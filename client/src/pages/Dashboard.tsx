import { useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Clock, CheckCircle, RefreshCw, History } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface DashboardProps {
  data: (string | number)[][];
  onRefresh?: () => void;
}

export default function Dashboard({ data, onRefresh }: DashboardProps) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const syncMutation = trpc.sheets.sync.useMutation({
    onMutate: () => setSyncStatus('syncing'),
    onSuccess: (result) => {
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

  const especialidadesData = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(row => {
      const esp = String(row[9]);
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
      const central = String(row[8]);
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Visão geral das regulações de encaminhamentos</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncStatus === 'syncing'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${syncButtonColor}`}
          >
            <RefreshCw size={16} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
            {syncButtonLabel}
          </button>
          <p className="text-xs text-gray-500">Atualização automática diária às 03:00</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total de Registros</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.totalRecords.toLocaleString('pt-BR')}</p>
            </div>
            <Users className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total de Cotas</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.totalCotas.toLocaleString('pt-BR')}</p>
            </div>
            <TrendingUp className="text-green-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Saldo Disponível</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.totalSaldo.toLocaleString('pt-BR')}</p>
            </div>
            <CheckCircle className="text-emerald-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Aguardando</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.totalAguardando.toLocaleString('pt-BR')}</p>
            </div>
            <Clock className="text-orange-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Índice Médio</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.avgIndexRegula.toFixed(2)}</p>
            </div>
            <TrendingUp className="text-red-500" size={32} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Especialidades</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={especialidadesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Central</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={centraisData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Index Distribution + Sync History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Índice Regula</h2>
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo por Índice</h2>
            <div className="space-y-3">
              {indexDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-700 font-medium">{item.range}</span>
                  </div>
                  <span className="text-gray-900 font-bold">{item.count.toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sync History */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <History size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Histórico de Sincronizações</h2>
          </div>
          {syncHistory && syncHistory.length > 0 ? (
            <div className="space-y-3">
              {syncHistory.map((log) => (
                <div key={log.id} className="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                      />
                      <span className="text-sm font-medium text-gray-800">
                        {log.status === 'success' ? `${log.rowCount?.toLocaleString('pt-BR')} registros` : 'Erro'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{log.message}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                    {new Date(log.syncedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nenhuma sincronização registrada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
