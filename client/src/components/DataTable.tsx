import { memo, useMemo, useCallback, Fragment } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import EncaminharCell from './EncaminharCell';
import AutoEncaminharCell from './AutoEncaminharCell';
import CheckInCell from './CheckInCell';
import { getCorRowStyle, getCorBadgeStyle, getCorPrioridade } from '@/lib/corAgenda';

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
  concluidasIds?: number[];
  onConcluir?: () => void;
  onRefresh?: () => void;
  dataUpdatedAt?: number;
}

// Memoizar a linha da tabela para evitar re-renders desnecessários
const TableRow = memo(function TableRow({
  row,
  rowIndex,
  isAdminOuMonitor,
  isRegulador,
  encaminhadosAtuais,
  checkInsAtuais,
  reguladoresList,
  emailUsuario,
  onUpdate,
  isConcluida,
}: {
  row: (string | number)[];
  rowIndex: number;
  isAdminOuMonitor: boolean;
  isRegulador: boolean;
  encaminhadosAtuais: { reguladorEmail: string; reguladorNome: string }[];
  checkInsAtuais: { usuarioEmail: string; usuarioNome: string }[];
  reguladoresList: { email: string; nome: string }[];
  emailUsuario: string;
  onUpdate: () => void;
  isConcluida: boolean;
}) {
  // Layout de índices: [0]agenda [1]municipio [2]cotas [3]saldo [4]aguardando
  // [5]autorizadas [6]autCotas [7]indexRegula [8]>7d [9]>28d [10]>90d
  // [11]central [12]especialidade [13]flagIndex [14]corIndex [15]flagAutCotas [16]corAutCotas [17]id
  const agendaId = typeof row[17] === 'number' ? row[17] : 0;
  const cor = String(row[14] ?? '');  // corIndex
  const flagIndex = String(row[13] ?? '');
  const flagAutCotas = String(row[15] ?? '');
  const corAutCotas = String(row[16] ?? '');
  const indexValue = parseFloat(String(row[7])) || 0;

  const getIndexRegulaColor = (value: number): string => {
    if (value > 3) return 'bg-red-100 dark:bg-red-950/50 text-red-900 dark:text-red-300';
    if (value > 2) return 'bg-orange-100 dark:bg-orange-950/50 text-orange-900 dark:text-orange-300';
    if (value > 1) return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-900 dark:text-yellow-300';
    return '';
  };

  const corRowStyle = getCorRowStyle(cor);
  const corBadgeStyle = getCorBadgeStyle(cor);

  return (
    <tr
      className={`border-b border-border hover:bg-secondary transition-colors ${
        isConcluida
          ? 'opacity-60 bg-emerald-50 dark:bg-emerald-950/20'
          : 'bg-card'
      }`}
      style={isConcluida ? undefined : corRowStyle}
    >
      {/* Agenda */}
      <td className="px-6 py-3 text-foreground">
        <div className="font-medium text-sm flex items-center gap-2">
          {cor && !isConcluida && <span style={corBadgeStyle} title={cor} />}
          {isConcluida && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Concluída
            </span>
          )}
          {String(row[0])}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{String(row[1])}</div>
      </td>

      {/* Encaminhar — admin/monitor: dropdown; regulador: botão toggle */}
      {(isAdminOuMonitor || isRegulador) && (
        <td className="px-3 py-3 text-center">
          {isConcluida ? (
            <span className="text-xs text-muted-foreground italic">bloqueado</span>
          ) : agendaId > 0 ? (
            isAdminOuMonitor ? (
              <EncaminharCell
                agendaId={agendaId}
                agendaNome={String(row[0])}
                municipio={String(row[1])}
                central={String(row[11])}
                especialidade={String(row[12])}
                encaminhadosAtuais={encaminhadosAtuais}
                reguladoresList={reguladoresList}
                onUpdate={onUpdate}
              />
            ) : (
              <AutoEncaminharCell
                agendaId={agendaId}
                agendaNome={String(row[0])}
                municipio={String(row[1])}
                central={String(row[11])}
                especialidade={String(row[12])}
                emailUsuario={emailUsuario}
                encaminhadosAtuais={encaminhadosAtuais}
                onUpdate={onUpdate}
              />
            )
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
      )}

      {/* Regulando — lista de reguladores com check-in ativo */}
      <td className="px-3 py-3 text-center">
        {checkInsAtuais.length > 0 ? (
          <div className="flex flex-col gap-1 items-center">
            {checkInsAtuais.map((ci) => (
              <span
                key={ci.usuarioEmail}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
              >
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 8 8">
                  <circle cx="4" cy="4" r="3" />
                </svg>
                {ci.usuarioNome || ci.usuarioEmail}
              </span>
            ))}
          </div>
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
      {/* Aut/Cotas */}
      <td className="px-3 py-3 text-center">
        <span
          title={flagAutCotas || undefined}
          className={`inline-block px-2 py-1 rounded text-sm font-semibold cursor-default ${
            corAutCotas === 'Vermelho' ? 'bg-red-100 dark:bg-red-950/50 text-red-900 dark:text-red-300' :
            corAutCotas === 'Laranja' ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-900 dark:text-orange-300' :
            corAutCotas === 'Amarelo' ? 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-900 dark:text-yellow-300' :
            corAutCotas === 'Verde' ? 'bg-green-100 dark:bg-green-950/50 text-green-900 dark:text-green-300' :
            'text-foreground'
          }`}
        >
          {(() => {
            // autCotas vem como string pt-BR (ex: "21,2") — converter antes de formatar
            const raw = String(row[6] ?? '');
            const v = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
            return isNaN(v) ? (raw || '—') : v.toFixed(2);
          })()}
        </span>
      </td>
      {/* IndexRegula */}
      <td className="px-3 py-3 text-center">
        <span
          title={flagIndex || undefined}
          className={`inline-block px-2 py-1 rounded text-sm font-semibold cursor-default ${
            getIndexRegulaColor(indexValue) || 'text-foreground'
          }`}
        >
          {indexValue.toFixed(2)}
        </span>
      </td>
      {/* >7d */}
      <td className="px-3 py-3 text-center text-sm font-medium text-foreground">
        {row[8] ? String(row[8]) : '—'}
      </td>
      {/* >28d */}
      <td className="px-3 py-3 text-center text-sm font-medium text-foreground">
        {row[9] ? String(row[9]) : '—'}
      </td>
              {/* >90d */}

      <td className="px-3 py-3 text-center text-sm font-medium text-foreground">
        {row[10] ? String(row[10]) : '—'}
      </td>
      {/* Central */}
      <td className="px-3 py-3 text-center text-xs font-medium text-foreground">
        {String(row[11])}
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
  concluidasIds = [],
  onConcluir,
  onRefresh,
  dataUpdatedAt,
}: DataTableProps) {
  const concluidasSet = useMemo(() => new Set(concluidasIds), [concluidasIds]);
  const perfilLower = perfilUsuario.toLowerCase();
  const isAdminOuMonitor =
    perfilLower.includes('administrador') ||
    perfilLower.includes('monitoramento');
  const isRegulador = perfilLower.includes('regulador');

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
    onConcluir?.();
  }, [refetchEncaminhamentos, refetchCheckIns, onConcluir]);

  // Expande especialidades compostas (ex: "Fisiatria, Reumatologia") em partes individuais
  const expandirEspecialidades = (valor: string): string[] =>
    valor.split(/[,;]/).map(e => e.trim()).filter(Boolean);

  // Filter and sort data
  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows.filter(row => {
      const agenda = String(row[0]);
      const central = String(row[11]);
      const especialidadeBruta = String(row[12]);

      const matchesAgenda = selectedAgendas.size === 0 || selectedAgendas.has(agenda);
      const matchesCentral = selectedCentrais.size === 0 || selectedCentrais.has(central);
      // Verifica se qualquer das especialidades da linha está no filtro selecionado
      const partesEsp = expandirEspecialidades(especialidadeBruta);
      const matchesEspecialidade =
        selectedEspecialidades.size === 0 ||
        partesEsp.some(p => selectedEspecialidades.has(p));

      return matchesAgenda && matchesCentral && matchesEspecialidade;
    });

    filtered.sort((a, b) => {
      // Coluna especial 14 = ordenar por cor (prioridade definida)
      if (sortColumn === 14) {
        const pa = getCorPrioridade(String(a[14] ?? ''));
        const pb = getCorPrioridade(String(b[14] ?? ''));
        if (pa !== pb) return sortOrder === 'asc' ? pa - pb : pb - pa;
        // Desempate: nome da agenda
        return String(a[0]).localeCompare(String(b[0]), 'pt-BR');
      }
      const numericColumns = [2, 3, 4, 5, 6, 7, 8, 9, 10];
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Regulação de Encaminhamentos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredAndSortedRows.length} resultado{filteredAndSortedRows.length !== 1 ? 's' : ''}
            </p>
          </div>

        </div>
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

              {/* Encaminhar — admin/monitor e regulador */}
              {(isAdminOuMonitor || isRegulador) && (
                <th className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">
                  Encaminhar
                </th>
              )}

              {/* Regulando — quem está com check-in ativo */}
              <th className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">
                Regulando
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
              {/* Aut/Cotas */}
              <th
                onClick={() => onSort(6)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Aut/Cotas</span>
                  <SortIcon col={6} />
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
              {/* >7d */}
              <th
                onClick={() => onSort(8)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>&gt;7d</span>
                  <SortIcon col={8} />
                </div>
              </th>
              {/* >28d */}
              <th
                onClick={() => onSort(9)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>&gt;28d</span>
                  <SortIcon col={9} />
                </div>
              </th>
              {/* >90d */}
              <th
                onClick={() => onSort(10)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>&gt;90d</span>
                  <SortIcon col={10} />
                </div>
              </th>
              {/* Central */}
              <th
                onClick={() => onSort(11)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Central</span>
                  <SortIcon col={11} />
                </div>
              </th>

            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length === 0 ? (
              <tr>
                <td colSpan={(isAdminOuMonitor || isRegulador) ? 12 : 11} className="px-6 py-8 text-center">
                  <p className="text-muted-foreground">Nenhum resultado encontrado</p>
                </td>
              </tr>
            ) : (
              filteredAndSortedRows.map((row, rowIndex) => {
                const agendaId = typeof row[17] === 'number' ? row[17] : 0;
                // Separador visual entre grupos de cor (só quando ordenando por cor)
                const corAtual = String(row[14] ?? '');
                const corAnterior = rowIndex > 0 ? String(filteredAndSortedRows[rowIndex - 1][14] ?? '') : corAtual;
                const isNovoCor = sortColumn === 14 && rowIndex > 0 && getCorPrioridade(corAtual) !== getCorPrioridade(corAnterior);
                return (
                  <Fragment key={agendaId > 0 ? agendaId : rowIndex}>
                    {isNovoCor && (
                      <tr>
                        <td colSpan={(isAdminOuMonitor || isRegulador) ? 12 : 11} className="h-0 p-0">
                          <div className="border-t-2 border-dashed border-border/60 mx-4" />
                        </td>
                      </tr>
                    )}
                    <TableRow
                      row={row}
                      rowIndex={rowIndex}
                      isAdminOuMonitor={isAdminOuMonitor}
                      isRegulador={isRegulador}
                      encaminhadosAtuais={encaminhamentosPorAgenda.get(agendaId) ?? []}
                      checkInsAtuais={checkInsPorAgenda.get(agendaId) ?? []}
                      reguladoresList={reguladoresList}
                      emailUsuario={emailUsuario}
                      onUpdate={handleUpdate}
                      isConcluida={agendaId > 0 && concluidasSet.has(agendaId)}
                    />
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
