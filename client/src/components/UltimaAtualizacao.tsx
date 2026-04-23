import { trpc } from '@/lib/trpc';
import { RefreshCw, Clock } from 'lucide-react';

interface UltimaAtualizacaoProps {
  /** Classe CSS adicional para o container */
  className?: string;
  /** Se true, exibe apenas o ícone + data sem o label "Última atualização:" */
  compact?: boolean;
}

/**
 * Exibe a data e hora da última sincronização bem-sucedida com a planilha.
 * Atualiza automaticamente a cada 5 minutos.
 */
export function UltimaAtualizacao({ className = '', compact = false }: UltimaAtualizacaoProps) {
  const { data, isLoading } = trpc.sheets.getUltimaAtualizacao.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 min
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse ${className}`}>
        <RefreshCw size={11} className="shrink-0" />
        <span>Verificando...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
        <Clock size={11} className="shrink-0 text-amber-500" />
        <span className="text-amber-600 dark:text-amber-400">Sem registro de atualização</span>
      </div>
    );
  }

  const dt = new Date(data.syncedAt);
  // Converter UTC → Brasília (UTC-3)
  const brasilia = new Date(dt.getTime() - 3 * 60 * 60 * 1000);

  const dataFormatada = brasilia.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const horaFormatada = brasilia.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  // Calcular há quanto tempo foi a última atualização
  const agora = new Date();
  const diffMs = agora.getTime() - dt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  let tempoRelativo = '';
  if (diffMin < 2) tempoRelativo = 'agora mesmo';
  else if (diffMin < 60) tempoRelativo = `há ${diffMin} min`;
  else if (diffH < 24) tempoRelativo = `há ${diffH}h`;
  else tempoRelativo = `há ${diffD}d`;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}
        title={`Última atualização: ${dataFormatada} às ${horaFormatada} (${data.rowCount?.toLocaleString('pt-BR') ?? '?'} registros)`}
      >
        <Clock size={11} className="shrink-0 text-green-500" />
        <span>{dataFormatada} {horaFormatada}</span>
        <span className="text-muted-foreground/60">({tempoRelativo})</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <Clock size={11} className="shrink-0 text-green-500" />
      <span>
        <span className="font-medium text-foreground/70">Última atualização:</span>{' '}
        {dataFormatada} às {horaFormatada}
        <span className="ml-1 text-muted-foreground/60">({tempoRelativo})</span>
      </span>
    </div>
  );
}
