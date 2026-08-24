import { getDb } from "./db";
import { condutasGercon, condutasGerconSyncLog } from "../drizzle/schema";

/**
 * Importação manual das condutas GERCON a partir de um CSV exportado
 * diretamente do banco de dados (uma alternativa temporária enquanto o
 * acesso ao Metabase não é liberado — ver server/syncMetabase.ts).
 *
 * Formato esperado do CSV (uma linha por situação × referência bibliográfica):
 *   id, titulo, status, especialidades, cid_primario, cip_primario,
 *   cid_secundario, ciap_segundario, conduta_sugerida, bibliografia_titulo,
 *   bibliografia_status, bibliografia_descricao, bibliografia_url, bibliografia_id
 *
 * - "especialidades" vem como array do Postgres, ex: {ENDOCRINOLOGIA} ou
 *   {NEUROLOGIA,"TRATAMENTO DA DOR"} — uma linha da tabela condutas_gercon é
 *   criada para CADA especialidade da lista (mesmo padrão da fonte antiga).
 * - Apenas situações com status = "true" são importadas.
 * - Apenas referências com bibliografia_status = "true" entram na lista de
 *   referências, numeradas e concatenadas com o texto de bibliografia_descricao.
 * - "cip_primario" é o código CIAP (nome da coluna vem com esse "typo" da
 *   fonte); "cid_primario" é o CID-10. Os campos "_secundario"/"_segundario"
 *   são opcionais e, quando presentes, são anexados ao final.
 */

// ─── Parser CSV (RFC 4180: aspas duplas, campos com vírgula/quebra de linha) ───

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Normaliza quebras de linha para \n antes de percorrer caractere a caractere
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];

    if (inQuotes) {
      if (c === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++; // pula a segunda aspa (escape "")
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += c;
  }

  // Última linha (sem quebra de linha final)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Remove linhas totalmente vazias (ex.: linha final em branco)
  return rows.filter(r => !(r.length === 1 && r[0] === ""));
}

interface CsvRecord {
  id: string;
  titulo: string;
  status: string;
  especialidades: string;
  cid_primario: string;
  cip_primario: string;
  cid_secundario: string;
  ciap_segundario: string;
  conduta_sugerida: string;
  bibliografia_titulo: string;
  bibliografia_status: string;
  bibliografia_descricao: string;
  bibliografia_url: string;
  bibliografia_id: string;
}

const REQUIRED_COLUMNS: (keyof CsvRecord)[] = [
  "id",
  "titulo",
  "status",
  "especialidades",
  "conduta_sugerida",
  "bibliografia_status",
  "bibliografia_descricao",
  "bibliografia_id",
];

function parseCsvRecords(csvText: string): CsvRecord[] {
  const table = parseCsv(csvText);
  if (table.length === 0) throw new Error("CSV vazio");

  const header = table[0].map(h => h.trim());
  for (const col of REQUIRED_COLUMNS) {
    if (!header.includes(col)) {
      throw new Error(
        `Coluna obrigatória "${col}" não encontrada no CSV. Colunas encontradas: ${header.join(", ")}`
      );
    }
  }

  return table.slice(1).map(cols => {
    const record = {} as Record<string, string>;
    header.forEach((colName, idx) => {
      record[colName] = cols[idx] ?? "";
    });
    return record as unknown as CsvRecord;
  });
}

// ─── Parser do array literal do Postgres: {A,B} ou {A,"B C"} ───

function parsePgArray(raw: string): string[] {
  const s = raw.trim();
  if (!s || s === "{}") return [];
  const inner = s.startsWith("{") && s.endsWith("}") ? s.slice(1, -1) : s;

  const items: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inQuotes) {
      if (c === '"') {
        inQuotes = false;
      } else {
        current += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      items.push(current.trim());
      current = "";
      continue;
    }
    current += c;
  }
  if (current.trim() !== "" || items.length > 0) items.push(current.trim());

  return items.filter(Boolean);
}

