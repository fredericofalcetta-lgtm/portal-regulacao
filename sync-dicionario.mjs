import { config } from 'dotenv';
config();

import axios from 'axios';
import mysql from 'mysql2/promise';

const SPREADSHEET_ID = "1cZ9aGm307pgF5tug8ScZFqncKy9BF1BHo7Dah9Rgm9k";
const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
const dbUrl = process.env.DATABASE_URL;

if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY não definida");
if (!dbUrl) throw new Error("DATABASE_URL não definida");

const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Dicion%C3%A1rio%20-%20Especialidades!A:B?key=${apiKey}&majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
const response = await axios.get(url, { timeout: 30000 });
const rows = response.data.values || [];

const dataRows = rows.slice(1).filter(r => r[0]?.trim() && r[1]?.trim());
console.log(`Encontradas ${dataRows.length} entradas no dicionário`);

const conn = await mysql.createConnection(dbUrl);
await conn.execute("DELETE FROM dicionario_especialidades");

for (let i = 0; i < dataRows.length; i += 500) {
  const batch = dataRows.slice(i, i + 500);
  const values = batch.map(r => [r[0].trim(), r[1].trim()]);
  await conn.query("INSERT INTO dicionario_especialidades (agenda, especialidade) VALUES ?", [values]);
}

console.log(`Sincronizados ${dataRows.length} registros no dicionário de especialidades`);
await conn.end();
