import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useRegulador } from "@/contexts/ReguladorContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Search, RotateCcw, Save, ChevronDown, Link2, BookOpen, ListChecks, MessageSquare, ExternalLink, Plus, Trash2 } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Agenda {
  id: number;
  agenda: string | null;
  municipio: string | null;
  central: string | null;
  especialidade: string | null;
}
function agendaNome(a: Agenda): string { return (a.agenda ?? "").trim() || "(sem nome)"; }
function deduplicarPorNome(agendas: Agenda[]): Agenda[] {
  const seen = new Set<string>();
  return agendas.filter(a => { const n = agendaNome(a); if (seen.has(n)) return false; seen.add(n); return true; });
}

function NomeSelectDropdown({
  options,
  selected,
  onToggle,
  placeholder = "Buscar agenda...",
  showEspecialidade = false,
}: NomeSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Calcular posição do dropdown (para cima ou para baixo)
  const calcDropdownStyle = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const desiredHeight = 400;
    const spaceBelow = viewportHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;

    if (spaceBelow >= desiredHeight || spaceBelow >= spaceAbove) {
      // Abrir para baixo
      setDropdownStyle({
        position: "fixed",
        zIndex: 9999,
        width: rect.width,
        top: rect.bottom + 4,
        left: rect.left,
        maxHeight: Math.min(spaceBelow, desiredHeight),
      });
    } else {
      // Abrir para cima
      setDropdownStyle({
        position: "fixed",
        zIndex: 9999,
        width: rect.width,
        bottom: viewportHeight - rect.top + 4,
        left: rect.left,
        maxHeight: Math.min(spaceAbove, desiredHeight),
      });
    }
  }, []);

  function handleOpen() {
    calcDropdownStyle();
    setOpen(v => !v);
  }

  // Deduplicar e filtrar por busca
  const dedupOptions = useMemo(() => deduplicarPorNome(options), [options]);

  const filteredOptions = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return dedupOptions;
    return dedupOptions.filter(a => agendaNome(a).toLowerCase().includes(q));
  }, [dedupOptions, search]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between border rounded-md px-3 py-2 text-sm bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-500">{placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="bg-white border rounded-md shadow-lg flex flex-col"
          style={dropdownStyle}
        >
          {/* Campo de busca */}
          <div className="p-2 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome da agenda..."
                className="pl-7 h-8 text-sm"
              />
            </div>
          </div>

          {/* Lista com scroll */}
          <div className="overflow-y-auto flex-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-gray-400 text-center">Nenhuma agenda encontrada</div>
            ) : (
              filteredOptions.map(a => {
                const nome = agendaNome(a);
                const isSelected = selected.has(nome);
                return (
                  <button
                    key={nome}
                    type="button"
                    onClick={() => onToggle(nome)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${isSelected ? "bg-blue-50" : ""}`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}>
                      {isSelected && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className="truncate flex-1">{nome}</span>
                    {showEspecialidade && a.especialidade && (
                      <span className="text-xs text-gray-400 flex-shrink-0">{a.especialidade}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Rodapé */}
          <div className="p-2 border-t text-xs text-gray-400 text-right flex-shrink-0">
            {selected.size} selecionada(s) · {filteredOptions.length} disponíveis
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
type TabId = "agendas-mesma" | "agendas-outras" | "protocolos" | "observacoes";

export default function AgendasRelacionadas() {
  const { perfilAtivo, regulador } = useRegulador();
  const perfil = (perfilAtivo ?? regulador?.perfil ?? "").toLowerCase();
  const isAdmin = perfil.includes("administrador") || perfil.includes("monitoramento");

  const [agendaSelecionadaId, setAgendaSelecionadaId] = useState<number | null>(null);
  const [searchAgendaPrincipal, setSearchAgendaPrincipal] = useState("");
  const [openAgendaPrincipal, setOpenAgendaPrincipal] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<TabId>("agendas-mesma");
  const refAgendaPrincipal = useRef<HTMLDivElement>(null);

  const { data: todasAgendas = [] } = trpc.agendasRelacionadas.listarTodasAgendas.useQuery();

  const agendaSelecionada = useMemo(
    () => todasAgendas.find(a => a.id === agendaSelecionadaId) ?? null,
    [todasAgendas, agendaSelecionadaId]
  );

  const agendasDeduplicadas = useMemo(() => deduplicarPorNome(todasAgendas), [todasAgendas]);
  const agendasFiltradas = useMemo(() => {
    const q = searchAgendaPrincipal.toLowerCase();
    if (!q) return agendasDeduplicadas;
    return agendasDeduplicadas.filter(a => agendaNome(a).toLowerCase().includes(q));
  }, [agendasDeduplicadas, searchAgendaPrincipal]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (refAgendaPrincipal.current && !refAgendaPrincipal.current.contains(e.target as Node)) setOpenAgendaPrincipal(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Suporte a inicialização via URL param ?agenda=NOME
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nomeParam = params.get("agenda");
    if (nomeParam && todasAgendas.length > 0) {
      const found = todasAgendas.find(a => agendaNome(a) === nomeParam);
      if (found) setAgendaSelecionadaId(found.id);
    }
  }, [todasAgendas]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Acesso restrito a Administradores e Monitoramento.</p>
      </div>
    );
  }

  const ABAS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "agendas-mesma", label: "Mesma especialidade", icon: <Link2 size={14} /> },
    { id: "agendas-outras", label: "Outras especialidades", icon: <Link2 size={14} /> },
    { id: "protocolos", label: "Protocolos e Prioridades", icon: <BookOpen size={14} /> },
    { id: "observacoes", label: "Observações", icon: <MessageSquare size={14} /> },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Link2 className="w-6 h-6 text-blue-600" />Agendas Relacionadas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure agendas relacionadas, protocolos e observações por agenda.
        </p>
      </div>

      {/* Seletor de agenda */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6 shadow-sm">
        <label className="block text-sm font-medium text-foreground mb-2">Agenda a configurar</label>
        <div className="relative" ref={refAgendaPrincipal}>
          <button onClick={() => setOpenAgendaPrincipal(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2.5 border border-border rounded-md bg-background text-sm hover:bg-muted/50 transition-colors">
            {agendaSelecionada ? (
              <span className="font-medium text-foreground">{agendaNome(agendaSelecionada)}</span>
            ) : (
              <span className="text-muted-foreground">Selecionar agenda...</span>
            )}
            <ChevronDown size={16} className={`text-muted-foreground transition-transform ${openAgendaPrincipal ? "rotate-180" : ""}`} />
          </button>
          {openAgendaPrincipal && (
            <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-xl">
              <div className="p-2 border-b border-border">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary">
                  <Search size={13} className="text-muted-foreground" />
                  <input autoFocus value={searchAgendaPrincipal} onChange={e => setSearchAgendaPrincipal(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    placeholder="Buscar agenda..." />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {agendasFiltradas.slice(0, 100).map(a => (
                  <button key={a.id} onClick={() => { setAgendaSelecionadaId(a.id); setOpenAgendaPrincipal(false); setSearchAgendaPrincipal(""); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${agendaSelecionada && agendaNome(agendaSelecionada) === agendaNome(a) ? "bg-primary/10 font-medium" : ""}`}>
                    {agendaNome(a)}
                    {a.especialidade && <span className="ml-2 text-xs text-muted-foreground">{a.especialidade}</span>}
                  </button>
                ))}
                {agendasFiltradas.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhuma agenda encontrada</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Área de configuração com abas */}
      {agendaSelecionada ? (
        <div className="bg-card border border-border rounded-lg shadow-sm">
          {/* Header da agenda */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-foreground">{agendaNome(agendaSelecionada)}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{agendaSelecionada.especialidade ?? "Sem especialidade"}</p>
          </div>

          {/* Abas */}
          <div className="flex border-b border-border overflow-x-auto">
            {ABAS.map(aba => (
              <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${abaAtiva === aba.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {aba.icon}{aba.label}
              </button>
            ))}
          </div>

          {/* Conteúdo da aba */}
          <div className="p-5">
            {(abaAtiva === "agendas-mesma" || abaAtiva === "agendas-outras") && (
              <AbaAgendasRelacionadas agendaSelecionada={agendaSelecionada} todasAgendas={todasAgendas} />
            )}
            {abaAtiva === "protocolos" && (
              <AbaProtocolos agendaSelecionada={agendaSelecionada} />
            )}
            {abaAtiva === "observacoes" && (
              <AbaObservacoes agendaSelecionada={agendaSelecionada} todasAgendas={todasAgendas} />
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          <Link2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecione uma agenda acima para configurar</p>
        </div>
      )}
    </div>
  );
}
