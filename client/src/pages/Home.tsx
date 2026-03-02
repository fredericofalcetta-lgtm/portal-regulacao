import { useEffect, useState } from 'react';
import FilterPanel from '@/components/FilterPanel';
import DataTable from '@/components/DataTable';
import { Loader2 } from 'lucide-react';

interface SheetData {
  headers: string[];
  rows: (string | number)[][];
  filters: {
    agendas: string[];
    centrais: string[];
    especialidades: string[];
  };
}

/**
 * Design System: Minimalismo Funcional
 * - Sidebar esquerda com filtros empilhados
 * - Tabela responsiva à direita com dados
 * - Paleta: Branco, cinza neutro, azul profundo (#1E40AF)
 * - Tipografia: Poppins (display), Inter (body)
 */
export default function Home() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedAgendas, setSelectedAgendas] = useState<Set<string>>(new Set());
  const [selectedCentrais, setSelectedCentrais] = useState<Set<string>>(new Set());
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<Set<string>>(new Set());

  // Sort state
  const [sortColumn, setSortColumn] = useState(7); // Default sort by IndexRegula (Column H)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data.json');
        if (!response.ok) {
          throw new Error('Falha ao carregar dados');
        }
        const jsonData = await response.json();
        setData(jsonData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      // Set new column and default to descending
      setSortColumn(columnIndex);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Erro ao carregar dados</p>
          <p className="text-muted-foreground">{error || 'Dados não disponíveis'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Filter Panel - Sidebar */}
      <FilterPanel
        agendas={data.filters.agendas}
        centrais={data.filters.centrais}
        especialidades={data.filters.especialidades}
        selectedAgendas={selectedAgendas}
        selectedCentrais={selectedCentrais}
        selectedEspecialidades={selectedEspecialidades}
        onAgendasChange={setSelectedAgendas}
        onCentraisChange={setSelectedCentrais}
        onEspecialidadesChange={setSelectedEspecialidades}
      />

      {/* Data Table - Main Content */}
      <DataTable
        headers={data.headers}
        rows={data.rows}
        selectedAgendas={selectedAgendas}
        selectedCentrais={selectedCentrais}
        selectedEspecialidades={selectedEspecialidades}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        onSort={handleSort}
      />
    </div>
  );
}
