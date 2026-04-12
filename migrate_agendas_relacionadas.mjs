import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS agendas_relacionadas_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      agenda_id INT NOT NULL UNIQUE,
      agenda_nome VARCHAR(255) NOT NULL,
      municipio VARCHAR(255),
      central VARCHAR(100),
      especialidade VARCHAR(255),
      relacionadas_ids TEXT NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
    )
  `);
  console.log('✅ Tabela agendas_relacionadas_config criada com sucesso!');
} catch (err) {
  console.error('❌ Erro:', err.message);
} finally {
  await conn.end();
}
