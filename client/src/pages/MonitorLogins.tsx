import { trpc } from '@/lib/trpc';
import { useRegulador } from '@/contexts/ReguladorContext';
import { LogIn, LogOut, RefreshCw, Loader2 } from 'lucide-react';

export default function MonitorLogins() {
  const { perfilAtivo, regulador } = useRegulador();
  const perfilNorm = (perfilAtivo ?? regulador?.perfil ?? '').toLowerCase();
  const isAdminOuMonitor = perfilNorm.includes('administrador') || perfilNorm.includes('monitoramento');

  const { data = [], isLoading, refetch } = trpc.loginLog.listar.useQuery(
    { limite: 500 },
    { refetchInterval: 60_000 }
  );

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const duracao = (loginAt: Date | string, logoutAt: Date | string | null | undefined) => {
    if (!logoutAt) return null;
    const diff = new Date(logoutAt).getTime() - new Date(loginAt).getTime();
    const mins = Math.floor(diff / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  if (!isAdminOuMonitor) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Acesso restrito a administradores e monitores.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <LogIn size={18} className="text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Monitor de Logins</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Histórico de entradas e saídas dos reguladores
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw size={12} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground text-sm">
            <Loader2 size={18} className="animate-spin" />
            Carregando...
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground border border-dashed border-border rounded-lg">
            <LogIn size={32} className="opacity-30" />
            <p className="text-sm">Nenhum registro de login encontrado.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">Regulador</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">E-mail</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">
                    <div className="flex items-center justify-center gap-1"><LogIn size={11} /> Login</div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">
                    <div className="flex items-center justify-center gap-1"><LogOut size={11} /> Logout</div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">Duração</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const dur = duracao(row.loginAt, row.logoutAt);
                  const ativo = !row.logoutAt;
                  return (
                    <tr key={row.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{row.reguladorNome ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{row.reguladorEmail}</td>
                      <td className="px-4 py-3 text-center text-xs text-foreground">{formatDate(row.loginAt)}</td>
                      <td className="px-4 py-3 text-center text-xs text-foreground">{formatDate(row.logoutAt)}</td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">{dur ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {ativo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            Encerrado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
