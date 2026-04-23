import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRegulador } from '@/contexts/ReguladorContext';
import { ExternalLink, RefreshCw, Search, FileText, BookOpen, ListChecks, ScrollText, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useIsAdmin() {
  const { perfilAtivo } = useRegulador();
  const perfil = perfilAtivo?.toLowerCase() ?? '';
  return ['administrador', 'admin', 'monitor', 'monitoramento'].some(p => perfil.includes(p));
}

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

// ─── Modal genérico ───────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Listas de Prioridades ────────────────────────────────────────────────────

type Prioridade = { id: number; grandeGrupo: string | null; nomeArquivo: string | null; linkUrl: string | null };

function PrioridadesTab() {
  const isAdmin = useIsAdmin();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Form state
  const [formGrupo, setFormGrupo] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formUrl, setFormUrl] = useState('');

  const utils = trpc.useUtils();
  const { data: lista = [], isLoading } = trpc.prioridades.getAll.useQuery();

  const criarMutation = trpc.prioridades.criar.useMutation({
    onSuccess: () => {
      toast.success('Prioridade criada com sucesso');
      utils.prioridades.getAll.invalidate();
      setShowModal(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const atualizarMutation = trpc.prioridades.atualizar.useMutation({
    onSuccess: () => {
      toast.success('Prioridade atualizada');
      utils.prioridades.getAll.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const excluirMutation = trpc.prioridades.excluir.useMutation({
    onSuccess: () => {
      toast.success('Prioridade excluída');
      utils.prioridades.getAll.invalidate();
      setConfirmDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const syncMutation = trpc.prioridades.sync.useMutation({
    onSuccess: () => {
      toast.success('Prioridades sincronizadas');
      utils.prioridades.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setFormGrupo('');
    setFormNome('');
    setFormUrl('');
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(item: Prioridade) {
    setEditingId(item.id);
    setFormGrupo(item.grandeGrupo ?? '');
    setFormNome(item.nomeArquivo ?? '');
    setFormUrl(item.linkUrl ?? '');
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    criarMutation.mutate({ grandeGrupo: formGrupo, nomeArquivo: formNome, linkUrl: formUrl });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (editingId === null) return;
    atualizarMutation.mutate({ id: editingId, grandeGrupo: formGrupo, nomeArquivo: formNome, linkUrl: formUrl });
  }

  const grupos = useMemo(() => {
    const filtered = lista.filter(item => {
      const term = search.toLowerCase();
      return !term || item.nomeArquivo?.toLowerCase().includes(term) || item.grandeGrupo?.toLowerCase().includes(term);
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
  const totalListas = lista.length;

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">
          {totalListas} listas em {totalGrupos} grupos
        </p>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin mr-1.5' : 'mr-1.5'} />
                Sincronizar
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus size={14} className="mr-1.5" />
                Nova Prioridade
              </Button>
            </>
          )}
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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Carregando listas...</p>
          </div>
        </div>
      ) : totalGrupos === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma lista encontrada</p>
          {isAdmin && <p className="text-sm mt-1">Use o botão "Nova Prioridade" para adicionar.</p>}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grupos)
            .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
            .map(([grupo, itens]) => {
              const colorClass = GROUP_COLORS[grupo] || 'bg-muted border-border text-muted-foreground';
              return (
                <div key={grupo}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>{grupo}</span>
                    <span className="text-xs text-muted-foreground">{itens.length} {itens.length === 1 ? 'lista' : 'listas'}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {itens.map(item => (
                      <div key={item.id} className="group relative">
                        {editingId === item.id ? (
                          <form onSubmit={handleUpdate} className="p-3 bg-card border-2 border-primary rounded-lg space-y-2">
                            <input
                              value={formGrupo}
                              onChange={e => setFormGrupo(e.target.value)}
                              placeholder="Grande Grupo"
                              className="w-full text-xs border border-border rounded px-2 py-1 bg-input text-foreground"
                              required
                            />
                            <input
                              value={formNome}
                              onChange={e => setFormNome(e.target.value)}
                              placeholder="Nome do arquivo"
                              className="w-full text-xs border border-border rounded px-2 py-1 bg-input text-foreground"
                              required
                            />
                            <input
                              value={formUrl}
                              onChange={e => setFormUrl(e.target.value)}
                              placeholder="URL (opcional)"
                              className="w-full text-xs border border-border rounded px-2 py-1 bg-input text-foreground"
                            />
                            <div className="flex gap-1 justify-end">
                              <button type="button" onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={14} /></button>
                              <button type="submit" disabled={atualizarMutation.isPending} className="p-1 text-green-600 hover:text-green-700"><Check size={14} /></button>
                            </div>
                          </form>
                        ) : (
                          <a
                            href={item.linkUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-start gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary hover:shadow-md transition-all duration-150 ${!item.linkUrl ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                          >
                            <FileText size={18} className="text-muted-foreground group-hover:text-primary mt-0.5 shrink-0 transition-colors" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-card-foreground group-hover:text-primary leading-snug transition-colors">
                                {item.nomeArquivo ? formatNomeArquivo(item.nomeArquivo) : 'Sem título'}
                              </p>
                              {!item.linkUrl && <p className="text-xs text-muted-foreground mt-1">Link não disponível</p>}
                            </div>
                            <ExternalLink size={14} className="text-muted-foreground/50 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                          </a>
                        )}
                        {isAdmin && editingId !== item.id && (
                          <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                            <button
                              onClick={(e) => { e.preventDefault(); openEdit(item); }}
                              className="p-1 bg-card border border-border rounded text-muted-foreground hover:text-primary hover:border-primary transition-colors shadow-sm"
                              title="Editar"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); setConfirmDeleteId(item.id); }}
                              className="p-1 bg-card border border-border rounded text-muted-foreground hover:text-red-600 hover:border-red-300 transition-colors shadow-sm"
                              title="Excluir"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Modal criar */}
      {showModal && (
        <Modal title="Nova Prioridade" onClose={() => { setShowModal(false); resetForm(); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Grande Grupo *</label>
              <Input value={formGrupo} onChange={e => setFormGrupo(e.target.value)} placeholder="Ex: Cardiologia" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nome do Arquivo *</label>
              <Input value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Ex: Prioridades_Cardiologia" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">URL do documento</label>
              <Input value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://drive.google.com/..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</Button>
              <Button type="submit" disabled={criarMutation.isPending}>
                {criarMutation.isPending ? 'Salvando...' : 'Criar Prioridade'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmação exclusão */}
      {confirmDeleteId !== null && (
        <Modal title="Confirmar exclusão" onClose={() => setConfirmDeleteId(null)}>
          <p className="text-sm text-muted-foreground mb-4">Tem certeza que deseja excluir esta prioridade? Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => excluirMutation.mutate({ id: confirmDeleteId! })} disabled={excluirMutation.isPending}>
              {excluirMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Protocolos ───────────────────────────────────────────────────────────────

type Protocolo = { id: number; nome: string; linkUrl: string | null };

function ProtocolosTab() {
  const isAdmin = useIsAdmin();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Form state
  const [formNome, setFormNome] = useState('');
  const [formUrl, setFormUrl] = useState('');

  const utils = trpc.useUtils();
  const { data: protocolos = [], isLoading } = trpc.protocolos.getAll.useQuery();

  const criarMutation = trpc.protocolos.criar.useMutation({
    onSuccess: () => {
      toast.success('Protocolo criado com sucesso');
      utils.protocolos.getAll.invalidate();
      setShowModal(false);
      setFormNome('');
      setFormUrl('');
    },
    onError: (e) => toast.error(e.message),
  });

  const atualizarMutation = trpc.protocolos.atualizar.useMutation({
    onSuccess: () => {
      toast.success('Protocolo atualizado');
      utils.protocolos.getAll.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const excluirMutation = trpc.protocolos.excluir.useMutation({
    onSuccess: () => {
      toast.success('Protocolo excluído');
      utils.protocolos.getAll.invalidate();
      setConfirmDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  function openEdit(p: Protocolo) {
    setEditingId(p.id);
    setFormNome(p.nome);
    setFormUrl(p.linkUrl ?? '');
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    criarMutation.mutate({ nome: formNome, linkUrl: formUrl });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (editingId === null) return;
    atualizarMutation.mutate({ id: editingId, nome: formNome, linkUrl: formUrl });
  }

  const filtered = protocolos.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">
          {protocolos.length} protocolo{protocolos.length !== 1 ? 's' : ''} disponíve{protocolos.length !== 1 ? 'is' : 'l'}
        </p>
        {isAdmin && (
          <Button size="sm" onClick={() => { setFormNome(''); setFormUrl(''); setShowModal(true); }}>
            <Plus size={14} className="mr-1.5" />
            Novo Protocolo
          </Button>
        )}
      </div>

      {/* Busca */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar protocolo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Carregando protocolos...</p>
          </div>
        </div>
      )}

      {!isLoading && protocolos.length === 0 && (
        <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
          <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum protocolo cadastrado</p>
          {isAdmin && <p className="text-muted-foreground/70 text-sm mt-1">Use o botão "Novo Protocolo" para adicionar.</p>}
        </div>
      )}

      {!isLoading && protocolos.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
          <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum protocolo encontrado para "{search}"</p>
          <p className="text-muted-foreground/70 text-sm mt-1">Tente uma busca diferente</p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(protocolo => (
            <div key={protocolo.id} className="group relative">
              {editingId === protocolo.id ? (
                <form onSubmit={handleUpdate} className="p-4 bg-card border-2 border-primary rounded-xl space-y-3">
                  <input
                    value={formNome}
                    onChange={e => setFormNome(e.target.value)}
                    placeholder="Nome do protocolo"
                    className="w-full text-sm border border-border rounded px-2 py-1.5 bg-input text-foreground"
                    required
                  />
                  <input
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    placeholder="URL (opcional)"
                    className="w-full text-sm border border-border rounded px-2 py-1.5 bg-input text-foreground"
                  />
                  <div className="flex gap-1 justify-end">
                    <button type="button" onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:text-foreground"><X size={14} /></button>
                    <button type="submit" disabled={atualizarMutation.isPending} className="p-1.5 text-green-600 hover:text-green-700"><Check size={14} /></button>
                  </div>
                </form>
              ) : protocolo.linkUrl ? (
                <a
                  href={protocolo.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="mt-0.5 p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors flex-shrink-0">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground group-hover:text-primary transition-colors leading-snug">
                      {protocolo.nome}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Abrir protocolo</span>
                    </div>
                  </div>
                </a>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-muted/30 border border-border rounded-xl opacity-60">
                  <div className="mt-0.5 p-2 bg-muted rounded-lg flex-shrink-0">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground leading-snug">{protocolo.nome}</p>
                    <span className="text-xs text-muted-foreground/70 mt-1 block">Sem link disponível</span>
                  </div>
                </div>
              )}

              {isAdmin && editingId !== protocolo.id && (
                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                  <button
                    onClick={(e) => { e.preventDefault(); openEdit(protocolo); }}
                    className="p-1 bg-card border border-border rounded text-muted-foreground hover:text-primary hover:border-primary transition-colors shadow-sm"
                    title="Editar"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setConfirmDeleteId(protocolo.id); }}
                    className="p-1 bg-card border border-border rounded text-muted-foreground hover:text-red-600 hover:border-red-300 transition-colors shadow-sm"
                    title="Excluir"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal criar */}
      {showModal && (
        <Modal title="Novo Protocolo" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nome do Protocolo *</label>
              <Input value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Ex: Protocolo de Cardiologia" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">URL do documento</label>
              <Input value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://drive.google.com/..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={criarMutation.isPending}>
                {criarMutation.isPending ? 'Salvando...' : 'Criar Protocolo'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmação exclusão */}
      {confirmDeleteId !== null && (
        <Modal title="Confirmar exclusão" onClose={() => setConfirmDeleteId(null)}>
          <p className="text-sm text-muted-foreground mb-4">Tem certeza que deseja excluir este protocolo? Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => excluirMutation.mutate({ id: confirmDeleteId! })} disabled={excluirMutation.isPending}>
              {excluirMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Página unificada ─────────────────────────────────────────────────────────

export default function Documentos() {
  return (
    <div className="min-h-screen bg-background p-8">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Documentos</h1>
        <p className="text-muted-foreground mt-2">
          Listas de prioridades e protocolos clínicos de referência
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="prioridades">
        <TabsList className="mb-6">
          <TabsTrigger value="prioridades" className="flex items-center gap-2">
            <ListChecks size={15} />
            Listas de Prioridades
          </TabsTrigger>
          <TabsTrigger value="protocolos" className="flex items-center gap-2">
            <ScrollText size={15} />
            Protocolos Clínicos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prioridades">
          <PrioridadesTab />
        </TabsContent>

        <TabsContent value="protocolos">
          <ProtocolosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
