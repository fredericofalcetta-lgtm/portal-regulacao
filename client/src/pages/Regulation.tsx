import { useMemo, useState } from 'react';
import FilterPanel from '@/components/FilterPanel';
import DataTable from '@/components/DataTable';
import { useRegulador } from '@/contexts/ReguladorContext';

interface RegulationProps {
  data: (string | number)[][];
}

// Perfis que têm acesso irrestrito a todas as especialidades
const PERFIS_IRRESTRITO = ['monitoramento', 'administrador'];

export default function Regulation({ data }: RegulationProps) {
  const { regulador } = useRegulador();
  const [selectedAgendas, setSelectedAgendas] = useState<Set<string>>(new Set());
  const [selectedCentrais, setSelectedCentrais] = useState<Set<string>>(new Set());
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState(7); // Default sort by IndexRegula
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Verifica se o perfil do regulador tem acesso irrestrito
  const isIrrestrito = useMemo(() => {
    if (!regulador?.perfil) return false;
    return PERFIS_IRRESTRITO.includes(regulador.perfil.toLowerCase());
  }, [regulador]);

  // Filtra os dados com base no Grande Grupo do regulador (se perfil restrito)
  const dadosFiltradosPorPerfil = useMemo(() => {
    if (isIrrestrito || !regulador?.grandeGrupo) return data;

    const gruposDoRegulador = regulador.grandeGrupo
      .split(/[,;\/]/)
      .map(g => g.trim().toLowerCase())
      .filter(Boolean);

    if (gruposDoRegulador.length === 0) return data;

    return data.filter(row => {
      const especialidade = String(row[9]).toLowerCase();
      return gruposDoRegulador.some(grupo => especialidade.includes(grupo));
    });
  }, [data, regulador, isIrrestrito]);

  // Extract unique values for filters (based on filtered data)
  const { agendas, centrais, especialidades } = useMemo(() => {
    const agendasSet = new Set<string>();
    const centraisSet = new Set<string>();
    const especialidadesSet = new Set<string>();

    dadosFiltradosPorPerfil.forEach(row => {
      agendasSet.add(String(row[0]));
      centraisSet.add(String(row[8]));
      especialidadesSet.add(String(row[9]));
    });

    return {
      agendas: Array.from(agendasSet).sort(),
      centrais: Array.from(centraisSet).sort(),
      especialidades: Array.from(especialidadesSet).sort(),
    };
  }, [dadosFiltradosPorPerfil]);

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
      {/* Aviso de restrição por perfil */}
      {!isIrrestrito && regulador?.grandeGrupo && (
        <div className="absolute top-2 right-4 z-10">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Exibindo especialidades de: <strong>{regulador.grandeGrupo}</strong>
          </div>
        </div>
      )}

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
        rows={dadosFiltradosPorPerfil}
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
