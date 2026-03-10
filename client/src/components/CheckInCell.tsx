import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface CheckInUsuario {
  usuarioEmail: string;
  usuarioNome: string;
}

interface CheckInCellProps {
  agendaId: number;
  agendaNome: string;
  municipio?: string;
  especialidade: string;
  central?: string;
  cotas?: number;
  saldo?: number;
  aguardando?: number;
  indexRegula?: number;
  checkInsAtuais: CheckInUsuario[];
  usuarioEmail: string;
  onUpdate: () => void;
}

export default function CheckInCell({
  agendaId,
  agendaNome,
  municipio,
  especialidade,
  central,
  cotas,
  saldo,
  aguardando,
  indexRegula,
  checkInsAtuais,
  usuarioEmail,
  onUpdate,
}: CheckInCellProps) {
  const meuCheckIn = checkInsAtuais.find(c => c.usuarioEmail === usuarioEmail);
  const outrosCheckIns = checkInsAtuais.filter(c => c.usuarioEmail !== usuarioEmail);

  const checkInMutation = trpc.checkIns.checkIn.useMutation({
    onSuccess: () => onUpdate(),
  });

  const handleClick = () => {
    checkInMutation.mutate({
      agendaId,
      agendaNome,
      municipio,
      especialidade,
      central,
      cotas,
      saldo,
      aguardando,
      indexRegula,
    });
  };

  const tooltipOutros =
    outrosCheckIns.length > 0
      ? `Também em regulação: ${outrosCheckIns.map(c => c.usuarioNome).join(', ')}`
      : undefined;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleClick}
        disabled={checkInMutation.isPending}
        title={meuCheckIn ? 'Clique para fazer check-out' : 'Clique para fazer check-in'}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          meuCheckIn
            ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 hover:bg-red-100 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300'
            : 'bg-muted text-muted-foreground hover:bg-green-100 dark:hover:bg-green-950/50 hover:text-green-700 dark:hover:text-green-300'
        }`}
      >
        {checkInMutation.isPending ? (
          <Loader2 size={11} className="animate-spin" />
        ) : meuCheckIn ? (
          <LogOut size={11} />
        ) : (
          <LogIn size={11} />
        )}
        <span>{meuCheckIn ? 'Check-out' : 'Check-in'}</span>
      </button>

      {outrosCheckIns.length > 0 && (
        <span
          title={tooltipOutros}
          className="text-xs text-muted-foreground cursor-help"
        >
          +{outrosCheckIns.length} outro{outrosCheckIns.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
