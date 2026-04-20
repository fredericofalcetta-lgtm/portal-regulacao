import https from "https";
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const SPREADSHEET_ID = "1cZ9aGm307pgF5tug8ScZFqncKy9BF1BHo7Dah9Rgm9k";

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = "";
      res.on("data", d => (data += d));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

const parseNum = (v) => {
  if (v == null || v === "" || v === "#N/A" || v === "#VALUE!" || v === "#REF!") return null;
  const cleaned = String(v).replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
};

const parseInt2 = (v) => {
  const n = parseNum(v);
  return n != null ? Math.round(n) : null;
};

async function run() {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY não definida");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Final?key=${apiKey}&majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
  console.log("Buscando aba Final...");
  const data = await fetchUrl(url);
  const rows = data.values || [];
  const dataRows = rows.slice(1);

  const insertRows = dataRows
    .filter(row => row.length >= 1 && row[0] && row[0] !== "#N/A" && row[0] !== "#VALUE!" && row[0] !== "#REF!" && row[0].trim() !== "")
    .map(row => ({
      agenda: row[0]?.trim() || null,
      municipio: row[1]?.trim() || null,
      cotas: parseInt2(row[2]),
      saldo: parseInt2(row[3]),
      aguardando: parseInt2(row[4]),
      autorizadas: parseInt2(row[5]),
      autCotas: row[6]?.trim() || null,
      indexRegula: parseNum(row[7]),
      aguardando28d: parseInt2(row[8]),
      aguardando60d: parseInt2(row[9]),
      aguardando90d: parseInt2(row[10]),
      central: row[11]?.trim() || null,
      especialidade: row[12]?.trim() || null,
      flagIndex: row[13]?.trim() || null,
      corIndex: row[14]?.trim() || null,
      flagAutCotas: row[15]?.trim() || null,
      corAutCotas: row[16]?.trim() || null,
    }));

  console.log(`Total linhas brutas: ${dataRows.length}`);
  console.log(`Linhas válidas para inserir: ${insertRows.length}`);
  if (insertRows.length > 0) {
    console.log("Amostra (3 primeiras):", JSON.stringify(insertRows.slice(0, 3), null, 2));
  }

  const conn = await createConnection(process.env.DATABASE_URL);
  await conn.execute("DELETE FROM regulacao_data");

  for (let i = 0; i < insertRows.length; i += 500) {
    const batch = insertRows.slice(i, i + 500);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    const values = batch.flatMap(r => [
      r.agenda, r.municipio, r.cotas, r.saldo, r.aguardando,
      r.autorizadas, r.autCotas, r.indexRegula,
      r.aguardando28d, r.aguardando60d, r.aguardando90d,
      r.central, r.especialidade,
      r.flagIndex, r.corIndex, r.flagAutCotas, r.corAutCotas
    ]);
    await conn.execute(
      `INSERT INTO regulacao_data (agenda, municipio, cotas, saldo, aguardando, autorizadas, aut_cotas, index_regula, aguardando_28d, aguardando_60d, aguardando_90d, central, especialidade, flag_index, cor_index, flag_aut_cotas, cor_aut_cotas) VALUES ${placeholders}`,
      values
    );
    console.log(`  Inseridos ${Math.min(i + 500, insertRows.length)}/${insertRows.length}...`);
  }

  // Registrar log
  await conn.execute(
    "INSERT INTO sync_log (row_count, status, message) VALUES (?, ?, ?)",
    [insertRows.length, "success", `Sincronizados ${insertRows.length} registros da planilha Google Sheets`]
  );

  console.log(`✅ ${insertRows.length} registros inseridos com sucesso!`);
  await conn.end();
}

run().catch(e => { console.error("❌ Erro:", e.message); process.exit(1); });
