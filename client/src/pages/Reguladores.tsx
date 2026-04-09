import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useRegulador } from '@/contexts/ReguladorContext';
import { ChevronDown, ChevronUp, Star, StarOff, Pencil, Check, X, Search, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Favorita {
  id: number;
  agendaId: number;
  agendaNome: string;
  municipio: string;
  central: string;
  especialidade: string;
}

interface ReguladorRow {
  id: number;
  nome: string;
  email: string;
  perfil: string | null;
  vinculo: string | null;
  especialidades: string;
  agendasFiltro: string;
  favoritas: Favorita[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function perfilLabel(perfil: string | null): string {
  if (!perfil) return '—';
  const map: Record<string, string> = {
    regulador: 'Regulador',
    monitoramento: 'Monitoramento',
    administrador: 'Administrador',
  };
  return perfil
    .split(/[,;]/)
    .map(p => map[p.trim().toLowerCase()] ?? p.trim())
    .join(', ');
}

// ─── Componente de linha de regulador ────────────────────────────────────────

interface ReguladorLinhaProps {
  reg: ReguladorRow;
  todasAgendas: { label: string; agendaId: number; agendaNome: string; municipio: string; central: string; especialidade: string }[];
  onSaved: () => void;
}

function ReguladorLinha({ reg, todasAgendas, onSaved }: ReguladorLinhaProps) {
  const [expanded, setExpanded] = useState(false);
  const [editando, setEditando] = useState(false);
  const [especialidades, setEspecialidades] = useState(reg.especialidades);
  const [agendasFiltro, setAgendasFiltro] = useState(reg.agendasFiltro);
  const [buscaFavorita, setBuscaFavorita] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  const atualizarConfig = trpc.reguladorConfig.atualizarConfig.useMutation({
    onSuccess: () => {
      toast.success(`${reg.nome} atualizado com sucesso.`);
      setEditando(false);
      onSaved();
    },
    onError: (e) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  const adicionarFavorita = trpc.reguladorConfig.adicionarFavorita.useMutation({
    onSuccess: (data) => {
      if (data.alreadyExists) {
        toast.warning('Essa agenda já está nas favoritas.');
      } else {
        toast.success('Favorita adicionada.');
        onSaved();
      }
      setBuscaFavorita('');
      setMostrarDropdown(false);
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const removerFavorita = trpc.reguladorConfig.removerFavorita.useMutation({
    onSuccess: () => {
      toast.success('Favorita removida.');
      onSaved();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const handleSalvar = () => {
    atualizarConfig.mutate({
      reguladorEmail: reg.email,
      especialidades,
      agendasFiltro,
    });
  };

  const handleCancelar = () => {
    setEspecialidades(reg.especialidades);
    setAgendasFiltro(reg.agendasFiltro);
    setEditando(false);
  };

  // Filtrar agendas para o dropdown de favoritas
  const agendasFiltradas = useMemo(() => {
    if (!buscaFavorita.trim()) return [];
    const termo = buscaFavorita.toLowerCase();
    return todasAgendas
      .filter(a => a.label.toLowerCase().includes(termo))
      .slice(0, 15);
  }, [buscaFavorita, todasAgendas]);

  const perfilNormalizado = (reg.perfil ?? '').toLowerCase();
  const isAdminMonitor =
    perfilNormalizado.includes('administrador') ||
    perfilNormalizado.includes('monitoramento');

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Linha principal */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground">{reg.nome}</span>
            {reg.perfil && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                {perfilLabel(reg.perfil)}
              </span>
            )}
            {reg.vinculo && (
              <span className="text-xs text-muted-foreground">{reg.vinculo}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{reg.email}</p>
        </div>

        {/* Resumo de especialidades */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground max-w-xs truncate">
          {reg.especialidades ? (
            <span className="truncate">{reg.especialidades}</span>
          ) : (
            <span className="italic">Sem especialidades</span>
          )}
        </div>

        {/* Indicador de favoritas */}
        {reg.favoritas.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <Star size={12} fill="currentColor" />
            <span>{reg.favoritas.length}</span>
          </div>
        )}

        {expanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
      </div>

      {/* Painel expandido */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-5 bg-muted/20">

          {/* Cabeçalho do painel */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Configuração do regulador</h3>
            {!editando ? (
              <button
                onClick={() => setEditando(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Pencil size={12} />
                Editar
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelar}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X size={12} />
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={atualizarConfig.isPending}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Check size={12} />
                  {atualizarConfig.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}
          </div>

          {/* Especialidades */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Especialidades (separadas por vírgula)
            </label>
            {editando ? (
              <input
                type="text"
                value={especialidades}
                onChange={e => setEspecialidades(e.target.value)}
                placeholder="Ex: Oncologia, Endocrinologia, Ortopedia"
                className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {especialidades
                  ? especialidades.split(/[,;]/).map(e => e.trim()).filter(Boolean).map((esp, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                      {esp}
                    </span>
                  ))
                  : <span className="text-xs text-muted-foreground italic">Nenhuma especialidade configurada</span>
                }
              </div>
            )}
          </div>

          {/* Agendas Filtro */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Agendas Filtro (separadas por vírgula)
            </label>
            <p className="text-xs text-muted-foreground">
              Agendas específicas que aparecem na aba Regulação. Agendas de especialidades sem filtro mostram todas.
            </p>
            {editando ? (
              <textarea
                value={agendasFiltro}
                onChange={e => setAgendasFiltro(e.target.value)}
                placeholder="Ex: ENDOCRINOLOGIA DIABETES, ONCOLOGIA MAMA"
                rows={3}
                className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {agendasFiltro
                  ? agendasFiltro.split(/[,;]/).map(a => a.trim()).filter(Boolean).map((ag, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {ag}
                    </span>
                  ))
                  : <span className="text-xs text-muted-foreground italic">Nenhuma agenda filtro configurada</span>
                }
              </div>
            )}
          </div>

          {/* Agendas Favoritas */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Agendas Favoritas
            </label>
            <p className="text-xs text-muted-foreground">
              Aparecem diariamente em "Encaminhadas para mim". O regulador pode fazer check-in e concluir; reaparecem no dia seguinte.
            </p>

            {/* Lista de favoritas existentes */}
            {reg.favoritas.length > 0 ? (
              <div className="space-y-1">
                {reg.favoritas.map(fav => (
                  <div key={fav.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <Star size={12} className="text-amber-500 shrink-0" fill="currentColor" />
                      <span className="text-xs text-foreground truncate">
                        {fav.agendaNome}
                        {fav.municipio && ` — ${fav.municipio}`}
                        {fav.central && ` — ${fav.central}`}
                      </span>
                    </div>
                    <button
                      onClick={() => removerFavorita.mutate({ id: fav.id })}
                      disabled={removerFavorita.isPending}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors shrink-0"
                      title="Remover favorita"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Nenhuma agenda favorita configurada</p>
            )}

            {/* Adicionar nova favorita */}
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border bg-background focus-within:border-primary transition-colors">
                <Search size={12} className="text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={buscaFavorita}
                  onChange={e => { setBuscaFavorita(e.target.value); setMostrarDropdown(true); }}
                  onFocus={() => setMostrarDropdown(true)}
                  onBlur={() => setTimeout(() => setMostrarDropdown(false), 200)}
                  placeholder="Buscar agenda para adicionar como favorita..."
                  className="flex-1 text-xs bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground"
                />
              </div>

              {/* Dropdown de resultados */}
              {mostrarDropdown && agendasFiltradas.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {agendasFiltradas.map(ag => (
                    <button
                      key={ag.agendaId}
                      onMouseDown={() => {
                        adicionarFavorita.mutate({
                          reguladorEmail: reg.email,
                          agendaId: ag.agendaId,
                          agendaNome: ag.agendaNome,
                          municipio: ag.municipio,
                          central: ag.central,
                          especialidade: ag.especialidade,
                        });
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <Plus size={10} className="text-muted-foreground shrink-0" />
                      <span className="truncate text-foreground">{ag.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Reguladores() {
  const { perfilAtivo, regulador } = useRegulador();
  const [busca, setBusca] = useState('');

  // Verificar acesso: apenas admin ou monitoramento
  const perfilNorm = (perfilAtivo ?? regulador?.perfil ?? '').toLowerCase();
  const temAcesso =
    perfilNorm.includes('administrador') ||
    perfilNorm.includes('monitoramento');

  const { data: reguladoresList, isLoading, refetch } = trpc.reguladorConfig.listarTodos.useQuery(undefined, {
    enabled: temAcesso,
  });

  // Buscar todas as agendas para o dropdown de favoritas
  const { data: sheetsData } = trpc.sheets.getData.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    enabled: temAcesso,
  });

  // Montar lista de agendas no formato "Agenda — Município — Central"
  const todasAgendas = useMemo(() => {
    if (!sheetsData?.rows) return [];
    return sheetsData.rows.map(row => ({
      agendaId: row[17] as number,
      agendaNome: row[0] as string,
      municipio: row[1] as string,
      central: row[11] as string,
      especialidade: row[12] as string,
      label: [row[0], row[1], row[11]].filter(Boolean).join(' — '),
    }));
  }, [sheetsData]);

  // Filtrar reguladores pela busca
  const reguladoresFiltrados = useMemo(() => {
    if (!reguladoresList) return [];
    if (!busca.trim()) return reguladoresList;
    const termo = busca.toLowerCase();
    return reguladoresList.filter(r =>
      r.nome.toLowerCase().includes(termo) ||
      r.email.toLowerCase().includes(termo) ||
      (r.perfil ?? '').toLowerCase().includes(termo) ||
      (r.especialidades ?? '').toLowerCase().includes(termo)
    );
  }, [reguladoresList, busca]);

  if (!temAcesso) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <X size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">
            Esta área é acessível apenas para perfis de Monitoramento e Administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Reguladores</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as especialidades, agendas filtro e agendas favoritas de cada regulador.
        </p>
      </div>

      {/* Barra de busca */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-primary/30 transition-all">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou especialidade..."
          className="flex-1 text-sm bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground"
        />
        {busca && (
          <button onClick={() => setBusca('')} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Contagem */}
      {reguladoresList && (
        <p className="text-xs text-muted-foreground">
          {reguladoresFiltrados.length} de {reguladoresList.length} reguladores
        </p>
      )}

      {/* Lista de reguladores */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : reguladoresFiltrados.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <StarOff size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum regulador encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reguladoresFiltrados.map(reg => (
            <ReguladorLinha
              key={reg.email}
              reg={reg}
              todasAgendas={todasAgendas}
              onSaved={() => refetch()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
