import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useRegulador } from "@/contexts/ReguladorContext";
import FilterPanel from "@/components/FilterPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, TrendingDown, ChevronUp, ChevronDown } from "lucide-react";
import { UltimaAtualizacao } from "@/components/UltimaAtualizacao";
import { toast } from "sonner";

type SemCotaRow = {
  id: number;
  especialidade: string | null;
  municipio: string | null;
  aguardando: number | null;
  autorizados: number | null;
  novasCotas: number | null;
  central: string | null;
  especialidadeCategoria: string | null;
  isNova: "sim" | "nao";
};

type SortCol = "especialidade" | "municipio" | "aguardando" | "autorizados" | "novasCotas" | "central" | "especialidadeCategoria";

export default function SemCotas() {
  const { perfilAtivo, regulador } = useRegulador();
  const perfilNorm = (perfilAtivo ?? regulador?.perfil ?? "").toLowerCase();
  const isAdmin = perfilNorm.includes("administrador") || perfilNorm.includes("monitoramento");

  const [selectedAgendas, setSelectedAgendas] = useState<Set<string>>(new Set());
  const [selectedCentrais, setSelectedCentrais] = useState<Set<string>>(new Set());
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<SortCol>("aguardando");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: filtrosData } = trpc.semCotas.getFiltros.useQuery();
  const { data: listData, isLoading } = trpc.semCotas.listar.useQuery({});
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

  // Agendas únicas para filtro (Espec Sem Cotas)
  const todasLinhas: SemCotaRow[] = (listData?.rows ?? []) as SemCotaRow[];
  const agendasUnicas = useMemo(() => {
    const s = new Set<string>();
    todasLinhas.forEach(r => { if (r.especialidade) s.add(r.especialidade); });
    return Array.from(s).sort();
  }, [todasLinhas]);

  const linhasFiltradas = useMemo(() => {
    return todasLinhas.filter(r => {
      if (selectedAgendas.size > 0 && !selectedAgendas.has(r.especialidade ?? "")) return false;
      if (selectedCentrais.size > 0 && !selectedCentrais.has(r.central ?? "")) return false;
      if (selectedEspecialidades.size > 0) {
        const cat = (r.especialidadeCategoria ?? "").toLowerCase();
        const match = Array.from(selectedEspecialidades).some(e => cat.includes(e.toLowerCase()));
        if (!match) return false;
      }
      return true;
    });
  }, [todasLinhas, selectedAgendas, selectedCentrais, selectedEspecialidades]);

  const linhasOrdenadas = useMemo(() => {
    return [...linhasFiltradas].sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sortOrder === "desc" ? bv - av : av - bv;
      }
      return sortOrder === "desc"
        ? String(bv).localeCompare(String(av), "pt-BR")
        : String(av).localeCompare(String(bv), "pt-BR");
    });
  }, [linhasFiltradas, sortCol, sortOrder]);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortOrder(o => o === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortOrder("desc"); }
  };

  const SortIcon = ({ col }: { col: SortCol }) =>
    sortCol === col
      ? sortOrder === "desc" ? <ChevronDown size={14} className="text-primary" /> : <ChevronUp size={14} className="text-primary" />
      : null;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Acesso restrito a Administradores e Monitoramento.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <FilterPanel
        agendas={agendasUnicas}
        centrais={centrais}
        especialidades={especialidades}
        selectedAgendas={selectedAgendas}
        selectedCentrais={selectedCentrais}
        selectedEspecialidades={selectedEspecialidades}
        onAgendasChange={setSelectedAgendas}
        onCentraisChange={setSelectedCentrais}
        onEspecialidadesChange={setSelectedEspecialidades}
      />

      <div className="flex-1 flex flex-col bg-card overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-orange-500" />
                <h1 className="text-xl font-semibold text-foreground">Sem Cotas</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {linhasOrdenadas.length} registro{linhasOrdenadas.length !== 1 ? "s" : ""}
                {linhasOrdenadas.length !== todasLinhas.length && (
                  <span className="ml-1 text-muted-foreground/70">· {todasLinhas.length} no total</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <UltimaAtualizacao />
              <Button variant="outline" size="sm" onClick={() => sincronizarMutation.mutate()} disabled={sincronizarMutation.isPending} className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${sincronizarMutation.isPending ? "animate-spin" : ""}`} />
                Sincronizar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : linhasOrdenadas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <TrendingDown className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nenhum registro encontrado com os filtros aplicados.</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-secondary z-10">
                <tr>
                  {[
                    { label: "Espec Sem Cotas", col: "especialidade" as SortCol },
                    { label: "Município indicado", col: "municipio" as SortCol },
                    { label: "Central", col: "central" as SortCol },
                    { label: "Aguardando", col: "aguardando" as SortCol },
                    { label: "Autorizados", col: "autorizados" as SortCol },
                    { label: "Cotas mês seguinte", col: "novasCotas" as SortCol },
                    { label: "Especialidade", col: "especialidadeCategoria" as SortCol },
                    { label: "Status", col: null },
                  ].map(({ label, col }) => (
                    <th
                      key={label}
                      onClick={col ? () => handleSort(col) : undefined}
                      className={`px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border ${col ? "cursor-pointer hover:bg-muted transition-colors" : ""}`}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        {col && <SortIcon col={col} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasOrdenadas.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`border-b border-border transition-colors hover:bg-muted/30 ${r.isNova === "sim" ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.especialidade ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.municipio ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-muted rounded px-1.5 py-0.5 text-muted-foreground">{r.central ?? "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`font-semibold ${(r.aguardando ?? 0) > 50 ? "text-red-600" : (r.aguardando ?? 0) > 10 ? "text-orange-500" : "text-foreground"}`}>
                        {r.aguardando ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{r.autorizados ?? 0}</td>
                    <td className="px-4 py-2.5 text-center">
                      {r.novasCotas != null ? (
                        <span className={`font-medium ${r.novasCotas > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                          {r.novasCotas}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.especialidadeCategoria ?? "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      {r.isNova === "sim" ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Nova
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        {linhasOrdenadas.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground flex justify-between">
            <span>{linhasOrdenadas.length} registro{linhasOrdenadas.length !== 1 ? "s" : ""}{selectedCentrais.size + selectedEspecialidades.size + selectedAgendas.size > 0 ? " (filtrado)" : ""}</span>
            <span>Total aguardando: <strong>{linhasOrdenadas.reduce((s, r) => s + (r.aguardando ?? 0), 0).toLocaleString("pt-BR")}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
