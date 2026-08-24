import axios from "axios";
import { getDb } from "./db";
import { condutasGercon, condutasGerconSyncLog } from "../drizzle/schema";
import { count } from "drizzle-orm";

/**
 * Sincronização das condutas do GERCON a partir de uma Question (card) salva
 * no Metabase: https://metabase.telessauders.ufrgs.br:3000/question/961-...
 *
 * Variáveis de ambiente necessárias (Railway):
 * - METABASE_URL              https://metabase.telessauders.ufrgs.br:3000
 * - METABASE_CARD_ID          961  (o número que aparece na URL da question)
 * - Autenticação — usar UMA das duas opções:
 *   a) METABASE_API_KEY       (se o Metabase tiver o recurso de API Keys habilitado)
 *   b) METABASE_EMAIL + METABASE_PASSWORD (login de uma conta de serviço no Metabase)
 *
 * ⚠️ ATENÇÃO — MESMO BLOQUEIO DE REDE DO POSTGRES (sesdw):
 * O Metabase do TelessaúdeRS provavelmente só é acessível via VPN institucional,
 * assim como o Postgres em 200.169.24.32 (ver server/syncPostgres.ts). O Railway
 * roda em IPs compartilhados públicos, então essa sincronização tende a falhar
 * com timeout/connection refused até a equipe de infraestrutura liberar o
 * acesso — pelo mesmo motivo e provavelmente pela mesma solicitação já em
 * andamento para o pg_hba.conf. Vale confirmar isso ANTES de gastar tempo
 * depurando erros de rede aqui.
 */

let cachedSessionToken: string | null = null;

function getMetabaseBaseUrl(): string {
  const url = process.env.METABASE_URL;
  if (!url) throw new Error("METABASE_URL não está definida");
  return url.replace(/\/+$/, "");
}

function getCardId(): number {
  const raw = process.env.METABASE_CARD_ID;
  if (!raw) throw new Error("METABASE_CARD_ID não está definida (ex: 961)");
  const id = Number(raw);
  if (!Number.isFinite(id)) throw new Error(`METABASE_CARD_ID inválido: "${raw}"`);
  return id;
}

async function getAuthHeaders(forceRelogin = false): Promise<Record<string, string>> {
  const apiKey = process.env.METABASE_API_KEY;
  if (apiKey) {
    return { "x-api-key": apiKey };
  }

  if (!forceRelogin && cachedSessionToken) {
    return { "X-Metabase-Session": cachedSessionToken };
  }

  const email = process.env.METABASE_EMAIL;
  const password = process.env.METABASE_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Configure METABASE_API_KEY, ou METABASE_EMAIL + METABASE_PASSWORD, para autenticar no Metabase"
    );
  }

  const baseUrl = getMetabaseBaseUrl();
  const { data } = await axios.post(
    `${baseUrl}/api/session`,
    { username: email, password },
    { timeout: 20000 }
  );

  if (!data?.id) {
    throw new Error("Login no Metabase não retornou um token de sessão válido");
  }

  cachedSessionToken = data.id as string;
  return { "X-Metabase-Session": cachedSessionToken };
}

interface MetabaseCardQueryResult {
  data: {
    cols: { name: string; display_name?: string }[];
    rows: unknown[][];
  };
}

/**
 * Executa a Question salva (POST /api/card/:id/query) — não precisa de SQL
 * nem de database_id, o card já sabe qual é a sua própria consulta.
 */
async function runMetabaseCardQuery(): Promise<MetabaseCardQueryResult["data"]> {
  const baseUrl = getMetabaseBaseUrl();
  const cardId = getCardId();
  const url = `${baseUrl}/api/card/${cardId}/query`;

  const headers = await getAuthHeaders();
  try {
    const { data } = await axios.post<MetabaseCardQueryResult>(url, {}, { headers, timeout: 120000 });
    return data.data;
  } catch (err: unknown) {
    // Sessão de login/senha pode ter expirado (Metabase expira em ~14 dias) — tenta renovar uma vez.
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status === 401 && !process.env.METABASE_API_KEY) {
      const retryHeaders = await getAuthHeaders(true);
      const { data } = await axios.post<MetabaseCardQueryResult>(url, {}, { headers: retryHeaders, timeout: 120000 });
      return data.data;
    }
    throw err;
  }
}

// Nomes aceitos para cada coluna esperada — a Question do Metabase pode ter
// sido criada com "AS" diferentes dos que usamos aqui internamente.
const COLUMN_ALIASES: Record<string, string[]> = {
  especialidade: ["especialidade"],
  situacao: ["situacao", "situação", "hipotese", "hipótese"],
  ciapCid: ["ciap_cid", "ciap/cid", "ciap", "cid"],
  conduta: ["conduta", "conduta_sugerida", "condutas_sugeridas"],
  referencias: ["referencias", "referências", "referencia", "referência"],
};

