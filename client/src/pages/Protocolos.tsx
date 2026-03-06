import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { FileText, RefreshCw, ExternalLink, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Protocolos() {
  const [search, setSearch] = useState("");
  const { data: protocolos = [], isLoading, refetch } = trpc.protocolos.getAll.useQuery();
  const syncMutation = trpc.protocolos.sync.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} protocolos sincronizados com sucesso!`);
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao sincronizar: ${err.message}`);
    },
  });

  const filtered = protocolos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Protocolos Clínicos</h1>
            <p className="text-sm text-gray-500">
              {protocolos.length} protocolo{protocolos.length !== 1 ? "s" : ""} disponíve{protocolos.length !== 1 ? "is" : "l"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Sincronizando..." : "Sincronizar"}
        </Button>
      </div>

      {/* Campo de busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar protocolo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Estado de carregamento */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Carregando protocolos...</p>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {!isLoading && protocolos.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum protocolo encontrado</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "Sincronizar" para carregar os protocolos da planilha</p>
          <Button
            variant="default"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="mt-4"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sincronizar Agora
          </Button>
        </div>
      )}

      {/* Sem resultados na busca */}
      {!isLoading && protocolos.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum protocolo encontrado para "{search}"</p>
          <p className="text-gray-400 text-sm mt-1">Tente uma busca diferente</p>
        </div>
      )}

      {/* Grid de protocolos */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((protocolo) => (
            protocolo.linkUrl ? (
              <a
                key={protocolo.id}
                href={protocolo.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="mt-0.5 p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors leading-snug">
                    {protocolo.nome}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
                      Abrir protocolo
                    </span>
                  </div>
                </div>
              </a>
            ) : (
              <div
                key={protocolo.id}
                className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl opacity-60"
              >
                <div className="mt-0.5 p-2 bg-gray-100 rounded-lg flex-shrink-0">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 leading-snug">
                    {protocolo.nome}
                  </p>
                  <span className="text-xs text-gray-400 mt-1 block">Sem link disponível</span>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
