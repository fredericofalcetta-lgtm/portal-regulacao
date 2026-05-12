import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { syncAndSeedIfEmpty } from "../syncSheets";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Endpoint dedicado para limpeza de check-ins via sendBeacon (beforeunload)
  // navigator.sendBeacon só suporta POST com Content-Type text/plain ou application/x-www-form-urlencoded
  app.post("/api/checkins/clear", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user?.email) {
        res.status(401).end();
        return;
      }
      const { getDb } = await import("../db");
      const { checkIns } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        await db.delete(checkIns).where(eq(checkIns.usuarioEmail, user.email));
      }
      res.status(204).end();
    } catch {
      // Silently fail — sendBeacon não processa a resposta
      res.status(204).end();
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

async function runPendingMigrations() {
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return;

    // Verifica colunas atuais da tabela
    const result = await db.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'agendas_relacionadas_config' AND TABLE_SCHEMA = DATABASE()"
    ) as unknown as [{ COLUMN_NAME: string }[], unknown];

    const colNames: string[] = result[0].map((r: { COLUMN_NAME: string }) => r.COLUMN_NAME);

    if (!colNames.includes('relacionadas_nomes')) {
      console.log('[Migration] Aplicando: adicionar relacionadas_nomes em agendas_relacionadas_config...');

      // Remover índice único de agenda_id se existir
      if (colNames.includes('agenda_id')) {
        try { await db.execute("ALTER TABLE `agendas_relacionadas_config` DROP INDEX `agendas_relacionadas_config_agenda_id_unique`"); }
        catch { /* pode não existir */ }
      }

      // Adicionar nova coluna
      await db.execute("ALTER TABLE `agendas_relacionadas_config` ADD COLUMN `relacionadas_nomes` text NOT NULL");

      // Adicionar unique em agenda_nome
      try { await db.execute("ALTER TABLE `agendas_relacionadas_config` ADD CONSTRAINT `agendas_relacionadas_config_agenda_nome_unique` UNIQUE(`agenda_nome`)"); }
      catch { /* pode já existir */ }

      // Remover colunas antigas
      for (const col of ['agenda_id', 'municipio', 'central', 'relacionadas_ids']) {
        if (colNames.includes(col)) {
          try { await db.execute(`ALTER TABLE \`agendas_relacionadas_config\` DROP COLUMN \`${col}\``); }
          catch (e) { console.warn(`[Migration] Não foi possível remover coluna ${col}:`, e); }
        }
      }

      console.log('[Migration] Concluída com sucesso!');
    } else {
      console.log('[Migration] agendas_relacionadas_config já está atualizada.');
    }

    // Migration: adicionar coluna createdAt em sem_cotas
    const colsSemCotas = await db.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sem_cotas' AND TABLE_SCHEMA = DATABASE()"
    ) as unknown as [{ COLUMN_NAME: string }[], unknown];
    const semCotasCols = colsSemCotas[0].map((r: { COLUMN_NAME: string }) => r.COLUMN_NAME);
    if (!semCotasCols.includes('createdAt')) {
      console.log('[Migration] Adicionando createdAt em sem_cotas...');
      await db.execute("ALTER TABLE sem_cotas ADD COLUMN createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP");
      console.log('[Migration] createdAt em sem_cotas OK!');
    }
    // Migration: adicionar novas_cotas e especialidade_categoria em sem_cotas
    if (!semCotasCols.includes('novas_cotas')) {
      console.log('[Migration] Adicionando novas_cotas em sem_cotas...');
      await db.execute("ALTER TABLE sem_cotas ADD COLUMN novas_cotas int NULL");
      console.log('[Migration] novas_cotas OK!');
    }
    if (!semCotasCols.includes('especialidade_categoria')) {
      console.log('[Migration] Adicionando especialidade_categoria em sem_cotas...');
      await db.execute("ALTER TABLE sem_cotas ADD COLUMN especialidade_categoria varchar(255) NULL");
      console.log('[Migration] especialidade_categoria OK!');
    }

    // Migration: criar tabela agenda_protocolos
    try {
      await db.execute(`CREATE TABLE IF NOT EXISTS agenda_protocolos (
        id int AUTO_INCREMENT PRIMARY KEY,
        agenda_nome varchar(255) NOT NULL,
        protocolos_nomes text NOT NULL,
        prioridades_nomes text NOT NULL,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY agenda_nome_unique (agenda_nome)
      )`);
      console.log('[Migration] agenda_protocolos OK!');
    } catch(e) { console.warn('[Migration] agenda_protocolos:', e); }

    // Migration: criar tabela agenda_observacoes
    try {
      await db.execute(`CREATE TABLE IF NOT EXISTS agenda_observacoes (
        id int AUTO_INCREMENT PRIMARY KEY,
        agenda_nome varchar(255) NOT NULL,
        central varchar(100) NOT NULL,
        observacao text NOT NULL,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY agenda_central (agenda_nome, central)
      )`);
      console.log('[Migration] agenda_observacoes OK!');
    } catch(e) { console.warn('[Migration] agenda_observacoes:', e); }

    // Limpeza diária: remover check-ins com mais de 24h
    try {
      await db.execute("DELETE FROM check_ins WHERE createdAt < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
      console.log('[Migration] Check-ins antigos removidos.');
    } catch(e) { console.warn('[Migration] Limpeza check-ins:', e); }
  } catch (err) {
    console.error('[Migration] Erro:', err);
  }
}

async function runDrizzleMigrations() {
  try {
    console.log('[Drizzle] Rodando migrations...');
    const { migrate } = await import('drizzle-orm/mysql2/migrator');
    const { getDb, getConnection } = await import('../db');
    const db = await getDb();
    if (!db) { console.error('[Drizzle] Banco não disponível'); return; }
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('[Drizzle] Migrations concluídas!');
  } catch (err) {
    console.error('[Drizzle] Erro nas migrations:', err);
  }
}

startServer()
  .then(() => runDrizzleMigrations())
  .then(() => runPendingMigrations())
  .then(() => syncAndSeedIfEmpty(false))
  .catch(console.error);

// Sincronização automática diária às 08:30 (horário de Brasília, UTC-3)
// Usa verificação periódica a cada 5 minutos para garantir que não perca o horário
// mesmo após reinicializações do servidor.
let lastSyncDate: string | null = null;

function getBrasiliaHourMinute(): { hour: number; minute: number; dateStr: string } {
  const now = new Date();
  // UTC-3 = subtrair 3 horas
  const brasilia = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return {
    hour: brasilia.getUTCHours(),
    minute: brasilia.getUTCMinutes(),
    dateStr: brasilia.toISOString().slice(0, 10), // YYYY-MM-DD
  };
}

async function checkAndRunDailySync() {
  const { hour, minute, dateStr } = getBrasiliaHourMinute();
  // Executar entre 08:30 e 08:34 (janela de 5 min), uma vez por dia
  if (hour === 8 && minute >= 30 && minute < 35 && lastSyncDate !== dateStr) {
    lastSyncDate = dateStr;
    console.log(`[Sync] Iniciando sincronização automática diária (${dateStr} 08:30 Brasília)...`);
    try {
      await syncAndSeedIfEmpty(true);
      console.log('[Sync] Sincronização automática concluída com sucesso!');
    } catch (err) {
      console.error('[Sync] Erro na sincronização automática:', err);
    }
  }
}

// Verificar a cada 5 minutos
setInterval(checkAndRunDailySync, 5 * 60 * 1000);
console.log('[Sync] Verificação periódica de sincronização ativada (a cada 5 min, executa às 08:30 Brasília)');
