import { LogIn, LogOut, Loader2, AlertTriangle, Users } from 'lucide-react';
import { useState } from 'react';
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

const LIMITE_CHECKINS = 2;

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

  // Agenda está no limite se já tem 2+ check-ins e eu não tenho check-in
  const agendaNoLimite = !meuCheckIn && checkInsAtuais.length >= LIMITE_CHECKINS;

  const [mostrarAlerta, setMostrarAlerta] = useState(false);

  const checkInMutation = trpc.checkIns.checkIn.useMutation({
    onSuccess: (data) => {
      if (data.bloqueado) {
        setMostrarAlerta(true);
      } else {
        setMostrarAlerta(false);
        onUpdate();
      }
    },
  });

  const handleClick = () => {
    if (agendaNoLimite) {
      setMostrarAlerta(true);
      return;
    }
    setMostrarAlerta(false);
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

  const nomesReguladores = checkInsAtuais.map(c => c.usuarioNome).join(' e ');

  return (
    <div className="relative flex flex-col items-center gap-1">
      {/* Alerta de bloqueio — aparece acima do botão */}
      {mostrarAlerta && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-64 p-2.5 rounded-lg shadow-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/90 text-amber-800 dark:text-amber-200 text-xs leading-snug">
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Agenda em regulação.</strong> Já está sendo regulada por{' '}
              <strong>{nomesReguladores}</strong>. Limite de {LIMITE_CHECKINS} reguladores atingido.
            </span>
          </div>
          <button
            onClick={() => setMostrarAlerta(false)}
            className="mt-1.5 text-amber-600 dark:text-amber-400 hover:underline text-xs"
          >
            Fechar
          </button>
          {/* Seta apontando para baixo */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-200 dark:border-t-amber-800" />
        </div>
      )}

      {/* Botão principal */}
      <button
        onClick={handleClick}
        disabled={checkInMutation.isPending}
        title={
          agendaNoLimite
            ? `Agenda no limite: ${checkInsAtuais.map(c => c.usuarioNome).join(', ')}`
            : meuCheckIn
            ? 'Clique para fazer check-out'
            : 'Clique para fazer check-in'
        }
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
          agendaNoLimite
            ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 cursor-not-allowed'
            : meuCheckIn
            ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 hover:bg-red-100 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300'
            : 'bg-muted text-muted-foreground hover:bg-green-100 dark:hover:bg-green-950/50 hover:text-green-700 dark:hover:text-green-300'
        }`}
      >
        {checkInMutation.isPending ? (
          <Loader2 size={11} className="animate-spin" />
        ) : agendaNoLimite ? (
          <Users size={11} />
        ) : meuCheckIn ? (
          <LogOut size={11} />
        ) : (
          <LogIn size={11} />
        )}
        <span>
          {agendaNoLimite ? 'Em regulação' : meuCheckIn ? 'Check-out' : 'Check-in'}
        </span>
      </button>

      {/* Indicador de outros reguladores */}
      {outrosCheckIns.length > 0 && (
        <span
          title={tooltipOutros}
          className={`text-xs cursor-help ${
            agendaNoLimite
              ? 'text-amber-600 dark:text-amber-400 font-medium'
              : 'text-muted-foreground'
          }`}
        >
          +{outrosCheckIns.length} outro{outrosCheckIns.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
