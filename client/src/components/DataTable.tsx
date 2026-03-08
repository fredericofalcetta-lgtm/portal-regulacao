import { useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Row {
  [key: string]: string | number;
}

interface DataTableProps {
  headers: string[];
  rows: (string | number)[][];
  selectedAgendas: Set<string>;
  selectedCentrais: Set<string>;
  selectedEspecialidades: Set<string>;
  sortColumn: number;
  sortOrder: 'asc' | 'desc';
  onSort: (column: number) => void;
}

export default function DataTable({
  headers,
  rows,
  selectedAgendas,
  selectedCentrais,
  selectedEspecialidades,
  sortColumn,
  sortOrder,
  onSort,
}: DataTableProps) {
  // Filter and sort data
  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows.filter(row => {
      // Check if row matches all selected filters
      const agenda = String(row[0]); // Column A
      const central = String(row[8]); // Column I
      const especialidade = String(row[9]); // Column J

      const matchesAgenda = selectedAgendas.size === 0 || selectedAgendas.has(agenda);
      const matchesCentral = selectedCentrais.size === 0 || selectedCentrais.has(central);
      const matchesEspecialidade =
        selectedEspecialidades.size === 0 || selectedEspecialidades.has(especialidade);

      return matchesAgenda && matchesCentral && matchesEspecialidade;
    });

    // Sort by IndexRegula (Column H - index 7) in descending order by default
    // Then apply custom sort if user clicked a column
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      let columnToSort = sortColumn;

      // If sorting by column 7 (IndexRegula), always use numeric sort
      if (columnToSort === 7) {
        aVal = parseFloat(String(a[7])) || 0;
        bVal = parseFloat(String(b[7])) || 0;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }

      // Try to parse as numbers for numeric columns
      const numericColumns = [2, 3, 4, 5, 6, 7]; // Cotas, Saldo, Aguardando, Autorizadas, Aut/Cotas, IndexRegula
      if (numericColumns.includes(columnToSort)) {
        aVal = parseFloat(String(a[columnToSort])) || 0;
        bVal = parseFloat(String(b[columnToSort])) || 0;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }

      // String sort for other columns
      aVal = String(a[columnToSort]);
      bVal = String(b[columnToSort]);
      return sortOrder === 'desc'
        ? bVal.localeCompare(aVal, 'pt-BR')
        : aVal.localeCompare(bVal, 'pt-BR');
    });

    return filtered;
  }, [rows, selectedAgendas, selectedCentrais, selectedEspecialidades, sortColumn, sortOrder]);

  const handleSort = (columnIndex: number) => {
    onSort(columnIndex);
  };

  const getIndexRegulaColor = (value: number): string => {
    if (value > 3) return 'bg-red-100 dark:bg-red-950/50 text-red-900 dark:text-red-300';
    if (value > 2) return 'bg-orange-100 dark:bg-orange-950/50 text-orange-900 dark:text-orange-300';
    if (value > 1) return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-900 dark:text-yellow-300';
    return '';
  };

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
          <thead className="sticky top-0 bg-secondary">
            <tr>
              <th
                onClick={() => handleSort(0)}
                className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span>Agenda</span>
                  {sortColumn === 0 && (
                    <span>
                      {sortOrder === 'desc' ? (
                        <ChevronDown size={16} className="text-primary" />
                      ) : (
                        <ChevronUp size={16} className="text-primary" />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort(2)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Cotas</span>
                  {sortColumn === 2 && (
                    <span>
                      {sortOrder === 'desc' ? (
                        <ChevronDown size={16} className="text-primary" />
                      ) : (
                        <ChevronUp size={16} className="text-primary" />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort(3)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Saldo</span>
                  {sortColumn === 3 && (
                    <span>
                      {sortOrder === 'desc' ? (
                        <ChevronDown size={16} className="text-primary" />
                      ) : (
                        <ChevronUp size={16} className="text-primary" />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort(4)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Aguardando</span>
                  {sortColumn === 4 && (
                    <span>
                      {sortOrder === 'desc' ? (
                        <ChevronDown size={16} className="text-primary" />
                      ) : (
                        <ChevronUp size={16} className="text-primary" />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort(5)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Autorizadas</span>
                  {sortColumn === 5 && (
                    <span>
                      {sortOrder === 'desc' ? (
                        <ChevronDown size={16} className="text-primary" />
                      ) : (
                        <ChevronUp size={16} className="text-primary" />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort(7)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Index</span>
                  {sortColumn === 7 && (
                    <span>
                      {sortOrder === 'desc' ? (
                        <ChevronDown size={16} className="text-primary" />
                      ) : (
                        <ChevronUp size={16} className="text-primary" />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort(8)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Central</span>
                  {sortColumn === 8 && (
                    <span>
                      {sortOrder === 'desc' ? (
                        <ChevronDown size={16} className="text-primary" />
                      ) : (
                        <ChevronUp size={16} className="text-primary" />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort(9)}
                className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Especialidade</span>
                  {sortColumn === 9 && (
                    <span>
                      {sortOrder === 'desc' ? (
                        <ChevronDown size={16} className="text-primary" />
                      ) : (
                        <ChevronUp size={16} className="text-primary" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center">
                  <p className="text-muted-foreground">Nenhum resultado encontrado</p>
                </td>
              </tr>
            ) : (
              filteredAndSortedRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`border-b border-border hover:bg-secondary transition-colors ${
                    rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                  }`}
                >
                  {/* Agenda column with smaller font for municipality */}
                  <td className="px-6 py-4 text-foreground">
                    <div className="font-medium text-sm">{String(row[0])}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {String(row[1])}
                    </div>
                  </td>
                  {/* Cotas */}
                  <td className="px-3 py-4 text-center text-sm font-medium text-foreground">
                    {String(row[2])}
                  </td>
                  {/* Saldo */}
                  <td className="px-3 py-4 text-center text-sm font-medium text-foreground">
                    {String(row[3])}
                  </td>
                  {/* Aguardando */}
                  <td className="px-3 py-4 text-center text-sm font-medium text-foreground">
                    {String(row[4])}
                  </td>
                  {/* Autorizadas */}
                  <td className="px-3 py-4 text-center text-sm font-medium text-foreground">
                    {String(row[5])}
                  </td>
                  {/* IndexRegula with conditional coloring */}
                  <td className="px-3 py-4 text-center">
                    {(() => {
                      const value = parseFloat(String(row[7])) || 0;
                      const bgColor = getIndexRegulaColor(value);
                      return (
                        <span
                          className={`inline-block px-2 py-1 rounded text-sm font-semibold ${
                            bgColor || 'text-foreground'
                          }`}
                        >
                          {value.toFixed(2)}
                        </span>
                      );
                    })()}
                  </td>
                  {/* Central */}
                  <td className="px-3 py-4 text-center text-xs font-medium text-foreground">
                    {String(row[8])}
                  </td>
                  {/* Especialidade */}
                  <td className="px-3 py-4 text-center text-xs text-foreground">
                    {String(row[9])}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
