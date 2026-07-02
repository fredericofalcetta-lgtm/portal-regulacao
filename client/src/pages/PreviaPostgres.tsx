/**
 * PreviaPostgres.tsx
 * ------------------
 * Aba "Prévia PG" — visível apenas para administradores.
 * Exibe os dados vindos da tabela regulacao_data_pg (populada via syncFromPostgres),
 * permitindo comparar com a fonte atual (Google Sheets) antes da migração definitiva.
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRegulador } from '@/contexts/ReguladorContext';
import { Database, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Regulation from './Regulation';

export default function PreviaPostgres() {
  const { regulador, perfilAtivo } = useRegulador();
  const perfilNorm = (perfilAtivo ?? regulador?.perfil ?? '').toLowerCase();
  const isAdmin = perfilNorm.includes('administrador');

  const [syncMsg, setSyncMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [diagMsg, setDiagMsg] = useState<string | null>(null);

  const testePgMutation = trpc.sheets.testePgConexao.useQuery(undefined, { enabled: false });

  const { data: pgData, isLoading, refetch } = trpc.sheets.getDataPg.useQuery(undefined, {
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const syncPgMutation = trpc.sheets.syncPg.useMutation({
    onSuccess: (res) => {
      setSyncMsg({ tipo: 'ok', texto: `Sync concluído — ${res.count} registros importados do PostgreSQL.` });
      refetch();
    },
    onError: (err) => {
      setSyncMsg({ tipo: 'erro', texto: `Erro: ${err.message}` });
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Acesso restrito a administradores.
      </div>
    );
  }

  const temDados = (pgData?.rows?.length ?? 0) > 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Barra de controle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Database size={15} className="text-blue-500" />
          Prévia PostgreSQL
          <span className="text-xs text-muted-foreground font-normal">
            — dados da tabela <code className="bg-muted px-1 rounded">regulacao_data_pg</code>
          </span>
          {temDados && (
            <span className="text-xs bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {pgData!.rows.length} agendas
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {diagMsg && (
            <div className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
              {diagMsg}
            </div>
          )}

          {syncMsg && (
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${
              syncMsg.tipo === 'ok'
                ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300'
            }`}>
              {syncMsg.tipo === 'ok'
                ? <CheckCircle2 size={12} />
                : <AlertTriangle size={12} />}
              {syncMsg.texto}
            </div>
          )}

          <button
            onClick={async () => {
              setDiagMsg("Testando conexão...");
              const res = await testePgMutation.refetch();
              const d = res.data;
              setDiagMsg(d ? `TCP: ${d.tcpOk ? '✓' : '✗'} | PG: ${d.pgOk ? '✓' : '✗'} — ${d.mensagem}` : 'Erro no diagnóstico');
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            Testar conexão
          </button>

          <button
            onClick={() => { setSyncMsg(null); setDiagMsg(null); syncPgMutation.mutate(); }}
            disabled={syncPgMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={12} className={syncPgMutation.isPending ? 'animate-spin' : ''} />
            {syncPgMutation.isPending ? 'Sincronizando...' : 'Sincronizar do PostgreSQL'}
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          Carregando dados...
        </div>
      ) : !temDados ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground">
          <Database size={32} className="opacity-30" />
          <p className="text-sm">Nenhum dado importado ainda.</p>
          <p className="text-xs">Clique em "Sincronizar do PostgreSQL" para buscar os dados.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <Regulation
            data={pgData!.rows as (string | number)[][]}
            concluidasIds={[]}
          />
        </div>
      )}
    </div>
  );
}
