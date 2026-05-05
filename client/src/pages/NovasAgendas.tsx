import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useRegulador } from "@/contexts/ReguladorContext";
import { Sparkles, Check, RefreshCw, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function NovasAgendas() {
  const { perfilAtivo, regulador } = useRegulador();
  const perfilNorm = (perfilAtivo ?? regulador?.perfil ?? "").toLowerCase();
  const isAdmin = perfilNorm.includes("administrador") || perfilNorm.includes("monitoramento");

  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.semCotas.listarNovas.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const marcarVistaMutation = trpc.semCotas.marcarNaoNova.useMutation({
    onSuccess: () => {
      utils.semCotas.listarNovas.invalidate();
      toast.success("Agenda marcada como vista.");
    },
    onError: () => toast.error("Erro ao marcar agenda."),
  });

  const marcarTodasMutation = trpc.semCotas.marcarTodasNaoNovas.useMutation({
    onSuccess: (res) => {
      utils.semCotas.listarNovas.invalidate();
      toast.success(`${res.count} agendas marcadas como vistas.`);
    },
    onError: () => toast.error("Erro ao marcar agendas."),
  });

  const novas = data ?? [];

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Acesso restrito a administradores e monitores.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <h1 className="text-xl font-semibold text-foreground">Novas Agendas</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Agendas sem cota que apareceram pela primeira vez — aguardando verificação
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              <RefreshCw size={12} />
              Atualizar
            </button>
            {novas.length > 0 && (
              <button
                onClick={() => marcarTodasMutation.mutate()}
                disabled={marcarTodasMutation.isPending}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Check size={12} />
                Marcar todas como vistas
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Carregando...
          </div>
        ) : novas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Check size={32} className="text-green-500" />
            <p className="text-sm font-medium">Nenhuma nova agenda pendente</p>
            <p className="text-xs">Todas as agendas sem cota já foram verificadas</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">Especialidade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">Município</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">Central</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">Aguardando</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">
                    <div className="flex items-center justify-center gap-1"><Calendar size={11} /> Apareceu em</div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">Ação</th>
                </tr>
              </thead>
              <tbody>
                {novas.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{row.especialidade ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{row.municipio ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-sm text-foreground">{row.central ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-amber-600 dark:text-amber-400">
                      {row.aguardando ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => marcarVistaMutation.mutate({ id: row.id })}
                        disabled={marcarVistaMutation.isPending}
                        title="Marcar como vista"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors disabled:opacity-50"
                      >
                        <Check size={11} />
                        Marcar vista
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
