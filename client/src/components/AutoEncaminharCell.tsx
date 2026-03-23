import { Loader2, BookmarkPlus, BookmarkCheck } from 'lucide-react';
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
  const jaEncaminhado = encaminhadosAtuais.some(e => e.reguladorEmail === emailUsuario);

  const autoEncaminharMutation = trpc.encaminhamentos.autoEncaminhar.useMutation({
    onSuccess: () => {
      onUpdate();
    },
  });

  const handleClick = () => {
    autoEncaminharMutation.mutate({ agendaId, agendaNome, municipio, central, especialidade });
  };

  return (
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
  );
}
