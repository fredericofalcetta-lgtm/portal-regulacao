import { describe, expect, it } from "vitest";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const SPREADSHEET_ID = "1cZ9aGm307pgF5tug8ScZFqncKy9BF1BHo7Dah9Rgm9k";
const SHEET_NAME = "Final";

describe("Google Sheets API", () => {
  it("deve acessar a planilha com a chave de API", async () => {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    expect(apiKey, "GOOGLE_SHEETS_API_KEY deve estar definida").toBeTruthy();

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${apiKey}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;

    const response = await axios.get(url, { timeout: 15000 });
    expect(response.status).toBe(200);
    expect(response.data.values).toBeDefined();
    expect(Array.isArray(response.data.values)).toBe(true);
    expect(response.data.values.length).toBeGreaterThan(1);

    console.log(`✅ Planilha acessada com sucesso! Total de linhas: ${response.data.values.length}`);
  }, 20000);
});
