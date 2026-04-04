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
  agendasConcluidas,
  dicionarioEspecialidades,
} from "../drizzle/schema";
import { asc, desc, eq, and, inArray } from "drizzle-orm";
import { syncSheetsToDb, syncPrioridadesToDb, syncReguladoresToDb, syncProtocolosToDb, syncDicionarioToDb } from "./syncSheets";
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
          agendas: reg.agendas,
          email: reg.email,
        },
      };
    }),
  }),

  sheets: router({
    // Buscar todos os dados da tabela regulacao_data (inclui id no índice 10)
    getData: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { rows: [], concluidasIds: [] };

      const data = await db
        .select()
        .from(regulacaoData)
        .orderBy(desc(regulacaoData.indexRegula));

      // Buscar agendas concluídas pelo usuário logado hoje
      // (para marcar na aba Regulação e bloquear reencaminhamento)
      const email = ctx.user?.email ?? "";
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const concluidasHoje = await db
        .select({ agendaId: agendasConcluidas.agendaId })
        .from(agendasConcluidas)
        .where(
          and(
            eq(agendasConcluidas.usuarioEmail, email),
            // concluidoEm é timestamp em ms; comparar com início do dia atual
            // Usamos SQL raw para comparar timestamp com data
          )
        );
      // Filtrar apenas as concluídas hoje no JavaScript (mais simples e compatível)
      const concluidasIds = concluidasHoje
        .filter(c => {
          // agendaId é o id da agenda — retornar todos (a filtragem por data é feita no frontend)
          return true;
        })
        .map(c => c.agendaId);

      // Layout de índices (novo cabeçalho a partir de 2026-03):
      // [0] agenda, [1] municipio, [2] cotas, [3] saldo, [4] aguardando,
      // [5] autorizadas, [6] autCotas, [7] indexRegula,
      // [8] aguardando28d, [9] aguardando60d, [10] aguardando90d,
      // [11] central, [12] especialidade, [13] flags, [14] cor, [15] id
      const rows = data.map(row => [
        row.agenda ?? "",          // 0
        row.municipio ?? "",       // 1
        row.cotas ?? 0,            // 2
        row.saldo ?? 0,            // 3
        row.aguardando ?? 0,       // 4
        row.autorizadas ?? 0,      // 5
        row.autCotas ?? "",        // 6
        row.indexRegula ?? 0,      // 7
        row.aguardando28d ?? 0,    // 8
        row.aguardando60d ?? 0,    // 9
        row.aguardando90d ?? 0,    // 10
        row.central ?? "",         // 11
        row.especialidade ?? "",   // 12
        row.flags ?? "",           // 13
        row.cor ?? "",             // 14: cor de destaque
        row.id,                    // 15: id para encaminhamentos e check-ins
      ]);

      return { rows, concluidasIds };
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

    // Sincronizar todos os bancos de dados de uma vez (Final + Reguladores + Dicionário)
    syncAll: protectedProcedure.mutation(async () => {
      const db = await getDb();
      const results: Record<string, number> = {};
      const errors: string[] = [];

      // 1. Aba Final (agendas)
      try {
        results.agendas = await syncSheetsToDb();
      } catch (e) {
        errors.push(`Agendas: ${e instanceof Error ? e.message : 'erro desconhecido'}`);
      }

      // 2. Aba Reguladores
      try {
        results.reguladores = await syncReguladoresToDb();
      } catch (e) {
        errors.push(`Reguladores: ${e instanceof Error ? e.message : 'erro desconhecido'}`);
      }

      // 3. Dicionário de Especialidades
      try {
        results.dicionario = await syncDicionarioToDb();
      } catch (e) {
        errors.push(`Dicionário: ${e instanceof Error ? e.message : 'erro desconhecido'}`);
      }

      if (db && errors.length > 0) {
        await db.insert(syncLog).values({
          rowCount: 0,
          status: 'error',
          message: `Erros parciais: ${errors.join('; ')}`,
        });
      }

      if (errors.length === 3) {
        throw new Error(`Falha em todas as sincronizações: ${errors.join('; ')}`);
      }

      return { success: true, results, errors };
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

  dicionario: router({
    // Buscar todo o dicionário agenda → especialidade
    getAll: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({ agenda: dicionarioEspecialidades.agenda, especialidade: dicionarioEspecialidades.especialidade })
        .from(dicionarioEspecialidades)
        .orderBy(asc(dicionarioEspecialidades.agenda));
    }),

    // Sincronizar dicionário manualmente
    sync: protectedProcedure.mutation(async () => {
      try {
        const count = await syncDicionarioToDb();
        return { success: true, count };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        throw new Error(message);
      }
    }),
  }),

  encaminhamentos: router({
    // Buscar encaminhamentos destinados ao usuário logado (com dados atualizados da agenda)
    getMinhas: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const email = ctx.user?.email ?? "";

      // Buscar encaminhamentos com JOIN na tabela de dados para pegar informações atualizadas
      // JOIN usa agendaNome + municipio + central como chave composta para evitar duplicatas.
      // IMPORTANTE: usar eq() direto (match exato) em vez de isNull()+or(), pois agendas sem
      // município têm municipio='' (string vazia, não NULL). Se usarmos isNull()+or(), o JOIN
      // faz match com TODAS as agendas de mesmo nome que também têm municipio='', causando
      // duplicação de linhas (ex: ORTOPEDIA ADULTO aparece em 16 centrais diferentes).
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
          aguardando28d: regulacaoData.aguardando28d,
          aguardando60d: regulacaoData.aguardando60d,
          aguardando90d: regulacaoData.aguardando90d,
          indexRegula: regulacaoData.indexRegula,
          flags: regulacaoData.flags,
          cor: regulacaoData.cor,
        })
        .from(encaminhamentos)
        .leftJoin(
          regulacaoData,
          and(
            eq(encaminhamentos.agendaNome, regulacaoData.agenda),
            eq(encaminhamentos.municipio, regulacaoData.municipio),
            eq(encaminhamentos.central, regulacaoData.central)
          )
        )
        .where(eq(encaminhamentos.reguladorEmail, email))
        .orderBy(desc(regulacaoData.indexRegula), desc(encaminhamentos.createdAt));

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

    // Remover um encaminhamento específico (pelo próprio regulador destinatário)
    removerMeu: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados não disponível");
        const email = ctx.user?.email ?? "";
        // Só permite remover encaminhamentos destinados ao próprio usuário
        await db
          .delete(encaminhamentos)
          .where(and(
            eq(encaminhamentos.id, input.id),
            eq(encaminhamentos.reguladorEmail, email)
          ));
        return { success: true };
      }),

    // Remover todos os encaminhamentos destinados ao usuário logado
    removerTodos: protectedProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados não disponível");
        const email = ctx.user?.email ?? "";
        await db
          .delete(encaminhamentos)
          .where(eq(encaminhamentos.reguladorEmail, email));
        return { success: true };
      }),

    // Encaminhar agenda para reguladores (admin/monitor)
    encaminhar: protectedProcedure
      .input(z.object({
        agendaId: z.number(),
        agendaNome: z.string(),
        municipio: z.string().optional(),
        central: z.string().optional(),
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
            municipio: input.municipio ?? null,
            central: input.central ?? null,
            especialidade: input.especialidade,
            reguladorEmail: reg.email,
            reguladorNome: reg.nome,
            encaminhadoPorEmail,
            encaminhadoPorNome,
          }))
        );

        return { success: true };
      }),

    // Auto-encaminhamento: regulador encaminha agenda para si mesmo (toggle)
    autoEncaminhar: protectedProcedure
      .input(z.object({
        agendaId: z.number(),
        agendaNome: z.string(),
        municipio: z.string().optional(),
        central: z.string().optional(),
        especialidade: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados não disponível");

        const email = ctx.user?.email ?? "";
        const nome = ctx.user?.name ?? "";

        // Verificar se já existe encaminhamento para este usuário nesta agenda
        const existing = await db
          .select()
          .from(encaminhamentos)
          .where(and(
            eq(encaminhamentos.agendaId, input.agendaId),
            eq(encaminhamentos.reguladorEmail, email)
          ))
          .limit(1);

        if (existing.length > 0) {
          // Já existe: remover (toggle off)
          await db
            .delete(encaminhamentos)
            .where(and(
              eq(encaminhamentos.agendaId, input.agendaId),
              eq(encaminhamentos.reguladorEmail, email)
            ));
          return { action: 'removed' };
        } else {
          // Não existe: inserir (toggle on)
          await db.insert(encaminhamentos).values({
            agendaId: input.agendaId,
            agendaNome: input.agendaNome,
            municipio: input.municipio ?? null,
            central: input.central ?? null,
            especialidade: input.especialidade,
            reguladorEmail: email,
            reguladorNome: nome,
            encaminhadoPorEmail: email,
            encaminhadoPorNome: nome,
          });
          return { action: 'added' };
        }
      }),
  }),

  checkIns: router({
    // Buscar check-ins do usuário logado (com flags atualizadas via JOIN)
    getMeus: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const email = ctx.user?.email ?? "";
      return db
        .select({
          id: checkIns.id,
          agendaId: checkIns.agendaId,
          agendaNome: checkIns.agendaNome,
          municipio: checkIns.municipio,
          especialidade: checkIns.especialidade,
          central: checkIns.central,
          // Dados numéricos atualizados via JOIN com regulacao_data
          cotas: regulacaoData.cotas,
          autorizadas: regulacaoData.autorizadas,
          autCotas: regulacaoData.autCotas,
          saldo: regulacaoData.saldo,
          aguardando: regulacaoData.aguardando,
          aguardando28d: regulacaoData.aguardando28d,
          aguardando60d: regulacaoData.aguardando60d,
          aguardando90d: regulacaoData.aguardando90d,
          indexRegula: regulacaoData.indexRegula,
          flags: regulacaoData.flags,
          cor: regulacaoData.cor,
          usuarioEmail: checkIns.usuarioEmail,
          usuarioNome: checkIns.usuarioNome,
          createdAt: checkIns.createdAt,
        })
        .from(checkIns)
        .leftJoin(
          regulacaoData,
          and(
            eq(checkIns.agendaNome, regulacaoData.agenda),
            eq(checkIns.municipio, regulacaoData.municipio),
            eq(checkIns.central, regulacaoData.central)
          )
        )
        .where(eq(checkIns.usuarioEmail, email))
        .orderBy(desc(checkIns.createdAt));
    }),

    // Buscar check-ins ativos para um conjunto de agendas (para exibir quem está regulando em Minhas Agendas)
    getPorAgendas: protectedProcedure
      .input(z.object({ agendaIds: z.array(z.number()) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db || input.agendaIds.length === 0) return {};
        const rows = await db
          .select({
            agendaId: checkIns.agendaId,
            usuarioEmail: checkIns.usuarioEmail,
            usuarioNome: checkIns.usuarioNome,
          })
          .from(checkIns)
          .where(inArray(checkIns.agendaId, input.agendaIds));
        // Agrupar por agendaId
        const grouped: Record<number, { usuarioEmail: string; usuarioNome: string }[]> = {};
        for (const row of rows) {
          if (!grouped[row.agendaId]) grouped[row.agendaId] = [];
          grouped[row.agendaId].push({ usuarioEmail: row.usuarioEmail, usuarioNome: row.usuarioNome });
        }
        return grouped;
      }),

    // Buscar todos os check-ins (para exibir na tabela)
    getAll: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          id: checkIns.id,
          agendaId: checkIns.agendaId,
          agendaNome: checkIns.agendaNome,
          municipio: checkIns.municipio,
          especialidade: checkIns.especialidade,
          central: checkIns.central,
          // Dados numéricos atualizados via JOIN com regulacao_data
          cotas: regulacaoData.cotas,
          autorizadas: regulacaoData.autorizadas,
          autCotas: regulacaoData.autCotas,
          saldo: regulacaoData.saldo,
          aguardando: regulacaoData.aguardando,
          aguardando28d: regulacaoData.aguardando28d,
          aguardando60d: regulacaoData.aguardando60d,
          aguardando90d: regulacaoData.aguardando90d,
          indexRegula: regulacaoData.indexRegula,
          flags: regulacaoData.flags,
          cor: regulacaoData.cor,
          usuarioEmail: checkIns.usuarioEmail,
          usuarioNome: checkIns.usuarioNome,
          createdAt: checkIns.createdAt,
        })
        .from(checkIns)
        .leftJoin(
          regulacaoData,
          and(
            eq(checkIns.agendaNome, regulacaoData.agenda),
            eq(checkIns.municipio, regulacaoData.municipio),
            eq(checkIns.central, regulacaoData.central)
          )
        )
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
          return { action: "checkout" as const, bloqueado: false, reguladores: [] };
        }

        // Verificar quantos check-ins existem para esta agenda (de outros usuários)
        const checkInsAgenda = await db
          .select({
            usuarioNome: checkIns.usuarioNome,
            usuarioEmail: checkIns.usuarioEmail,
          })
          .from(checkIns)
          .where(eq(checkIns.agendaId, input.agendaId));

        const LIMITE_CHECKINS = 2;
        if (checkInsAgenda.length >= LIMITE_CHECKINS) {
          // Agenda já está com o limite de reguladores ativos
          return {
            action: "bloqueado" as const,
            bloqueado: true,
            reguladores: checkInsAgenda.map(c => c.usuarioNome),
          };
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

        return { action: "checkin" as const, bloqueado: false, reguladores: [] };
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

    // Buscar agendas relacionadas (mesma especialidade + central) e recursos da especialidade
    getRelacionadas: protectedProcedure
      .input(z.object({
        especialidade: z.string(),
        central: z.string().optional(),
        agendaIdExcluir: z.number(), // excluir a agenda do próprio check-in
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { agendas: [], prioridades: [], protocolos: [] };

        // Normalizar especialidade (pode ser composta, ex: "Fisiatria, Reumatologia")
        const especialidades = input.especialidade
          .split(/[,;/]+/)
          .map(e => e.trim().toLowerCase())
          .filter(Boolean);

        // Buscar todas as agendas da mesma central
        const todasAgendas = await db
          .select()
          .from(regulacaoData)
          .orderBy(desc(regulacaoData.indexRegula));

        // Filtrar por especialidade (match parcial) e central
        const agendasRelacionadas = todasAgendas
          .filter(a => {
            if (a.id === input.agendaIdExcluir) return false;
            // Filtro por central
            if (input.central && a.central !== input.central) return false;
            // Filtro por especialidade (suporta múltiplas)
            const espAgenda = (a.especialidade ?? "").split(/[,;/]+/).map(e => e.trim().toLowerCase());
            return especialidades.some(e => espAgenda.includes(e));
          })
          .slice(0, 20) // limitar a 20 agendas
          .map(a => ({
            id: a.id,
            agenda: a.agenda,
            municipio: a.municipio,
            central: a.central,
            cotas: a.cotas,
            saldo: a.saldo,
            aguardando: a.aguardando,
            autorizadas: a.autorizadas,
            autCotas: a.autCotas,
            indexRegula: a.indexRegula,
            especialidade: a.especialidade,
            cor: a.cor,
          }));

        // Buscar prioridades da especialidade (match por grandeGrupo)
        const todasPrioridades = await db
          .select()
          .from(prioridades)
          .orderBy(asc(prioridades.nomeArquivo));

        const prioridadesRelacionadas = todasPrioridades.filter(p => {
          const grupo = (p.grandeGrupo ?? "").toLowerCase();
          return especialidades.some(e => grupo.includes(e) || e.includes(grupo));
        });

        // Buscar protocolos da especialidade (match por nome)
        const todosProtocolos = await db
          .select()
          .from(protocolos)
          .orderBy(asc(protocolos.nome));

        const protocolosRelacionados = todosProtocolos.filter(p => {
          const nome = (p.nome ?? "").toLowerCase();
          return especialidades.some(e => nome.includes(e) || e.includes(nome.split(" ")[0]));
        });

        return {
          agendas: agendasRelacionadas,
          prioridades: prioridadesRelacionadas,
          protocolos: protocolosRelacionados,
        };
      }),
  }),

  // ─── Agendas Concluídas ──────────────────────────────────────────────────────
  agendasConcluidas: router({
    // Buscar agendas concluídas do usuário logado
    getMeus: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const email = ctx.user?.email ?? "";
      return db
        .select()
        .from(agendasConcluidas)
        .where(eq(agendasConcluidas.usuarioEmail, email))
        .orderBy(desc(agendasConcluidas.concluidoEm));
    }),

    // Registrar agenda como concluída (após check-out do check-in ativo)
    concluir: protectedProcedure
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

        // 1. Fazer check-out (remover check-in ativo)
        await db
          .delete(checkIns)
          .where(and(
            eq(checkIns.agendaId, input.agendaId),
            eq(checkIns.usuarioEmail, usuarioEmail)
          ));

        // 2. Remover o encaminhamento associado (sai de "Encaminhadas para mim")
        await db
          .delete(encaminhamentos)
          .where(and(
            eq(encaminhamentos.agendaId, input.agendaId),
            eq(encaminhamentos.reguladorEmail, usuarioEmail)
          ));

        // 3. Registrar na tabela de concluídas
        await db.insert(agendasConcluidas).values({
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

        return { success: true };
      }),

    // Limpar todas as agendas concluídas do usuário
    limpar: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const email = ctx.user?.email ?? "";
      await db
        .delete(agendasConcluidas)
        .where(eq(agendasConcluidas.usuarioEmail, email));
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
