import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useRegulador } from "@/contexts/ReguladorContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { X, Search, RotateCcw, Save, ChevronDown, Link2 } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Agenda {
  id: number;
  agenda: string | null;
  municipio: string | null;
  central: string | null;
  especialidade: string | null;
}

// Nome canônico da agenda
function agendaNome(a: Agenda): string {
  return (a.agenda ?? "").trim() || "(sem nome)";
}

// Label completo: nome + central (para distinguir instâncias da mesma agenda)
function agendaLabel(a: Agenda) {
  const partes = [a.agenda, a.central, a.municipio].filter(Boolean);
  return partes.join(" — ");
}

// Deduplica lista de agendas por nome, mantendo a primeira ocorrência de cada nome
// Usado apenas nos dropdowns de relacionadas (mesma esp / outras esp)
function deduplicarPorNome(agendas: Agenda[]): Agenda[] {
  const seen = new Set<string>();
  return agendas.filter(a => {
    const nome = agendaNome(a);
    if (seen.has(nome)) return false;
    seen.add(nome);
    return true;
  });
}

// Dado um conjunto de nomes selecionados, retorna todos os IDs correspondentes
// (expande nome → todos os IDs com aquele nome na lista fornecida)
// Mantido para uso futuro se necessário

// ─── Dropdown multi-select por nome com busca e direção inteligente ──────────

