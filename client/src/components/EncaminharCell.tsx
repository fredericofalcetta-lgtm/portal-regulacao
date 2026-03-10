import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Send } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface EncaminharCellProps {
  agendaId: number;
  agendaNome: string;
  especialidade: string;
  encaminhadosAtuais: { reguladorEmail: string; reguladorNome: string }[];
  onUpdate: () => void;
}

export default function EncaminharCell({
  agendaId,
  agendaNome,
  especialidade,
  encaminhadosAtuais,
  onUpdate,
}: EncaminharCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(
    new Set(encaminhadosAtuais.map(e => e.reguladorEmail))
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: reguladoresList = [] } = trpc.reguladores.listarReguladores.useQuery();
  const encaminharMutation = trpc.encaminhamentos.encaminhar.useMutation({
    onSuccess: () => {
      onUpdate();
      setIsOpen(false);
    },
  });

  // Sincronizar selecionados quando encaminhadosAtuais mudar
  useEffect(() => {
    setSelecionados(new Set(encaminhadosAtuais.map(e => e.reguladorEmail)));
  }, [encaminhadosAtuais]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleRegulador = (email: string) => {
    const novo = new Set(selecionados);
    if (novo.has(email)) {
      novo.delete(email);
    } else {
      novo.add(email);
    }
    setSelecionados(novo);
  };

  const handleSalvar = () => {
    const reguladoresSelecionados = reguladoresList
      .filter(r => selecionados.has(r.email))
      .map(r => ({ email: r.email, nome: r.nome }));

    encaminharMutation.mutate({
      agendaId,
      agendaNome,
      especialidade,
      reguladores: reguladoresSelecionados,
    });
  };

  const nomesEncaminhados = encaminhadosAtuais.map(e => e.reguladorNome);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
          encaminhadosAtuais.length > 0
            ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
            : 'bg-muted text-muted-foreground hover:bg-secondary'
        }`}
        title={encaminhadosAtuais.length > 0 ? nomesEncaminhados.join(', ') : 'Encaminhar agenda'}
      >
        <Send size={11} />
        {encaminhadosAtuais.length > 0 ? (
          <span>{encaminhadosAtuais.length} reg.</span>
        ) : (
          <span>Encaminhar</span>
        )}
        <ChevronDown size={11} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-md shadow-xl z-50">
          <div className="p-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground">Encaminhar para:</p>
            <p className="text-xs text-muted-foreground truncate">{agendaNome}</p>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {reguladoresList.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                Nenhum regulador encontrado
              </p>
            ) : (
              reguladoresList.map(reg => (
                <label
                  key={reg.email}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-secondary cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selecionados.has(reg.email)}
                    onChange={() => toggleRegulador(reg.email)}
                    className="w-3.5 h-3.5 rounded border-border text-primary cursor-pointer"
                  />
                  <span className="text-xs text-foreground flex-1 truncate">{reg.nome}</span>
                </label>
              ))
            )}
          </div>

          <div className="p-2 border-t border-border flex gap-2">
            <button
              onClick={handleSalvar}
              disabled={encaminharMutation.isPending}
              className="flex-1 px-2 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {encaminharMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-2 py-1.5 bg-muted text-muted-foreground text-xs rounded hover:bg-secondary transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
