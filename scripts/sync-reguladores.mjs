import axios from "axios";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const SPREADSHEET_ID = "1cZ9aGm307pgF5tug8ScZFqncKy9BF1BHo7Dah9Rgm9k";
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!API_KEY) throw new Error("GOOGLE_SHEETS_API_KEY não definida");
if (!DATABASE_URL) throw new Error("DATABASE_URL não definida");

const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Reguladores?key=${API_KEY}&majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
const response = await axios.get(url, { timeout: 30000 });
const rows = response.data.values || [];

const dataRows = rows.slice(1);

// Remover duplicatas de e-mail
const seen = new Set();
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
    ativo: "sim",
  }));

console.log(`Encontrados ${insertRows.length} reguladores únicos`);

const conn = await mysql.createConnection(DATABASE_URL);

await conn.execute("DELETE FROM reguladores");
console.log("Tabela limpa");

for (let i = 0; i < insertRows.length; i += 50) {
  const batch = insertRows.slice(i, i + 50);
  for (const r of batch) {
    await conn.execute(
      "INSERT INTO reguladores (nome, vinculo, perfil, grande_grupo, agendas, email, ativo) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [r.nome, r.vinculo, r.perfil, r.grandeGrupo, r.agendas, r.email, r.ativo]
    );
  }
  console.log(`Inseridos ${Math.min(i + 50, insertRows.length)} / ${insertRows.length}`);
}

await conn.end();
console.log(`✅ ${insertRows.length} reguladores sincronizados com sucesso!`);