interface NomeSelectDropdownProps {
  options: Agenda[];          // lista completa (pode ter duplicatas — será deduplicada)
  selected: Set<string>;      // nomes selecionados
  onToggle: (nome: string) => void;
  placeholder?: string;
  showEspecialidade?: boolean; // exibir especialidade ao lado do nome
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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AgendasRelacionadas() {
  const { perfilAtivo, regulador } = useRegulador();
  const perfilNorm = (perfilAtivo ?? regulador?.perfil ?? '').toLowerCase();
  const isAdmin = perfilNorm.includes('administrador') || perfilNorm.includes('monitoramento');

  // Agenda selecionada para configurar
  const [agendaSelecionadaId, setAgendaSelecionadaId] = useState<number | null>(null);
  const [searchAgendaPrincipal, setSearchAgendaPrincipal] = useState("");
  const [openAgendaPrincipal, setOpenAgendaPrincipal] = useState(false);
  const refAgendaPrincipal = useRef<HTMLDivElement>(null);

  // Nomes selecionados (em vez de IDs — deduplicados por nome)
  const [nomesMesmaEsp, setNomesMesmaEsp] = useState<Set<string>>(new Set());
  const [nomesOutras, setNomesOutras] = useState<Set<string>>(new Set());
  const [usandoPadrao, setUsandoPadrao] = useState(true);
  const [salvando, setSalvando] = useState(false);
  // Flag: usuário fez alterações manuais que não devem ser sobrescritas pelo useEffect
  const isDirty = useRef(false);

  // Queries
  const { data: todasAgendas = [] } = trpc.agendasRelacionadas.listarTodasAgendas.useQuery();
  const utils = trpc.useUtils();

  // Agenda selecionada
  const agendaSelecionada = useMemo(
    () => todasAgendas.find(a => a.id === agendaSelecionadaId) ?? null,
    [todasAgendas, agendaSelecionadaId]
  );

  // Agendas da mesma especialidade (excluindo a própria agenda selecionada por nome)
  const agendasMesmaEsp = useMemo(() => {
    if (!agendaSelecionada?.especialidade) return [];
    const nomeExcluir = agendaNome(agendaSelecionada);
    return todasAgendas.filter(
      a => a.especialidade === agendaSelecionada.especialidade && agendaNome(a) !== nomeExcluir
    );
  }, [todasAgendas, agendaSelecionada]);

  // Nomes únicos disponíveis na mesma especialidade
  const nomesUnicosMesmaEsp = useMemo(
    () => new Set(deduplicarPorNome(agendasMesmaEsp).map(agendaNome)),
    [agendasMesmaEsp]
  );

  // Agendas de outras especialidades (excluindo a própria por nome)
  const agendasOutrasEsp = useMemo(() => {
    if (!agendaSelecionada) return [];
    const nomeExcluir = agendaNome(agendaSelecionada);
    if (!agendaSelecionada.especialidade) {
      return todasAgendas.filter(a => agendaNome(a) !== nomeExcluir);
    }
    return todasAgendas.filter(
      a => a.especialidade !== agendaSelecionada.especialidade && agendaNome(a) !== nomeExcluir
    );
  }, [todasAgendas, agendaSelecionada]);

  // Carregar configuração quando agenda muda
  const { data: configData } = trpc.agendasRelacionadas.getConfig.useQuery(
    { agendaId: agendaSelecionadaId!, especialidade: agendaSelecionada?.especialidade ?? "" },
    { enabled: agendaSelecionadaId !== null }
  );

  useEffect(() => {
    if (!configData || !agendaSelecionada) return;
    // Se o usuário já fez alterações manuais desde o último carregamento, não sobrescrever
    if (isDirty.current) return;

    if (configData.usandoPadrao) {
      setNomesMesmaEsp(nomesUnicosMesmaEsp);
      setNomesOutras(new Set());
    } else {
      const nomesRelacionadas = configData.relacionadasNomes ?? [];
      const nomesMesmaEspSet = new Set(agendasMesmaEsp.map(a => agendaNome(a)));
      setNomesMesmaEsp(new Set(nomesRelacionadas.filter(n => nomesMesmaEspSet.has(n))));
      setNomesOutras(new Set(nomesRelacionadas.filter(n => !nomesMesmaEspSet.has(n))));
    }
    setUsandoPadrao(configData.usandoPadrao);
  }, [configData, agendaSelecionada, agendasMesmaEsp, nomesUnicosMesmaEsp]);

  // Mutations
  const salvarMutation = trpc.agendasRelacionadas.salvarConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      setUsandoPadrao(false);
      isDirty.current = false; // config salva — pode receber atualizações do servidor novamente
      utils.agendasRelacionadas.getConfig.invalidate();
    },
    onError: (err) => toast.error(`Erro ao salvar: ${err.message}`),
  });

  const resetarMutation = trpc.agendasRelacionadas.resetarConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração resetada para o padrão");
      setUsandoPadrao(true);
      setNomesMesmaEsp(nomesUnicosMesmaEsp);
      setNomesOutras(new Set());
      utils.agendasRelacionadas.getConfig.invalidate();
    },
    onError: () => toast.error("Erro ao resetar configuração"),
  });

  // Handlers
  function handleSelecionarAgenda(id: number) {
    isDirty.current = false; // nova agenda: permite que useEffect carregue a config
    setAgendaSelecionadaId(id);
    setOpenAgendaPrincipal(false);
    setSearchAgendaPrincipal("");
  }

  function handleToggleMesmaEsp(nome: string) {
    isDirty.current = true;
    setNomesMesmaEsp(prev => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome); else next.add(nome);
      return next;
    });
  }

  function handleToggleOutras(nome: string) {
    isDirty.current = true;
    setNomesOutras(prev => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome); else next.add(nome);
      return next;
    });
  }

  async function handleSalvar() {
    if (!agendaSelecionada) return;
    setSalvando(true);
    try {
      // Enviar nomes (não IDs) — nomes são estáveis entre sincronizações
      const nomesRelacionadas = [
        ...Array.from(nomesMesmaEsp),
        ...Array.from(nomesOutras),
      ];
      await salvarMutation.mutateAsync({
        agendaNome: agendaNome(agendaSelecionada),
        especialidade: agendaSelecionada.especialidade ?? '',
        relacionadasNomes: nomesRelacionadas,
      });
    } finally {
      setSalvando(false);
    }
  }

  async function handleResetar() {
    if (!agendaSelecionada) return;
    await resetarMutation.mutateAsync({ agendaNome: agendaNome(agendaSelecionada) });
  }

  // Fechar dropdown principal ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (refAgendaPrincipal.current && !refAgendaPrincipal.current.contains(e.target as Node)) {
        setOpenAgendaPrincipal(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Agendas deduplicadas por nome para o dropdown principal
  // (3000+ agendas → mostrar apenas um representante por nome)
  const agendasDeduplicadasPrincipal = useMemo(
    () => deduplicarPorNome(todasAgendas),
    [todasAgendas]
  );

  // Filtro do dropdown principal (busca por nome)
  const agendasFiltradasPrincipal = useMemo(() => {
    const q = searchAgendaPrincipal.toLowerCase();
    if (!q) return agendasDeduplicadasPrincipal;
    return agendasDeduplicadasPrincipal.filter(a => agendaNome(a).toLowerCase().includes(q));
  }, [agendasDeduplicadasPrincipal, searchAgendaPrincipal]);

  // Contagem de nomes únicos disponíveis
  const qtdNomesUnicosMesmaEsp = useMemo(
    () => deduplicarPorNome(agendasMesmaEsp).length,
    [agendasMesmaEsp]
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Acesso restrito a Administradores e Monitoramento.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Link2 className="w-6 h-6 text-blue-600" />
          Agendas Relacionadas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure quais agendas aparecem no painel de detalhes de cada check-in em Minhas Agendas.
          Por padrão, todas as agendas da mesma especialidade são exibidas.
        </p>
      </div>

      {/* Seletor de agenda principal */}
      <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Agenda a configurar
        </label>
        <div ref={refAgendaPrincipal} className="relative">
          <button
            type="button"
            onClick={() => setOpenAgendaPrincipal(v => !v)}
            className="w-full flex items-center justify-between border rounded-md px-3 py-2.5 text-sm bg-white hover:bg-gray-50 transition-colors"
          >
            {agendaSelecionada ? (
              <span className="font-medium text-gray-900">{agendaNome(agendaSelecionada)}</span>
            ) : (
              <span className="text-gray-400">Selecione uma agenda para configurar...</span>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openAgendaPrincipal ? "rotate-180" : ""}`} />
          </button>

          {openAgendaPrincipal && (
            <div className="fixed z-[9999] bg-white border rounded-md shadow-lg" style={{
              width: refAgendaPrincipal.current?.getBoundingClientRect().width,
              top: (refAgendaPrincipal.current?.getBoundingClientRect().bottom ?? 0) + 4,
              left: refAgendaPrincipal.current?.getBoundingClientRect().left,
            }}>
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    autoFocus
                    value={searchAgendaPrincipal}
                    onChange={e => setSearchAgendaPrincipal(e.target.value)}
                    placeholder="Buscar por nome da agenda..."
                    className="pl-7 h-8 text-sm"
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {agendasFiltradasPrincipal.length === 0 ? (
                  <div className="p-3 text-sm text-gray-400 text-center">Nenhuma agenda encontrada</div>
                ) : (
                  agendasFiltradasPrincipal.map(a => (
                    <button
                      key={agendaNome(a)}
                      type="button"
                      onClick={() => handleSelecionarAgenda(a.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${agendaSelecionada && agendaNome(agendaSelecionada) === agendaNome(a) ? "bg-blue-50 font-medium" : ""}`}
                    >
                      <span className="truncate">{agendaNome(a)}</span>
                      {a.especialidade && (
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{a.especialidade}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuração de relacionadas */}
      {agendaSelecionada && (
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {usandoPadrao ? (
                <Badge variant="outline" className="text-gray-500">Usando padrão (todas da especialidade)</Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">Configuração personalizada</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {!usandoPadrao && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetar}
                  disabled={resetarMutation.isPending}
                  className="gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Resetar para padrão
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSalvar}
                disabled={salvando}
                className="gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {salvando ? "Salvando..." : "Salvar configuração"}
              </Button>
            </div>
          </div>

          {/* Dropdown 1: Mesma especialidade */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  Agendas da mesma especialidade
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Especialidade: <span className="font-medium">{agendaSelecionada.especialidade}</span>
                  {" · "}{qtdNomesUnicosMesmaEsp} tipo(s) de agenda disponíveis
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { isDirty.current = true; setNomesMesmaEsp(nomesUnicosMesmaEsp); }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Selecionar todas
                </button>
                <span className="text-gray-300">·</span>
                <button
                  type="button"
                  onClick={() => { isDirty.current = true; setNomesMesmaEsp(new Set()); }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover todas
                </button>
              </div>
            </div>

            {/* Chips das selecionadas — um chip por nome */}
            {nomesMesmaEsp.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-gray-50 rounded-md">
                {Array.from(nomesMesmaEsp).map(nome => (
                  <span key={nome} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {nome}
                    <button
                      type="button"
                      onClick={() => handleToggleMesmaEsp(nome)}
                      className="hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <NomeSelectDropdown
              options={agendasMesmaEsp}
              selected={nomesMesmaEsp}
              onToggle={handleToggleMesmaEsp}
              placeholder={`Adicionar agenda da especialidade ${agendaSelecionada.especialidade}...`}
            />
          </div>

          {/* Dropdown 2: Outras especialidades */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  Agendas de outras especialidades
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Adicione agendas de qualquer outra especialidade que devem aparecer como relacionadas.
                </p>
              </div>
              {nomesOutras.size > 0 && (
                <button
                  type="button"
                  onClick={() => { isDirty.current = true; setNomesOutras(new Set()); }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover todas
                </button>
              )}
            </div>

            {/* Chips das selecionadas */}
            {nomesOutras.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-gray-50 rounded-md">
                {Array.from(nomesOutras).map(nome => {
                  // Buscar especialidade de uma instância desse nome
                  const amostra = agendasOutrasEsp.find(a => agendaNome(a) === nome);
                  return (
                    <span key={nome} className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                      {nome}
                      {amostra?.especialidade && (
                        <span className="text-purple-500 ml-1">({amostra.especialidade})</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleOutras(nome)}
                        className="hover:text-purple-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <NomeSelectDropdown
              options={agendasOutrasEsp}
              selected={nomesOutras}
              onToggle={handleToggleOutras}
              placeholder="Buscar e adicionar agendas de outras especialidades..."
              showEspecialidade
            />
          </div>

          {/* Resumo */}
          <div className="bg-gray-50 border rounded-lg p-3 text-sm text-gray-600">
            <strong>{nomesMesmaEsp.size + nomesOutras.size}</strong> tipo(s) de agenda configurado(s)
            {" · "}
            <strong>{nomesMesmaEsp.size}</strong> da mesma especialidade
            {" · "}
            <strong>{nomesOutras.size}</strong> de outras especialidades
          </div>
        </div>
      )}

      {!agendaSelecionada && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <Link2 className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Selecione uma agenda acima para configurar suas agendas relacionadas</p>
        </div>
      )}
    </div>
  );
}
