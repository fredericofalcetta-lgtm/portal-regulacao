import { useMemo, memo, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import EncaminharCell from './EncaminharCell';
import CheckInCell from './CheckInCell';

interface DataTableProps {
  headers: string[];
  rows: (string | number)[][];
  selectedAgendas: Set<string>;
  selectedCentrais: Set<string>;
  selectedEspecialidades: Set<string>;
  sortColumn: number;
  sortOrder: 'asc' | 'desc';
  onSort: (column: number) => void;
  perfilUsuario: string;
  emailUsuario: string;
}

// Memoizar a linha da tabela para evitar re-renders desnecessários
const TableRow = memo(function TableRow({
  row,
  rowIndex,
  isAdminOuMonitor,
  encaminhadosAtuais,
  checkInsAtuais,
  reguladoresList,
  emailUsuario,
  onUpdate,
}: {
  row: (string | number)[];
  rowIndex: number;
  isAdminOuMonitor: boolean;
  encaminhadosAtuais: { reguladorEmail: string; reguladorNome: string }[];
  checkInsAtuais: { usuarioEmail: string; usuarioNome: string }[];
  reguladoresList: { email: string; nome: string }[];
  emailUsuario: string;
  onUpdate: () => void;
}) {
  const agendaId = typeof row[10] === 'number' ? row[10] : 0;
  const indexValue = parseFloat(String(row[7])) || 0;

  const getIndexRegulaColor = (value: number): string => {
    if (value > 3) return 'bg-red-100 dark:bg-red-950/50 text-red-900 dark:text-red-300';
    if (value > 2) return 'bg-orange-100 dark:bg-orange-950/50 text-orange-900 dark:text-orange-300';
    if (value > 1) return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-900 dark:text-yellow-300';
    return '';
  };

  return (
    <tr
      className={`border-b border-border hover:bg-secondary transition-colors ${
        rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/30'
      }`}
    >
      {/* Agenda */}
      <td className="px-6 py-3 text-foreground">
        <div className="font-medium text-sm">{String(row[0])}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{String(row[1])}</div>
      </td>

      {/* Encaminhar — apenas admin/monitor */}
      {isAdminOuMonitor && (
        <td className="px-3 py-3 text-center">
          {agendaId > 0 ? (
            <EncaminharCell
              agendaId={agendaId}
              agendaNome={String(row[0])}
              especialidade={String(row[9])}
              encaminhadosAtuais={encaminhadosAtuais}
              reguladoresList={reguladoresList}
              onUpdate={onUpdate}
            />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
      )}

      {/* Check-in — todos */}
      <td className="px-3 py-3 text-center">
        {agendaId > 0 ? (
          <CheckInCell
            agendaId={agendaId}
            agendaNome={String(row[0])}
            municipio={String(row[1])}
            especialidade={String(row[9])}
            central={String(row[8])}
            cotas={typeof row[2] === 'number' ? row[2] : undefined}
            saldo={typeof row[3] === 'number' ? row[3] : undefined}
            aguardando={typeof row[4] === 'number' ? row[4] : undefined}
            indexRegula={indexValue}
            checkInsAtuais={checkInsAtuais}
            usuarioEmail={emailUsuario}
            onUpdate={onUpdate}
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Cotas */}
      <td className="px-3 py-3 text-center text-sm font-medium text-foreground">
        {String(row[2])}
      </td>
      {/* Saldo */}
      <td className="px-3 py-3 text-center text-sm font-medium text-foreground">
        {String(row[3])}
      </td>
      {/* Aguardando */}
      <td className="px-3 py-3 text-center text-sm font-medium text-foreground">
        {String(row[4])}
      </td>
      {/* Autorizadas */}
      <td className="px-3 py-3 text-center text-sm font-medium text-foreground">
        {String(row[5])}
      </td>
      {/* IndexRegula */}
      <td className="px-3 py-3 text-center">
        <span
          className={`inline-block px-2 py-1 rounded text-sm font-semibold ${
            getIndexRegulaColor(indexValue) || 'text-foreground'
          }`}
        >
          {indexValue.toFixed(2)}
        </span>
      </td>
      {/* Central */}
      <td className="px-3 py-3 text-center text-xs font-medium text-foreground">
        {String(row[8])}
      </td>
    </tr>
  );
});

export default function DataTable({
  headers,
  rows,
  selectedAgendas,
  selectedCentrais,
  selectedEspecialidades,
  sortColumn,
  sortOrder,
  onSort,
  perfilUsuario,
  emailUsuario,
}: DataTableProps) {
  const isAdminOuMonitor =
    perfilUsuario.toLowerCase() === 'administrador' ||
    perfilUsuario.toLowerCase() === 'monitoramento';

  // Uma única query para reguladores — compartilhada por todas as linhas
  const { data: reguladoresList = [] } = trpc.reguladores.listarReguladores.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Queries de encaminhamentos e check-ins com staleTime para evitar refetches desnecessários
  const { data: encaminhamentosData = [], refetch: refetchEncaminhamentos } =
    trpc.encaminhamentos.getAll.useQuery(undefined, {
      staleTime: 30 * 1000, // 30 segundos
    });
  const { data: checkInsData = [], refetch: refetchCheckIns } =
    trpc.checkIns.getAll.useQuery(undefined, {
      staleTime: 30 * 1000,
    });

  // Mapear encaminhamentos por agendaId
  const encaminhamentosPorAgenda = useMemo(() => {
    const map = new Map<number, { reguladorEmail: string; reguladorNome: string }[]>();
    for (const enc of encaminhamentosData) {
      const list = map.get(enc.agendaId) ?? [];
      list.push({ reguladorEmail: enc.reguladorEmail, reguladorNome: enc.reguladorNome });
      map.set(enc.agendaId, list);
    }
    return map;
  }, [encaminhamentosData]);

  // Mapear check-ins por agendaId
  const checkInsPorAgenda = useMemo(() => {
    const map = new Map<number, { usuarioEmail: string; usuarioNome: string }[]>();
    for (const ci of checkInsData) {
      const list = map.get(ci.agendaId) ?? [];
      list.push({ usuarioEmail: ci.usuarioEmail, usuarioNome: ci.usuarioNome });
      map.set(ci.agendaId, list);
    }
    return map;
  }, [checkInsData]);

  const handleUpdate = useCallback(() => {
    refetchEncaminhamentos();
    refetchCheckIns();
  }, [refetchEncaminhamentos, refetchCheckIns]);

  // Filter and sort data
  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows.filter(row => {
      const agenda = String(row[0]);
      const central = String(row[8]);
      const especialidade = String(row[9]);

      const matchesAgenda = selectedAgendas.size === 0 || selectedAgendas.has(agenda);
      const matchesCentral = selectedCentrais.size === 0 || selectedCentrais.has(central);
      const matchesEspecialidade =
        selectedEspecialidades.size === 0 || selectedEspecialidades.has(especialidade);

      return matchesAgenda && matchesCentral && matchesEspecialidade;
    });

    filtered.sort((a, b) => {
      const numericColumns = [2, 3, 4, 5, 6, 7];
      if (numericColumns.includes(sortColumn)) {
        const aVal = parseFloat(String(a[sortColumn])) || 0;
        const bVal = parseFloat(String(b[sortColumn])) || 0;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }
      const aVal = String(a[sortColumn]);
      const bVal = String(b[sortColumn]);
      return sortOrder === 'desc'
        ? bVal.localeCompare(aVal, 'pt-BR')
        : aVal.localeCompare(bVal, 'pt-BR');
    });

    return filtered;
  }, [rows, selectedAgendas, selectedCentrais, selectedEspecialidades, sortColumn, sortOrder]);

  const SortIcon = ({ col }: { col: number }) =>
    sortColumn === col ? (
      sortOrder === 'desc' ? (
        <ChevronDown size={16} className="text-primary" />
      ) : (
        <ChevronUp size={16} className="text-primary" />
      )
    ) : null;

  return (
    <div className="flex-1 flex flex-col bg-card">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-semibold text-foreground">
          Regulação de Encaminhamentos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filteredAndSortedRows.length} resultado{filteredAndSortedRows.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              {/* Agenda */}
              <th
                onClick={() => onSort(0)}
                className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center space-x-1">
                  <span>Agenda</span>
                  <SortIcon col={0} />
                </div>
              </th>

              {/* Encaminhar — apenas admin/monitor */}
              {isAdminOuMonitor && (
                <th className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">
                  Encaminhar
                </th>
              )}

              {/* Check-in — todos */}
              <th className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">
                Check-in
              </th>

              {/* Cotas */}
              <th
                onClick={() => onSort(2)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Cotas</span>
                  <SortIcon col={2} />
                </div>
              </th>
              {/* Saldo */}
              <th
                onClick={() => onSort(3)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Saldo</span>
                  <SortIcon col={3} />
                </div>
              </th>
              {/* Aguardando */}
              <th
                onClick={() => onSort(4)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Aguardando</span>
                  <SortIcon col={4} />
                </div>
              </th>
              {/* Autorizadas */}
              <th
                onClick={() => onSort(5)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Autorizadas</span>
                  <SortIcon col={5} />
                </div>
              </th>
              {/* Index */}
              <th
                onClick={() => onSort(7)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Index</span>
                  <SortIcon col={7} />
                </div>
              </th>
              {/* Central */}
              <th
                onClick={() => onSort(8)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Central</span>
                  <SortIcon col={8} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length === 0 ? (
              <tr>
                <td colSpan={isAdminOuMonitor ? 9 : 8} className="px-6 py-8 text-center">
                  <p className="text-muted-foreground">Nenhum resultado encontrado</p>
                </td>
              </tr>
            ) : (
              filteredAndSortedRows.map((row, rowIndex) => {
                const agendaId = typeof row[10] === 'number' ? row[10] : 0;
                return (
                  <TableRow
                    key={agendaId > 0 ? agendaId : rowIndex}
                    row={row}
                    rowIndex={rowIndex}
                    isAdminOuMonitor={isAdminOuMonitor}
                    encaminhadosAtuais={encaminhamentosPorAgenda.get(agendaId) ?? []}
                    checkInsAtuais={checkInsPorAgenda.get(agendaId) ?? []}
                    reguladoresList={reguladoresList}
                    emailUsuario={emailUsuario}
                    onUpdate={handleUpdate}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