// Palavras que permanecem em minúsculas no meio do nome da especialidade
const LOWERCASE_WORDS = new Set(["da", "de", "do", "das", "dos", "e"]);

function toTitleCase(raw: string): string {
  return raw
    .toLowerCase()
    .split(" ")
    .map((word, idx) => {
      if (idx > 0 && LOWERCASE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// ─── Transformação CSV → linhas de condutas_gercon ───────────────────────────

interface CondutaRow {
  especialidade: string;
  situacao: string;
  ciapCid: string | null;
  conduta: string;
  referencias: string | null;
}

function buildCiapCid(rec: CsvRecord): string | null {
  const partes = [rec.cip_primario, rec.cid_primario, rec.ciap_segundario, rec.cid_secundario]
    .map(p => (p ?? "").trim())
    .filter(Boolean);
  return partes.length > 0 ? partes.join(" / ") : null;
}

function buildReferencias(recs: CsvRecord[]): string | null {
  const vistos = new Set<string>();
  const descricoes: string[] = [];

  for (const rec of recs) {
    if (rec.bibliografia_status !== "true") continue;
    const bibId = rec.bibliografia_id?.trim();
    const desc = rec.bibliografia_descricao?.trim();
    if (!desc) continue;
    const chave = bibId || desc;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    descricoes.push(desc);
  }

  if (descricoes.length === 0) return null;
  return descricoes.map((d, i) => `${i + 1}. ${d}`).join("\n");
}

export function transformCsvToCondutas(csvText: string): CondutaRow[] {
  const records = parseCsvRecords(csvText);

  const byId = new Map<string, CsvRecord[]>();
  for (const rec of records) {
    const grupo = byId.get(rec.id) ?? [];
    grupo.push(rec);
    byId.set(rec.id, grupo);
  }

  const result: CondutaRow[] = [];

  for (const grupo of byId.values()) {
    const primeiro = grupo[0];
    if (primeiro.status !== "true") continue; // situação inativa — não importar

    const situacao = primeiro.titulo?.trim();
    const conduta = primeiro.conduta_sugerida?.trim();
    if (!situacao || !conduta) continue;

    const especialidades = parsePgArray(primeiro.especialidades).map(toTitleCase);
    const ciapCid = buildCiapCid(primeiro);
    const referencias = buildReferencias(grupo);

    const listaEspecialidades = especialidades.length > 0 ? especialidades : ["Sem especialidade"];
    for (const especialidade of listaEspecialidades) {
      result.push({ especialidade, situacao, ciapCid, conduta, referencias });
    }
  }

  return result;
}

/**
 * Substitui todo o conteúdo da tabela condutas_gercon pelos dados do CSV
 * (mesmo padrão "delete + insert" usado nos demais syncs).
 */
export async function importCondutasGerconFromCsv(csvText: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados não disponível");

  const rows = transformCsvToCondutas(csvText);
  if (rows.length === 0) {
    throw new Error("Nenhuma conduta ativa encontrada no CSV enviado. Verifique o arquivo.");
  }

  await db.delete(condutasGercon);

  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    if (batch.length > 0) {
      await db.insert(condutasGercon).values(batch);
    }
  }

  await db.insert(condutasGerconSyncLog).values({
    rowCount: rows.length,
    status: "success",
    message: `Importadas ${rows.length} condutas GERCON via upload de CSV`,
  });

  console.log(`[Import CSV] ${rows.length} condutas GERCON importadas com sucesso`);
  return rows.length;
}

/** Wrapper usado pela mutation tRPC: registra o erro no log antes de propagar. */
export async function importCondutasGerconFromCsvComLog(csvText: string): Promise<number> {
  try {
    return await importCondutasGerconFromCsv(csvText);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    try {
      const db = await getDb();
      if (db) {
        await db.insert(condutasGerconSyncLog).values({
          rowCount: 0,
          status: "error",
          message: `Falha na importação de CSV: ${message}`,
        });
      }
    } catch {
      /* se nem o log der certo, apenas propaga o erro original */
    }
    throw error;
  }
}
