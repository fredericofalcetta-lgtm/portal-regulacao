import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('Criando tabela regulador_config...');
await conn.execute(`
  CREATE TABLE IF NOT EXISTS regulador_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    regulador_email VARCHAR(320) NOT NULL UNIQUE,
    especialidades TEXT,
    agendas_filtro TEXT,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
  )
`);
console.log('✅ regulador_config criada');

console.log('Criando tabela agendas_favoritas...');
await conn.execute(`
  CREATE TABLE IF NOT EXISTS agendas_favoritas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    regulador_email VARCHAR(320) NOT NULL,
    agenda_id INT NOT NULL,
    agenda_nome VARCHAR(255) NOT NULL,
    municipio VARCHAR(255),
    central VARCHAR(100),
    especialidade VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE KEY unique_favorita (regulador_email, agenda_id)
  )
`);
console.log('✅ agendas_favoritas criada');

await conn.end();
console.log('Migração concluída!');
