import { LogIn, LogOut, Loader2, ClipboardList, RefreshCw, Send, CheckCircle2, Trash2, Flag } from 'lucide-react';
import { trpc } from '@/lib/trpc';

// ─── Componente de linha de agenda ───────────────────────────────────────────

interface AgendaRowProps {
  agendaId: number;
  agendaNome: string;
  municipio?: string | null;
  central?: string | null;
  cotas?: number | null;
  saldo?: number | null;
  aguardando?: number | null;
  indexRegula?: number | null;
  flags?: string | null;
  temCheckIn: boolean;
  encaminhadoPor?: string | null;
  createdAt: Date;
  onCheckIn: () => void;
  onRemover?: () => void;
  isCheckInPending: boolean;
  isRemoverPending: boolean;
  showFlags?: boolean;
}

function AgendaRow({
  agendaNome,
  municipio,
  central,
  cotas,
  saldo,
  aguardando,
  indexRegula,
  flags,
  temCheckIn,
  encaminhadoPor,
  createdAt,
  onCheckIn,
  onRemover,
  isCheckInPending,
  isRemoverPending,
  showFlags = false,
}: AgendaRowProps) {
  const getBadgeColor = (value: number | null | undefined): string => {
    if (!value) return 'bg-muted text-muted-foreground';
    if (value > 3) return 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300';
    if (value > 2) return 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300';
    if (value > 1) return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <tr className="border-t border-border hover:bg-secondary/50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-foreground">{agendaNome}</div>
        {municipio && (
          <div className="text-xs text-muted-foreground mt-0.5">{municipio}</div>
        )}
      </td>
      <td className="px-4 py-3 text-center text-xs text-foreground">{central ?? '—'}</td>
      <td className="px-4 py-3 text-center text-sm font-medium text-foreground">{cotas ?? '—'}</td>
      <td className="px-4 py-3 text-center text-sm font-medium text-foreground">{saldo ?? '—'}</td>
      <td className="px-4 py-3 text-center text-sm font-medium text-foreground">{aguardando ?? '—'}</td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-block px-2 py-0.5 rounded text-sm ${getBadgeColor(indexRegula)}`}>
          {indexRegula != null ? indexRegula.toFixed(2) : '—'}
        </span>
      </td>
      {showFlags && (
        <td className="px-4 py-3 text-center">
          {flags ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
              <Flag size={10} />
              {flags}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
      )}
      {encaminhadoPor !== undefined && (
        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
          {encaminhadoPor ?? '—'}
        </td>
      )}
      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
        {new Date(createdAt).toLocaleString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        })}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={onCheckIn}
          disabled={isCheckInPending}
          title={temCheckIn ? 'Fazer check-out desta agenda' : 'Fazer check-in nesta agenda'}
          className={`flex items-center gap-1 mx-auto px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
            temCheckIn
              ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
              : 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
          }`}
        >
          {isCheckInPending ? (
            <Loader2 size={11} className="animate-spin" />
          ) : temCheckIn ? (
            <LogOut size={11} />
          ) : (
            <LogIn size={11} />
          )}
          {temCheckIn ? 'Check-out' : 'Check-in'}
        </button>
      </td>
      {onRemover !== undefined && (
        <td className="px-4 py-3 text-center">
          <button
            onClick={onRemover}
            disabled={isRemoverPending}
            title="Remover este encaminhamento"
            className="flex items-center gap-1 mx-auto px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300"
          >
            {isRemoverPending ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Trash2 size={11} />
            )}
            Concluído
          </button>
        </td>
      )}
    </tr>
  );
}

// ─── Cabeçalho da tabela ─────────────────────────────────────────────────────

function TableHeader({
  showEncaminhadoPor,
  showRemover,
  showFlags,
}: {
  showEncaminhadoPor: boolean;
  showRemover: boolean;
  showFlags?: boolean;
}) {
  return (
    <thead className="bg-secondary">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Agenda</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Central</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Cotas</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Saldo</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Aguardando</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Index</th>
        {showFlags && (
          <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Flags</th>
        )}
        {showEncaminhadoPor && (
          <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Encaminhado por</th>
        )}
        <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">
          {showEncaminhadoPor ? 'Encaminhado em' : 'Check-in em'}
        </th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Check-in</th>
        {showRemover && (
          <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Ação</th>
        )}
      </tr>
    </thead>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MinhasAgendas() {
  const { data: checkIns = [], isLoading: loadingCheckIns, refetch: refetchCheckIns } =
    trpc.checkIns.getMeus.useQuery();

  const { data: encaminhadas = [], isLoading: loadingEncaminhadas, refetch: refetchEncaminhadas } =
    trpc.encaminhamentos.getMinhas.useQuery();

  const checkInMutation = trpc.checkIns.checkIn.useMutation({
    onSuccess: () => {
      refetchCheckIns();
      refetchEncaminhadas();
    },
  });

  const removerMutation = trpc.encaminhamentos.removerMeu.useMutation({
    onSuccess: () => {
      refetchEncaminhadas();
    },
  });

  const handleCheckIn = (enc: {
    agendaId: number;
    agendaNome: string;
    municipio?: string | null;
    especialidade?: string;
    central?: string | null;
    cotas?: number | null;
    saldo?: number | null;
    aguardando?: number | null;
    indexRegula?: number | null;
  }) => {
    checkInMutation.mutate({
      agendaId: enc.agendaId,
      agendaNome: enc.agendaNome,
      municipio: enc.municipio ?? undefined,
      especialidade: enc.especialidade ?? '',
      central: enc.central ?? undefined,
      cotas: enc.cotas ?? undefined,
      saldo: enc.saldo ?? undefined,
      aguardando: enc.aguardando ?? undefined,
      indexRegula: enc.indexRegula ?? undefined,
    });
  };

  const isLoading = loadingCheckIns || loadingEncaminhadas;

  // Conjunto de agendaIds com check-in ativo (para marcar nas encaminhadas)
  const checkInIds = new Set(checkIns.map(ci => ci.agendaId));

  const handleRefresh = () => {
    refetchCheckIns();
    refetchEncaminhadas();
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
                Check-ins ativos e agendas encaminhadas para você
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8">

        {/* ── Seção 1: Check-ins ativos ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold text-foreground">Check-ins ativos</h2>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300">
              {checkIns.length}
            </span>
          </div>

          {loadingCheckIns ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : checkIns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border bg-card">
              <ClipboardList size={24} className="text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Você não tem check-ins ativos no momento.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Acesse a aba <strong>Regulação</strong> e clique em "Check-in" em uma agenda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse">
                <TableHeader showEncaminhadoPor={false} showRemover={false} showFlags={false} />
                <tbody>
                  {checkIns.map((ci) => (
                    <AgendaRow
                      key={ci.id}
                      agendaId={ci.agendaId}
                      agendaNome={ci.agendaNome}
                      municipio={ci.municipio}
                      central={ci.central}
                      cotas={ci.cotas}
                      saldo={ci.saldo}
                      aguardando={ci.aguardando}
                      indexRegula={ci.indexRegula}
                      temCheckIn={true}
                      createdAt={ci.createdAt}
                      onCheckIn={() => handleCheckIn(ci)}
                      isCheckInPending={checkInMutation.isPending}
                      isRemoverPending={false}
                      showFlags={false}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Seção 2: Agendas encaminhadas ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Send size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-foreground">Encaminhadas para mim</h2>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
              {encaminhadas.length}
            </span>
          </div>

          {loadingEncaminhadas ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : encaminhadas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border bg-card">
              <Send size={24} className="text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma agenda foi encaminhada para você ainda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse">
                <TableHeader showEncaminhadoPor={true} showRemover={true} showFlags={true} />
                <tbody>
                  {encaminhadas.map((enc) => (
                    <AgendaRow
                      key={enc.id}
                      agendaId={enc.agendaId}
                      agendaNome={enc.agendaNome}
                      municipio={enc.municipio}
                      central={enc.central}
                      cotas={enc.cotas}
                      saldo={enc.saldo}
                      aguardando={enc.aguardando}
                      indexRegula={enc.indexRegula}
                      flags={enc.flags}
                      temCheckIn={checkInIds.has(enc.agendaId)}
                      encaminhadoPor={enc.encaminhadoPorNome}
                      createdAt={enc.createdAt}
                      onCheckIn={() => handleCheckIn({
                        agendaId: enc.agendaId,
                        agendaNome: enc.agendaNome,
                        municipio: enc.municipio,
                        especialidade: enc.especialidade,
                        central: enc.central,
                        cotas: enc.cotas,
                        saldo: enc.saldo,
                        aguardando: enc.aguardando,
                        indexRegula: enc.indexRegula,
                      })}
                      onRemover={() => removerMutation.mutate({ id: enc.id })}
                      isCheckInPending={checkInMutation.isPending}
                      isRemoverPending={removerMutation.isPending}
                      showFlags={true}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
