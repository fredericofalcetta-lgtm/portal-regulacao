import axios from "axios";
import { getDb } from "./db";
import { regulacaoData, syncLog } from "../drizzle/schema";
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
  } catch (err) {
    console.error("[Sync] Erro durante sincronização:", err);
  }
}
