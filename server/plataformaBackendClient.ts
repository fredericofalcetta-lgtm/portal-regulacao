import { Client } from "pg";

/**
 * Cliente de consulta ao PostgreSQL do "plataforma-backend" — usado por
 * enquanto apenas para EXPLORAÇÃO/COMPARAÇÃO de dados na aba de teste
 * (client/src/pages/TestePlataformaBackend.tsx), não faz parte ainda do
 * fluxo de sincronização automática de condutas_gercon.
 *
 * Credenciais via variáveis de ambiente no Railway (NÃO reutilizar as
 * variáveis PG_* já usadas pelo sync do sesdw em server/syncPostgres.ts —
 * são bancos diferentes, com administradores diferentes):
 *   PLATAFORMA_BACKEND_HOST=143.54.31.135
 *   PLATAFORMA_BACKEND_PORT=5432
 *   PLATAFORMA_BACKEND_DATABASE=plataforma_backend
 *   PLATAFORMA_BACKEND_USER=estatistica
 *   PLATAFORMA_BACKEND_PASSWORD=<senha>
 *
 * ⚠️ Por segurança, apenas comandos SELECT/WITH (somente leitura) são aceitos.
 */

export interface QueryResult {
  fields: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

function getConfig() {
  return {
    host: process.env.PLATAFORMA_BACKEND_HOST ?? "143.54.31.135",
    port: Number(process.env.PLATAFORMA_BACKEND_PORT ?? "5432"),
    database: process.env.PLATAFORMA_BACKEND_DATABASE ?? "plataforma_backend",
    user: process.env.PLATAFORMA_BACKEND_USER ?? "estatistica",
    password: process.env.PLATAFORMA_BACKEND_PASSWORD ?? "",
    ssl: false as const,
    connectionTimeoutMillis: 10000,
    statement_timeout: 20000, // aborta consultas que rodem mais de 20s
  };
}

/** Permite apenas consultas somente-leitura (SELECT ou WITH ... SELECT). */
function assertQueryIsReadOnly(sql: string): void {
  const trimmed = sql.trim().replace(/;+\s*$/g, ""); // remove ; final
  if (trimmed.includes(";")) {
    throw new Error("Envie apenas UM comando por consulta (sem ';' no meio do texto).");
  }
  const primeiraPalavra = trimmed.split(/\s+/)[0]?.toLowerCase();
  if (primeiraPalavra !== "select" && primeiraPalavra !== "with") {
    throw new Error(
      `Apenas consultas SELECT (ou WITH ... SELECT) são permitidas nessa aba de teste. Comando recebido: "${primeiraPalavra ?? ""}"`
    );
  }
}

/** Executa uma consulta somente-leitura no plataforma-backend e retorna o resultado bruto. */
export async function testarQueryPlataformaBackend(sql: string): Promise<QueryResult> {
  assertQueryIsReadOnly(sql);

  const client = new Client(getConfig());
  try {
    await client.connect();
    const result = await client.query(sql);
    const fields = result.fields.map(f => f.name);
    return {
      fields,
      rows: result.rows as Record<string, unknown>[],
      rowCount: result.rowCount ?? result.rows.length,
    };
  } finally {
    await client.end().catch(() => {});
  }
}
