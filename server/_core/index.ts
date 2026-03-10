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

startServer()
  .then(() => syncAndSeedIfEmpty(false))
  .catch(console.error);

// Sincronização automática diária às 08:30
function scheduleDailySync() {
  const now = new Date();
  const next = new Date();
  next.setHours(8, 30, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const msUntilNext = next.getTime() - now.getTime();

  console.log(`[Sync] Próxima sincronização agendada para: ${next.toLocaleString('pt-BR')}`);

  setTimeout(async () => {
    console.log('[Sync] Iniciando sincronização automática diária...');
    try {
      await syncAndSeedIfEmpty(true);
      console.log('[Sync] Sincronização automática concluída com sucesso!');
    } catch (err) {
      console.error('[Sync] Erro na sincronização automática:', err);
    }
    scheduleDailySync(); // Reagendar para o próximo dia
  }, msUntilNext);
}

scheduleDailySync();
