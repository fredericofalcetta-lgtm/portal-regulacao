/**
 * RecadoModal.tsx
 * Modal que aparece automaticamente após login quando há um recado
 * ativo ainda não lido pelo colaborador.
 * - Clicar fora fecha a modal MAS o recado volta na próxima vez.
 * - Clicar em "Ciente" marca como lido e nunca mais aparece.
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Bell, X } from 'lucide-react';

export default function RecadoModal() {
  const [dispensado, setDispensado] = useState(false);

  const { data: recado, isLoading } = trpc.recados.getPendente.useQuery(undefined, {
    staleTime: 0,
  });

  const utils = trpc.useUtils();
  const marcarLidoMutation = trpc.recados.marcarLido.useMutation({
    onSuccess: () => {
      utils.recados.getPendente.invalidate();
    },
  });

  // Fechar temporariamente sem marcar como lido (volta na próxima sessão)
  const handleDispensarTemporario = () => setDispensado(true);

  // Marcar como lido definitivamente
  const handleCiente = () => {
    if (recado) marcarLidoMutation.mutate({ recadoId: recado.id });
  };

  if (isLoading || !recado || dispensado) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleDispensarTemporario}
    >
      <div
        className="relative w-full sm:max-w-lg mx-0 sm:mx-4 rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Botão fechar temporário */}
        <button
          onClick={handleDispensarTemporario}
          className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Fechar (o recado voltará na próxima vez)"
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-primary/10 border-b border-border pr-10">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 shrink-0">
            <Bell size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Recado da administração</p>
            <h2 className="text-sm font-semibold text-foreground truncate">{recado.titulo}</h2>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="px-5 py-4 max-h-48 overflow-y-auto">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {recado.mensagem}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Clique fora para fechar. O recado voltará até você clicar em "Ciente".
          </p>
          <button
            onClick={handleCiente}
            disabled={marcarLidoMutation.isPending}
            className="shrink-0 ml-3 flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {marcarLidoMutation.isPending ? 'Registrando...' : 'Ciente'}
          </button>
        </div>
      </div>
    </div>
  );
}
