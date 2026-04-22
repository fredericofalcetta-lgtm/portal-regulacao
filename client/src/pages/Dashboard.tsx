import { useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Clock, CheckCircle, RefreshCw, History } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useTheme } from '@/contexts/ThemeContext';

interface DashboardProps {
  data: (string | number)[][];
  onRefresh?: () => void;
}

export default function Dashboard({ data, onRefresh }: DashboardProps) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Verificar perfil do usuário para controle de acesso ao botão de sincronização
  // O campo perfil pode conter valores compostos como "ADMINISTRADOR, REGULADOR"
  const { data: accessData } = trpc.auth.checkAccess.useQuery();
  const perfil = accessData?.regulador?.perfil?.toLowerCase() ?? '';
  const podeSync = perfil.includes('administrador') || perfil.includes('monitoramento');

  const syncMutation = trpc.sheets.syncAll.useMutation({
    onMutate: () => setSyncStatus('syncing'),
    onSuccess: () => {
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
      if (onRefresh) onRefresh();
    },
    onError: () => {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    },
  });

  const { data: syncHistory } = trpc.sheets.getSyncHistory.useQuery();

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRecords = data.length;
    const totalCotas = data.reduce((sum, row) => sum + (parseFloat(String(row[2])) || 0), 0);
    const totalSaldo = data.reduce((sum, row) => sum + (parseFloat(String(row[3])) || 0), 0);
    const totalAguardando = data.reduce((sum, row) => sum + (parseFloat(String(row[4])) || 0), 0);
    const avgIndexRegula = totalRecords > 0
      ? data.reduce((sum, row) => sum + (parseFloat(String(row[7])) || 0), 0) / totalRecords
      : 0;

    return { totalRecords, totalCotas, totalSaldo, totalAguardando, avgIndexRegula };
  }, [data]);

  // [8]>7d [9]>28d [10]>90d [11]central [12]especialidade [13]flags [14]id
  const especialidadesData = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(row => {
      const esp = String(row[12]);
      map.set(esp, (map.get(esp) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  const centraisData = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(row => {
      const central = String(row[11]);
      map.set(central, (map.get(central) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const indexDistribution = useMemo(() => {
    const ranges = [
      { range: '> 3', count: 0, color: '#dc2626' },
      { range: '2-3', count: 0, color: '#ea580c' },
      { range: '1-2', count: 0, color: '#eab308' },
      { range: '≤ 1', count: 0, color: '#6b7280' },
    ];
    data.forEach(row => {
      const value = parseFloat(String(row[7])) || 0;
      if (value > 3) ranges[0].count++;
      else if (value > 2) ranges[1].count++;
      else if (value > 1) ranges[2].count++;
      else ranges[3].count++;
    });
    return ranges;
  }, [data]);

  // Totais de pacientes aguardando por faixa de tempo
  const aguardandoFaixas = useMemo(() => {
    const total7d = data.reduce((sum, row) => sum + (parseFloat(String(row[8])) || 0), 0);
    const total28d = data.reduce((sum, row) => sum + (parseFloat(String(row[9])) || 0), 0);
    const total90d = data.reduce((sum, row) => sum + (parseFloat(String(row[10])) || 0), 0);
    return { total7d, total28d, total90d };
  }, [data]);

  const syncButtonLabel = {
    idle: 'Sincronizar Agora',
    syncing: 'Sincronizando...',
    success: 'Sincronizado!',
    error: 'Erro na sincronização',
  }[syncStatus];

  const syncButtonColor = {
    idle: 'bg-blue-600 hover:bg-blue-700',
    syncing: 'bg-blue-400 cursor-not-allowed',
    success: 'bg-green-600',
    error: 'bg-red-600',
  }[syncStatus];

  // Cores dos gráficos adaptadas ao tema
  const chartAxisColor = isDark ? '#8B949E' : '#6b7280';
  const chartGridColor = isDark ? '#30363D' : '#e5e7eb';
  const tooltipStyle = isDark
    ? { backgroundColor: '#1C2333', border: '1px solid #30363D', color: '#E2E8F0' }
    : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', color: '#1f2937' };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Visão geral das regulações de encaminhamentos</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {podeSync && (
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncStatus === 'syncing'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${syncButtonColor}`}
            >
              <RefreshCw size={16} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
              {syncButtonLabel}
            </button>
          )}
          <p className="text-xs text-muted-foreground">Atualização automática diária às 08:30</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {[
          { label: 'Total de Registros', value: metrics.totalRecords.toLocaleString('pt-BR'), icon: Users, color: 'text-blue-500' },
          { label: 'Total de Cotas', value: metrics.totalCotas.toLocaleString('pt-BR'), icon: TrendingUp, color: 'text-green-500' },
          { label: 'Saldo Disponível', value: metrics.totalSaldo.toLocaleString('pt-BR'), icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'Aguardando', value: metrics.totalAguardando.toLocaleString('pt-BR'), icon: Clock, color: 'text-orange-500' },
          { label: 'Índice Médio', value: metrics.avgIndexRegula.toFixed(2), icon: TrendingUp, color: 'text-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">{label}</p>
                <p className="text-2xl font-bold text-card-foreground mt-2">{value}</p>
              </div>
              <Icon className={color} size={32} />
            </div>
          </div>
        ))}
      </div>

      {/* Faixas de Tempo de Espera */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Aguardando >7 dias', value: aguardandoFaixas.total7d.toLocaleString('pt-BR'), color: 'text-yellow-500', bg: 'border-yellow-200 dark:border-yellow-900' },
          { label: 'Aguardando >28 dias', value: aguardandoFaixas.total28d.toLocaleString('pt-BR'), color: 'text-orange-500', bg: 'border-orange-200 dark:border-orange-900' },
          { label: 'Aguardando >90 dias', value: aguardandoFaixas.total90d.toLocaleString('pt-BR'), color: 'text-red-500', bg: 'border-red-200 dark:border-red-900' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`bg-card border ${bg} rounded-lg shadow-sm p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
              <Clock className={color} size={28} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Top 10 Especialidades</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={especialidadesData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12, fill: chartAxisColor }} />
              <YAxis tick={{ fill: chartAxisColor }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Distribuição por Central</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={centraisData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12, fill: chartAxisColor }} />
              <YAxis tick={{ fill: chartAxisColor }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Index Distribution + Sync History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Distribuição de Índice Regula</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={indexDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, count }) => `${range}: ${count}`}
                  outerRadius={90}
                  dataKey="count"
                >
                  {indexDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Resumo por Índice</h2>
            <div className="space-y-3">
              {indexDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-foreground font-medium">{item.range}</span>
                  </div>
                  <span className="text-foreground font-bold">{item.count.toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sync History */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <History size={20} className="text-muted-foreground" />
            <h2 className="text-lg font-semibold text-card-foreground">Histórico de Sincronizações</h2>
          </div>
          {syncHistory && syncHistory.length > 0 ? (
            <div className="space-y-3">
              {syncHistory.map((log) => (
                <div key={log.id} className="flex items-start justify-between border-b border-border pb-3 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                      />
                      <span className="text-sm font-medium text-card-foreground">
                        {log.status === 'success' ? `${log.rowCount?.toLocaleString('pt-BR')} registros` : 'Erro'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{log.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(log.syncedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhuma sincronização registrada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
