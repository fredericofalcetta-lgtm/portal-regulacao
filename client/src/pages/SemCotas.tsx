import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useRegulador } from "@/contexts/ReguladorContext";
import FilterPanel from "@/components/FilterPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Sparkles, TrendingDown } from "lucide-react";
import { toast } from "sonner";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type SemCotaRow = {
  id: number;
  especialidade: string | null;
  municipio: string | null;
  aguardando: number | null;
  autorizados: number | null;
  central: string | null;
  isNova: "sim" | "nao";
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SemCotas() {
  const { perfilAtivo, regulador } = useRegulador();
  const perfilNorm = (perfilAtivo ?? regulador?.perfil ?? "").toLowerCase();
  const isAdmin =
    perfilNorm.includes("administrador") || perfilNorm.includes("monitoramento");

  // Filtros
  const [selectedCentrais, setSelectedCentrais] = useState<Set<string>>(new Set());
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<Set<string>>(new Set());

  // Queries
  const { data: filtrosData } = trpc.semCotas.getFiltros.useQuery();
  const { data: listData, isLoading, refetch } = trpc.semCotas.listar.useQuery({});

  const utils = trpc.useUtils();
  const sincronizarMutation = trpc.semCotas.sincronizar.useMutation({
    onSuccess: (res) => {
      toast.success(`Sincronizado! ${res.count} registros atualizados.`);
      utils.semCotas.listar.invalidate();
      utils.semCotas.getFiltros.invalidate();
    },
    onError: () => toast.error("Erro ao sincronizar dados"),
  });

  const centrais = filtrosData?.centrais ?? [];
  const especialidades = filtrosData?.especialidades ?? [];

  // Todas as linhas
  const todasLinhas: SemCotaRow[] = (listData?.rows ?? []) as SemCotaRow[];
  const novas: SemCotaRow[] = (listData?.novas ?? []) as SemCotaRow[];

  // Aplicar filtros locais
  const linhasFiltradas = useMemo(() => {
    return todasLinhas.filter((r) => {
      if (selectedCentrais.size > 0 && !selectedCentrais.has(r.central ?? ""))
        return false;
      if (selectedEspecialidades.size > 0) {
        const esp = (r.especialidade ?? "").toLowerCase();
        const match = Array.from(selectedEspecialidades).some((e) =>
          esp.includes(e.toLowerCase())
        );
        if (!match) return false;
      }
      return true;
    });
  }, [todasLinhas, selectedCentrais, selectedEspecialidades]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          Acesso restrito a Administradores e Monitoramento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Painel de filtros lateral */}
      <FilterPanel
        agendas={[]}
        centrais={centrais}
        especialidades={especialidades}
        selectedAgendas={new Set()}
        selectedCentrais={selectedCentrais}
        selectedEspecialidades={selectedEspecialidades}
        onAgendasChange={() => {}}
        onCentraisChange={setSelectedCentrais}
        onEspecialidadesChange={setSelectedEspecialidades}
      />

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-orange-500" />
              Sem Cotas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Agendas sem cotas disponíveis no período atual.{" "}
              {linhasFiltradas.length} registro(s) exibido(s).
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sincronizarMutation.mutate()}
            disabled={sincronizarMutation.isPending}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${sincronizarMutation.isPending ? "animate-spin" : ""}`}
            />
            Sincronizar
          </Button>
        </div>

        {/* ── Seção: Agendas Novas ─────────────────────────────────────────── */}
        {novas.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-semibold text-amber-800">
                Agendas Novas
              </h2>
              <Badge className="bg-amber-500 text-white border-0 ml-1">
                {novas.length} nova{novas.length !== 1 ? "s" : ""}
              </Badge>
              <span className="text-xs text-amber-600 ml-1">
                — não existiam no banco do dia anterior
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {novas.map((r) => (
                <div
                  key={r.id}
                  className="bg-white border border-amber-200 rounded-lg p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {r.especialidade ?? "—"}
                    </p>
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-gray-500">
                    {r.central && (
                      <span className="bg-gray-100 rounded px-1.5 py-0.5">
                        {r.central}
                      </span>
                    )}
                    {r.municipio && (
                      <span className="bg-gray-100 rounded px-1.5 py-0.5">
                        {r.municipio}
                      </span>
                    )}
                    <span className="bg-orange-100 text-orange-700 rounded px-1.5 py-0.5 font-medium">
                      {r.aguardando ?? 0} aguardando
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabela completa ──────────────────────────────────────────────── */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : linhasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                <TrendingDown className="w-10 h-10 opacity-30" />
                <p className="text-sm">Nenhum registro encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                      Especialidade
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                      Município
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                      Aguardando
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                      Autorizados
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                      Central
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linhasFiltradas.map((r, idx) => (
                    <tr
                      key={r.id}
                      className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${
                        r.isNova === "sim" ? "bg-amber-50/60" : idx % 2 === 0 ? "" : "bg-muted/10"
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {r.especialidade ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {r.municipio || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className={`font-semibold ${
                            (r.aguardando ?? 0) > 50
                              ? "text-red-600"
                              : (r.aguardando ?? 0) > 10
                              ? "text-orange-500"
                              : "text-foreground"
                          }`}
                        >
                          {r.aguardando ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {r.autorizados ?? 0}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                          {r.central ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {r.isNova === "sim" ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                            Nova
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Rodapé da tabela */}
          {linhasFiltradas.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground flex justify-between">
              <span>
                {linhasFiltradas.length} registro(s)
                {selectedCentrais.size + selectedEspecialidades.size > 0
                  ? " (filtrado)"
                  : ""}
              </span>
              <span>
                Total aguardando:{" "}
                <strong>
                  {linhasFiltradas.reduce((s, r) => s + (r.aguardando ?? 0), 0).toLocaleString("pt-BR")}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
