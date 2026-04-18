import axios from "axios";
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const SPREADSHEET_ID = "1cZ9aGm307pgF5tug8ScZFqncKy9BF1BHo7Dah9Rgm9k";

async function run() {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY não definida");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sem cotas?key=${apiKey}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;
  const response = await axios.get(url, { timeout: 30000 });
  const rows = response.data.values || [];
  const dataRows = rows.slice(1);

  const novasLinhas = dataRows
    .filter(row => row.length >= 1 && row[0])
    .map(row => ({
      especialidade: row[0] != null ? String(row[0]).trim() : null,
      municipio: row[1] != null ? String(row[1]).trim() || null : null,
      aguardando: row[2] != null ? parseInt(String(row[2])) || 0 : 0,
      autorizados: row[3] != null ? parseInt(String(row[3])) || 0 : 0,
      central: row[4] != null ? String(row[4]).trim() || null : null,
      isNova: "nao",
    }));

  const conn = await createConnection(process.env.DATABASE_URL);
  await conn.execute("DELETE FROM sem_cotas");

  for (let i = 0; i < novasLinhas.length; i += 500) {
    const batch = novasLinhas.slice(i, i + 500);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
    const values = batch.flatMap(r => [r.especialidade, r.municipio, r.aguardando, r.autorizados, r.central, r.isNova]);
    await conn.execute(
      `INSERT INTO sem_cotas (especialidade, municipio, aguardando, autorizados, central, is_nova) VALUES ${placeholders}`,
      values
    );
  }

  console.log(`✅ ${novasLinhas.length} registros sem cotas inseridos`);
  await conn.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
