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
  reguladorConfig,
  agendasFavoritas,
  agendasRelacionadasConfig,
  semCotas,
} from "../drizzle/schema";
import { asc, desc, eq, and, inArray } from "drizzle-orm";
import { syncSheetsToDb, syncPrioridadesToDb, syncDicionarioToDb, syncSemCotasToDb } from "./syncSheets";
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

      // Layout de índices (novo cabeçalho a partir de 2026-04):
      // [0] agenda, [1] municipio, [2] cotas, [3] saldo, [4] aguardando,
      // [5] autorizadas, [6] autCotas, [7] indexRegula,
      // [8] aguardando28d, [9] aguardando60d, [10] aguardando90d,
      // [11] central, [12] especialidade,
      // [13] flagIndex, [14] corIndex, [15] flagAutCotas, [16] corAutCotas, [17] id
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
        row.flagIndex ?? "",       // 13: flag/tooltip do IndexRegula
        row.corIndex ?? "",        // 14: cor para colorir a linha
        row.flagAutCotas ?? "",    // 15: flag/tooltip do Aut/Cotas
        row.corAutCotas ?? "",     // 16: cor para colorir o valor Aut/Cotas
        row.id,                    // 17: id para encaminhamentos e check-ins
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

       // 2. Dicionário de Especialidades
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

    // Buscar data/hora da última sincronização bem-sucedida
    getUltimaAtualizacao: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select({ syncedAt: syncLog.syncedAt, rowCount: syncLog.rowCount })
        .from(syncLog)
        .where(eq(syncLog.status, 'success'))
        .orderBy(desc(syncLog.syncedAt))
        .limit(1);
      return rows[0] ?? null;
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
    // Criar protocolo manualmente
    criar: protectedProcedure
      .input(z.object({
        nome: z.string().min(1).max(500),
        linkUrl: z.string().url().optional().or(z.literal('')),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Banco indisponível');
        const userEmail = ctx.user?.email ?? '';
        const meReg = await db.select({ perfil: reguladores.perfil }).from(reguladores).where(eq(reguladores.email, userEmail)).limit(1);
        const perfil = meReg[0]?.perfil?.toLowerCase() ?? '';
        if (!['administrador', 'admin', 'monitor', 'monitoramento'].some(p => perfil.includes(p))) {
          throw new Error('Sem permissão para criar protocolos');
        }
        await db.insert(protocolos).values({
          nome: input.nome,
          linkUrl: input.linkUrl || null,
        });
        return { success: true };
      }),
    // Atualizar protocolo
    atualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).max(500),
        linkUrl: z.string().url().optional().or(z.literal('')),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Banco indisponível');
        const userEmail = ctx.user?.email ?? '';
        const meReg = await db.select({ perfil: reguladores.perfil }).from(reguladores).where(eq(reguladores.email, userEmail)).limit(1);
        const perfil = meReg[0]?.perfil?.toLowerCase() ?? '';
        if (!['administrador', 'admin', 'monitor', 'monitoramento'].some(p => perfil.includes(p))) {
          throw new Error('Sem permissão para editar protocolos');
        }
        await db.update(protocolos)
          .set({ nome: input.nome, linkUrl: input.linkUrl || null })
          .where(eq(protocolos.id, input.id));
        return { success: true };
      }),
    // Excluir protocolo
    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Banco indisponível');
        const userEmail = ctx.user?.email ?? '';
        const meReg = await db.select({ perfil: reguladores.perfil }).from(reguladores).where(eq(reguladores.email, userEmail)).limit(1);
        const perfil = meReg[0]?.perfil?.toLowerCase() ?? '';
        if (!['administrador', 'admin', 'monitor', 'monitoramento'].some(p => perfil.includes(p))) {
          throw new Error('Sem permissão para excluir protocolos');
        }
        await db.delete(protocolos).where(eq(protocolos.id, input.id));
        return { success: true };
      }),
    // Sincronização via planilha desativada — protocolos gerenciados pelo portal
    sync: protectedProcedure.mutation(async () => {
      return { success: false, message: "Sincronização de protocolos via planilha foi desativada. Use o portal para gerenciar protocolos." };
    }),
  }),

  reguladores: router({
    // Sincronização de reguladores via planilha foi desativada.
    // Reguladores são agora gerenciados diretamente pelo portal.
    sync: protectedProcedure.mutation(async () => {
      return { success: false, message: "Sincronização de reguladores via planilha foi desativada. Use o portal para gerenciar reguladores." };
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
    // Inclui agendas favoritas do regulador como encaminhamentos virtuais (isFavorita=true).
    getMinhas: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const email = ctx.user?.email ?? "";

      // 1. Buscar encaminhamentos reais com JOIN na tabela de dados
      // JOIN usa agendaNome + municipio + central como chave composta para evitar duplicatas.
      // IMPORTANTE: usar eq() direto (match exato) em vez de isNull()+or(), pois agendas sem
      // município têm municipio='' (string vazia, não NULL). Se usarmos isNull()+or(), o JOIN
      // faz match com TODAS as agendas de mesmo nome que também têm municipio='', causando
      // duplicação de linhas (ex: ORTOPEDIA ADULTO aparece em 16 centrais diferentes).
      const encResult = await db
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
          autorizadas: regulacaoData.autorizadas,
          autCotas: regulacaoData.autCotas,
          indexRegula: regulacaoData.indexRegula,
          flagIndex: regulacaoData.flagIndex,
          corIndex: regulacaoData.corIndex,
          flagAutCotas: regulacaoData.flagAutCotas,
          corAutCotas: regulacaoData.corAutCotas,
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

      // 2. Buscar agendas favoritas do regulador com dados atualizados via JOIN
      const favResult = await db
        .select({
          favId: agendasFavoritas.id,
          agendaId: agendasFavoritas.agendaId,
          agendaNome: agendasFavoritas.agendaNome,
          especialidade: agendasFavoritas.especialidade,
          // Dados atualizados da agenda via JOIN
          municipio: regulacaoData.municipio,
          central: regulacaoData.central,
          cotas: regulacaoData.cotas,
          saldo: regulacaoData.saldo,
          aguardando: regulacaoData.aguardando,
          aguardando28d: regulacaoData.aguardando28d,
          aguardando60d: regulacaoData.aguardando60d,
          aguardando90d: regulacaoData.aguardando90d,
          autorizadas: regulacaoData.autorizadas,
          autCotas: regulacaoData.autCotas,
          indexRegula: regulacaoData.indexRegula,
          flagIndex: regulacaoData.flagIndex,
          corIndex: regulacaoData.corIndex,
          flagAutCotas: regulacaoData.flagAutCotas,
          corAutCotas: regulacaoData.corAutCotas,
        })
        .from(agendasFavoritas)
        .leftJoin(
          regulacaoData,
          and(
            eq(agendasFavoritas.agendaNome, regulacaoData.agenda),
            eq(agendasFavoritas.municipio, regulacaoData.municipio),
            eq(agendasFavoritas.central, regulacaoData.central)
          )
        )
        .where(eq(agendasFavoritas.reguladorEmail, email));

      // 3. Converter favoritas para o mesmo formato dos encaminhamentos
      // IDs negativos para distinguir de encaminhamentos reais no frontend
      const encIds = new Set(encResult.map(e => e.agendaId));
      const favAsEnc = favResult
        .filter(f => !encIds.has(f.agendaId)) // não duplicar se já encaminhada
        .map(f => ({
          id: -(f.favId),          // ID negativo = favorita
          agendaId: f.agendaId,
          agendaNome: f.agendaNome,
          especialidade: f.especialidade ?? "",
          reguladorEmail: email,
          reguladorNome: "",
          encaminhadoPorEmail: "favorita",
          encaminhadoPorNome: "Favorita",
          createdAt: new Date(),
          municipio: f.municipio,
          central: f.central,
          cotas: f.cotas,
          saldo: f.saldo,
          aguardando: f.aguardando,
          aguardando28d: f.aguardando28d,
          aguardando60d: f.aguardando60d,
          aguardando90d: f.aguardando90d,
          autorizadas: f.autorizadas,
          autCotas: f.autCotas,
          indexRegula: f.indexRegula,
          flagIndex: f.flagIndex,
          corIndex: f.corIndex,
          flagAutCotas: f.flagAutCotas,
          corAutCotas: f.corAutCotas,
        }));

      // 4. Combinar: encaminhamentos reais primeiro, depois favoritas
      return [...encResult, ...favAsEnc];
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
          flagIndex: regulacaoData.flagIndex,
          corIndex: regulacaoData.corIndex,
          flagAutCotas: regulacaoData.flagAutCotas,
          corAutCotas: regulacaoData.corAutCotas,
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
          flagIndex: regulacaoData.flagIndex,
          corIndex: regulacaoData.corIndex,
          flagAutCotas: regulacaoData.flagAutCotas,
          corAutCotas: regulacaoData.corAutCotas,
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

    // Buscar agendas relacionadas (mesma especialidade + central/municipio) e recursos da especialidade
    getRelacionadas: protectedProcedure
      .input(z.object({
        especialidade: z.string(),
        central: z.string().optional(),
        municipio: z.string().optional(),
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

        // Verificar se há configuração personalizada de agendas relacionadas
        const configPersonalizada = await db
          .select()
          .from(agendasRelacionadasConfig)
          .where(eq(agendasRelacionadasConfig.agendaId, input.agendaIdExcluir))
          .limit(1);

        // Buscar todas as agendas do banco
        const todasAgendas = await db
          .select()
          .from(regulacaoData)
          .orderBy(desc(regulacaoData.indexRegula));

        let agendasRelacionadas;

        if (configPersonalizada.length > 0) {
          // Usar IDs configurados manualmente
          let idsConfigurados: number[] = [];
          try { idsConfigurados = JSON.parse(configPersonalizada[0].relacionadasIds); } catch { idsConfigurados = []; }

          agendasRelacionadas = todasAgendas
            .filter(a => idsConfigurados.includes(a.id))
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
              corIndex: a.corIndex,
              flagIndex: a.flagIndex,
              flagAutCotas: a.flagAutCotas,
              corAutCotas: a.corAutCotas,
            }));
        } else {
          // Comportamento padrão: filtrar por especialidade e, se disponível, por região (municipio ou central)
          agendasRelacionadas = todasAgendas
            .filter(a => {
              if (a.id === input.agendaIdExcluir) return false;
              // Filtrar por central se informada
              if (input.central && a.central !== input.central) return false;
              // Filtrar por município se informado (e sem central)
              if (!input.central && input.municipio && a.municipio !== input.municipio) return false;
              const espAgenda = (a.especialidade ?? "").split(/[,;/]+/).map(e => e.trim().toLowerCase());
              return especialidades.some(e => espAgenda.includes(e));
            })
            .slice(0, 20)
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
              corIndex: a.corIndex,
              flagIndex: a.flagIndex,
              flagAutCotas: a.flagAutCotas,
              corAutCotas: a.corAutCotas,
            }));
        }

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

  // ─── Configuração de Reguladores (admin/monitor) ────────────────────────────
  reguladorConfig: router({
    /**
     * Listar todos os reguladores com suas configurações (especialidades + agendas filtro + favoritas).
     * Acessível apenas por admin/monitor.
     */
    listarTodos: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      // Buscar todos os reguladores ativos
      const regs = await db
        .select()
        .from(reguladores)
        .where(eq(reguladores.ativo, "sim"))
        .orderBy(asc(reguladores.nome));

      // Buscar todas as configs
      const configs = await db.select().from(reguladorConfig);
      const configMap = new Map(configs.map(c => [c.reguladorEmail, c]));

      // Buscar todas as favoritas agrupadas por email
      const favs = await db.select().from(agendasFavoritas);
      const favMap = new Map<string, typeof favs>();
      for (const fav of favs) {
        if (!favMap.has(fav.reguladorEmail)) favMap.set(fav.reguladorEmail, []);
        favMap.get(fav.reguladorEmail)!.push(fav);
      }

      return regs.map(reg => {
        const config = configMap.get(reg.email);
        const favoritas = favMap.get(reg.email) ?? [];
        return {
          id: reg.id,
          nome: reg.nome,
          email: reg.email,
          perfil: reg.perfil,
          vinculo: reg.vinculo,
          especialidades: config?.especialidades ?? "",
          agendasFiltro: config?.agendasFiltro ?? "",
          favoritas: favoritas.map(f => ({
            id: f.id,
            agendaId: f.agendaId,
            agendaNome: f.agendaNome,
            municipio: f.municipio ?? "",
            central: f.central ?? "",
            especialidade: f.especialidade ?? "",
          })),
        };
      });
    }),

    /**
     * Atualizar especialidades e agendas filtro de um regulador.
     */
    atualizarConfig: protectedProcedure
      .input(z.object({
        reguladorEmail: z.string().email(),
        especialidades: z.string(),
        agendasFiltro: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados não disponível");

        // Upsert: inserir ou atualizar
        const existing = await db
          .select()
          .from(reguladorConfig)
          .where(eq(reguladorConfig.reguladorEmail, input.reguladorEmail))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(reguladorConfig)
            .set({
              especialidades: input.especialidades,
              agendasFiltro: input.agendasFiltro,
            })
            .where(eq(reguladorConfig.reguladorEmail, input.reguladorEmail));
        } else {
          await db.insert(reguladorConfig).values({
            reguladorEmail: input.reguladorEmail,
            especialidades: input.especialidades,
            agendasFiltro: input.agendasFiltro,
          });
        }

        return { success: true };
      }),

    /**
     * Adicionar agenda favorita para um regulador.
     */
    adicionarFavorita: protectedProcedure
      .input(z.object({
        reguladorEmail: z.string().email(),
        agendaId: z.number(),
        agendaNome: z.string(),
        municipio: z.string().optional(),
        central: z.string().optional(),
        especialidade: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados não disponível");

        // Verificar se já existe
        const existing = await db
          .select()
          .from(agendasFavoritas)
          .where(and(
            eq(agendasFavoritas.reguladorEmail, input.reguladorEmail),
            eq(agendasFavoritas.agendaId, input.agendaId)
          ))
          .limit(1);

        if (existing.length > 0) return { success: true, alreadyExists: true };

        await db.insert(agendasFavoritas).values({
          reguladorEmail: input.reguladorEmail,
          agendaId: input.agendaId,
          agendaNome: input.agendaNome,
          municipio: input.municipio ?? "",
          central: input.central ?? "",
          especialidade: input.especialidade ?? "",
        });

        return { success: true, alreadyExists: false };
      }),

    /**
     * Remover agenda favorita de um regulador.
     */
    removerFavorita: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados não disponível");
        await db.delete(agendasFavoritas).where(eq(agendasFavoritas.id, input.id));
        return { success: true };
      }),

    /**
     * Atualizar o perfil de um regulador (regulador | monitoramento | administrador).
     * Apenas admin e monitor podem alterar perfis.
     */
    atualizarPerfil: protectedProcedure
      .input(z.object({
        reguladorEmail: z.string().email(),
        // Aceita string livre para suportar múltiplos perfis separados por vírgula
        // ex: "regulador, monitoramento" ou apenas "administrador"
        perfil: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error('Banco de dados não disponível');
        // Verificar se o usuário logado é admin ou monitor
        const userEmail = ctx.user?.email ?? '';
        const meReg = await db.select({ perfil: reguladores.perfil })
          .from(reguladores)
          .where(eq(reguladores.email, userEmail))
          .limit(1);
        const meuPerfil = (meReg[0]?.perfil ?? '').toLowerCase();
        const temPermissao = meuPerfil.includes('administrador') || meuPerfil.includes('monitoramento');
        if (!temPermissao) throw new Error('Sem permissão para alterar perfis');
        await db.update(reguladores)
          .set({ perfil: input.perfil })
          .where(eq(reguladores.email, input.reguladorEmail));
        return { success: true };
      }),

    /**
     * Buscar configuração do regulador logado (para aplicar filtros na aba Regulação).
     */
    meuConfig: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const email = ctx.user?.email ?? "";

      const config = await db
        .select()
        .from(reguladorConfig)
        .where(eq(reguladorConfig.reguladorEmail, email))
        .limit(1);

      const favoritas = await db
        .select()
        .from(agendasFavoritas)
        .where(eq(agendasFavoritas.reguladorEmail, email));

      return {
        especialidades: config[0]?.especialidades ?? "",
        agendasFiltro: config[0]?.agendasFiltro ?? "",
        favoritas: favoritas.map(f => ({
          id: f.id,
          agendaId: f.agendaId,
          agendaNome: f.agendaNome,
          municipio: f.municipio ?? "",
          central: f.central ?? "",
          especialidade: f.especialidade ?? "",
        })),
      };
    }),

    /**
     * Criar um novo regulador manualmente (sem depender da planilha).
     * Apenas admin/monitor podem criar.
     */
    criar: protectedProcedure
      .input(z.object({
        nome: z.string().min(2, "Nome muito curto"),
        email: z.string().email("E-mail inválido"),
        perfil: z.string().default("regulador"),
        vinculo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco indisponível");
        // Verificar se o e-mail já existe
        const existing = await db
          .select({ id: reguladores.id })
          .from(reguladores)
          .where(eq(reguladores.email, input.email))
          .limit(1);
        if (existing.length > 0) {
          throw new Error("Já existe um regulador com este e-mail");
        }
        await db.insert(reguladores).values({
          nome: input.nome,
          email: input.email,
          perfil: input.perfil,
          vinculo: input.vinculo ?? null,
          ativo: "sim",
        });
        return { success: true };
      }),

    /**
     * Excluir (desativar) um regulador pelo ID.
     * Apenas admin/monitor podem excluir.
     */
    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco indisponível");
        await db
          .update(reguladores)
          .set({ ativo: "nao" })
          .where(eq(reguladores.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Agendas Relacionadas Config ─────────────────────────────────────────────
  agendasRelacionadas: router({
    /**
     * Buscar configuração de agendas relacionadas para uma agenda específica.
     * Se não houver configuração salva, retorna todas as agendas da mesma especialidade.
     */
    getConfig: protectedProcedure
      .input(z.object({
        agendaId: z.number(),
        especialidade: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { relacionadas: [], usandoPadrao: true };

        // Verificar se há configuração salva
        const config = await db
          .select()
          .from(agendasRelacionadasConfig)
          .where(eq(agendasRelacionadasConfig.agendaId, input.agendaId))
          .limit(1);

        if (config.length > 0) {
          // Retornar IDs configurados
          let ids: number[] = [];
          try { ids = JSON.parse(config[0].relacionadasIds); } catch { ids = []; }
          return { relacionadas: ids, usandoPadrao: false };
        }

        // Sem configuração: retornar todas da mesma especialidade
        const todasEspecialidade = await db
          .select({ id: regulacaoData.id })
          .from(regulacaoData)
          .where(eq(regulacaoData.especialidade, input.especialidade));

        const ids = todasEspecialidade
          .map(r => r.id)
          .filter(id => id !== input.agendaId);

        return { relacionadas: ids, usandoPadrao: true };
      }),

    /**
     * Listar todas as configurações de agendas relacionadas (para a aba de administração).
     */
    listarConfigs: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(agendasRelacionadasConfig)
        .orderBy(asc(agendasRelacionadasConfig.agendaNome));
    }),

    /**
     * Salvar/atualizar configuração de agendas relacionadas para uma agenda.
     */
    salvarConfig: protectedProcedure
      .input(z.object({
        agendaId: z.number(),
        agendaNome: z.string(),
        municipio: z.string().optional(),
        central: z.string().optional(),
        especialidade: z.string().optional(),
        relacionadasIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados não disponível");

        const existing = await db
          .select()
          .from(agendasRelacionadasConfig)
          .where(eq(agendasRelacionadasConfig.agendaId, input.agendaId))
          .limit(1);

        const idsJson = JSON.stringify(input.relacionadasIds);

        if (existing.length > 0) {
          await db
            .update(agendasRelacionadasConfig)
            .set({ relacionadasIds: idsJson })
            .where(eq(agendasRelacionadasConfig.agendaId, input.agendaId));
        } else {
          await db.insert(agendasRelacionadasConfig).values({
            agendaId: input.agendaId,
            agendaNome: input.agendaNome,
            municipio: input.municipio ?? "",
            central: input.central ?? "",
            especialidade: input.especialidade ?? "",
            relacionadasIds: idsJson,
          });
        }

        return { success: true };
      }),

    /**
     * Resetar configuração de uma agenda (voltar ao padrão: todas da mesma especialidade).
     */
    resetarConfig: protectedProcedure
      .input(z.object({ agendaId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados não disponível");
        await db
          .delete(agendasRelacionadasConfig)
          .where(eq(agendasRelacionadasConfig.agendaId, input.agendaId));
        return { success: true };
      }),

    /**
     * Listar todas as agendas disponíveis (para o dropdown de seleção).
     */
      listarTodasAgendas: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const agendas = await db
        .select({
          id: regulacaoData.id,
          agenda: regulacaoData.agenda,
          municipio: regulacaoData.municipio,
          central: regulacaoData.central,
          especialidade: regulacaoData.especialidade,
        })
        .from(regulacaoData)
        .orderBy(asc(regulacaoData.agenda));
      // Deduplica por nome+municipio+central
      const seen = new Set<string>();
      return agendas.filter(a => {
        const key = `${a.agenda}|${a.municipio}|${a.central}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }),
  }),

  // ─── Sem Cotas (admin/monitor) ───────────────────────────────────────────────
  semCotas: router({
    /**
     * Listar todos os registros da aba Sem Cotas com filtros opcionais.
     */
    listar: protectedProcedure
      .input(z.object({
        central: z.string().optional(),
        especialidade: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { rows: [], novas: [] };

        const rows = await db
          .select()
          .from(semCotas)
          .orderBy(asc(semCotas.central), asc(semCotas.especialidade));

        // Aplicar filtros em memória
        const filtered = rows.filter(r => {
          if (input.central && r.central !== input.central) return false;
          if (input.especialidade) {
            const esp = (r.especialidade ?? '').toLowerCase();
            if (!esp.includes(input.especialidade.toLowerCase())) return false;
          }
          return true;
        });

        const novas = filtered.filter(r => r.isNova === 'sim');
        return { rows: filtered, novas };
      }),

    /**
     * Sincronizar manualmente a aba Sem Cotas.
     */
    sincronizar: protectedProcedure.mutation(async () => {
      const count = await syncSemCotasToDb();
      return { count };
    }),

    /**
     * Retorna os valores únicos de Central e Especialidade para os filtros.
     */
    getFiltros: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { centrais: [], especialidades: [] };

      const rows = await db
        .select({
          central: semCotas.central,
          especialidade: semCotas.especialidade,
        })
        .from(semCotas);

      const centraisSet = new Set<string>();
      const especialidadesSet = new Set<string>();
      for (const r of rows) {
        if (r.central) centraisSet.add(r.central);
        if (r.especialidade) especialidadesSet.add(r.especialidade);
      }

      // Ordenar centrais na ordem padrão: CRA, 1CRS..18CRS
      const ordemCentral = ['CRA','1CRS','2CRS','3CRS','4CRS','5CRS','6CRS','7CRS','8CRS','9CRS','10CRS','11CRS','12CRS','13CRS','14CRS','15CRS','16CRS','17CRS','18CRS'];
      const centrais = Array.from(centraisSet).sort((a, b) => {
        const ia = ordemCentral.indexOf(a);
        const ib = ordemCentral.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });

      const especialidades = Array.from(especialidadesSet).sort();
      return { centrais, especialidades };
    }),
  }),
});
export type AppRouter = typeof appRouter;
