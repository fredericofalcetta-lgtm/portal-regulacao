import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const SPREADSHEET_ID = "1cZ9aGm307pgF5tug8ScZFqncKy9BF1BHo7Dah9Rgm9k";
const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Final!1:1?key=${apiKey}&majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;

const response = await axios.get(url, { timeout: 15000 });
const headers: string[] = response.data.values?.[0] ?? [];
console.log("Cabeçalhos da aba Final:");
headers.forEach((h, i) => console.log(`  [${i}] ${h}`));
