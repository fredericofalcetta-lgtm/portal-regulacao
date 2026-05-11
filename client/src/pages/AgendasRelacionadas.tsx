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

// ─── Aba: Agendas Relacionadas ────────────────────────────────────────────────
function AbaAgendasRelacionadas({ agendaSelecionada, todasAgendas }: { agendaSelecionada: Agenda; todasAgendas: Agenda[] }) {
  const utils = trpc.useUtils();
  const isDirty = useRef(false);
  const [nomesMesmaEsp, setNomesMesmaEsp] = useState<Set<string>>(new Set());
  const [nomesOutras, setNomesOutras] = useState<Set<string>>(new Set());
  const [usandoPadrao, setUsandoPadrao] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [subAba, setSubAba] = useState<"mesma" | "outras">("mesma");

  const especialidades = useMemo(() => {
    const esp = agendaSelecionada.especialidade ?? "";
    return esp.split(/[,;]/).map(e => e.trim()).filter(Boolean);
  }, [agendaSelecionada]);

  const agendasMesmaEsp = useMemo(() => {
    const nomeExcluir = agendaNome(agendaSelecionada);
    return todasAgendas.filter(a => {
      if (agendaNome(a) === nomeExcluir) return false;
      const aEsps = (a.especialidade ?? "").split(/[,;]/).map(e => e.trim());
      return especialidades.some(e => aEsps.includes(e));
    });
  }, [todasAgendas, agendaSelecionada, especialidades]);

  const nomesUnicosMesmaEsp = useMemo(() => new Set(deduplicarPorNome(agendasMesmaEsp).map(agendaNome)), [agendasMesmaEsp]);

  const agendasOutrasEsp = useMemo(() => {
    const nomeExcluir = agendaNome(agendaSelecionada);
    return todasAgendas.filter(a => {
      if (agendaNome(a) === nomeExcluir) return false;
      const aEsps = (a.especialidade ?? "").split(/[,;]/).map(e => e.trim());
      return !especialidades.some(e => aEsps.includes(e));
    });
  }, [todasAgendas, agendaSelecionada, especialidades]);

  const { data: configData } = trpc.agendasRelacionadas.getConfig.useQuery(
    { agendaId: agendaSelecionada.id, especialidade: agendaSelecionada.especialidade ?? "" },
    { enabled: true }
  );

  useEffect(() => {
    if (!configData || isDirty.current) return;
    if (configData.usandoPadrao) {
      setNomesMesmaEsp(nomesUnicosMesmaEsp);
      setNomesOutras(new Set());
    } else {
      const nomes = configData.relacionadasNomes ?? [];
      const mesmaSet = new Set(agendasMesmaEsp.map(a => agendaNome(a)));
      setNomesMesmaEsp(new Set(nomes.filter(n => mesmaSet.has(n))));
      setNomesOutras(new Set(nomes.filter(n => !mesmaSet.has(n))));
    }
    setUsandoPadrao(configData.usandoPadrao);
  }, [configData, agendasMesmaEsp, nomesUnicosMesmaEsp]);

  const salvarMutation = trpc.agendasRelacionadas.salvarConfig.useMutation({
    onSuccess: () => { toast.success("Configuração salva!"); setUsandoPadrao(false); isDirty.current = false; utils.agendasRelacionadas.getConfig.invalidate(); },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });
  const resetarMutation = trpc.agendasRelacionadas.resetarConfig.useMutation({
    onSuccess: () => { toast.success("Resetado para o padrão"); setUsandoPadrao(true); setNomesMesmaEsp(nomesUnicosMesmaEsp); setNomesOutras(new Set()); isDirty.current = false; utils.agendasRelacionadas.getConfig.invalidate(); },
    onError: () => toast.error("Erro ao resetar"),
  });

  const toggle = (set: Set<string>, nome: string): Set<string> => {
    isDirty.current = true;
    const next = new Set(set);
    if (next.has(nome)) next.delete(nome); else next.add(nome);
    return next;
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await salvarMutation.mutateAsync({
        agendaNome: agendaNome(agendaSelecionada),
        especialidade: agendaSelecionada.especialidade ?? "",
        relacionadasNomes: [...Array.from(nomesMesmaEsp), ...Array.from(nomesOutras)],
      });
    } finally { setSalvando(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        {usandoPadrao ? (
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">Usando padrão</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">Configuração personalizada</span>
        )}
        {especialidades.length > 1 && (
          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs">{especialidades.length} especialidades</span>
        )}
      </div>
      <div className="flex border-b border-border">
        <button onClick={() => setSubAba("mesma")} className={`px-4 py-2 text-sm font-medium transition-colors ${subAba === "mesma" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
          Mesma especialidade ({nomesUnicosMesmaEsp.size})
        </button>
        <button onClick={() => setSubAba("outras")} className={`px-4 py-2 text-sm font-medium transition-colors ${subAba === "outras" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
          Outras especialidades {nomesOutras.size > 0 && `(${nomesOutras.size} sel.)`}
        </button>
      </div>
      {subAba === "mesma" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{nomesMesmaEsp.size} de {nomesUnicosMesmaEsp.size} selecionadas</span>
            <div className="flex gap-2">
              <button onClick={() => { isDirty.current = true; setNomesMesmaEsp(nomesUnicosMesmaEsp); }} className="text-xs text-blue-600 hover:underline">Selecionar todas</button>
              <span className="text-muted-foreground">·</span>
              <button onClick={() => { isDirty.current = true; setNomesMesmaEsp(new Set()); }} className="text-xs text-red-500 hover:underline">Remover todas</button>
            </div>
          </div>
          <NomeSelectDropdown options={agendasMesmaEsp} selected={nomesMesmaEsp}
            onToggle={n => setNomesMesmaEsp(toggle(nomesMesmaEsp, n))}
            placeholder="Buscar agenda da mesma especialidade..." showEspecialidade={especialidades.length > 1} />
          {nomesMesmaEsp.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Array.from(nomesMesmaEsp).map(n => (
                <span key={n} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
                  {n}<button onClick={() => setNomesMesmaEsp(toggle(nomesMesmaEsp, n))}><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {subAba === "outras" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{nomesOutras.size} selecionadas de outras especialidades</span>
            {nomesOutras.size > 0 && (
              <button onClick={() => { isDirty.current = true; setNomesOutras(new Set()); }} className="text-xs text-red-500 hover:underline">Remover todas</button>
            )}
          </div>
          <NomeSelectDropdown options={agendasOutrasEsp} selected={nomesOutras}
            onToggle={n => setNomesOutras(toggle(nomesOutras, n))}
            placeholder="Buscar agenda de outra especialidade..." showEspecialidade />
          {nomesOutras.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Array.from(nomesOutras).map(n => (
                <span key={n} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs">
                  {n}<button onClick={() => setNomesOutras(toggle(nomesOutras, n))}><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSalvar} disabled={salvando} size="sm">
          <Save size={14} className="mr-1.5" />{salvando ? "Salvando..." : "Salvar"}
        </Button>
        {!usandoPadrao && (
          <Button onClick={() => resetarMutation.mutate({ agendaNome: agendaNome(agendaSelecionada) })} variant="outline" size="sm">
            <RotateCcw size={14} className="mr-1.5" />Restaurar padrão
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Aba: Protocolos e Prioridades ────────────────────────────────────────────
function AbaProtocolos({ agendaSelecionada }: { agendaSelecionada: Agenda }) {
  const utils = trpc.useUtils();
  const nome = agendaNome(agendaSelecionada);
  const { data: todosProtocolos = [] } = trpc.protocolos.getAll.useQuery();
  const { data: todasPrioridades = [] } = trpc.prioridades.getAll.useQuery();
  const { data: config } = trpc.agendaConfig.getProtocolos.useQuery({ agendaNome: nome });
  const [protSelecionados, setProtSelecionados] = useState<Set<string>>(new Set());
  const [prioSelecionadas, setPrioSelecionadas] = useState<Set<string>>(new Set());
  const [searchProt, setSearchProt] = useState("");
  const [searchPrio, setSearchPrio] = useState("");

  useEffect(() => {
    if (!config) return;
    setProtSelecionados(new Set(config.protocolosNomes));
    setPrioSelecionadas(new Set(config.prioridadesNomes));
  }, [config]);

  const salvarMutation = trpc.agendaConfig.salvarProtocolos.useMutation({
    onSuccess: () => { toast.success("Protocolos salvos!"); utils.agendaConfig.getProtocolos.invalidate(); },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const protFiltrados = todosProtocolos.filter(p => p.nome.toLowerCase().includes(searchProt.toLowerCase()));
  const prioFiltradas = todasPrioridades.filter(p => (p.nomeArquivo ?? p.grandeGrupo ?? "").toLowerCase().includes(searchPrio.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <BookOpen size={14} />Protocolos
          <span className="text-xs font-normal text-muted-foreground">({protSelecionados.size} selecionados)</span>
        </h3>
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <input value={searchProt} onChange={e => setSearchProt(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Buscar protocolo..." />
        </div>
        <div className="max-h-48 overflow-y-auto border border-border rounded-md">
          {protFiltrados.map(p => (
            <label key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm border-b border-border last:border-0">
              <input type="checkbox" checked={protSelecionados.has(p.nome)}
                onChange={() => setProtSelecionados(prev => { const n = new Set(prev); if (n.has(p.nome)) n.delete(p.nome); else n.add(p.nome); return n; })}
                className="w-3.5 h-3.5 rounded" />
              <span className="flex-1">{p.nome}</span>
              {(p as any).linkUrl && <ExternalLink size={11} className="text-muted-foreground flex-shrink-0" />}
            </label>
          ))}
          {protFiltrados.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhum protocolo encontrado</p>}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <ListChecks size={14} />Listas de prioridades
          <span className="text-xs font-normal text-muted-foreground">({prioSelecionadas.size} selecionadas)</span>
        </h3>
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <input value={searchPrio} onChange={e => setSearchPrio(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Buscar lista de prioridades..." />
        </div>
        <div className="max-h-48 overflow-y-auto border border-border rounded-md">
          {prioFiltradas.map(p => {
            const label = (p as any).nomeArquivo ?? p.grandeGrupo ?? String(p.id);
            return (
              <label key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm border-b border-border last:border-0">
                <input type="checkbox" checked={prioSelecionadas.has(label)}
                  onChange={() => setPrioSelecionadas(prev => { const n = new Set(prev); if (n.has(label)) n.delete(label); else n.add(label); return n; })}
                  className="w-3.5 h-3.5 rounded" />
                <span className="flex-1">{label}</span>
                {p.grandeGrupo && <span className="text-xs text-muted-foreground">{p.grandeGrupo}</span>}
              </label>
            );
          })}
          {prioFiltradas.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhuma lista encontrada</p>}
        </div>
      </div>
      <Button onClick={() => salvarMutation.mutate({ agendaNome: nome, protocolosNomes: Array.from(protSelecionados), prioridadesNomes: Array.from(prioSelecionadas) })}
        disabled={salvarMutation.isPending} size="sm">
        <Save size={14} className="mr-1.5" />{salvarMutation.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}

// ─── Aba: Observações ─────────────────────────────────────────────────────────
function AbaObservacoes({ agendaSelecionada, todasAgendas }: { agendaSelecionada: Agenda; todasAgendas: Agenda[] }) {
  const utils = trpc.useUtils();
  const nome = agendaNome(agendaSelecionada);
  const centraisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    todasAgendas.filter(a => agendaNome(a) === nome && a.central).forEach(a => set.add(a.central!));
    return Array.from(set).sort();
  }, [todasAgendas, nome]);

  const [centralSelecionada, setCentralSelecionada] = useState<string>("");
  const [textoObs, setTextoObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (centraisDisponiveis.length > 0 && !centralSelecionada) setCentralSelecionada(centraisDisponiveis[0]);
  }, [centraisDisponiveis]);

  const { data: todasObs = [] } = trpc.agendaConfig.getTodasObservacoes.useQuery({ agendaNome: nome });
  const { data: obsAtual } = trpc.agendaConfig.getObservacao.useQuery(
    { agendaNome: nome, central: centralSelecionada },
    { enabled: !!centralSelecionada }
  );

  useEffect(() => { setTextoObs(obsAtual?.observacao ?? ""); }, [obsAtual, centralSelecionada]);

  const salvarMutation = trpc.agendaConfig.salvarObservacao.useMutation({
    onSuccess: () => { toast.success("Observação salva!"); utils.agendaConfig.getTodasObservacoes.invalidate(); utils.agendaConfig.getObservacao.invalidate(); },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });
  const deletarMutation = trpc.agendaConfig.deletarObservacao.useMutation({
    onSuccess: () => { toast.success("Observação removida"); setTextoObs(""); utils.agendaConfig.getTodasObservacoes.invalidate(); utils.agendaConfig.getObservacao.invalidate(); },
    onError: () => toast.error("Erro ao remover"),
  });

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Observações específicas por central. Aparecem no check-in desta agenda.</p>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Central</label>
        <div className="flex flex-wrap gap-2">
          {centraisDisponiveis.map(c => (
            <button key={c} onClick={() => setCentralSelecionada(c)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${centralSelecionada === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
              {c}
              {todasObs.some(o => o.central === c) && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />}
            </button>
          ))}
          {centraisDisponiveis.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma central encontrada.</p>}
        </div>
      </div>
      {centralSelecionada && (
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Observação para {centralSelecionada}</label>
          <textarea value={textoObs} onChange={e => setTextoObs(e.target.value)} rows={4}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            placeholder="Digite a observação..." />
          <div className="flex gap-2 mt-2">
            <Button onClick={async () => { setSalvando(true); try { await salvarMutation.mutateAsync({ agendaNome: nome, central: centralSelecionada, observacao: textoObs }); } finally { setSalvando(false); } }}
              disabled={salvando} size="sm">
              <Save size={14} className="mr-1.5" />{salvando ? "Salvando..." : "Salvar"}
            </Button>
            {textoObs && (
              <Button onClick={() => deletarMutation.mutate({ agendaNome: nome, central: centralSelecionada })}
                variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                <Trash2 size={14} className="mr-1.5" />Remover
              </Button>
            )}
          </div>
        </div>
      )}
      {todasObs.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Observações cadastradas</h4>
          <div className="space-y-2">
            {todasObs.map(o => (
              <div key={o.id} onClick={() => setCentralSelecionada(o.central)}
                className={`p-3 rounded-md border text-sm cursor-pointer transition-colors ${o.central === centralSelecionada ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                <span className="font-medium text-xs text-primary">{o.central}</span>
                <p className="text-muted-foreground mt-0.5 line-clamp-2">{o.observacao}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Página principal ────────────────────────────────────────────────────────
type TabId = "agendas-mesma" | "protocolos" | "observacoes";

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
    { id: "agendas-mesma", label: "Agendas relacionadas", icon: <Link2 size={14} /> },
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
            {abaAtiva === "agendas-mesma" && (
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