function normalizeColName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findColumnIndex(colNames: string[], field: keyof typeof COLUMN_ALIASES): number {
  const aliases = COLUMN_ALIASES[field].map(normalizeColName);
  const normalized = colNames.map(normalizeColName);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Executa a Question no Metabase e substitui todo o conteúdo da tabela
 * condutas_gercon (mesmo padrão de "delete + insert" usado no sync do Sheets).
 */
export async function syncCondutasGerconFromMetabase(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados não disponível");

  const result = await runMetabaseCardQuery();
  const colNames = result.cols.map(c => c.display_name || c.name);

  const iEspecialidade = findColumnIndex(colNames, "especialidade");
  const iSituacao = findColumnIndex(colNames, "situacao");
  const iCiapCid = findColumnIndex(colNames, "ciapCid");
  const iConduta = findColumnIndex(colNames, "conduta");
  const iReferencias = findColumnIndex(colNames, "referencias");

  if (iEspecialidade === -1 || iSituacao === -1 || iConduta === -1) {
    throw new Error(
      `A Question do Metabase precisa retornar colunas de especialidade, situação e conduta. ` +
        `Colunas retornadas: ${colNames.join(", ") || "(nenhuma)"}. ` +
        `Se os nomes forem diferentes, ajuste COLUMN_ALIASES em server/syncMetabase.ts.`
    );
  }

  const asText = (v: unknown): string => (v == null ? "" : String(v)).trim();
  const asTextOrNull = (v: unknown): string | null => {
    const s = asText(v);
    return s === "" ? null : s;
  };

  const insertRows = result.rows
    .filter(row => asText(row[iSituacao]) !== "")
    .map(row => ({
      especialidade: asText(row[iEspecialidade]),
      situacao: asText(row[iSituacao]),
      ciapCid: iCiapCid !== -1 ? asTextOrNull(row[iCiapCid]) : null,
      conduta: asText(row[iConduta]),
      referencias: iReferencias !== -1 ? asTextOrNull(row[iReferencias]) : null,
    }));

  await db.delete(condutasGercon);

  // Inserir em lotes para evitar um único payload SQL muito grande
  const BATCH_SIZE = 100;
  for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
    const batch = insertRows.slice(i, i + BATCH_SIZE);
    if (batch.length > 0) {
      await db.insert(condutasGercon).values(batch);
    }
  }

  await db.insert(condutasGerconSyncLog).values({
    rowCount: insertRows.length,
    status: "success",
    message: `Sincronizadas ${insertRows.length} condutas GERCON via Metabase (card ${getCardId()})`,
  });

  console.log(`[Sync Metabase] ${insertRows.length} condutas GERCON sincronizadas com sucesso`);
  return insertRows.length;
}

/** Wrapper usado pela mutation tRPC: registra o erro no log antes de propagar. */
export async function syncCondutasGerconComLog(): Promise<number> {
  try {
    return await syncCondutasGerconFromMetabase();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    try {
      const db = await getDb();
      if (db) {
        await db.insert(condutasGerconSyncLog).values({
          rowCount: 0,
          status: "error",
          message,
        });
      }
    } catch {
      /* se nem o log der certo, apenas propaga o erro original */
    }
    throw error;
  }
}

/** Sincroniza apenas se a tabela estiver vazia (primeira carga após o deploy). */
export async function syncCondutasGerconIfEmpty(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Sync Metabase] Banco de dados não disponível, pulando sincronização inicial");
      return;
    }

    const result = await db.select({ total: count() }).from(condutasGercon);
    const total = result[0]?.total ?? 0;
    if (total > 0) {
      console.log(`[Sync Metabase] condutas_gercon já contém ${total} registros, pulando sincronização inicial`);
      return;
    }

    console.log("[Sync Metabase] Iniciando sincronização inicial de condutas GERCON...");
    await syncCondutasGerconComLog();
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      console.error(
        "[Sync Metabase] Erro durante sincronização inicial (HTTP):",
        `status=${err.response?.status ?? "sem resposta"}`,
        `url=${err.config?.url ?? "desconhecida"}`,
        `mensagem=${err.message}`,
        err.response?.data ? `dados=${JSON.stringify(err.response.data)}` : "",
        err.code === "ECONNABORTED" || err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT"
          ? " — isso costuma indicar bloqueio de rede/VPN, não erro de código."
          : ""
      );
    } else if (err instanceof Error) {
      console.error("[Sync Metabase] Erro durante sincronização inicial:", err.message);
    } else {
      console.error("[Sync Metabase] Erro durante sincronização inicial:", String(err));
    }
  }
}
