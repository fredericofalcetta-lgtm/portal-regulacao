import { useMemo } from 'react';
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
} from 'lucide-react';

const NAV_CARDS = [
  {
    href: '/regulacao',
    icon: Table2,
    title: 'Regulação de Encaminhamentos',
    description:
      'Consulte e filtre as agendas disponíveis por especialidade, central e município. Dados ordenados por índice de regulação.',
    color: 'bg-blue-600',
    lightColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-700',
  },
  {
    href: '/dashboard',
    icon: BarChart3,
    title: 'Dashboard',
    description:
      'Visualize métricas e gráficos com a distribuição de cotas, saldos e índices por especialidade e central.',
    color: 'bg-indigo-600',
    lightColor: 'bg-indigo-50 border-indigo-200',
    textColor: 'text-indigo-700',
  },
  {
    href: '/prioridades',
    icon: ListChecks,
    title: 'Listas de Prioridades',
    description:
      'Acesse os documentos de critérios de priorização para cada especialidade, organizados por grupo clínico.',
    color: 'bg-violet-600',
    lightColor: 'bg-violet-50 border-violet-200',
    textColor: 'text-violet-700',
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
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-start gap-2 shadow-sm min-w-0">
      <div className={`p-2.5 rounded-lg ${color} shrink-0`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="w-full min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide leading-tight truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Landing() {
  const { data: sheetsData } = trpc.sheets.getData.useQuery();
  const { data: prioridades } = trpc.prioridades.getAll.useQuery();
  const { data: syncHistory } = trpc.sheets.getSyncHistory.useQuery();

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
    <div className="min-h-screen bg-gray-50">
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
          {lastSyncDate && (
            <div className="flex items-center gap-2 mt-5 text-slate-400 text-sm">
              <Clock size={14} />
              <span>Última atualização: {lastSyncDate}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-10 max-w-6xl">
        {/* Métricas */}
        {stats && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Resumo Geral</h2>
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
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {NAV_CARDS.map(({ href, icon: Icon, title, description, color, lightColor, textColor }) => (
              <Link key={href} href={href}>
                <a className={`group block border rounded-xl p-6 bg-white hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${lightColor}`}>
                  <div className={`inline-flex p-3 rounded-lg ${color} mb-4`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <h3 className={`font-semibold text-base mb-2 ${textColor}`}>{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">{description}</p>
                  <div className={`flex items-center gap-1 text-sm font-medium ${textColor} group-hover:gap-2 transition-all`}>
                    Acessar
                    <ArrowRight size={14} />
                  </div>
                </a>
              </Link>
            ))}
          </div>
        </section>

        {/* Listas de prioridades resumo */}
        {prioridades && prioridades.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Listas de Prioridades Disponíveis</h2>
              <Link href="/prioridades">
                <a className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  Ver todas <ArrowRight size={13} />
                </a>
              </Link>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-3">
                {prioridades.length} documentos disponíveis em {new Set(prioridades.map(p => p.grandeGrupo).filter(Boolean)).size} grupos clínicos
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(prioridades.map(p => p.grandeGrupo?.trim()).filter(Boolean)))
                  .sort((a, b) => (a ?? '').localeCompare(b ?? '', 'pt-BR'))
                  .map(grupo => (
                    <span
                      key={grupo}
                      className="px-3 py-1 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium rounded-full"
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
