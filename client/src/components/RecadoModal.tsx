/**
 * RecadoModal.tsx
 * Modal que aparece automaticamente após login quando há um recado
 * ativo ainda não lido pelo colaborador. Exige confirmação ("Ciente")
 * para fechar e só aparece uma vez por recado.
 */
import { trpc } from '@/lib/trpc';
import { Bell, X } from 'lucide-react';

export default function RecadoModal() {
  const { data: recado, isLoading } = trpc.recados.getPendente.useQuery(undefined, {
    staleTime: 0, // sempre verificar no mount
  });

  const marcarLidoMutation = trpc.recados.marcarLido.useMutation({
    onSuccess: () => {
      // Invalida a query para que a modal não reapareça
      utils.recados.getPendente.invalidate();
    },
  });
  const utils = trpc.useUtils();

  if (isLoading || !recado) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-primary/10 border-b border-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/20">
            <Bell size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recado da administração</p>
            <h2 className="text-base font-semibold text-foreground truncate">{recado.titulo}</h2>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-5">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {recado.mensagem}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Este recado aparece apenas uma vez.
          </p>
          <button
            onClick={() => marcarLidoMutation.mutate({ recadoId: recado.id })}
            disabled={marcarLidoMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <X size={14} />
            {marcarLidoMutation.isPending ? 'Registrando...' : 'Ciente'}
          </button>
        </div>
      </div>
    </div>
  );
}
