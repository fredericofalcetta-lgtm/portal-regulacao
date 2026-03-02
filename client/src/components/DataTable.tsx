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

  return (
    <div className="flex-1 flex flex-col bg-white">
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
              {headers.map((header, index) => (
                <th
                  key={index}
                  onClick={() => handleSort(index)}
                  className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>{header}</span>
                    {sortColumn === index && (
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
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-6 py-8 text-center">
                  <p className="text-muted-foreground">Nenhum resultado encontrado</p>
                </td>
              </tr>
            ) : (
              filteredAndSortedRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`border-b border-border hover:bg-secondary transition-colors ${
                    rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-6 py-4 text-sm text-foreground whitespace-nowrap"
                    >
                      {cellIndex === 7 ? (
                        // IndexRegula column - highlight with color based on value
                        <span
                          className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-white text-sm ${
                            parseFloat(String(cell)) >= 2.5
                              ? 'bg-red-600'
                              : parseFloat(String(cell)) >= 1.5
                                ? 'bg-orange-500'
                                : parseFloat(String(cell)) >= 0.5
                                  ? 'bg-yellow-500'
                                  : 'bg-green-600'
                          }`}
                        >
                          {parseFloat(String(cell)).toFixed(2)}
                        </span>
                      ) : (
                        String(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
