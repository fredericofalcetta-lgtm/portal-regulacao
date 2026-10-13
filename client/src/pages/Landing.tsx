import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { FRASE_FILA_COTAS_BAIXA, FRASE_FILA_COTAS_ALTA } from '@/lib/corAgenda';
import {
  Table2,
  ArrowRight,
  Activity,
  Users,
  TrendingUp,
  AlertCircle,
  Clock,
  RefreshCw,
  BookOpen,
} from 'lucide-react';


// ─── Legenda (dicionário das colunas) ─────────────────────────────────────────
// Texto fornecido pela equipe de regulação. As regras de Fila/Cotas usam as
// mesmas frases do alerta exibido no check-in (lib/corAgenda.ts).
const LEGENDA: {
  termo: string;
  descricao: string;
  regras?: { rotulo: string; texto: string; classe: string }[];
}[] = [
  { termo: 'AGENDA', descricao: 'Nome da agenda no GERCON.' },
  { termo: 'CENTRAL', descricao: 'Central de regulação no GERCON.' },
  {
    termo: 'MUNICÍPIO',
    descricao: 'Município que oferece a agenda, conforme regionalização configurada no GERCON. Ao expandir a linha da agenda visualizamos cada município que a oferece. Uma linha com esse campo em branco irá aparecer sempre que houver solicitações sem município ou com uma instituição indicada; estes casos são contabilizados como município nulo.',
  },
  {
    termo: 'FILA/COTAS',
    descricao: 'Relação entre a quantidade de casos autorizados e em aguarda regulação/reavaliação/reversão pela quantidade de cotas disponíveis no mês vigente. Quanto maior o número, mais tempo o paciente demora para consultar.',
    regras: [
      { rotulo: '⏩ ≤ 4,00', texto: FRASE_FILA_COTAS_BAIXA, classe: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800' },
      { rotulo: '⚠️ > 4,00', texto: FRASE_FILA_COTAS_ALTA, classe: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800' },
    ],
  },
  {
    termo: 'INDEX',
    descricao: 'Cálculo que leva em conta o saldo do mês vigente, a quantidade de casos aguardando regulação e a quantidade de casos autorizados, para sinalizar em quais agendas se corre o risco de perder consultas, por falta de casos autorizados.',
    regras: [
      { rotulo: 'Index > 3', texto: 'Situação crítica para perda de consultas. Esta agenda deve ser regulada prioritariamente. Avalie a relação FILA/COTAS para decidir a flexibilidade da regulação.', classe: 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-800' },
      { rotulo: 'Index > 2', texto: 'Alta oferta de consultas. A agenda deve ser regulada com brevidade.', classe: 'bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-100 border border-orange-200 dark:border-orange-800' },
      { rotulo: 'Index > 1', texto: 'Não há casos autorizados suficientes para cobrir a oferta do mês. Priorize a regulação dessas agendas após terminar a regulação das agendas em vermelho e laranja.', classe: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-900 dark:text-yellow-100 border border-yellow-200 dark:border-yellow-800' },
      { rotulo: 'Index ≤ 1', texto: 'Seguir pelo tempo de espera: agendas com mais de 90 dias e mais de 28 dias aguardando regulação.', classe: 'bg-muted text-foreground border border-border' },
    ],
  },
  { termo: '> 7D', descricao: 'Número de casos aguardando a primeira regulação há mais de 7 dias. Monitorado em agendas "tempo sensível" como oncologias e PNAR.' },
  { termo: '> 28D', descricao: 'Número de casos aguardando a primeira regulação há mais de 28 dias. Monitorado em todas as agendas como uma das metas pactuadas com a SES/RS. Clique sobre ">28D" para ordenar as linhas a partir do maior número de casos.' },
  { termo: '> 90D', descricao: 'Número de casos aguardando a primeira regulação há mais de 90 dias. Agendas com atraso crítico para primeira regulação. Clique sobre ">90D" para ordenar as linhas a partir do maior número de casos.' },
  { termo: 'COTAS', descricao: 'Total de consultas na especialidade no mês vigente. Este dado é informado pelos prestadores e não varia ao longo do mês.' },
  { termo: 'SALDO', descricao: 'Número de consultas ainda disponíveis no mês vigente. Este número vai diminuindo ao longo do mês, conforme as consultas são agendadas.' },
  { termo: 'AGUARDANDO', descricao: 'Casos com a situação Aguardando Regulação, Reavaliação ou Reversão na respectiva central, especialidade e município indicado.' },
  { termo: 'AUTORIZADAS', descricao: 'Casos com a situação Autorizada e Autorização Automática na respectiva central, especialidade e município indicado.' },
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
  // O campo perfil pode conter valores compostos como "ADMINISTRADOR, REGULADOR"
  const { data: accessData } = trpc.auth.checkAccess.useQuery();
  const perfil = accessData?.regulador?.perfil?.toLowerCase() ?? '';
  const podeSync = perfil.includes('administrador') || perfil.includes('monitoramento');

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

    const especialidades = new Set(rows.map(r => r[12]).filter(Boolean));

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
            Portal de Monitoramento<br />da Regulação TSRS
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

        {/* Legenda do portal — substitui o antigo "Acesso Rápido" */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            Aprenda a interpretar as informações do Portal de Monitoramento 👇🏽
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Significado de cada coluna da Lista de agendas e como usar os indicadores para decidir a regulação.
          </p>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {LEGENDA.map((item, i) => (
              <div key={item.termo} className={`grid grid-cols-1 md:grid-cols-[150px_1fr] gap-x-5 gap-y-1 px-5 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                <div className="text-sm font-bold text-foreground tracking-wide">{item.termo}</div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.descricao}</p>
                  {item.regras && (
                    <ul className="mt-2 space-y-1.5">
                      {item.regras.map(r => (
                        <li key={r.rotulo} className={`flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 rounded-md px-3 py-2 text-sm ${r.classe}`}>
                          <span className="font-semibold whitespace-nowrap shrink-0">{r.rotulo}</span>
                          <span className="leading-relaxed">{r.texto}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
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
