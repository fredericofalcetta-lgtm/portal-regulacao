/**
 * UsoPortal.tsx — "Uso do Portal" (administradores e monitoramento)
 *
 * Relatório por regulador ativo, combinando:
 *  - sessões de uso (heartbeat de interação real com o portal)
 *  - histórico permanente de check-ins e agendas concluídas (atividade_log)
 *
 * Objetivo: identificar quem ainda não migrou das planilhas antigas.
 */
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRegulador } from '@/contexts/ReguladorContext';
import { Activity, Download, Loader2, RefreshCw, Search } from 'lucide-react';

type Status = 'nunca' | 'sem-regulacao' | 'regulando';

const PERIODOS = [7, 15, 30, 60];

function formatarData(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatarMinutos(min: number) {
  if (min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export default function UsoPortal() {
  const { perfilAtivo, regulador } = useRegulador();
  const perfilNorm = (perfilAtivo ?? regulador?.perfil ?? '').toLowerCase();
  const isAdminOuMonitor = perfilNorm.includes('administrador') || perfilNorm.includes('monitoramento');

  const [dias, setDias] = useState(15);
  const [busca, setBusca] = useState('');
  const [somenteSemRegulacao, setSomenteSemRegulacao] = useState(false);

  const { data = [], isLoading, refetch, isFetching } = trpc.usoPortal.relatorio.useQuery(
    { dias },
    { enabled: isAdminOuMonitor }
  );

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const comStatus = data.map(l => {
      const status: Status = !l.ultimaAtividadePortal && !l.ultimaAtividadeRegulacao
        ? 'nunca'
        : (l.checkins + l.conclusoes === 0 ? 'sem-regulacao' : 'regulando');
      return { ...l, status };
    });
    const ordem: Record<Status, number> = { nunca: 0, 'sem-regulacao': 1, regulando: 2 };
    return comStatus
      .filter(l => !termo || l.nome.toLowerCase().includes(termo) || l.email.includes(termo))
      .filter(l => !somenteSemRegulacao || l.status !== 'regulando')
      .sort((a, b) => ordem[a.status] - ordem[b.status] || (a.conclusoes + a.checkins) - (b.conclusoes + b.checkins) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [data, busca, somenteSemRegulacao]);

  const resumo = useMemo(() => ({
    total: data.length,
    nunca: data.filter(l => !l.ultimaAtividadePortal && !l.ultimaAtividadeRegulacao).length,
    semRegulacao: data.filter(l => (l.ultimaAtividadePortal || l.ultimaAtividadeRegulacao) && l.checkins + l.conclusoes === 0).length,
    regulando: data.filter(l => l.checkins + l.conclusoes > 0).length,
  }), [data]);

  const exportarCsv = () => {
    const cab = ['Nome', 'E-mail', 'Perfil', 'Status', 'Sessões', 'Tempo no portal (min)', 'Última atividade no portal', 'Check-ins', 'Agendas concluídas', 'Última atividade de regulação'];
    const rotulo: Record<Status, string> = { nunca: 'Nunca acessou', 'sem-regulacao': 'Sem regulação no período', regulando: 'Regulando' };
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const corpo = linhas.map(l => [l.nome, l.email, l.perfil ?? '', rotulo[l.status], l.sessoes, l.minutosNoPortal,
      formatarData(l.ultimaAtividadePortal), l.checkins, l.conclusoes, formatarData(l.ultimaAtividadeRegulacao)]);
    const csv = '\uFEFF' + [cab, ...corpo].map(r => r.map(esc).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `uso-portal-${dias}dias.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdminOuMonitor) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Acesso restrito a administradores e monitores.
      </div>
    );
  }

  const badge = (status: Status) => {
    if (status === 'nunca') return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300">Nunca acessou</span>;
    if (status === 'sem-regulacao') return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">Sem regulação no período</span>;
    return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">Regulando</span>;
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Uso do Portal</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Atividade de cada regulador ativo: tempo de uso do portal e regulação efetiva (check-ins e agendas concluídas).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportarCsv} disabled={linhas.length === 0}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
              <Download size={12} /> Exportar CSV
            </button>
            <button onClick={() => refetch()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors">
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-xs text-muted-foreground">Período:</span>
          {PERIODOS.map(p => (
            <button key={p} onClick={() => setDias(p)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${dias === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              {p} dias
            </button>
          ))}
          <div className="relative ml-2">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar regulador..."
              className="text-xs pl-7 pr-2 py-1 rounded-md border border-border bg-background w-52" />
          </div>
          <button onClick={() => setSomenteSemRegulacao(v => !v)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${somenteSemRegulacao ? 'bg-amber-600 text-white border-amber-600' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            Só quem não está regulando
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Reguladores ativos', valor: resumo.total, cor: 'text-foreground' },
            { label: `Regulando (${dias}d)`, valor: resumo.regulando, cor: 'text-green-600 dark:text-green-400' },
            { label: `Sem regulação (${dias}d)`, valor: resumo.semRegulacao, cor: 'text-amber-600 dark:text-amber-400' },
            { label: 'Nunca acessaram', valor: resumo.nunca, cor: 'text-red-600 dark:text-red-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <div className={`text-2xl font-semibold ${c.cor}`}>{isLoading ? '…' : c.valor}</div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground text-sm">
            <Loader2 size={18} className="animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-secondary">
                <tr>
                  {['Regulador', 'Status', 'Sessões', 'Tempo no portal', 'Última atividade no portal', 'Check-ins', 'Concluídas', 'Última regulação'].map((h, i) => (
                    <th key={h} className={`px-3 py-2.5 text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum regulador encontrado.</td></tr>
                ) : linhas.map(l => (
                  <tr key={l.email} className="border-b border-border hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{l.nome}</div>
                      <div className="text-xs text-muted-foreground">{l.email}</div>
                    </td>
                    <td className="px-3 py-2 text-center">{badge(l.status)}</td>
                    <td className="px-3 py-2 text-center text-xs">{l.sessoes || '—'}</td>
                    <td className="px-3 py-2 text-center text-xs">{formatarMinutos(l.minutosNoPortal)}</td>
                    <td className="px-3 py-2 text-center text-xs">{formatarData(l.ultimaAtividadePortal)}</td>
                    <td className="px-3 py-2 text-center text-xs font-medium">{l.checkins || '—'}</td>
                    <td className="px-3 py-2 text-center text-xs font-medium">{l.conclusoes || '—'}</td>
                    <td className="px-3 py-2 text-center text-xs">{formatarData(l.ultimaAtividadeRegulacao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Observação: o histórico de check-ins passou a ser gravado de forma permanente a partir desta atualização.
          Dados anteriores incluem apenas as agendas concluídas que ainda estavam registradas e os check-ins das últimas 24h.
        </p>
      </div>
    </div>
  );
}
