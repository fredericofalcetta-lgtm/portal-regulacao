import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  regulacaoData,
  syncLog,
  prioridades,
  reguladores,
  protocolos,
  encaminhamentos,
  checkIns,
} from "../drizzle/schema";
import { asc, desc, eq, and } from "drizzle-orm";
import { syncSheetsToDb, syncPrioridadesToDb, syncReguladoresToDb, syncProtocolosToDb } from "./syncSheets";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    /**
     * Verifica se o usuário autenticado está na lista de reguladores autorizados.
     * Retorna o perfil do regulador se autorizado, ou null se não autorizado.
     */
    checkAccess: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { authorized: false, regulador: null };

      const userEmail = ctx.user?.email?.toLowerCase();
      if (!userEmail) return { authorized: false, regulador: null };

      const result = await db
        .select()
        .from(reguladores)
        .where(eq(reguladores.email, userEmail))
        .limit(1);

      if (result.length === 0) {
        return { authorized: false, regulador: null };
      }

      const reg = result[0];
      return {
        authorized: reg.ativo === "sim",
        regulador: {
          nome: reg.nome,
          perfil: reg.perfil,
          grandeGrupo: reg.grandeGrupo,
          email: reg.email,
        },
      };
    }),
  }),

  sheets: router({
    // Buscar todos os dados da tabela regulacao_data (inclui id no índice 10)
    getData: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { rows: [] };

      const data = await db
        .select()
        .from(regulacaoData)
        .orderBy(desc(regulacaoData.indexRegula));

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
        row.id, // índice 10: id da linha para encaminhamentos e check-ins
      ]);

      return { rows };
    }),

    // Sincronizar dados manualmente
    sync: protectedProcedure.mutation(async () => {
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
    getSyncHistory: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(syncLog)
        .orderBy(desc(syncLog.syncedAt))
        .limit(10);
    }),
  }),

  prioridades: router({
    // Buscar todas as listas de prioridades
    getAll: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(prioridades)
        .orderBy(asc(prioridades.grandeGrupo), asc(prioridades.nomeArquivo));
    }),

    // Sincronizar prioridades manualmente
    sync: protectedProcedure.mutation(async () => {
      try {
        const count = await syncPrioridadesToDb();
        return { success: true, count };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        throw new Error(message);
      }
    }),
  }),

  protocolos: router({
    // Buscar todos os protocolos
    getAll: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(protocolos)
        .orderBy(asc(protocolos.nome));
    }),

    // Sincronizar protocolos manualmente
    sync: protectedProcedure.mutation(async () => {
      try {
        const count = await syncProtocolosToDb();
        return { success: true, count };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        throw new Error(message);
      }
    }),
  }),

  reguladores: router({
    // Sincronizar reguladores manualmente
    sync: protectedProcedure.mutation(async () => {
      try {
        const count = await syncReguladoresToDb();
        return { success: true, count };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        throw new Error(message);
      }
    }),

    // Listar todos os usuários ativos cadastrados (para encaminhamento por Admin/Monitor)
    listarReguladores: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({ nome: reguladores.nome, email: reguladores.email, perfil: reguladores.perfil })
        .from(reguladores)
        .where(eq(reguladores.ativo, "sim"))
        .orderBy(asc(reguladores.nome));
    }),
  }),

  encaminhamentos: router({
    // Buscar encaminhamentos destinados ao usuário logado (com dados atualizados da agenda)
    getMinhas: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const email = ctx.user?.email ?? "";

      // Buscar encaminhamentos com JOIN na tabela de dados para pegar informações atualizadas
      const result = await db
        .select({
          id: encaminhamentos.id,
          agendaId: encaminhamentos.agendaId,
          agendaNome: encaminhamentos.agendaNome,
          especialidade: encaminhamentos.especialidade,
          reguladorEmail: encaminhamentos.reguladorEmail,
          reguladorNome: encaminhamentos.reguladorNome,
          encaminhadoPorEmail: encaminhamentos.encaminhadoPorEmail,
          encaminhadoPorNome: encaminhamentos.encaminhadoPorNome,
          createdAt: encaminhamentos.createdAt,
          // Dados atualizados da agenda via JOIN
          municipio: regulacaoData.municipio,
          central: regulacaoData.central,
          cotas: regulacaoData.cotas,
          saldo: regulacaoData.saldo,
          aguardando: regulacaoData.aguardando,
          indexRegula: regulacaoData.indexRegula,
        })
        .from(encaminhamentos)
        .leftJoin(regulacaoData, eq(encaminhamentos.agendaId, regulacaoData.id))
        .where(eq(encaminhamentos.reguladorEmail, email))
        .orderBy(desc(encaminhamentos.createdAt));

      return result;
    }),

    // Buscar todos os encaminhamentos (carregado uma vez para a tabela)
    getAll: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(encaminhamentos)
        .orderBy(desc(encaminhamentos.createdAt));
    }),

    // Encaminhar agenda para reguladores (admin/monitor)
    encaminhar: protectedProcedure
      .input(z.object({
        agendaId: z.number(),
        agendaNome: z.string(),
        especialidade: z.string(),
        reguladores: z.array(z.object({
          email: z.string(),
          nome: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados não disponível");

        const encaminhadoPorEmail = ctx.user?.email ?? "";
        const encaminhadoPorNome = ctx.user?.name ?? "";

        // Remover encaminhamentos anteriores desta agenda
        await db
          .delete(encaminhamentos)
          .where(eq(encaminhamentos.agendaId, input.agendaId));

        if (input.reguladores.length === 0) return { success: true };

        // Inserir novos encaminhamentos
        await db.insert(encaminhamentos).values(
          input.reguladores.map(reg => ({
            agendaId: input.agendaId,
            agendaNome: input.agendaNome,
            especialidade: input.especialidade,
            reguladorEmail: reg.email,
            reguladorNome: reg.nome,
            encaminhadoPorEmail,
            encaminhadoPorNome,
          }))
        );

        return { success: true };
      }),
  }),

  checkIns: router({
    // Buscar check-ins do usuário logado
    getMeus: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const email = ctx.user?.email ?? "";
      return db
        .select()
        .from(checkIns)
        .where(eq(checkIns.usuarioEmail, email))
        .orderBy(desc(checkIns.createdAt));
    }),

    // Buscar todos os check-ins (para exibir na tabela)
    getAll: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(checkIns)
        .orderBy(desc(checkIns.createdAt));
    }),

    // Fazer check-in ou check-out em uma agenda (toggle)
    checkIn: protectedProcedure
      .input(z.object({
        agendaId: z.number(),
        agendaNome: z.string(),
        municipio: z.string().optional(),
        especialidade: z.string(),
        central: z.string().optional(),
        cotas: z.number().optional(),
        saldo: z.number().optional(),
        aguardando: z.number().optional(),
        indexRegula: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados não disponível");

        const usuarioEmail = ctx.user?.email ?? "";
        const usuarioNome = ctx.user?.name ?? "";

        // Verificar se já existe check-in desta agenda para este usuário
        const existing = await db
          .select()
          .from(checkIns)
          .where(and(
            eq(checkIns.agendaId, input.agendaId),
            eq(checkIns.usuarioEmail, usuarioEmail)
          ))
          .limit(1);

        if (existing.length > 0) {
          // Já tem check-in: fazer check-out (remover)
          await db
            .delete(checkIns)
            .where(and(
              eq(checkIns.agendaId, input.agendaId),
              eq(checkIns.usuarioEmail, usuarioEmail)
            ));
          return { action: "checkout" as const };
        }

        // Fazer check-in
        await db.insert(checkIns).values({
          agendaId: input.agendaId,
          agendaNome: input.agendaNome,
          municipio: input.municipio,
          especialidade: input.especialidade,
          central: input.central,
          cotas: input.cotas,
          saldo: input.saldo,
          aguardando: input.aguardando,
          indexRegula: input.indexRegula,
          usuarioEmail,
          usuarioNome,
        });

        return { action: "checkin" as const };
      }),

    // Remover todos os check-ins do usuário (chamado no logout)
    clearMeus: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const email = ctx.user?.email ?? "";
      await db
        .delete(checkIns)
        .where(eq(checkIns.usuarioEmail, email));
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
