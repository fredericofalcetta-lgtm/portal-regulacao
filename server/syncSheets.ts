import axios from "axios";
import { getDb } from "./db";
import { regulacaoData, syncLog, prioridades, reguladores } from "../drizzle/schema";
import { count } from "drizzle-orm";

const SPREADSHEET_ID = "1cZ9aGm307pgF5tug8ScZFqncKy9BF1BHo7Dah9Rgm9k";
const SHEET_NAME = "Final";

export async function syncSheetsToDb(): Promise<number> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY não está definida");

  const db = await getDb();
  if (!db) throw new Error("Banco de dados não disponível");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${apiKey}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;
  const response = await axios.get(url, { timeout: 30000 });
  const rows: (string | number)[][] = response.data.values || [];

  // Pular o cabeçalho (linha 0)
  const dataRows = rows.slice(1);

  // Limpar dados existentes e inserir novos
  await db.delete(regulacaoData);

  const insertRows = dataRows
    .filter(row => row.length >= 8)
    .map(row => ({
      agenda: row[0] != null ? String(row[0]) : null,
      municipio: row[1] != null ? String(row[1]) : null,
      cotas: row[2] != null ? parseInt(String(row[2])) || null : null,
      saldo: row[3] != null ? parseInt(String(row[3])) || null : null,
      aguardando: row[4] != null ? parseInt(String(row[4])) || null : null,
      autorizadas: row[5] != null ? parseInt(String(row[5])) || null : null,
      autCotas: row[6] != null ? String(row[6]) : null,
      indexRegula: row[7] != null ? parseFloat(String(row[7])) || null : null,
      central: row[8] != null ? String(row[8]) : null,
      especialidade: row[9] != null ? String(row[9]) : null,
    }));

  if (insertRows.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < insertRows.length; i += batchSize) {
      await db.insert(regulacaoData).values(insertRows.slice(i, i + batchSize));
    }
  }

  // Registrar log de sincronização
  await db.insert(syncLog).values({
    rowCount: insertRows.length,
    status: "success",
    message: `Sincronizados ${insertRows.length} registros da planilha Google Sheets`,
  });

  console.log(`[Sync] ${insertRows.length} registros sincronizados com sucesso`);
  return insertRows.length;
}

export async function syncPrioridadesToDb(): Promise<number> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY não está definida");

  const db = await getDb();
  if (!db) throw new Error("Banco de dados não disponível");

  const SPREADSHEET_ID = "1cZ9aGm307pgF5tug8ScZFqncKy9BF1BHo7Dah9Rgm9k";

  // Buscar metadados com hyperlinks da coluna G da aba Apoio
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${apiKey}&ranges=Apoio!F1:G250&fields=sheets.data.rowData.values.hyperlink,sheets.data.rowData.values.formattedValue`;
  const response = await axios.get(url, { timeout: 30000 });
  const sheets = response.data.sheets || [];
  const rowData = sheets[0]?.data?.[0]?.rowData || [];

  // Limpar dados existentes
  await db.delete(prioridades);

  const insertRows: { grandeGrupo: string | null; nomeArquivo: string | null; linkUrl: string | null }[] = [];

  // Pular linha 0 (cabeçalho)
  for (let i = 1; i < rowData.length; i++) {
    const row = rowData[i];
    const values = row?.values || [];
    const colF = values[0];
    const colG = values[1];

    const grandeGrupo = colF?.formattedValue?.trim() || null;
    const nomeArquivo = colG?.formattedValue?.trim() || null;
    const linkUrl = colG?.hyperlink?.trim() || null;

    if (nomeArquivo || linkUrl) {
      insertRows.push({ grandeGrupo, nomeArquivo, linkUrl });
    }
  }

  if (insertRows.length > 0) {
    await db.insert(prioridades).values(insertRows);
  }

  console.log(`[Sync] ${insertRows.length} listas de prioridades sincronizadas com sucesso`);
  return insertRows.length;
}

export async function syncReguladoresToDb(): Promise<number> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY não está definida");

  const db = await getDb();
  if (!db) throw new Error("Banco de dados não disponível");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Reguladores?key=${apiKey}&majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
  const response = await axios.get(url, { timeout: 30000 });
  const rows: string[][] = response.data.values || [];

  // Pular cabeçalho (linha 0)
  const dataRows = rows.slice(1);

  // Filtrar linhas válidas (nome e email obrigatórios) e remover e-mails duplicados
  const seen = new Set<string>();
  const insertRows = dataRows
    .filter(row => row[0]?.trim() && row[5]?.trim())
    .filter(row => {
      const email = row[5]?.trim().toLowerCase();
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    })
    .map(row => ({
      nome: row[0]?.trim() ?? "",
      vinculo: row[1]?.trim() || null,
      perfil: row[2]?.trim() || null,
      grandeGrupo: row[3]?.trim() || null,
      agendas: row[4]?.trim() || null,
      email: row[5]?.trim().toLowerCase() ?? "",
      ativo: "sim" as const,
    }));

  // Limpar e reinserir todos os reguladores
  await db.delete(reguladores);

  if (insertRows.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < insertRows.length; i += batchSize) {
      await db.insert(reguladores).values(insertRows.slice(i, i + batchSize));
    }
  }

  console.log(`[Sync] ${insertRows.length} reguladores sincronizados com sucesso`);
  return insertRows.length;
}

/**
 * Sincroniza se o banco estiver vazio (primeira carga) ou se forceSync for true.
 */
export async function syncAndSeedIfEmpty(forceSync = false): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Sync] Banco de dados não disponível, pulando sincronização");
      return;
    }

    if (!forceSync) {
      const result = await db.select({ total: count() }).from(regulacaoData);
      const total = result[0]?.total ?? 0;
      if (total > 0) {
        console.log(`[Sync] Banco já contém ${total} registros, pulando sincronização inicial`);
        return;
      }
    }

    console.log("[Sync] Iniciando sincronização com Google Sheets...");
    await syncSheetsToDb();
    await syncPrioridadesToDb();
    await syncReguladoresToDb();
  } catch (err) {
    console.error("[Sync] Erro durante sincronização:", err);
  }
}
