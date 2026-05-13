import { useState, useRef, useEffect } from 'react';
import { Loader2, BookmarkPlus, BookmarkCheck, ChevronDown, Layers } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface AutoEncaminharGrupoCellProps {
  linhas: (string | number)[][];
  emailUsuario: string;
  encaminhamentosPorAgenda: Map<number, { reguladorEmail: string; reguladorNome: string }[]>;
  onUpdate: () => void;
  concluidasSet: Set<number>;
}

export default function AutoEncaminharGrupoCell({
  linhas,
  emailUsuario,
  encaminhamentosPorAgenda,
  onUpdate,
  concluidasSet,
}: AutoEncaminharGrupoCellProps) {
  const isSingle = linhas.length === 1;

  // Quantas linhas do grupo já estão na lista do usuário
  const encaminhadasNoGrupo = linhas.filter(r => {
    const id = typeof r[17] === 'number' ? r[17] : 0;
    return encaminhamentosPorAgenda.get(id)?.some(e => e.reguladorEmail === emailUsuario);
  });

  const todasEncaminhadas = encaminhadasNoGrupo.length === linhas.length;
  const algunsEncaminhados = encaminhadasNoGrupo.length > 0 && !todasEncaminhadas;

  const autoEncaminharMutation = trpc.encaminhamentos.autoEncaminhar.useMutation({
    onSuccess: () => onUpdate(),
  });

  const [processando, setProcessando] = useState(false);

  // Encaminhar/desencaminhar todas as linhas do grupo em sequência
  const handleGrupo = async () => {
    setProcessando(true);
    try {
      for (const row of linhas) {
        const id = typeof row[17] === 'number' ? row[17] : 0;
        if (id <= 0) continue;
        const isConcluida = concluidasSet.has(id);
        if (isConcluida) continue;
        await autoEncaminharMutation.mutateAsync({
          agendaId: id,
          agendaNome: String(row[0]),
          municipio: row[1] != null && String(row[1]) !== '' ? String(row[1]) : undefined,
          central: row[11] != null && String(row[11]) !== '' ? String(row[11]) : undefined,
          especialidade: String(row[12]),
        });
      }
    } finally {
      setProcessando(false);
    }
  };

  if (isSingle) {
    // Comportamento original para grupo de 1
    const row = linhas[0];
    const id = typeof row[17] === 'number' ? row[17] : 0;
    const jaEncaminhado = encaminhamentosPorAgenda.get(id)?.some(e => e.reguladorEmail === emailUsuario) ?? false;

    return (
      <button
        onClick={() => autoEncaminharMutation.mutate({
          agendaId: id,
          agendaNome: String(row[0]),
          municipio: row[1] != null && String(row[1]) !== '' ? String(row[1]) : undefined,
          central: row[11] != null && String(row[11]) !== '' ? String(row[11]) : undefined,
          especialidade: String(row[12]),
        })}
        disabled={autoEncaminharMutation.isPending}
        title={jaEncaminhado ? 'Remover da minha lista' : 'Adicionar à minha lista'}
        className={`flex items-center gap-1 mx-auto px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
          jaEncaminhado
            ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
            : 'bg-muted text-muted-foreground hover:bg-secondary'
        }`}
      >
        {autoEncaminharMutation.isPending ? <Loader2 size={11} className="animate-spin" /> :
          jaEncaminhado ? <BookmarkCheck size={11} /> : <BookmarkPlus size={11} />}
        {jaEncaminhado ? 'Na lista' : 'Minha lista'}
      </button>
    );
  }

  // Grupo com múltiplas linhas
  return (
    <button
      onClick={handleGrupo}
      disabled={processando}
      title={todasEncaminhadas ? 'Remover todas da minha lista' : 'Adicionar todas à minha lista'}
      className={`flex items-center gap-1 mx-auto px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
        todasEncaminhadas
          ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
          : algunsEncaminhados
          ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100'
          : 'bg-muted text-muted-foreground hover:bg-secondary'
      }`}
    >
      {processando ? (
        <Loader2 size={11} className="animate-spin" />
      ) : todasEncaminhadas ? (
        <BookmarkCheck size={11} />
      ) : (
        <BookmarkPlus size={11} />
      )}
      <Layers size={10} />
      {todasEncaminhadas ? 'Na lista' : algunsEncaminhados ? `${encaminhadasNoGrupo.length}/${linhas.length}` : 'Minha lista'}
    </button>
  );
}
