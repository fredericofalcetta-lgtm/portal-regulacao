import { useState, useRef, useEffect, useMemo } from "react";
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

function agendaLabel(a: Agenda) {
  const partes = [a.agenda, a.municipio, a.central].filter(Boolean);
  return partes.join(" — ");
}

// ─── Dropdown multi-select com busca ─────────────────────────────────────────

interface MultiSelectDropdownProps {
  options: Agenda[];
  selected: number[];
  onToggle: (id: number) => void;
  placeholder?: string;
  excludeIds?: number[];
}

function MultiSelectDropdown({ options, selected, onToggle, placeholder = "Buscar agenda...", excludeIds = [] }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return options.filter(a => {
      if (excludeIds.includes(a.id)) return false;
      if (!q) return true;
      return agendaLabel(a).toLowerCase().includes(q);
    });
  }, [options, search, excludeIds]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between border rounded-md px-3 py-2 text-sm bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-500">{placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="fixed z-[9999] bg-white border rounded-md shadow-lg" style={{
          width: ref.current?.getBoundingClientRect().width,
          top: (ref.current?.getBoundingClientRect().bottom ?? 0) + 4,
          left: ref.current?.getBoundingClientRect().left,
        }}>
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, município ou central..."
                className="pl-7 h-8 text-sm"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-gray-400 text-center">Nenhuma agenda encontrada</div>
            ) : (
              filtered.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onToggle(a.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${selected.includes(a.id) ? "bg-blue-50" : ""}`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(a.id) ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}>
                    {selected.includes(a.id) && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="truncate">{agendaLabel(a)}</span>
                </button>
              ))
            )}
          </div>
          <div className="p-2 border-t text-xs text-gray-400 text-right">
            {selected.filter(id => !excludeIds.includes(id)).length} selecionada(s)
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

  // IDs das relacionadas configuradas (mesma especialidade + outras)
  const [relacionadasMesmaEsp, setRelacionadasMesmaEsp] = useState<number[]>([]);
  const [relacionadasOutras, setRelacionadasOutras] = useState<number[]>([]);
  const [usandoPadrao, setUsandoPadrao] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Queries
  const { data: todasAgendas = [] } = trpc.agendasRelacionadas.listarTodasAgendas.useQuery();
  const utils = trpc.useUtils();

  // Agenda selecionada
  const agendaSelecionada = useMemo(
    () => todasAgendas.find(a => a.id === agendaSelecionadaId) ?? null,
    [todasAgendas, agendaSelecionadaId]
  );

  // Agendas da mesma especialidade
  const agendasMesmaEsp = useMemo(() => {
    if (!agendaSelecionada?.especialidade) return [];
    return todasAgendas.filter(
      a => a.especialidade === agendaSelecionada.especialidade && a.id !== agendaSelecionadaId
    );
  }, [todasAgendas, agendaSelecionada, agendaSelecionadaId]);

  // Agendas de outras especialidades
  const agendasOutrasEsp = useMemo(() => {
    if (!agendaSelecionada?.especialidade) return todasAgendas.filter(a => a.id !== agendaSelecionadaId);
    return todasAgendas.filter(
      a => a.especialidade !== agendaSelecionada.especialidade && a.id !== agendaSelecionadaId
    );
  }, [todasAgendas, agendaSelecionada, agendaSelecionadaId]);

  // Carregar configuração quando agenda muda
  const { data: configData } = trpc.agendasRelacionadas.getConfig.useQuery(
    { agendaId: agendaSelecionadaId!, especialidade: agendaSelecionada?.especialidade ?? "" },
    { enabled: agendaSelecionadaId !== null }
  );

  useEffect(() => {
    if (!configData || !agendaSelecionada) return;

    const idsRelacionadas = configData.relacionadas;
    const idsEspecialidade = agendasMesmaEsp.map(a => a.id);

    // Separar em "mesma especialidade" e "outras"
    const mesmaEsp = idsRelacionadas.filter(id => idsEspecialidade.includes(id));
    const outras = idsRelacionadas.filter(id => !idsEspecialidade.includes(id));

    setRelacionadasMesmaEsp(mesmaEsp);
    setRelacionadasOutras(outras);
    setUsandoPadrao(configData.usandoPadrao);
  }, [configData, agendaSelecionada, agendasMesmaEsp]);

  // Mutations
  const salvarMutation = trpc.agendasRelacionadas.salvarConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      setUsandoPadrao(false);
      utils.agendasRelacionadas.getConfig.invalidate();
    },
    onError: () => toast.error("Erro ao salvar configuração"),
  });

  const resetarMutation = trpc.agendasRelacionadas.resetarConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração resetada para o padrão");
      setUsandoPadrao(true);
      // Restaurar padrão: todas da mesma especialidade
      setRelacionadasMesmaEsp(agendasMesmaEsp.map(a => a.id));
      setRelacionadasOutras([]);
      utils.agendasRelacionadas.getConfig.invalidate();
    },
    onError: () => toast.error("Erro ao resetar configuração"),
  });

  // Handlers
  function handleSelecionarAgenda(id: number) {
    setAgendaSelecionadaId(id);
    setOpenAgendaPrincipal(false);
    setSearchAgendaPrincipal("");
  }

  function handleToggleMesmaEsp(id: number) {
    setRelacionadasMesmaEsp(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function handleToggleOutras(id: number) {
    setRelacionadasOutras(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleSalvar() {
    if (!agendaSelecionada) return;
    setSalvando(true);
    try {
      await salvarMutation.mutateAsync({
        agendaId: agendaSelecionada.id,
        agendaNome: agendaSelecionada.agenda ?? "",
        municipio: agendaSelecionada.municipio ?? "",
        central: agendaSelecionada.central ?? "",
        especialidade: agendaSelecionada.especialidade ?? "",
        relacionadasIds: [...relacionadasMesmaEsp, ...relacionadasOutras],
      });
    } finally {
      setSalvando(false);
    }
  }

  async function handleResetar() {
    if (!agendaSelecionada) return;
    await resetarMutation.mutateAsync({ agendaId: agendaSelecionada.id });
  }

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (refAgendaPrincipal.current && !refAgendaPrincipal.current.contains(e.target as Node)) {
        setOpenAgendaPrincipal(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filtro do dropdown principal
  const agendasFiltradasPrincipal = useMemo(() => {
    const q = searchAgendaPrincipal.toLowerCase();
    if (!q) return todasAgendas;
    return todasAgendas.filter(a => agendaLabel(a).toLowerCase().includes(q));
  }, [todasAgendas, searchAgendaPrincipal]);

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
              <span className="font-medium text-gray-900">{agendaLabel(agendaSelecionada)}</span>
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
                    placeholder="Buscar por nome, município ou central..."
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
                      key={a.id}
                      type="button"
                      onClick={() => handleSelecionarAgenda(a.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${a.id === agendaSelecionadaId ? "bg-blue-50 font-medium" : ""}`}
                    >
                      <span className="truncate">{agendaLabel(a)}</span>
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
                  {" · "}{agendasMesmaEsp.length} agenda(s) disponíveis
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRelacionadasMesmaEsp(agendasMesmaEsp.map(a => a.id))}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Selecionar todas
                </button>
                <span className="text-gray-300">·</span>
                <button
                  type="button"
                  onClick={() => setRelacionadasMesmaEsp([])}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover todas
                </button>
              </div>
            </div>

            {/* Chips das selecionadas */}
            {relacionadasMesmaEsp.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-gray-50 rounded-md">
                {relacionadasMesmaEsp.map(id => {
                  const a = todasAgendas.find(x => x.id === id);
                  if (!a) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {agendaLabel(a)}
                      <button
                        type="button"
                        onClick={() => handleToggleMesmaEsp(id)}
                        className="hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Dropdown para adicionar */}
            <MultiSelectDropdown
              options={agendasMesmaEsp}
              selected={relacionadasMesmaEsp}
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
              {relacionadasOutras.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRelacionadasOutras([])}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover todas
                </button>
              )}
            </div>

            {/* Chips das selecionadas */}
            {relacionadasOutras.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-gray-50 rounded-md">
                {relacionadasOutras.map(id => {
                  const a = todasAgendas.find(x => x.id === id);
                  if (!a) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                      {agendaLabel(a)}
                      {a.especialidade && <span className="text-purple-500">({a.especialidade})</span>}
                      <button
                        type="button"
                        onClick={() => handleToggleOutras(id)}
                        className="hover:text-purple-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Dropdown multi-select com busca */}
            <MultiSelectDropdown
              options={agendasOutrasEsp}
              selected={relacionadasOutras}
              onToggle={handleToggleOutras}
              placeholder="Buscar e adicionar agendas de outras especialidades..."
              excludeIds={[agendaSelecionadaId!]}
            />
          </div>

          {/* Resumo */}
          <div className="bg-gray-50 border rounded-lg p-3 text-sm text-gray-600">
            <strong>{relacionadasMesmaEsp.length + relacionadasOutras.length}</strong> agenda(s) relacionada(s) configurada(s)
            {" · "}
            <strong>{relacionadasMesmaEsp.length}</strong> da mesma especialidade
            {" · "}
            <strong>{relacionadasOutras.length}</strong> de outras especialidades
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
