import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // Adicionar as 4 novas colunas se não existirem
  const queries = [
    `ALTER TABLE regulacao_data ADD COLUMN IF NOT EXISTS flag_index TEXT`,
    `ALTER TABLE regulacao_data ADD COLUMN IF NOT EXISTS cor_index VARCHAR(100)`,
    `ALTER TABLE regulacao_data ADD COLUMN IF NOT EXISTS flag_aut_cotas TEXT`,
    `ALTER TABLE regulacao_data ADD COLUMN IF NOT EXISTS cor_aut_cotas VARCHAR(100)`,
    // Remover as colunas antigas flags e cor (se ainda existirem)
    `ALTER TABLE regulacao_data DROP COLUMN IF EXISTS flags`,
    `ALTER TABLE regulacao_data DROP COLUMN IF EXISTS cor`,
  ];

  for (const q of queries) {
    console.log('Executando:', q);
    await conn.execute(q);
    console.log('  OK');
  }

  console.log('\n✅ Migração concluída com sucesso!');
} catch (err) {
  console.error('❌ Erro na migração:', err.message);
} finally {
  await conn.end();
}
