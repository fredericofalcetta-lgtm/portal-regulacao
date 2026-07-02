/**
 * syncPostgres.ts
 * ---------------
 * Sincroniza dados do PostgreSQL externo (fonte Tableau/SESDW) para a tabela
 * local `regulacao_data_pg`, que serve como prévia paralela antes de
 * substituir definitivamente o Google Sheets.
 *
 * Credenciais configuradas via variáveis de ambiente no Railway:
 *   PG_HOST=200.169.24.32
 *   PG_PORT=5000
 *   PG_DATABASE=sesdw
 *   PG_USER=telessaude_read
 *   PG_PASSWORD=tQ#f7qBZ$9pu
 *
 * Campos calculados em código (equivalentes às fórmulas das planilhas):
 *   aut_cotas, index_regula, flag_index, cor_index, flag_aut_cotas, cor_aut_cotas
 */

import { Client } from "pg";
import { getDb } from "./db";
import { regulacaoDataPg } from "../drizzle/schema";

// ---------------------------------------------------------------------------
// Helpers — tradução direta das fórmulas Google Sheets
// ---------------------------------------------------------------------------

/**
 * Fila/Cotas = autorizadas / cotas
 * =SE(C=0;"";F/C)   onde C=cotas, F=autorizadas
 */
function calcAutCotas(cotas: number, autorizadas: number): number | null {
  if (cotas === 0) return null;
  return autorizadas / cotas;
}

/**
 * IndexRegula
 * Variáveis: c=cotas, d=saldo (agendas livres), e=aguardando, f=autorizadas
 */
function calcIndexRegula(
  cotas: number,
  saldo: number,
  aguardando: number,
  autorizadas: number
): number | null {
  if (cotas === 0) return null;
  try {
    if (autorizadas >= cotas) {
      return cotas / autorizadas;
    }
    if (aguardando === 0) {
      return 1;
    }
    if (saldo === 0) {
      return 1 + 0.05 * (aguardando / (cotas + aguardando));
    }
    return (
      1 + (0.05 + 0.2 * (saldo / cotas)) * ((aguardando + 1) / (autorizadas + 1))
    );
  } catch {
    return null;
  }
}

/**
 * Flag Index — orientação ao regulador baseada no IndexRegula
 */
function calcFlagIndex(indexRegula: number | null): string | null {
  if (indexRegula === null) return null;
  if (indexRegula > 2)
    return "Autorize tudo o que for pertinente à especialidade, independente do critério";
  if (indexRegula > 1)
    return "Autorize com flexibilidade, observando a quantidade de casos aguardando regulação e as cotas disponíveis";
  return null;
}

/**
 * Cor Index — semáforo baseado no IndexRegula
 */
function calcCorIndex(indexRegula: number | null): string | null {
  if (indexRegula === null) return null;
  if (indexRegula > 3) return "VERMELHA";
  if (indexRegula > 2) return "LARANJA";
  if (indexRegula > 1) return "AMARELO";
  return null;
}

/**
 * Flag Aut/Cotas — orientação ao regulador baseada na Fila/Cotas
 */
function calcFlagAutCotas(autCotas: number | null): string | null {
  if (autCotas === null) return null;
  if (autCotas < 1)
    return "Autorize tudo o que for pertinente à especialidade, independente do critério";
  if (autCotas <= 4)
    return "Autorize tudo o que for pertinente à especialidade, para evitar perda de consultas nos 3 próximos meses. Se há critério, não pendencie para alterar prioridade, todos os P3 vão consultar dentro de 4 meses";
  return "Aplicar critérios do protocolo à risca. Pendencie se necessário. Pacientes levam pelo menos 4 meses para consultar";
}

/**
 * Cor Aut/Cotas — semáforo baseado na Fila/Cotas
 */
function calcCorAutCotas(autCotas: number | null): string | null {
  if (autCotas === null) return null;
  if (autCotas < 1) return null;
  if (autCotas <= 4) return "LILÁS";
  return "CINZA ESCURO";
}

// ---------------------------------------------------------------------------
// Query PostgreSQL
// ---------------------------------------------------------------------------

