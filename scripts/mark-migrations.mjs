/**
 * Script para registrar migrações já aplicadas no banco (sem executá-las).
 * Útil quando as tabelas já existem mas o registro em __drizzle_migrations está desatualizado.
 */
import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const drizzleDir = join(__dirname, '../drizzle');

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar migrações já registradas
const [applied] = await conn.execute('SELECT hash FROM __drizzle_migrations');
const appliedHashes = new Set(applied.map(r => r.hash));
console.log(`Migrações já registradas: ${appliedHashes.size}`);

// Listar arquivos SQL locais
const files = readdirSync(drizzleDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

let registered = 0;
for (const file of files) {
  const content = readFileSync(join(drizzleDir, file), 'utf8');
  const hash = createHash('sha256').update(content).digest('hex');

  if (appliedHashes.has(hash)) {
    console.log(`  [já registrada] ${file}`);
    continue;
  }

  // Registrar sem executar o SQL
  await conn.execute(
    'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
    [hash, Date.now()]
  );
  console.log(`  [registrada agora] ${file} -> ${hash.substring(0, 20)}`);
  registered++;
}

console.log(`\nTotal registradas agora: ${registered}`);
await conn.end();
