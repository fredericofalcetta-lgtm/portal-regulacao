import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ExternalLink, RefreshCw, Search, FileText } from 'lucide-react';

// Cores dos grupos com suporte dark mode via classes Tailwind
const GROUP_COLORS: Record<string, string> = {
  'Cardiologia': 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  'Cirurgia Buco/Estomato': 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
  'Cirurgia Geral': 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  'Cirurgia Plástica': 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
  'Cirurgia Torac/Pneumo': 'bg-lime-50 dark:bg-lime-950/40 border-lime-200 dark:border-lime-800 text-lime-700 dark:text-lime-300',
  'Cirurgia Vascular': 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
  'Dermatologia': 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300',
  'Endocrinologia': 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300',
  'Gastro/Procto': 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300',
  'Genética': 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  'Geriatria': 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
  'Ginecologia': 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300',
  'Hematologia': 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
  'Infectologia': 'bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-200 dark:border-fuchsia-800 text-fuchsia-700 dark:text-fuchsia-300',
  'Mastologia': 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300',
  'Nefrologia': 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
  'Neurologia': 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  'Oftalmologia': 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
  'Oncologia': 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  'Ortopedia': 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
  'Otorrino': 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300',
  'Reabilitação': 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300',
  'Reumatologia': 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  'Saúde Mental': 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
  'Urologia': 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300',
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
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Listas de Prioridades</h1>
          <p className="text-muted-foreground mt-2">
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
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por especialidade ou grupo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-muted-foreground text-sm">Carregando listas...</p>
          </div>
        </div>
      ) : totalGrupos === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma lista encontrada</p>
          <p className="text-sm mt-1">Tente sincronizar os dados ou ajuste a busca.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grupos)
            .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
            .map(([grupo, itens]) => {
              const colorClass = GROUP_COLORS[grupo] || 'bg-muted border-border text-muted-foreground';
              return (
                <div key={grupo}>
                  {/* Cabeçalho do grupo */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
                      {grupo}
                    </span>
                    <span className="text-xs text-muted-foreground">{itens.length} {itens.length === 1 ? 'lista' : 'listas'}</span>
                  </div>

                  {/* Cards das listas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {itens.map(item => (
                      <a
                        key={item.id}
                        href={item.linkUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group flex items-start gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary hover:shadow-md transition-all duration-150 ${!item.linkUrl ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                      >
                        <FileText size={18} className="text-muted-foreground group-hover:text-primary mt-0.5 shrink-0 transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground group-hover:text-primary leading-snug transition-colors">
                            {item.nomeArquivo ? formatNomeArquivo(item.nomeArquivo) : 'Sem título'}
                          </p>
                          {!item.linkUrl && (
                            <p className="text-xs text-muted-foreground mt-1">Link não disponível</p>
                          )}
                        </div>
                        <ExternalLink size={14} className="text-muted-foreground/50 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
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
