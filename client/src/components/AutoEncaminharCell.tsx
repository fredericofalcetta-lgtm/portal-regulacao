import { Loader2, BookmarkPlus, BookmarkCheck, Users } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface AutoEncaminharCellProps {
  agendaId: number;
  agendaNome: string;
  municipio?: string;
  central?: string;
  especialidade: string;
  emailUsuario: string;
  encaminhadosAtuais: { reguladorEmail: string; reguladorNome: string }[];
  onUpdate: () => void;
}

export default function AutoEncaminharCell({
  agendaId,
  agendaNome,
  municipio,
  central,
  especialidade,
  emailUsuario,
  encaminhadosAtuais,
  onUpdate,
}: AutoEncaminharCellProps) {
  const jaEncaminhado = (encaminhadosAtuais ?? []).some(e => e.reguladorEmail === emailUsuario);
  // Outros reguladores (além do próprio usuário)
  const outrosReguladores = (encaminhadosAtuais ?? []).filter(e => e.reguladorEmail !== emailUsuario);

  const autoEncaminharMutation = trpc.encaminhamentos.autoEncaminhar.useMutation({
    onSuccess: () => {
      onUpdate();
    },
  });

  const handleClick = () => {
    autoEncaminharMutation.mutate({ agendaId, agendaNome, municipio, central, especialidade });
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Botão de toggle "Minha lista" */}
      <button
        onClick={handleClick}
        disabled={autoEncaminharMutation.isPending}
        title={jaEncaminhado ? 'Remover da minha lista' : 'Adicionar à minha lista'}
        className={`flex items-center gap-1 mx-auto px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
          jaEncaminhado
            ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
            : 'bg-muted text-muted-foreground hover:bg-secondary'
        }`}
      >
        {autoEncaminharMutation.isPending ? (
          <Loader2 size={11} className="animate-spin" />
        ) : jaEncaminhado ? (
          <BookmarkCheck size={11} />
        ) : (
          <BookmarkPlus size={11} />
        )}
        {jaEncaminhado ? 'Na lista' : 'Minha lista'}
      </button>

      {/* Badges de outros reguladores que também estão regulando esta agenda */}
      {outrosReguladores.length > 0 && (
        <div className="flex flex-wrap gap-0.5 justify-center max-w-[120px]">
          {outrosReguladores.slice(0, 3).map(r => (
            <span
              key={r.reguladorEmail}
              title={r.reguladorNome}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300"
            >
              <Users size={9} />
              {r.reguladorNome.split(' ')[0]}
            </span>
          ))}
          {outrosReguladores.length > 3 && (
            <span
              title={outrosReguladores.slice(3).map(r => r.reguladorNome).join(', ')}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground"
            >
              +{outrosReguladores.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
