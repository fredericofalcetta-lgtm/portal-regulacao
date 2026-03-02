import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { regulacaoData, syncLog } from "../drizzle/schema";
import { desc } from "drizzle-orm";
import { syncSheetsToDb } from "./syncSheets";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  sheets: router({
    // Buscar todos os dados da tabela regulacao_data
    getData: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { rows: [] };

      const data = await db
        .select()
        .from(regulacaoData)
        .orderBy(desc(regulacaoData.indexRegula));

      // Converter para o formato esperado pelo frontend (array de arrays)
      const rows = data.map(row => [
        row.agenda ?? "",
        row.municipio ?? "",
        row.cotas ?? 0,
        row.saldo ?? 0,
        row.aguardando ?? 0,
        row.autorizadas ?? 0,
        row.autCotas ?? "",
        row.indexRegula ?? 0,
        row.central ?? "",
        row.especialidade ?? "",
      ]);

      return { rows };
    }),

    // Sincronizar dados manualmente
    sync: publicProcedure.mutation(async () => {
      try {
        const count = await syncSheetsToDb();
        return { success: true, count };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        const db = await getDb();
        if (db) {
          await db.insert(syncLog).values({
            rowCount: 0,
            status: "error",
            message,
          });
        }
        throw error;
      }
    }),

    // Buscar histórico de sincronizações
    getSyncHistory: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(syncLog)
        .orderBy(desc(syncLog.syncedAt))
        .limit(10);
    }),
  }),
});

export type AppRouter = typeof appRouter;
