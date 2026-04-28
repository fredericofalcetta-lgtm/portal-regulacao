import { useState, useMemo, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useRegulador } from '@/contexts/ReguladorContext';
import { ChevronDown, ChevronUp, Star, X, Search, Plus, Trash2, Check, Pencil } from 'lucide-react';
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

function splitList(s: string): string[] {
  return s.split(/[,;]/).map(x => x.trim()).filter(Boolean);
}

// ─── MultiSelectDropdown ─────────────────────────────────────────────────────
// Dropdown genérico com busca e chips de seleção múltipla.
// Usa portal (fixed positioning) para evitar clipping por overflow-hidden dos cards pai.

interface MultiSelectDropdownProps {
  label: string;
  description?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

function MultiSelectDropdown({
  label,
  description,
  options,
  selected,
  onChange,
  placeholder = 'Buscar...',
  disabled = false,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Calcular posição do dropdown relativa ao viewport (portal)
  const openDropdown = () => {
    if (disabled) return;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropHeight = 240;
      if (spaceBelow >= dropHeight) {
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          zIndex: 9999,
        });
      } else {
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: rect.width,
          zIndex: 9999,
        });
      }
    }
    setOpen(true);
  };

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setBusca('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = useMemo(() => {
    const t = busca.toLowerCase();
    return options.filter(o => !selected.includes(o) && o.toLowerCase().includes(t)).slice(0, 20);
  }, [busca, options, selected]);

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      {/* Chips de selecionados */}
      <div
        ref={containerRef}
        className={`min-h-[38px] flex flex-wrap gap-1.5 px-3 py-2 rounded-md border bg-background transition-colors cursor-pointer ${
          disabled ? 'opacity-60 cursor-not-allowed border-border' : 'border-border hover:border-primary/50 focus-within:border-primary'
        }`}
        onClick={openDropdown}
      >
        {selected.length === 0 && (
          <span className="text-xs text-muted-foreground italic self-center">{placeholder}</span>
        )}
        {selected.map(s => (
          <span
            key={s}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
            onClick={e => e.stopPropagation()}
          >
            {s}
            {!disabled && (
              <button
                onClick={e => { e.stopPropagation(); toggle(s); }}
                className="hover:text-red-500 transition-colors"
              >
                <X size={10} />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <ChevronDown size={14} className={`ml-auto self-center text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {/* Dropdown renderizado via portal (fixed) */}
      {open && (
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-popover border border-border rounded-md shadow-xl max-h-60 flex flex-col"
        >
          {/* Busca */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search size={12} className="text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Filtrar..."
              className="flex-1 text-xs bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* Opções */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-3 py-2">
                {busca ? 'Nenhum resultado' : 'Todas as opções já selecionadas'}
              </p>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  onMouseDown={e => { e.preventDefault(); toggle(opt); setBusca(''); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2 text-foreground"
                >
                  <Plus size={10} className="text-muted-foreground shrink-0" />
                  <span className="truncate">{opt}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AgendaFiltroDropdown ─────────────────────────────────────────────────────
// Dropdown para agendas filtro — opções são nomes de agendas (sem município/central)

interface AgendaFiltroDropdownProps {
  todasAgendas: { agendaNome: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

function AgendaFiltroDropdown({ todasAgendas, selected, onChange, disabled = false }: AgendaFiltroDropdownProps) {
  // Deduplica nomes de agenda
  const opcoes = useMemo(() => {
    const seen = new Set<string>();
    return todasAgendas
      .map(a => a.agendaNome)
      .filter(n => { if (seen.has(n)) return false; seen.add(n); return true; })
      .sort();
  }, [todasAgendas]);

  return (
    <MultiSelectDropdown
      label="Agendas Filtro"
      description="Agendas específicas que aparecem na aba Regulação. Especialidades sem filtro mostram todas as suas agendas."
      options={opcoes}
      selected={selected}
      onChange={onChange}
      placeholder="Selecionar agendas filtro..."
      disabled={disabled}
    />
  );
}

// ─── FavoritaDropdown ─────────────────────────────────────────────────────────
// Busca e adiciona agendas favoritas (com município e central)

interface FavoritaDropdownProps {
  todasAgendas: { label: string; agendaId: number; agendaNome: string; municipio: string; central: string; especialidade: string }[];
  favoritas: Favorita[];
  reguladorEmail: string;
  onAdicionada: () => void;
  onRemovida: () => void;
}

function FavoritaDropdown({ todasAgendas, favoritas, reguladorEmail, onAdicionada, onRemovida }: FavoritaDropdownProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const adicionarFavorita = trpc.reguladorConfig.adicionarFavorita.useMutation({
    onSuccess: (data) => {
      if (data.alreadyExists) {
        toast.warning('Essa agenda já está nas favoritas.');
      } else {
        toast.success('Favorita adicionada.');
        onAdicionada();
      }
      setBusca('');
      setOpen(false);
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const removerFavorita = trpc.reguladorConfig.removerFavorita.useMutation({
    onSuccess: () => { toast.success('Favorita removida.'); onRemovida(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const openDropdown = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropHeight = 240;
      if (spaceBelow >= dropHeight) {
        setDropdownStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
      } else {
        setDropdownStyle({ position: 'fixed', bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width, zIndex: 9999 });
      }
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setBusca('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const favIds = useMemo(() => new Set(favoritas.map(f => f.agendaId)), [favoritas]);

  const filtradas = useMemo(() => {
    if (!busca.trim()) return [];
    const t = busca.toLowerCase();
    return todasAgendas.filter(a => !favIds.has(a.agendaId) && a.label.toLowerCase().includes(t)).slice(0, 15);
  }, [busca, todasAgendas, favIds]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agendas Favoritas</label>
      <p className="text-xs text-muted-foreground">
        Aparecem diariamente em "Encaminhadas para mim". O regulador pode fazer check-in e concluir; reaparecem no dia seguinte.
      </p>

      {/* Lista de favoritas */}
      {favoritas.length > 0 ? (
        <div className="space-y-1">
          {favoritas.map(fav => (
            <div key={fav.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
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

      {/* Campo de busca para adicionar */}
      <div ref={containerRef} className="relative">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border bg-background hover:border-primary/50 transition-colors cursor-pointer"
          onClick={openDropdown}
        >
          <Search size={12} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={busca}
            onChange={e => { setBusca(e.target.value); if (!open) openDropdown(); }}
            onFocus={openDropdown}
            placeholder="Buscar agenda para adicionar como favorita..."
            className="flex-1 text-xs bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground"
          />
        </div>

        {open && filtradas.length > 0 && (
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-popover border border-border rounded-md shadow-xl max-h-60 overflow-y-auto"
          >
            {filtradas.map(ag => (
              <button
                key={ag.agendaId}
                onMouseDown={e => {
                  e.preventDefault();
                  adicionarFavorita.mutate({
                    reguladorEmail,
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
  );
}

// ─── Componente de linha de regulador ────────────────────────────────────────

interface ReguladorLinhaProps {
  reg: ReguladorRow;
  todasAgendas: { label: string; agendaId: number; agendaNome: string; municipio: string; central: string; especialidade: string }[];
  todasEspecialidades: string[];
  onSaved: () => void;
  onExcluir: (id: number, nome: string) => void;
}

const PERFIS = [
  { value: 'regulador', label: 'Regulador' },
  { value: 'monitoramento', label: 'Monitoramento' },
  { value: 'administrador', label: 'Administrador' },
];

// Converte string de perfil (ex: "regulador, monitoramento") em array de valores
function parsePerfis(perfil: string | null): string[] {
  if (!perfil) return ['regulador'];
  return perfil.split(/[,;]/).map(p => p.trim().toLowerCase()).filter(Boolean);
}

function ReguladorLinha({ reg, todasAgendas, todasEspecialidades, onSaved, onExcluir }: ReguladorLinhaProps) {
  const [expanded, setExpanded] = useState(false);
  const [editando, setEditando] = useState(false);
  const [especialidades, setEspecialidades] = useState<string[]>(splitList(reg.especialidades));
  const [agendasFiltro, setAgendasFiltro] = useState<string[]>(splitList(reg.agendasFiltro));
  const [perfisSelecionados, setPerfisSelecionados] = useState<string[]>(
    parsePerfis(reg.perfil)
  );

  const atualizarConfig = trpc.reguladorConfig.atualizarConfig.useMutation({
    onError: (e) => toast.error(`Erro ao salvar config: ${e.message}`),
  });

  const atualizarPerfil = trpc.reguladorConfig.atualizarPerfil.useMutation({
    onError: (e) => toast.error(`Erro ao salvar perfil: ${e.message}`),
  });

  const handleSalvar = async () => {
    // Salvar config (especialidades + agendas filtro)
    await atualizarConfig.mutateAsync({
      reguladorEmail: reg.email,
      especialidades: especialidades.join(', '),
      agendasFiltro: agendasFiltro.join(', '),
    });
    // Salvar perfil (sempre salva para garantir consistência)
    const novosPerfis = perfisSelecionados.length > 0 ? perfisSelecionados : ['regulador'];
    await atualizarPerfil.mutateAsync({
      reguladorEmail: reg.email,
      perfil: novosPerfis.join(', '),
    });
    toast.success(`${reg.nome} atualizado com sucesso.`);
    setEditando(false);
    onSaved();
  };

  const handleCancelar = () => {
    setEspecialidades(splitList(reg.especialidades));
    setAgendasFiltro(splitList(reg.agendasFiltro));
    setPerfisSelecionados(parsePerfis(reg.perfil));
    setEditando(false);
  };

  return (
    // Removido overflow-hidden para não cortar os dropdowns com position:fixed
    <div className="border border-border rounded-lg bg-card">
      {/* Linha principal */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors select-none rounded-lg"
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

        {expanded
          ? <ChevronUp size={16} className="text-muted-foreground shrink-0" />
          : <ChevronDown size={16} className="text-muted-foreground shrink-0" />
        }
      </div>

      {/* Painel expandido */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-5 bg-muted/20 rounded-b-lg">

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

          {/* Perfil — seletor de múltiplos perfis */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Perfil</label>
            {editando ? (
              <div className="flex gap-3 flex-wrap">
                {PERFIS.map(p => {
                  const checked = perfisSelecionados.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setPerfisSelecionados(prev =>
                          checked
                            ? prev.filter(v => v !== p.value)
                            : [...prev, p.value]
                        );
                      }}
                      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors select-none ${
                        checked
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {checked && <Check size={10} />}
                      {p.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-foreground">
                {perfilLabel(reg.perfil)}
              </div>
            )}
          </div>

          {/* Especialidades — dropdown multi-select */}
          <MultiSelectDropdown
            label="Especialidades"
            options={todasEspecialidades}
            selected={especialidades}
            onChange={setEspecialidades}
            placeholder="Selecionar especialidades..."
            disabled={!editando}
          />

          {/* Agendas Filtro — dropdown multi-select */}
          <AgendaFiltroDropdown
            todasAgendas={todasAgendas}
            selected={agendasFiltro}
            onChange={setAgendasFiltro}
            disabled={!editando}
          />

          {/* Agendas Favoritas — sempre editável */}
          <FavoritaDropdown
            todasAgendas={todasAgendas}
            favoritas={reg.favoritas}
            reguladorEmail={reg.email}
            onAdicionada={onSaved}
            onRemovida={onSaved}
          />

          {/* Zona de perigo */}
          <div className="pt-3 border-t border-border">
            <button
              onClick={() => onExcluir(reg.id, reg.nome)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 size={12} />
              Excluir regulador
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

// ─── Modal de cadastro de novo regulador ────────────────────────────────────
interface ModalCadastroProps {
  onClose: () => void;
  onSaved: () => void;
}
function ModalCadastroRegulador({ onClose, onSaved }: ModalCadastroProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [vinculo, setVinculo] = useState('');
  const [perfisSelecionados, setPerfisSelecionados] = useState<string[]>(['regulador']);

  const criarMutation = trpc.reguladorConfig.criar.useMutation({
    onSuccess: () => {
      toast.success('Regulador cadastrado com sucesso!');
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!nome.trim() || !email.trim()) return;
    criarMutation.mutate({
      nome: nome.trim(),
      email: email.trim(),
      perfil: perfisSelecionados.length > 0 ? perfisSelecionados.join(', ') : 'regulador',
      vinculo: vinculo.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5"
        onClick={ev => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Novo Regulador</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome completo"
              required
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* E-mail */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Vínculo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vínculo</label>
            <input
              type="text"
              value={vinculo}
              onChange={e => setVinculo(e.target.value)}
              placeholder="Ex: SESAB, Municipal..."
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Perfil */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Perfil</label>
            <div className="flex gap-3 flex-wrap">
              {PERFIS.map(p => {
                const checked = perfisSelecionados.includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setPerfisSelecionados(prev =>
                        checked ? prev.filter(v => v !== p.value) : [...prev, p.value]
                      );
                    }}
                    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors select-none ${
                      checked
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {checked && <Check size={10} />}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criarMutation.isPending}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {criarMutation.isPending ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Reguladores() {
  const { perfilAtivo, regulador } = useRegulador();
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  // Verificar acesso: apenas admin ou monitoramento
  const perfilNorm = (perfilAtivo ?? regulador?.perfil ?? '').toLowerCase();
  const temAcesso =
    perfilNorm.includes('administrador') ||
    perfilNorm.includes('monitoramento');

  const { data: reguladoresList, isLoading, refetch } = trpc.reguladorConfig.listarTodos.useQuery(undefined, {
    enabled: temAcesso,
  });

  // Buscar todas as agendas para o dropdown de favoritas e agendas filtro
  const { data: sheetsData } = trpc.sheets.getData.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    enabled: temAcesso,
  });

  // Buscar dicionário de especialidades
  const { data: dicionario } = trpc.dicionario.getAll.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
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

  // Extrair especialidades únicas do dicionário
  const todasEspecialidades = useMemo(() => {
    if (!dicionario) return [];
    const seen = new Set<string>();
    return dicionario
      .map(d => d.especialidade)
      .filter(e => { if (!e || seen.has(e)) return false; seen.add(e); return true; })
      .sort();
  }, [dicionario]);

  const excluirMutation = trpc.reguladorConfig.excluir.useMutation({
    onSuccess: () => {
      toast.success('Regulador excluído com sucesso.');
      refetch();
    },
    onError: (e) => toast.error(`Erro ao excluir: ${e.message}`),
  });

  const handleExcluir = (id: number, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
    excluirMutation.mutate({ id });
  };

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
      {/* Modal de cadastro */}
      {modalAberto && (
        <ModalCadastroRegulador
          onClose={() => setModalAberto(false)}
          onSaved={() => refetch()}
        />
      )}

      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reguladores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as especialidades, agendas filtro e agendas favoritas de cada regulador.
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} />
          Novo Regulador
        </button>
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
          <button onClick={() => setBusca('')} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Lista de reguladores */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : reguladoresFiltrados.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">{busca ? 'Nenhum regulador encontrado para esta busca.' : 'Nenhum regulador cadastrado.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reguladoresFiltrados.map(reg => (
            <ReguladorLinha
              key={reg.id}
              reg={reg}
              todasAgendas={todasAgendas}
              todasEspecialidades={todasEspecialidades}
              onSaved={() => refetch()}
              onExcluir={handleExcluir}
            />
          ))}
        </div>
      )}
    </div>
  );
}
