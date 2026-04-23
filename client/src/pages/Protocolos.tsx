import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { FileText, ExternalLink, Search, BookOpen, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Protocolos() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editLink, setEditLink] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoLink, setNovoLink] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data: protocolos = [], isLoading, refetch } = trpc.protocolos.getAll.useQuery();
  const utils = trpc.useUtils();

  const isAdmin = (() => {
    const perfil = (user as { perfil?: string } | null)?.perfil?.toLowerCase() ?? '';
    return ['administrador', 'admin', 'monitor', 'monitoramento'].some(p => perfil.includes(p));
  })();

  const criarMutation = trpc.protocolos.criar.useMutation({
    onSuccess: () => {
      toast.success("Protocolo criado com sucesso!");
      setShowModal(false);
      setNovoNome("");
      setNovoLink("");
      utils.protocolos.getAll.invalidate();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const atualizarMutation = trpc.protocolos.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Protocolo atualizado!");
      setEditingId(null);
      utils.protocolos.getAll.invalidate();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const excluirMutation = trpc.protocolos.excluir.useMutation({
    onSuccess: () => {
      toast.success("Protocolo excluído!");
      setConfirmDeleteId(null);
      utils.protocolos.getAll.invalidate();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const filtered = protocolos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (p: { id: number; nome: string; linkUrl: string | null }) => {
    setEditingId(p.id);
    setEditNome(p.nome);
    setEditLink(p.linkUrl ?? "");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-950/50 rounded-lg">
            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Protocolos Clínicos</h1>
            <p className="text-sm text-muted-foreground">
              {protocolos.length} protocolo{protocolos.length !== 1 ? "s" : ""} disponíve{protocolos.length !== 1 ? "is" : "l"}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Protocolo
          </Button>
        )}
      </div>

      {/* Campo de busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar protocolo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Estado de carregamento */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Carregando protocolos...</p>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {!isLoading && protocolos.length === 0 && (
        <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
          <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum protocolo cadastrado</p>
          {isAdmin && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowModal(true)}
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Protocolo
            </Button>
          )}
        </div>
      )}

      {/* Sem resultados na busca */}
      {!isLoading && protocolos.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
          <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum protocolo encontrado para "{search}"</p>
          <p className="text-muted-foreground/70 text-sm mt-1">Tente uma busca diferente</p>
        </div>
      )}

      {/* Grid de protocolos */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((protocolo) => (
            editingId === protocolo.id ? (
              /* Card em modo edição */
              <div key={protocolo.id} className="flex flex-col gap-2 p-4 bg-card border-2 border-primary rounded-xl">
                <Input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Nome do protocolo"
                  className="text-sm"
                />
                <Input
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  placeholder="URL (opcional)"
                  className="text-sm"
                />
                <div className="flex gap-2 mt-1">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1"
                    disabled={atualizarMutation.isPending || !editNome.trim()}
                    onClick={() => atualizarMutation.mutate({ id: protocolo.id, nome: editNome.trim(), linkUrl: editLink.trim() })}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : confirmDeleteId === protocolo.id ? (
              /* Card em modo confirmação de exclusão */
              <div key={protocolo.id} className="flex flex-col gap-2 p-4 bg-destructive/10 border-2 border-destructive rounded-xl">
                <p className="text-sm font-medium text-destructive">Excluir "{protocolo.nome}"?</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    disabled={excluirMutation.isPending}
                    onClick={() => excluirMutation.mutate({ id: protocolo.id })}
                  >
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : protocolo.linkUrl ? (
              /* Card normal com link */
              <div key={protocolo.id} className="group relative flex items-start gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:shadow-md transition-all duration-200">
                <a
                  href={protocolo.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 flex-1 min-w-0"
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
                      <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        Abrir protocolo
                      </span>
                    </div>
                  </div>
                </a>
                {isAdmin && (
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => startEdit(protocolo)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(protocolo.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Card sem link */
              <div key={protocolo.id} className="group relative flex items-start gap-3 p-4 bg-muted/30 border border-border rounded-xl">
                <div className="mt-0.5 p-2 bg-muted rounded-lg flex-shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground leading-snug">
                    {protocolo.nome}
                  </p>
                  <span className="text-xs text-muted-foreground/70 mt-1 block">Sem link disponível</span>
                </div>
                {isAdmin && (
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => startEdit(protocolo)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(protocolo.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      )}

      {/* Modal de criação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Novo Protocolo</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nome do protocolo *</label>
                <Input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Cardiologia Adulto"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">URL do protocolo</label>
                <Input
                  value={novoLink}
                  onChange={(e) => setNovoLink(e.target.value)}
                  placeholder="https://..."
                  type="url"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                className="flex-1"
                disabled={criarMutation.isPending || !novoNome.trim()}
                onClick={() => criarMutation.mutate({ nome: novoNome.trim(), linkUrl: novoLink.trim() })}
              >
                {criarMutation.isPending ? "Salvando..." : "Criar Protocolo"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
