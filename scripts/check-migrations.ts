import { config } from 'dotenv';
config();
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute('SELECT * FROM __drizzle_migrations ORDER BY id') as any;
  console.log('Migrações aplicadas:', rows.length);
  rows.forEach((r: any) => console.log(' -', r.hash?.substring(0, 20), r.created_at));
  await conn.end();
}

main().catch(console.error);
