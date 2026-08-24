#!/usr/bin/env python3
"""
Aplica as edições da feature "Condutas GERCON" nos arquivos JÁ EXISTENTES
do repositório portal-regulacao.

Como usar:
1. Coloque este script na RAIZ do repositório (mesmo nível de package.json).
2. Antes de rodar, crie os 3 arquivos novos (não editados por este script):
     - server/syncMetabase.ts   (copie o conteúdo enviado)
     - server/gerconQuery.sql   (copie o conteúdo enviado e depois cole sua SQL real)
     - client/src/pages/CondutasGercon.tsx  (copie o conteúdo enviado)
3. Rode:  python3 apply_gercon_feature.py
4. Revise o `git diff`, comite e faça o deploy normalmente pelo Railway.

O script é idempotente: se um trecho já foi aplicado, ele avisa e não duplica.
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent


def apply_edit(rel_path: str, old: str, new: str, label: str) -> None:
    path = ROOT / rel_path
    if not path.exists():
        print(f"[ERRO] Arquivo não encontrado: {rel_path}")
        sys.exit(1)

    text = path.read_text(encoding="utf-8")

    if new in text:
        print(f"[OK] Já aplicado — {label} ({rel_path})")
        return

    if old not in text:
        print(f"[ERRO] Trecho esperado não encontrado em {rel_path} — {label}")
        print("       O arquivo pode ter mudado desde a última vez. Aplique manualmente esse trecho.")
        sys.exit(1)

    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")
    print(f"[OK] Aplicado — {label} ({rel_path})")


def main() -> None:
    # ── drizzle/schema.ts ────────────────────────────────────────────────
    apply_edit(
        "drizzle/schema.ts",
        old="export type SyncLog = typeof syncLog.$inferSelect;",
        new='''export type SyncLog = typeof syncLog.$inferSelect;

/**
 * Tabela para armazenar as condutas/referências do GERCON (respostas-padrão
 * usadas pelos reguladores para consultorias, por especialidade e situação clínica).
 * Sincronizada a partir de uma consulta SQL no Metabase (ver server/syncMetabase.ts).
 */
export const condutasGercon = mysqlTable("condutas_gercon", {
  id: int("id").autoincrement().primaryKey(),
  especialidade: varchar("especialidade", { length: 255 }).notNull(),
  situacao: text("situacao").notNull(),
  ciapCid: text("ciap_cid"),
  conduta: text("conduta").notNull(),
  referencias: text("referencias"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CondutaGercon = typeof condutasGercon.$inferSelect;
export type InsertCondutaGercon = typeof condutasGercon.$inferInsert;

/**
 * Log de sincronização específico das condutas do GERCON (fonte: Metabase).
 * Mantido separado do sync_log geral para não misturar com as sincronizações
 * da planilha Google Sheets.
 */
export const condutasGerconSyncLog = mysqlTable("condutas_gercon_sync_log", {
  id: int("id").autoincrement().primaryKey(),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  rowCount: int("row_count"),
  status: varchar("status", { length: 50 }).default("success"),
  message: text("message"),
});

export type CondutasGerconSyncLog = typeof condutasGerconSyncLog.$inferSelect;''',
        label="tabelas condutasGercon / condutasGerconSyncLog",
    )

    # ── server/routers.ts — imports ──────────────────────────────────────
    apply_edit(
        "server/routers.ts",
        old='''  loginLog,
  recados,
  recadosLidos,
} from "../drizzle/schema";
import { asc, desc, eq, and, inArray, sql } from "drizzle-orm";
import { syncSheetsToDb, syncPrioridadesToDb, syncDicionarioToDb, syncSemCotasToDb } from "./syncSheets";
import { syncFromPostgres } from "./syncPostgres";''',
        new='''  loginLog,
  recados,
  recadosLidos,
  condutasGercon,
  condutasGerconSyncLog,
} from "../drizzle/schema";
import { asc, desc, eq, and, inArray, sql } from "drizzle-orm";
import { syncSheetsToDb, syncPrioridadesToDb, syncDicionarioToDb, syncSemCotasToDb } from "./syncSheets";
import { syncFromPostgres } from "./syncPostgres";
import { syncCondutasGerconComLog } from "./syncMetabase";''',
        label="imports de condutasGercon e syncMetabase",
    )

    # ── server/routers.ts — novo router `condutas` ───────────────────────
    apply_edit(
        "server/routers.ts",
        old='''        return db
          .select()
          .from(loginLog)
          .orderBy(desc(loginLog.loginAt))
          .limit(input.limite ?? 500);
      }),
  }),

});
export type AppRouter = typeof appRouter;''',
        new='''        return db
          .select()
          .from(loginLog)
          .orderBy(desc(loginLog.loginAt))
          .limit(input.limite ?? 500);
      }),
  }),

  /**
   * Condutas do GERCON — respostas/referências padronizadas por situação clínica,
   * usadas pelos reguladores para instruir consultorias. Dados sincronizados a
   * partir de uma consulta SQL no Metabase (ver server/syncMetabase.ts).
   */
  condutas: router({
    // Lista completa — o filtro/busca é feito no cliente (dataset pequeno, ~algumas centenas de linhas)
    listar: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          id: condutasGercon.id,
          especialidade: condutasGercon.especialidade,
          situacao: condutasGercon.situacao,
          ciapCid: condutasGercon.ciapCid,
          conduta: condutasGercon.conduta,
          referencias: condutasGercon.referencias,
        })
        .from(condutasGercon)
        .orderBy(asc(condutasGercon.situacao));
    }),

    // Sincronizar manualmente com o Metabase
    sincronizar: protectedProcedure.mutation(async () => {
      const count = await syncCondutasGerconComLog();
      return { success: true, count };
    }),

    // Data/hora da última sincronização bem-sucedida
    ultimaSincronizacao: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select({ syncedAt: condutasGerconSyncLog.syncedAt, rowCount: condutasGerconSyncLog.rowCount })
        .from(condutasGerconSyncLog)
        .where(eq(condutasGerconSyncLog.status, "success"))
        .orderBy(desc(condutasGerconSyncLog.syncedAt))
        .limit(1);
      return rows[0] ?? null;
    }),

    // Histórico de sincronizações (para diagnóstico de falhas)
    historicoSincronizacao: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(condutasGerconSyncLog)
        .orderBy(desc(condutasGerconSyncLog.syncedAt))
        .limit(10);
    }),
  }),

});
export type AppRouter = typeof appRouter;''',
        label="router condutas (listar/sincronizar/ultimaSincronizacao/historico)",
    )

    # ── server/_core/index.ts — import ────────────────────────────────────
    apply_edit(
        "server/_core/index.ts",
        old='import { syncAndSeedIfEmpty } from "../syncSheets";',
        new='''import { syncAndSeedIfEmpty } from "../syncSheets";
import { syncCondutasGerconIfEmpty, syncCondutasGerconComLog } from "../syncMetabase";''',
        label="import de syncMetabase em _core/index.ts",
    )

    # ── server/_core/index.ts — criação das tabelas via migração automática ─
    apply_edit(
        "server/_core/index.ts",
        old="    // Limpeza diária: remover check-ins com mais de 24h",
        new='''    // Migration: criar tabelas de condutas GERCON (sincronizadas via Metabase)
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS \\`condutas_gercon\\` (
          \\`id\\`             int NOT NULL AUTO_INCREMENT PRIMARY KEY,
          \\`especialidade\\`  varchar(255)  NOT NULL,
          \\`situacao\\`       text          NOT NULL,
          \\`ciap_cid\\`       text          NULL,
          \\`conduta\\`        text          NOT NULL,
          \\`referencias\\`    text          NULL,
          \\`updatedAt\\`      timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS \\`condutas_gercon_sync_log\\` (
          \\`id\\`          int NOT NULL AUTO_INCREMENT PRIMARY KEY,
          \\`synced_at\\`   timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \\`row_count\\`   int NULL,
          \\`status\\`      varchar(50) NULL DEFAULT 'success',
          \\`message\\`     text NULL
        )
      `);
      console.log('[Migration] condutas_gercon e condutas_gercon_sync_log OK!');
    } catch(e) { console.warn('[Migration] condutas_gercon:', e); }

    // Limpeza diária: remover check-ins com mais de 24h''',
        label="criação das tabelas condutas_gercon* na migração automática",
    )

    # ── server/_core/index.ts — sync inicial no boot ─────────────────────
    apply_edit(
        "server/_core/index.ts",
        old='''startServer()
  .then(() => runDrizzleMigrations())
  .then(() => runPendingMigrations())
  .then(() => syncAndSeedIfEmpty(false))
  .catch(console.error);''',
        new='''startServer()
  .then(() => runDrizzleMigrations())
  .then(() => runPendingMigrations())
  .then(() => syncAndSeedIfEmpty(false))
  .then(() => syncCondutasGerconIfEmpty())
  .catch(console.error);''',
        label="sync inicial de condutasGercon no boot",
    )

    # ── server/_core/index.ts — sync diário automático ───────────────────
    apply_edit(
        "server/_core/index.ts",
        old='''// Verificar a cada 5 minutos
setInterval(checkAndRunDailySync, 5 * 60 * 1000);
console.log('[Sync] Verificação periódica de sincronização ativada (a cada 5 min, executa às 08:30 Brasília)');''',
        new='''// Verificar a cada 5 minutos
setInterval(checkAndRunDailySync, 5 * 60 * 1000);
console.log('[Sync] Verificação periódica de sincronização ativada (a cada 5 min, executa às 08:30 Brasília)');

// Sincronização automática diária das condutas GERCON (Metabase) às 08:40 Brasília —
// horário separado do sync do Sheets (08:30) para não concorrer pelo banco ao mesmo tempo.
let lastCondutasSyncDate: string | null = null;

async function checkAndRunDailyCondutasSync() {
  const { hour, minute, dateStr } = getBrasiliaHourMinute();
  if (hour === 8 && minute >= 40 && minute < 45 && lastCondutasSyncDate !== dateStr) {
    lastCondutasSyncDate = dateStr;
    console.log(`[Sync Metabase] Iniciando sincronização automática diária de condutas GERCON (${dateStr} 08:40 Brasília)...`);
    try {
      await syncCondutasGerconComLog();
      console.log('[Sync Metabase] Sincronização automática de condutas GERCON concluída com sucesso!');
    } catch (err) {
      console.error('[Sync Metabase] Erro na sincronização automática de condutas GERCON:', err);
    }
  }
}

setInterval(checkAndRunDailyCondutasSync, 5 * 60 * 1000);
console.log('[Sync Metabase] Verificação periódica de sincronização de condutas GERCON ativada (a cada 5 min, executa às 08:40 Brasília)');''',
        label="sync diário automático de condutasGercon (08:40)",
    )

    # ── client/src/pages/Home.tsx — import e rota ────────────────────────
    apply_edit(
        "client/src/pages/Home.tsx",
        old="import Recados from './Recados';",
        new="import Recados from './Recados';\nimport CondutasGercon from './CondutasGercon';",
        label="import CondutasGercon em Home.tsx",
    )
    apply_edit(
        "client/src/pages/Home.tsx",
        old='          <Route path="/sem-cotas" component={SemCotas} />',
        new='          <Route path="/sem-cotas" component={SemCotas} />\n          <Route path="/condutas-gercon" component={CondutasGercon} />',
        label="rota /condutas-gercon em Home.tsx",
    )

    # ── client/src/App.tsx — rota ─────────────────────────────────────────
    apply_edit(
        "client/src/App.tsx",
        old='      <Route path="/previa-pg">',
        new='''      <Route path="/condutas-gercon">
        {() => (
          <AuthGuard>
            <Home />
          </AuthGuard>
        )}
      </Route>

      <Route path="/previa-pg">''',
        label="rota /condutas-gercon em App.tsx",
    )

    # ── client/src/components/Sidebar.tsx — ícone e item de menu ─────────
    apply_edit(
        "client/src/components/Sidebar.tsx",
        old="import { Menu, X, BarChart3, Table2, FolderOpen, Home, LogOut, UserCircle2, Sun, Moon, ClipboardList, Activity, RefreshCw, Users, Link2, TrendingDown, Sparkles, LogIn, Database, MessageSquare } from 'lucide-react';",
        new="import { Menu, X, BarChart3, Table2, FolderOpen, Home, LogOut, UserCircle2, Sun, Moon, ClipboardList, Activity, RefreshCw, Users, Link2, TrendingDown, Sparkles, LogIn, Database, MessageSquare, BookOpen } from 'lucide-react';",
        label="import do ícone BookOpen em Sidebar.tsx",
    )
    apply_edit(
        "client/src/components/Sidebar.tsx",
        old="    { href: '/reguladores', page: 'reguladores', icon: Users, label: 'Reguladores', visible: true },",
        new="    { href: '/reguladores', page: 'reguladores', icon: Users, label: 'Reguladores', visible: true },\n    { href: '/condutas-gercon', page: 'condutas-gercon', icon: BookOpen, label: 'Condutas GERCON', visible: true },",
        label="item de menu 'Condutas GERCON' em Sidebar.tsx",
    )

    # ── .env.example ──────────────────────────────────────────────────────
    apply_edit(
        ".env.example",
        old="# Node\nNODE_ENV=production",
        new='''# Node
NODE_ENV=production

# Metabase — condutas GERCON (server/syncMetabase.ts)
# URL base do Metabase (sem barra no final)
METABASE_URL=https://metabase.exemplo.org.br
# ID numérico da conexão de banco DENTRO do Metabase (Admin > Databases > abrir a conexão > id na URL)
METABASE_DATABASE_ID=1
# Autenticação — use API Key (opção a) OU email/senha de uma conta de serviço (opção b)
# a) API Key (se o Metabase tiver esse recurso habilitado):
METABASE_API_KEY=
# b) login e senha (usado se METABASE_API_KEY não estiver definida):
METABASE_EMAIL=
METABASE_PASSWORD=''',
        label="variáveis METABASE_* em .env.example",
    )

    print("\nTudo aplicado! Não esqueça de:")
    print("  1) criar server/syncMetabase.ts, server/gerconQuery.sql e")
    print("     client/src/pages/CondutasGercon.tsx com o conteúdo enviado")
    print("  2) colar sua consulta SQL real em server/gerconQuery.sql")
    print("  3) configurar as variáveis METABASE_* no Railway")


if __name__ == "__main__":
    main()
