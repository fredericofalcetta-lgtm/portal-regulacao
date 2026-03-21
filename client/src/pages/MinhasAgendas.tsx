import React from 'react';
import { LogIn, LogOut, Loader2, ClipboardList, RefreshCw, Send, CheckCircle2, Trash2, Flag, CheckCheck, XCircle } from 'lucide-react';
import CheckInDetalhes from '@/components/CheckInDetalhes';
import { trpc } from '@/lib/trpc';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  concluidoEm?: Date | null;
  createdAt: Date;
  onCheckIn?: () => void;
  onRemover?: () => void;
  onConcluir?: () => void;
  isCheckInPending: boolean;
  isRemoverPending: boolean;
  isConcluirPending?: boolean;
  showFlags?: boolean;
  showConcluir?: boolean;
  showEncaminhadoPor?: boolean;
  showConcluidoEm?: boolean;
  isConcluida?: boolean;
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
  concluidoEm,
  createdAt,
  onCheckIn,
  onRemover,
  onConcluir,
  isCheckInPending,
  isRemoverPending,
  isConcluirPending = false,
  showFlags = false,
  showConcluir = false,
  showEncaminhadoPor = false,
  showConcluidoEm = false,
  isConcluida = false,
}: AgendaRowProps) {
  const getBadgeColor = (value: number | null | undefined): string => {
    if (!value) return 'bg-muted text-muted-foreground';
    if (value > 3) return 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300';
    if (value > 2) return 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300';
    if (value > 1) return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <tr className={`border-t border-border hover:bg-secondary/50 transition-colors ${isConcluida ? 'opacity-75' : ''}`}>
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
      {showEncaminhadoPor && (
        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
          {encaminhadoPor ?? '—'}
        </td>
      )}
      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
        {showConcluidoEm && concluidoEm
          ? new Date(concluidoEm).toLocaleString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
            })
          : new Date(createdAt).toLocaleString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
            })}
      </td>
      {/* Botão Check-in/Check-out — só aparece se onCheckIn estiver definido */}
      {onCheckIn !== undefined && (
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
      )}
      {/* Botão Concluído — só aparece nos check-ins ativos */}
      {showConcluir && onConcluir !== undefined && (
        <td className="px-4 py-3 text-center">
          <button
            onClick={onConcluir}
            disabled={isConcluirPending}
            title="Marcar agenda como concluída"
            className="flex items-center gap-1 mx-auto px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
          >
            {isConcluirPending ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <CheckCheck size={11} />
            )}
            Concluído
          </button>
        </td>
      )}
      {/* Coluna de status para agendas concluídas */}
      {isConcluida && (
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={10} />
            Concluído
          </span>
        </td>
      )}
    </tr>
  );
}

// ─── Cabeçalho da tabela ─────────────────────────────────────────────────────

