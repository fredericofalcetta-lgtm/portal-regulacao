import { useState,
 useMemo } from 'react';
import FilterPanel from '@/components/FilterPanel';
import DataTable from '@/components/DataTable';
import { useRegulador } from '@/contexts/ReguladorContext';
import { usePersistedFilters } from '@/hooks/usePersistedFilters';
import { trpc } from '@/lib/trpc';
import { UltimaAtualizacao } from '@/components/UltimaAtualizacao';

interface RegulationProps {
  data: (string | number)[][];
  concluidasIds?: number[];
  onConcluir?: () => void;
  onRefresh?: () => void;
  dataUpdatedAt?: number;
}

// Perfis que têm acesso irrestrito a todas as especialidades
const PERFIS_IRRESTRITO = ['monitoramento', 'administrador'];

export default function Regulation({ data, concluidasIds = [], onConcluir, onRefresh, dataUpdatedAt }: RegulationProps) {
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

  const [selectedCores, setSelectedCores] = useState<Set<string>>(new Set());

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

  // Buscar dicionário de especialidades (agenda → especialidade)
  const { data: dicionario = [] } = trpc.dicionario.getAll.useQuery();
  const { data: coresDisponiveis = [] } = trpc.sheets.getCoresDisponiveis.useQuery(undefined, { staleTime: 5 * 60 * 1000 });

  // Mapa normalizado: nome_agenda_lower → especialidade_lower
  const mapaAgendaEspecialidade = useMemo(() => {
    const mapa = new Map<string, string>();
    dicionario.forEach(d => {
      mapa.set(d.agenda.trim().toLowerCase(), d.especialidade.trim().toLowerCase());
    });
    return mapa;
  }, [dicionario]);

  // Filtra os dados com base nas agendas responsáveis (se houver) e no Grande Grupo
  const dadosFiltradosPorPerfil = useMemo(() => {
    if (isIrrestrito) return data;

    // Parsear os grupos do regulador
    const gruposDoRegulador = regulador?.grandeGrupo
      ? regulador.grandeGrupo.split(/[,;\/]/).map(g => g.trim().toLowerCase()).filter(Boolean)
      : [];

    if (gruposDoRegulador.length === 0 && !agendasDoRegulador) return data;

    // Se há agendas específicas E dicionário carregado, aplicar lógica por grupo
    if (agendasDoRegulador && agendasDoRegulador.length > 0 && mapaAgendaEspecialidade.size > 0) {
      // Descobrir quais grupos têm agendas específicas definidas
      // Para cada agenda específica, encontrar sua especialidade no dicionário
      const gruposComAgendaEspecifica = new Set<string>();
      agendasDoRegulador.forEach(nomeAgenda => {
        const esp = mapaAgendaEspecialidade.get(nomeAgenda);
        if (esp) {
          // Encontrar qual grupo do regulador corresponde a essa especialidade
          gruposDoRegulador.forEach(grupo => {
            if (esp.includes(grupo) || grupo.includes(esp)) {
              gruposComAgendaEspecifica.add(grupo);
            }
          });
        }
      });

      return data.filter(row => {
        const nomeAgenda = String(row[0]).trim().toLowerCase();
        const especialidade = String(row[12]).trim().toLowerCase();

        // Verificar a qual grupo do regulador esta linha pertence
        const gruposDaLinha = gruposDoRegulador.filter(grupo =>
          especialidade.includes(grupo) || grupo.includes(especialidade)
        );

        if (gruposDaLinha.length === 0) return false;

        // Para cada grupo da linha, verificar se tem agendas específicas
        return gruposDaLinha.some(grupo => {
          if (gruposComAgendaEspecifica.has(grupo)) {
            // Grupo tem agendas específicas: mostrar apenas as listadas
            return agendasDoRegulador.some(ag => ag === nomeAgenda);
          } else {
            // Grupo sem agendas específicas: mostrar todas as agendas do grupo
            return true;
          }
        });
      });
    }

    // Sem agendas específicas: filtrar apenas por Grande Grupo
    if (gruposDoRegulador.length > 0) {
      return data.filter(row => {
        const especialidade = String(row[12]).toLowerCase();
        return gruposDoRegulador.some(grupo => especialidade.includes(grupo));
      });
    }

    return data;
  }, [data, regulador, isIrrestrito, agendasDoRegulador, mapaAgendaEspecialidade]);

  // Ordem personalizada das Centrais: CRA primeiro, depois NºCRS em ordem numérica
  const ORDEM_CENTRAIS = ['CRA', '1CRS', '2CRS', '3CRS', '4CRS', '5CRS', '6CRS', '7CRS', '8CRS', '9CRS', '10CRS', '11CRS', '12CRS', '13CRS', '14CRS', '15CRS', '16CRS', '17CRS', '18CRS'];

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
      const central = String(row[11]);
      if (central) centraisSet.add(central);
      // Expande especialidades compostas
      expandirEspecialidades(String(row[12])).forEach(esp => { if (esp) especialidadesSet.add(esp); });
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
      const especialidadesBruto = String(row[12]);
      const central = String(row[11]);

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
  }, [dadosFiltradosPorPerfil, selectedEspecialidades, selectedCentrais, selectedCores]);

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
      {/* Indicador de última atualização */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <UltimaAtualizacao compact />
      </div>
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
        selectedCores={selectedCores}
        onCoresChange={setSelectedCores}
        coresDisponiveis={coresDisponiveis}
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
        selectedCores={selectedCores}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        onSort={handleSort}
        perfilUsuario={perfilAtivo ?? regulador?.perfil ?? ''}
        emailUsuario={regulador?.email ?? ''}
        concluidasIds={concluidasIds}
        onConcluir={onConcluir}
        onRefresh={onRefresh}
        dataUpdatedAt={dataUpdatedAt}
      />
    </div>
  );
}
