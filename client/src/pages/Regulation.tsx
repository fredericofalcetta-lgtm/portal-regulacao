import { useMemo } from 'react';
import FilterPanel from '@/components/FilterPanel';
import DataTable from '@/components/DataTable';
import { useRegulador } from '@/contexts/ReguladorContext';
import { usePersistedFilters } from '@/hooks/usePersistedFilters';

interface RegulationProps {
  data: (string | number)[][];
}

// Perfis que têm acesso irrestrito a todas as especialidades
const PERFIS_IRRESTRITO = ['monitoramento', 'administrador'];

export default function Regulation({ data }: RegulationProps) {
  const { regulador, perfilAtivo } = useRegulador();
  const {
    selectedAgendas,
    selectedCentrais,
    selectedEspecialidades,
    sortColumn,
    sortOrder,
    setSelectedAgendas,
    setSelectedCentrais,
    setSelectedEspecialidades,
    setSortColumn,
    setSortOrder,
  } = usePersistedFilters();

  // Verifica se o perfil ATIVO tem acesso irrestrito
  const isIrrestrito = useMemo(() => {
    const perfil = perfilAtivo ?? regulador?.perfil ?? null;
    if (!perfil) return false;
    return PERFIS_IRRESTRITO.includes(perfil.toLowerCase());
  }, [regulador, perfilAtivo]);

  // Parseia a lista de agendas responsáveis do regulador (campo agendas, coluna E da planilha)
  // Suporta separadores: vírgula, ponto-e-vírgula, barra, ou múltiplos espaços
  const agendasDoRegulador = useMemo(() => {
    if (!regulador?.agendas) return null;
    const lista = regulador.agendas
      .split(/[,;\/]|\s{2,}/)
      .map(a => a.trim().toLowerCase())
      .filter(Boolean);
    return lista.length > 0 ? lista : null;
  }, [regulador]);

  // Filtra os dados com base nas agendas responsáveis (se houver) e no Grande Grupo
  const dadosFiltradosPorPerfil = useMemo(() => {
    if (isIrrestrito) return data;

    let resultado = data;

    // Filtro por agendas responsáveis (coluna E da planilha Reguladores)
    // Usa correspondência exata (normalizada) para evitar que agendas com nomes similares aparecem
    if (agendasDoRegulador && agendasDoRegulador.length > 0) {
      resultado = resultado.filter(row => {
        const nomeAgenda = String(row[0]).trim().toLowerCase();
        return agendasDoRegulador.some(ag => ag === nomeAgenda);
      });
      return resultado;
    }

    // Fallback: filtro por Grande Grupo (especialidade) se não houver agendas definidas
    if (regulador?.grandeGrupo) {
      const gruposDoRegulador = regulador.grandeGrupo
        .split(/[,;\/]/)
        .map(g => g.trim().toLowerCase())
        .filter(Boolean);

      if (gruposDoRegulador.length > 0) {
        resultado = resultado.filter(row => {
          const especialidade = String(row[9]).toLowerCase();
          return gruposDoRegulador.some(grupo => especialidade.includes(grupo));
        });
      }
    }

    return resultado;
  }, [data, regulador, isIrrestrito, agendasDoRegulador]);

  // Ordem personalizada das Centrais: CRA primeiro, depois NºCRS em ordem numérica
  const ORDEM_CENTRAIS = ['CRA', '1CRS', '2CRS', '3CRS', '5CRS', '6CRS', '7CRS', '8CRS', '9CRS', '10CRS', '11CRS', '12CRS', '13CRS', '14CRS', '15CRS', '16CRS', '17CRS', '18CRS'];

  const sortCentrais = (lista: string[]): string[] => {
    return [...lista].sort((a, b) => {
      const ia = ORDEM_CENTRAIS.indexOf(a);
      const ib = ORDEM_CENTRAIS.indexOf(b);
      // Se ambos estão na lista de ordem, usar a posição definida
      if (ia !== -1 && ib !== -1) return ia - ib;
      // Se só um está, ele vem primeiro
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      // Demais valores em ordem alfabética
      return a.localeCompare(b);
    });
  };

  // Utilitário: expande um valor de especialidade composto em partes individuais
  // Suporta separadores: vírgula e ponto-e-vírgula
  const expandirEspecialidades = (valor: string): string[] => {
    return valor
      .split(/[,;]/)
      .map(e => e.trim())
      .filter(Boolean);
  };

  // Todas as opções únicas de filtro (sem cascata) — base para Especialidade e Central
  // Especialidades compostas (ex: "Fisiatria, Reumatologia") são expandidas em itens individuais
  const { centrais, especialidades } = useMemo(() => {
    const centraisSet = new Set<string>();
    const especialidadesSet = new Set<string>();

    dadosFiltradosPorPerfil.forEach(row => {
      centraisSet.add(String(row[8]));
      // Expande especialidades compostas
      expandirEspecialidades(String(row[9])).forEach(esp => especialidadesSet.add(esp));
    });

    return {
      centrais: sortCentrais(Array.from(centraisSet)),
      especialidades: Array.from(especialidadesSet).sort(),
    };
  }, [dadosFiltradosPorPerfil]);

  // Agendas em cascata: filtradas pelas especialidades selecionadas (e centrais selecionadas)
  // Considera que uma linha pode ter múltiplas especialidades separadas por vírgula
  const agendas = useMemo(() => {
    const agendasSet = new Set<string>();

    dadosFiltradosPorPerfil.forEach(row => {
      const especialidadesBruto = String(row[9]);
      const central = String(row[8]);

      const partes = expandirEspecialidades(especialidadesBruto);
      const matchEsp =
        selectedEspecialidades.size === 0 ||
        partes.some(p => selectedEspecialidades.has(p));
      const matchCentral =
        selectedCentrais.size === 0 || selectedCentrais.has(central);

      if (matchEsp && matchCentral) {
        agendasSet.add(String(row[0]));
      }
    });

    return Array.from(agendasSet).sort();
  }, [dadosFiltradosPorPerfil, selectedEspecialidades, selectedCentrais]);

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
      setSortOrder('desc' as const);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Aviso de restrição por perfil */}
      {!isIrrestrito && regulador?.grandeGrupo && (
        <div className="absolute top-2 right-4 z-10">
          <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
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
        perfilUsuario={regulador?.perfil ?? ''}
        emailUsuario={regulador?.email ?? ''}
      />
    </div>
  );
}