function TableHeader({
  showEncaminhadoPor = false,
  showCheckIn = true,
  showConcluir = false,
  showFlags = false,
  showStatus = false,
  dateLabel = 'Check-in em',
}: {
  showEncaminhadoPor?: boolean;
  showCheckIn?: boolean;
  showConcluir?: boolean;
  showFlags?: boolean;
  showStatus?: boolean;
  dateLabel?: string;
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
          {dateLabel}
        </th>
        {showCheckIn && (
          <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Check-in</th>
        )}
        {showConcluir && (
          <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Ação</th>
        )}
        {showStatus && (
          <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Status</th>
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

  const { data: concluidas = [], isLoading: loadingConcluidas, refetch: refetchConcluidas } =
    trpc.agendasConcluidas.getMeus.useQuery();

  const checkInMutation = trpc.checkIns.checkIn.useMutation({
    onSuccess: () => {
      refetchCheckIns();
      refetchEncaminhadas();
    },
  });

  const concluirMutation = trpc.agendasConcluidas.concluir.useMutation({
    onSuccess: () => {
      refetchCheckIns();
      refetchEncaminhadas();
      refetchConcluidas();
    },
  });

  const limparConcluidasMutation = trpc.agendasConcluidas.limpar.useMutation({
    onSuccess: () => {
      refetchConcluidas();
    },
  });

  const limparEncaminhadasMutation = trpc.encaminhamentos.removerTodos.useMutation({
    onSuccess: () => {
      refetchEncaminhadas();
    },
  });

  // Fazer check-in ou check-out em uma agenda das encaminhadas
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

  // Fazer check-out de um check-in ativo (retorna para encaminhadas)
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

  // Concluir agenda: faz check-out e move para agendas concluídas
  const handleConcluir = (ci: {
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
    concluirMutation.mutate({
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

  const isLoading = loadingCheckIns || loadingEncaminhadas || loadingConcluidas;

  // Conjunto de agendaIds com check-in ativo
  const checkInIds = new Set(checkIns.map(ci => ci.agendaId));

  // Soma total de Aguardando das agendas concluídas
  const totalAguardandoConcluidas = concluidas.reduce((acc, c) => acc + (c.aguardando ?? 0), 0);

  const handleRefresh = () => {
    refetchCheckIns();
    refetchEncaminhadas();
    refetchConcluidas();
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
                <TableHeader
                  showEncaminhadoPor={false}
                  showCheckIn={true}
                  showConcluir={true}
                  showFlags={true}
                  dateLabel="Check-in em"
                />
                <tbody>
                  {checkIns.map((ci) => (
                    <React.Fragment key={ci.id}>
                      <AgendaRow
                        agendaId={ci.agendaId}
                        agendaNome={ci.agendaNome}
                        municipio={ci.municipio}
                        central={ci.central}
                        cotas={ci.cotas}
                        saldo={ci.saldo}
                        aguardando={ci.aguardando}
                        indexRegula={ci.indexRegula}
                        flags={ci.flags}
                        temCheckIn={true}
                        createdAt={ci.createdAt}
                        onCheckIn={() => handleCheckOut(ci)}
                        onConcluir={() => handleConcluir(ci)}
                        isCheckInPending={checkInMutation.isPending}
                        isRemoverPending={false}
                        isConcluirPending={concluirMutation.isPending}
                        showFlags={true}
                        showConcluir={true}
                      />
                      {/* Submenu de agendas relacionadas */}
                      <tr key={`detalhes-${ci.id}`}>
                        <td colSpan={9} className="p-0">
                          <CheckInDetalhes
                            agendaId={ci.agendaId}
                            especialidade={ci.especialidade}
                            central={ci.central}
                          />
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Seção 2: Encaminhadas para mim ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Send size={18} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-foreground">Encaminhadas para mim</h2>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                {encaminhadas.length}
              </span>
            </div>
            {encaminhadas.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={limparEncaminhadasMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md transition-colors disabled:opacity-50"
                  >
                    {limparEncaminhadasMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <XCircle size={12} />
                    )}
                    Limpar encaminhadas
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar agendas encaminhadas?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação removerá todas as {encaminhadas.length} agenda{encaminhadas.length !== 1 ? 's' : ''} encaminhada{encaminhadas.length !== 1 ? 's' : ''} para você. Esta operação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => limparEncaminhadasMutation.mutate()}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Sim, limpar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
                <TableHeader
                  showEncaminhadoPor={true}
                  showCheckIn={true}
                  showConcluir={false}
                  showFlags={false}
                  dateLabel="Encaminhado em"
                />
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
                      isCheckInPending={checkInMutation.isPending}
                      isRemoverPending={false}
                      showEncaminhadoPor={true}
                      showFlags={false}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Seção 3: Agendas concluídas ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-semibold text-foreground">Agendas concluídas</h2>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                {concluidas.length}
              </span>
            </div>
            {concluidas.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={limparConcluidasMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md transition-colors disabled:opacity-50"
                  >
                    {limparConcluidasMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <XCircle size={12} />
                    )}
                    Limpar agendas concluídas
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar agendas concluídas?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação removerá todas as {concluidas.length} agenda{concluidas.length !== 1 ? 's' : ''} concluída{concluidas.length !== 1 ? 's' : ''} do seu histórico. Esta operação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => limparConcluidasMutation.mutate()}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Sim, limpar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {loadingConcluidas ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : concluidas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border bg-card">
              <CheckCheck size={24} className="text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma agenda concluída ainda.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em <strong>"Concluído"</strong> em um check-in ativo para registrá-lo aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse">
                <TableHeader
                  showEncaminhadoPor={false}
                  showCheckIn={false}
                  showConcluir={false}
                  showFlags={false}
                  showStatus={true}
                  dateLabel="Concluído em"
                />
                <tbody>
                  {concluidas.map((c) => (
                    <AgendaRow
                      key={c.id}
                      agendaId={c.agendaId}
                      agendaNome={c.agendaNome}
                      municipio={c.municipio}
                      central={c.central}
                      cotas={c.cotas}
                      saldo={c.saldo}
                      aguardando={c.aguardando}
                      indexRegula={c.indexRegula}
                      temCheckIn={false}
                      concluidoEm={c.concluidoEm}
                      createdAt={c.concluidoEm}
                      isCheckInPending={false}
                      isRemoverPending={false}
                      showConcluidoEm={true}
                      isConcluida={true}
                    />
                  ))}
                </tbody>
                {/* Rodapé com soma total de Aguardando */}
                <tfoot className="bg-emerald-50 dark:bg-emerald-950/20 border-t-2 border-emerald-200 dark:border-emerald-800">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                      Total Aguardando (produtividade):
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {totalAguardandoConcluidas}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
