import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Send, Search, Layers } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface EncaminharGrupoCellProps {
  linhas: (string | number)[][];   // todas as linhas do grupo (mesmo nome+central)
  encaminhadosGrupo: { reguladorEmail: string; reguladorNome: string }[];
  reguladoresList: { email: string; nome: string }[];
  onUpdate: () => void;
}

export default function EncaminharGrupoCell({
  linhas,
  encaminhadosGrupo,
  reguladoresList,
  onUpdate,
}: EncaminharGrupoCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(
    new Set(encaminhadosGrupo.map(e => e.reguladorEmail))
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const encaminharMutation = trpc.encaminhamentos.encaminhar.useMutation({
    onSuccess: () => { onUpdate(); setIsOpen(false); },
  });

  useEffect(() => {
    setSelecionados(new Set(encaminhadosGrupo.map(e => e.reguladorEmail)));
  }, [encaminhadosGrupo]);

  useEffect(() => {
    if (isOpen) { setBusca(''); setTimeout(() => searchRef.current?.focus(), 50); }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const reguladoresFiltrados = useMemo(() => {
    if (!busca.trim()) return reguladoresList;
    const termo = busca.trim().toLowerCase();
    return reguladoresList.filter(r => r.nome.toLowerCase().includes(termo));
  }, [reguladoresList, busca]);

  const toggleRegulador = (email: string) => {
    setSelecionados(prev => { const next = new Set(prev); if (next.has(email)) next.delete(email); else next.add(email); return next; });
  };

  // Salva o encaminhamento para TODAS as linhas do grupo em sequência
  const handleSalvar = async () => {
    const reguladoresSelecionados = reguladoresList
      .filter(r => selecionados.has(r.email))
      .map(r => ({ email: r.email, nome: r.nome }));

    // Dispara uma mutation por linha do grupo
    for (const row of linhas) {
      const agendaId = typeof row[17] === 'number' ? row[17] : 0;
      if (agendaId <= 0) continue;
      await encaminharMutation.mutateAsync({
        agendaId,
        agendaNome: String(row[0]),
        municipio: String(row[1]),
        central: String(row[11]),
        especialidade: String(row[12]),
        reguladores: reguladoresSelecionados,
      });
    }
  };

  const nomesEncaminhados = encaminhadosGrupo.map(e => e.reguladorNome);
  const isGrupo = linhas.length > 1;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
          encaminhadosGrupo.length > 0
            ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
            : 'bg-muted text-muted-foreground hover:bg-secondary'
        }`}
        title={encaminhadosGrupo.length > 0 ? nomesEncaminhados.join(', ') : 'Encaminhar agenda'}
      >
        {isGrupo ? <Layers size={11} /> : <Send size={11} />}
        {encaminhadosGrupo.length > 0 ? (
          <span>{encaminhadosGrupo.length} reg.</span>
        ) : (
          <span>{isGrupo ? 'Enc. todas' : 'Encaminhar'}</span>
        )}
        <ChevronDown size={11} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-md shadow-xl z-50">
          <div className="p-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground">Encaminhar para:</p>
            <p className="text-xs text-muted-foreground truncate">
              {String(linhas[0][0])} · {String(linhas[0][11])}
            </p>
            {isGrupo && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                <Layers size={10} />
                Será aplicado a todos os {linhas.length} municípios
              </p>
            )}
          </div>

          <div className="px-2 pt-2 pb-1">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-secondary border border-border focus-within:border-primary transition-colors">
              <Search size={11} className="text-muted-foreground shrink-0" />
              <input ref={searchRef} type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar profissional..." className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none min-w-0" />
              {busca && (
                <button onClick={() => setBusca('')} className="text-muted-foreground hover:text-foreground transition-colors"><X size={10} /></button>
              )}
            </div>
          </div>

          <div className="max-h-44 overflow-y-auto">
            {reguladoresFiltrados.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                {busca ? `Nenhum resultado para "${busca}"` : 'Nenhum regulador encontrado'}
              </p>
            ) : (
              reguladoresFiltrados.map(reg => (
                <label key={reg.email} className="flex items-center gap-2 px-3 py-2 hover:bg-secondary cursor-pointer transition-colors">
                  <input type="checkbox" checked={selecionados.has(reg.email)} onChange={() => toggleRegulador(reg.email)}
                    className="w-3.5 h-3.5 rounded border-border text-primary cursor-pointer" />
                  <span className="text-xs text-foreground flex-1 truncate">{reg.nome}</span>
                </label>
              ))
            )}
          </div>

          <div className="p-2 border-t border-border flex gap-2">
            <button onClick={handleSalvar} disabled={encaminharMutation.isPending}
              className="flex-1 px-2 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50">
              {encaminharMutation.isPending ? 'Salvando...' : isGrupo ? `Salvar (${linhas.length} agendas)` : 'Salvar'}
            </button>
            <button onClick={() => setIsOpen(false)} className="px-2 py-1.5 bg-muted text-muted-foreground text-xs rounded hover:bg-secondary transition-colors">
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
