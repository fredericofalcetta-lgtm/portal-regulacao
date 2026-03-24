import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  Table2,
  BarChart3,
  ListChecks,
  ArrowRight,
  Activity,
  Users,
  TrendingUp,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

const NAV_CARDS = [
  {
    href: '/regulacao',
    icon: Table2,
    title: 'Regulação de Encaminhamentos',
    description:
      'Consulte e filtre as agendas disponíveis por especialidade, central e município. Dados ordenados por índice de regulação.',
    color: 'bg-blue-600',
    borderColor: 'border-blue-200 dark:border-blue-800',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  {
    href: '/dashboard',
    icon: BarChart3,
    title: 'Dashboard',
    description:
      'Visualize métricas e gráficos com a distribuição de cotas, saldos e índices por especialidade e central.',
    color: 'bg-indigo-600',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
    textColor: 'text-indigo-700 dark:text-indigo-300',
  },
  {
    href: '/prioridades',
    icon: ListChecks,
    title: 'Listas de Prioridades',
    description:
      'Acesse os documentos de critérios de priorização para cada especialidade, organizados por grupo clínico.',
    color: 'bg-violet-600',
    borderColor: 'border-violet-200 dark:border-violet-800',
    bgColor: 'bg-violet-50 dark:bg-violet-950/40',
    textColor: 'text-violet-700 dark:text-violet-300',
  },
];

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-start gap-2 shadow-sm min-w-0">
      <div className={`p-2.5 rounded-lg ${color} shrink-0`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="w-full min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide leading-tight truncate">{label}</p>
        <p className="text-xl font-bold text-card-foreground mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Landing() {
  const { data: sheetsData, refetch: refetchData } = trpc.sheets.getData.useQuery();
  const { data: prioridades } = trpc.prioridades.getAll.useQuery();
  const { data: syncHistory, refetch: refetchHistory } = trpc.sheets.getSyncHistory.useQuery();

  // Controle de acesso ao botão de sincronização
  const { data: accessData } = trpc.auth.checkAccess.useQuery();
  const perfil = accessData?.regulador?.perfil?.toLowerCase() ?? '';
  const podeSync = perfil === 'administrador' || perfil === 'monitoramento';

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const syncMutation = trpc.sheets.syncAll.useMutation({
    onMutate: () => setSyncStatus('syncing'),
    onSuccess: () => {
      setSyncStatus('success');
      refetchData();
      refetchHistory();
      setTimeout(() => setSyncStatus('idle'), 3000);
    },
    onError: () => {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    },
  });

  const rows = sheetsData?.rows ?? [];

  const stats = useMemo(() => {
    if (!rows.length) return null;

    const totalCotas = rows.reduce((sum, r) => sum + (Number(r[2]) || 0), 0);
    const totalSaldo = rows.reduce((sum, r) => sum + (Number(r[3]) || 0), 0);
    const totalAguardando = rows.reduce((sum, r) => sum + (Number(r[4]) || 0), 0);
    const totalAlta = rows.filter(r => Number(r[7]) > 3).length;

    const especialidades = new Set(rows.map(r => r[9]).filter(Boolean));

    return {
      totalAgendas: rows.length,
      totalCotas,
      totalSaldo,
      totalAguardando,
      totalAlta,
      totalEspecialidades: especialidades.size,
    };
  }, [rows]);

  const lastSync = syncHistory?.[0];
  const lastSyncDate = lastSync?.syncedAt
    ? new Date(lastSync.syncedAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white px-8 py-14">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-blue-400" />
            <span className="text-blue-300 text-sm font-medium uppercase tracking-widest">
              Sistema de Regulação
            </span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-3">
            Portal de Regulação de<br />Encaminhamentos
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl">
            Plataforma centralizada para consulta, análise e gestão de encaminhamentos para
            consultas especializadas no sistema de saúde.
          </p>
          <div className="flex items-center gap-4 mt-5 flex-wrap">
            {lastSyncDate && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Clock size={14} />
                <span>Última atualização: {lastSyncDate}</span>
              </div>
            )}
            {podeSync && (
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncStatus === 'syncing'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                  syncStatus === 'syncing'
                    ? 'border-slate-500 text-slate-400 cursor-not-allowed'
                    : syncStatus === 'success'
                    ? 'border-green-500/50 text-green-400 hover:bg-green-500/10'
                    : syncStatus === 'error'
                    ? 'border-red-500/50 text-red-400 hover:bg-red-500/10'
                    : 'border-slate-500/50 text-slate-300 hover:bg-white/10 hover:border-slate-400'
                }`}
              >
                <RefreshCw size={12} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                {syncStatus === 'idle' && 'Sincronizar agora'}
                {syncStatus === 'syncing' && 'Sincronizando...'}
                {syncStatus === 'success' && 'Sincronizado!'}
                {syncStatus === 'error' && 'Erro — tentar novamente'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-10 max-w-6xl">
        {/* Métricas */}
        {stats && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-foreground mb-4">Resumo Geral</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              <StatCard
                icon={Table2}
                label="Agendas"
                value={stats.totalAgendas.toLocaleString('pt-BR')}
                color="bg-blue-500"
              />
              <StatCard
                icon={Users}
                label="Especialidades"
                value={stats.totalEspecialidades}
                color="bg-indigo-500"
              />
              <StatCard
                icon={TrendingUp}
                label="Total de Cotas"
                value={stats.totalCotas.toLocaleString('pt-BR')}
                color="bg-green-500"
              />
              <StatCard
                icon={Activity}
                label="Saldo Disponível"
                value={stats.totalSaldo.toLocaleString('pt-BR')}
                color="bg-teal-500"
              />
              <StatCard
                icon={Users}
                label="Aguardando"
                value={stats.totalAguardando.toLocaleString('pt-BR')}
                color="bg-amber-500"
              />
              <StatCard
                icon={AlertCircle}
                label="Índice Alto (>3)"
                value={stats.totalAlta}
                sub="agendas críticas"
                color="bg-red-500"
              />
            </div>
          </section>
        )}

        {/* Links rápidos */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {NAV_CARDS.map(({ href, icon: Icon, title, description, color, borderColor, bgColor, textColor }) => (
              <Link key={href} href={href}>
                <div className={`group block border rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${borderColor} ${bgColor}`}>
                  <div className={`inline-flex p-3 rounded-lg ${color} mb-4`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <h3 className={`font-semibold text-base mb-2 ${textColor}`}>{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</p>
                  <div className={`flex items-center gap-1 text-sm font-medium ${textColor} group-hover:gap-2 transition-all`}>
                    Acessar
                    <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Listas de prioridades resumo */}
        {prioridades && prioridades.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Listas de Prioridades Disponíveis</h2>
              <Link href="/prioridades">
                <span className="text-sm text-primary hover:underline flex items-center gap-1 cursor-pointer">
                  Ver todas <ArrowRight size={13} />
                </span>
              </Link>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-3">
                {prioridades.length} documentos disponíveis em {new Set(prioridades.map(p => p.grandeGrupo).filter(Boolean)).size} grupos clínicos
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(prioridades.map(p => p.grandeGrupo?.trim()).filter(Boolean)))
                  .sort((a, b) => (a ?? '').localeCompare(b ?? '', 'pt-BR'))
                  .map(grupo => (
                    <span
                      key={grupo}
                      className="px-3 py-1 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-medium rounded-full"
                    >
                      {grupo}
                    </span>
                  ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
