import axios from "axios";
import { getDb } from "./db";
import { regulacaoData, syncLog, prioridades, reguladores, protocolos, dicionarioEspecialidades } from "../drizzle/schema";
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

  // Novo cabeçalho (a partir de 2026-03):
  // [0] Agenda, [1] Município, [2] Cotas, [3] Saldo, [4] Aguardando,
  // [5] Autorizadas, [6] Aut/Cotas, [7] IndexRegula,
  // [8] >28, [9] >60d, [10] >90d, [11] Central, [12] Especialidade, [13] Flags, [14] Cor
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
      aguardando28d: row[8] != null ? parseInt(String(row[8])) || null : null,
      aguardando60d: row[9] != null ? parseInt(String(row[9])) || null : null,
      aguardando90d: row[10] != null ? parseInt(String(row[10])) || null : null,
      central: row[11] != null ? String(row[11]) : null,
      especialidade: row[12] != null ? String(row[12]) : null,
      flags: row[13] != null ? String(row[13]) : null,
      cor: row[14] != null ? String(row[14]).trim() : null,
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

export async function syncProtocolosToDb(): Promise<number> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY não está definida");

  const db = await getDb();
  if (!db) throw new Error("Banco de dados não disponível");

  // Buscar metadados com hyperlinks da coluna H da aba Apoio
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${apiKey}&ranges=Apoio!H:H&fields=sheets.data.rowData.values.hyperlink,sheets.data.rowData.values.formattedValue`;
  const response = await axios.get(url, { timeout: 30000 });
  const sheets = response.data.sheets || [];
  const rowData = sheets[0]?.data?.[0]?.rowData || [];

  // Limpar dados existentes
  await db.delete(protocolos);

  const insertRows: { nome: string; linkUrl: string | null }[] = [];

  // Pular linha 0 (cabeçalho)
  for (let i = 1; i < rowData.length; i++) {
    const row = rowData[i];
    const cell = row?.values?.[0];
    const nome = cell?.formattedValue?.trim() || "";
    const linkUrl = cell?.hyperlink?.trim() || null;

    if (nome) {
      insertRows.push({ nome, linkUrl });
    }
  }

  if (insertRows.length > 0) {
    await db.insert(protocolos).values(insertRows);
  }

  console.log(`[Sync] ${insertRows.length} protocolos sincronizados com sucesso`);
  return insertRows.length;
}

export async function syncDicionarioToDb(): Promise<number> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY n\u00e3o est\u00e1 definida");

  const db = await getDb();
  if (!db) throw new Error("Banco de dados n\u00e3o dispon\u00edvel");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Dicion%C3%A1rio%20-%20Especialidades!A:B?key=${apiKey}&majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
  const response = await axios.get(url, { timeout: 30000 });
  const rows: string[][] = response.data.values || [];

  // Pular cabe\u00e7alho (linha 0)
  const dataRows = rows.slice(1);

  // Limpar dados existentes
  await db.delete(dicionarioEspecialidades);

  const insertRows = dataRows
    .filter(row => row[0]?.trim() && row[1]?.trim())
    .map(row => ({
      agenda: row[0].trim(),
      especialidade: row[1].trim(),
    }));

  if (insertRows.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < insertRows.length; i += batchSize) {
      await db.insert(dicionarioEspecialidades).values(insertRows.slice(i, i + batchSize));
    }
  }

  console.log(`[Sync] ${insertRows.length} entradas do dicion\u00e1rio de especialidades sincronizadas`);
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
    await syncDicionarioToDb();
  } catch (err) {
    console.error("[Sync] Erro durante sincronização:", err);
  }
}
