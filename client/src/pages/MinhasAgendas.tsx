import { LogOut, Loader2, ClipboardList, RefreshCw } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function MinhasAgendas() {
  const { data: checkIns = [], isLoading, refetch } = trpc.checkIns.getMeus.useQuery();

  const checkInMutation = trpc.checkIns.checkIn.useMutation({
    onSuccess: () => refetch(),
  });

  const handleCheckOut = (ci: {
    agendaId: number;
    agendaNome: string;
    municipio?: string | null;
    especialidade: string;
    central?: string | null;
    cotas?: number | null;
    saldo?: number | null;
    aguardando?: number | null;
    indexRegula?: number | null;
  }) => {
    checkInMutation.mutate({
      agendaId: ci.agendaId,
      agendaNome: ci.agendaNome,
      municipio: ci.municipio ?? undefined,
      especialidade: ci.especialidade,
      central: ci.central ?? undefined,
      cotas: ci.cotas ?? undefined,
      saldo: ci.saldo ?? undefined,
      aguardando: ci.aguardando ?? undefined,
      indexRegula: ci.indexRegula ?? undefined,
    });
  };

  const getBadgeColor = (value: number | null | undefined): string => {
    if (!value) return 'bg-muted text-muted-foreground';
    if (value > 3) return 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300';
    if (value > 2) return 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300';
    if (value > 1) return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="flex-1 flex flex-col bg-background min-h-screen">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Minhas Agendas</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Agendas com check-in ativo nesta sessão
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : checkIns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ClipboardList size={28} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum check-in ativo
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Você ainda não fez check-in em nenhuma agenda. Acesse a aba{' '}
              <strong>Regulação</strong> e clique em "Check-in" na agenda desejada.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              {checkIns.length} agenda{checkIns.length !== 1 ? 's' : ''} em regulação
            </p>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                      Agenda
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">
                      Especialidade
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">
                      Central
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">
                      Cotas
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">
                      Saldo
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">
                      Aguardando
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">
                      Index
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">
                      Check-in em
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {checkIns.map((ci, idx) => (
                    <tr
                      key={ci.id}
                      className={`border-t border-border hover:bg-secondary/50 transition-colors ${
                        idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-foreground">{ci.agendaNome}</div>
                        {ci.municipio && (
                          <div className="text-xs text-muted-foreground mt-0.5">{ci.municipio}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-foreground">
                        {ci.especialidade}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-foreground">
                        {ci.central ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-foreground">
                        {ci.cotas ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-foreground">
                        {ci.saldo ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-foreground">
                        {ci.aguardando ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-sm ${getBadgeColor(ci.indexRegula)}`}
                        >
                          {ci.indexRegula != null ? ci.indexRegula.toFixed(2) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {new Date(ci.createdAt).toLocaleString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleCheckOut(ci)}
                          disabled={checkInMutation.isPending}
                          title="Fazer check-out desta agenda"
                          className="flex items-center gap-1 mx-auto px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                        >
                          {checkInMutation.isPending ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <LogOut size={11} />
                          )}
                          Check-out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