const PG_QUERY = `
WITH agendas AS (
  SELECT
    especialidade,
    centralregulacao                              AS central_regulacao,
    municipioexecutante                           AS municipio_executante,
    COUNT(DISTINCT CASE WHEN
      DATE_TRUNC('month', dataagenda::date) = DATE_TRUNC('month', CURRENT_DATE)
      AND situacaoagenda IN (
        'AGENDA_CONFIRMADA', 'AGENDADA', 'LIVRE',
        'REALIZADA', 'FALTANTE', 'TRANSFERIDA'
      )
      AND tipoconsulta = 'PRIMEIRA'
    THEN id END)                                   AS total_agendas_mes,
    COUNT(DISTINCT CASE WHEN
      DATE_TRUNC('month', dataagenda::date) = DATE_TRUNC('month', CURRENT_DATE)
      AND situacaoagenda = 'LIVRE'
      AND tipoconsulta = 'PRIMEIRA'
    THEN id END)                                   AS agendas_livres_mes,
    COUNT(DISTINCT CASE WHEN
      dataagenda::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
      AND situacaoagenda = 'LIVRE'
      AND tipoconsulta = 'PRIMEIRA'
    THEN id END)                                   AS agendas_livres_14d
  FROM stage.ses_gercon_agendas_detalhe
  GROUP BY especialidade, centralregulacao, municipioexecutante
),
solicitacoes AS (
  SELECT
    "Descrição Especialidade"                     AS especialidade,
    centralregulacao                              AS central_regulacao,
    "Município Executante"                        AS municipio_executante,
    COUNT(DISTINCT CASE WHEN
      "Situação Solicitação" IN (
        'Aguarda regulação', 'Aguarda reversão', 'Aguarda reavaliação'
      )
    THEN "Número CMCE" END)                        AS total_aguardando,
    COUNT(DISTINCT CASE WHEN
      "Situação Solicitação" = 'Autorizadas'
    THEN "Número CMCE" END)                        AS total_autorizadas,
    COUNT(DISTINCT CASE WHEN
      "Situação Solicitação" = 'Aguarda regulação'
      AND CURRENT_DATE - "Data Solicitação"::date > 7
    THEN "Número CMCE" END)                        AS aguarda_reg_7d,
    COUNT(DISTINCT CASE WHEN
      "Situação Solicitação" = 'Aguarda regulação'
      AND CURRENT_DATE - "Data Solicitação"::date > 28
    THEN "Número CMCE" END)                        AS aguarda_reg_28d,
    COUNT(DISTINCT CASE WHEN
      "Situação Solicitação" = 'Aguarda regulação'
      AND CURRENT_DATE - "Data Solicitação"::date > 90
    THEN "Número CMCE" END)                        AS aguarda_reg_90d
  FROM stage.gercon_solicitacoes
  GROUP BY
    "Descrição Especialidade",
    centralregulacao,
    "Município Executante"
)
SELECT
  COALESCE(a.especialidade,         s.especialidade)         AS especialidade,
  COALESCE(a.central_regulacao,     s.central_regulacao)     AS central_regulacao,
  COALESCE(a.municipio_executante,  s.municipio_executante)  AS municipio_executante,
  COALESCE(a.total_agendas_mes,     0)                       AS total_agendas_mes,
  COALESCE(a.agendas_livres_mes,    0)                       AS agendas_livres_mes,
  COALESCE(s.total_aguardando,      0)                       AS total_aguardando,
  COALESCE(s.total_autorizadas,     0)                       AS total_autorizadas,
  COALESCE(s.aguarda_reg_7d,        0)                       AS aguarda_reg_7d,
  COALESCE(s.aguarda_reg_28d,       0)                       AS aguarda_reg_28d,
  COALESCE(s.aguarda_reg_90d,       0)                       AS aguarda_reg_90d
FROM agendas a
FULL OUTER JOIN solicitacoes s
  ON  a.especialidade        = s.especialidade
  AND a.central_regulacao    = s.central_regulacao
  AND a.municipio_executante = s.municipio_executante
ORDER BY especialidade, central_regulacao, municipio_executante
`;

// ---------------------------------------------------------------------------
// Sync principal
// ---------------------------------------------------------------------------

export async function syncFromPostgres(): Promise<number> {
  const client = new Client({
    host:     process.env.PG_HOST     ?? "200.169.24.32",
    port:     parseInt(process.env.PG_PORT ?? "5000", 10),
    database: process.env.PG_DATABASE ?? "sesdw",
    user:     process.env.PG_USER     ?? "telessaude_read",
    password: process.env.PG_PASSWORD ?? "tQ#f7qBZ$9pu",
    ssl:      { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    query_timeout:           120000,
  });

  try {
    console.log("[PG Sync] Conectando ao PostgreSQL externo...");
    await client.connect();
    console.log("[PG Sync] Executando query...");

    const result = await client.query(PG_QUERY);
    const rows = result.rows;
    console.log(`[PG Sync] ${rows.length} linhas recebidas do PostgreSQL.`);

    if (rows.length === 0) {
      console.warn("[PG Sync] Nenhuma linha retornada — sync abortado para preservar dados atuais.");
      return 0;
    }

    // Mapear colunas e calcular campos derivados
    const inserts = rows.map((row) => {
      const cotas       = Number(row.total_agendas_mes)  || 0;
      const saldo       = Number(row.agendas_livres_mes) || 0;
      const aguardando  = Number(row.total_aguardando)   || 0;
      const autorizadas = Number(row.total_autorizadas)  || 0;
      const ag7d        = Number(row.aguarda_reg_7d)     || 0;
      const ag28d       = Number(row.aguarda_reg_28d)    || 0;
      const ag90d       = Number(row.aguarda_reg_90d)    || 0;

      const autCotas    = calcAutCotas(cotas, autorizadas);
      const indexRegula = calcIndexRegula(cotas, saldo, aguardando, autorizadas);

      return {
        agenda:        (row.especialidade        as string | null) ?? null,
        municipio:     (row.municipio_executante as string | null) ?? null,
        central:       (row.central_regulacao    as string | null) ?? null,
        cotas,
        saldo,
        aguardando,
        autorizadas,
        aguardando7d:  ag7d,
        aguardando28d: ag28d,
        aguardando90d: ag90d,
        autCotas:      autCotas !== null ? String(autCotas) : null,
        indexRegula,
        flagIndex:     calcFlagIndex(indexRegula),
        corIndex:      calcCorIndex(indexRegula),
        flagAutCotas:  calcFlagAutCotas(autCotas),
        corAutCotas:   calcCorAutCotas(autCotas),
        especialidade: null as string | null,
      };
    });

    // Gravar na tabela paralela (DELETE + INSERT em batches)
    const db = await getDb();
    if (!db) throw new Error("[PG Sync] Banco MySQL não disponível.");

    console.log("[PG Sync] Atualizando regulacao_data_pg...");
    await db.delete(regulacaoDataPg);

    const batchSize = 500;
    for (let i = 0; i < inserts.length; i += batchSize) {
      await db.insert(regulacaoDataPg).values(inserts.slice(i, i + batchSize));
    }

    console.log(`[PG Sync] ${inserts.length} registros gravados em regulacao_data_pg.`);
    return inserts.length;

  } finally {
    await client.end().catch(() => {});
  }
}
