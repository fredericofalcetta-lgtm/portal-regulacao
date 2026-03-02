import { useMemo, useState } from 'react';
import FilterPanel from '@/components/FilterPanel';
import DataTable from '@/components/DataTable';

interface RegulationProps {
  data: (string | number)[][];
}

export default function Regulation({ data }: RegulationProps) {
  const [selectedAgendas, setSelectedAgendas] = useState<Set<string>>(new Set());
  const [selectedCentrais, setSelectedCentrais] = useState<Set<string>>(new Set());
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState(7); // Default sort by IndexRegula
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Extract unique values for filters
  const { agendas, centrais, especialidades } = useMemo(() => {
    const agendasSet = new Set<string>();
    const centraisSet = new Set<string>();
    const especialidadesSet = new Set<string>();

    data.forEach(row => {
      agendasSet.add(String(row[0]));
      centraisSet.add(String(row[8]));
      especialidadesSet.add(String(row[9]));
    });

    return {
      agendas: Array.from(agendasSet).sort(),
      centrais: Array.from(centraisSet).sort(),
      especialidades: Array.from(especialidadesSet).sort(),
    };
  }, [data]);

  const headers = [
    'Agenda',
    'Município',
    'Cotas',
    'Saldo',
    'Aguardando',
    'Autorizadas',
    'Aut/Cotas',
    'IndexRegula',
    'Central',
    'Especialidade',
  ];

  const handleSort = (column: number) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar com Filtros */}
      <FilterPanel
        agendas={agendas}
        centrais={centrais}
        especialidades={especialidades}
        selectedAgendas={selectedAgendas}
        selectedCentrais={selectedCentrais}
        selectedEspecialidades={selectedEspecialidades}
        onAgendasChange={setSelectedAgendas}
        onCentraisChange={setSelectedCentrais}
        onEspecialidadesChange={setSelectedEspecialidades}
      />

      {/* Tabela de Dados */}
      <DataTable
        headers={headers}
        rows={data}
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
