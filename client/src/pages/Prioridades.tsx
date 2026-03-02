import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ExternalLink, RefreshCw, Search, FileText } from 'lucide-react';

// Ícones de cores por grupo
const GROUP_COLORS: Record<string, string> = {
  'Cardiologia': 'bg-red-50 border-red-200 text-red-700',
  'Cirurgia Buco/Estomato': 'bg-orange-50 border-orange-200 text-orange-700',
  'Cirurgia Geral': 'bg-amber-50 border-amber-200 text-amber-700',
  'Cirurgia Plástica': 'bg-yellow-50 border-yellow-200 text-yellow-700',
  'Cirurgia Torac/Pneumo': 'bg-lime-50 border-lime-200 text-lime-700',
  'Cirurgia Vascular': 'bg-green-50 border-green-200 text-green-700',
  'Dermatologia': 'bg-teal-50 border-teal-200 text-teal-700',
  'Endocrinologia': 'bg-cyan-50 border-cyan-200 text-cyan-700',
  'Gastro/Procto': 'bg-sky-50 border-sky-200 text-sky-700',
  'Genética': 'bg-blue-50 border-blue-200 text-blue-700',
  'Geriatria': 'bg-indigo-50 border-indigo-200 text-indigo-700',
  'Ginecologia': 'bg-violet-50 border-violet-200 text-violet-700',
  'Hematologia': 'bg-purple-50 border-purple-200 text-purple-700',
  'Infectologia': 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700',
  'Mastologia': 'bg-pink-50 border-pink-200 text-pink-700',
  'Nefrologia': 'bg-rose-50 border-rose-200 text-rose-700',
  'Neurologia': 'bg-red-50 border-red-200 text-red-700',
  'Oftalmologia': 'bg-orange-50 border-orange-200 text-orange-700',
  'Oncologia': 'bg-amber-50 border-amber-200 text-amber-700',
  'Ortopedia': 'bg-green-50 border-green-200 text-green-700',
  'Otorrino': 'bg-teal-50 border-teal-200 text-teal-700',
  'Reabilitação': 'bg-cyan-50 border-cyan-200 text-cyan-700',
  'Reumatologia': 'bg-blue-50 border-blue-200 text-blue-700',
  'Saúde Mental': 'bg-indigo-50 border-indigo-200 text-indigo-700',
  'Urologia': 'bg-violet-50 border-violet-200 text-violet-700',
};

function formatNomeArquivo(nome: string): string {
  return nome
    .replace(/_/g, ' ')
    .replace(/Prioridades/gi, 'Prioridades')
    .replace(/Regula[çc][aã]o?/gi, 'Regulação')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function Prioridades() {
  const [search, setSearch] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const utils = trpc.useUtils();

  const { data: lista, isLoading } = trpc.prioridades.getAll.useQuery();

  const syncMutation = trpc.prioridades.sync.useMutation({
    onMutate: () => setSyncStatus('syncing'),
    onSuccess: () => {
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
      utils.prioridades.getAll.invalidate();
    },
    onError: () => {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    },
  });

  // Agrupar por grande grupo
  const grupos = useMemo(() => {
    if (!lista) return {};
    const filtered = lista.filter(item => {
      const term = search.toLowerCase();
      return (
        !term ||
        item.nomeArquivo?.toLowerCase().includes(term) ||
        item.grandeGrupo?.toLowerCase().includes(term)
      );
    });

    const map: Record<string, typeof filtered> = {};
    filtered.forEach(item => {
      const grupo = item.grandeGrupo?.trim() || 'Outros';
      if (!map[grupo]) map[grupo] = [];
      map[grupo].push(item);
    });
    return map;
  }, [lista, search]);

  const totalGrupos = Object.keys(grupos).length;
  const totalListas = lista?.length ?? 0;

  const syncButtonLabel = {
    idle: 'Sincronizar',
    syncing: 'Sincronizando...',
    success: 'Sincronizado!',
    error: 'Erro',
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
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Listas de Prioridades</h1>
          <p className="text-gray-600 mt-2">
            {totalListas} listas em {totalGrupos} grupos — documentos do Google Drive
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncStatus === 'syncing'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${syncButtonColor}`}
          >
            <RefreshCw size={15} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
            {syncButtonLabel}
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="mb-6 relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por especialidade ou grupo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-500 text-sm">Carregando listas...</p>
          </div>
        </div>
      ) : totalGrupos === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma lista encontrada</p>
          <p className="text-sm mt-1">Tente sincronizar os dados ou ajuste a busca.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grupos)
            .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
            .map(([grupo, itens]) => {
              const colorClass = GROUP_COLORS[grupo] || 'bg-gray-50 border-gray-200 text-gray-700';
              return (
                <div key={grupo}>
                  {/* Cabeçalho do grupo */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
                      {grupo}
                    </span>
                    <span className="text-xs text-gray-400">{itens.length} {itens.length === 1 ? 'lista' : 'listas'}</span>
                  </div>

                  {/* Cards das listas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {itens.map(item => (
                      <a
                        key={item.id}
                        href={item.linkUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all duration-150 ${!item.linkUrl ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                      >
                        <FileText size={18} className="text-gray-400 group-hover:text-blue-500 mt-0.5 shrink-0 transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 leading-snug transition-colors">
                            {item.nomeArquivo ? formatNomeArquivo(item.nomeArquivo) : 'Sem título'}
                          </p>
                          {!item.linkUrl && (
                            <p className="text-xs text-gray-400 mt-1">Link não disponível</p>
                          )}
                        </div>
                        <ExternalLink size={14} className="text-gray-300 group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
