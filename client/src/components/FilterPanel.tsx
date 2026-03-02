import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilterPanelProps {
  agendas: string[];
  centrais: string[];
  especialidades: string[];
  selectedAgendas: Set<string>;
  selectedCentrais: Set<string>;
  selectedEspecialidades: Set<string>;
  onAgendasChange: (agendas: Set<string>) => void;
  onCentraisChange: (centrais: Set<string>) => void;
  onEspecialidadesChange: (especialidades: Set<string>) => void;
}

export default function FilterPanel({
  agendas,
  centrais,
  especialidades,
  selectedAgendas,
  selectedCentrais,
  selectedEspecialidades,
  onAgendasChange,
  onCentraisChange,
  onEspecialidadesChange,
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    agendas: true,
    centrais: true,
    especialidades: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCheckboxChange = (
    value: string,
    selectedSet: Set<string>,
    onChange: (set: Set<string>) => void
  ) => {
    const newSet = new Set(selectedSet);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    onChange(newSet);
  };

  const clearAllFilters = () => {
    onAgendasChange(new Set());
    onCentraisChange(new Set());
    onEspecialidadesChange(new Set());
  };

  return (
    <div className="w-full lg:w-80 bg-white border-r border-border p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Filtros</h2>
        {(selectedAgendas.size > 0 || selectedCentrais.size > 0 || selectedEspecialidades.size > 0) && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpar tudo
          </button>
        )}
      </div>

      {/* Especialidade Filter */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('especialidades')}
          className="w-full flex items-center justify-between p-3 bg-secondary hover:bg-muted rounded-md transition-colors"
        >
          <span className="font-medium text-sm text-foreground">Especialidade</span>
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform ${
              expandedSections.especialidades ? 'rotate-180' : ''
            }`}
          />
        </button>
        {expandedSections.especialidades && (
          <div className="space-y-2 max-h-48 overflow-y-auto pl-2">
            {especialidades.map(esp => (
              <label key={esp} className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedEspecialidades.has(esp)}
                  onChange={() =>
                    handleCheckboxChange(esp, selectedEspecialidades, onEspecialidadesChange)
                  }
                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                  {esp}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Central Filter */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('centrais')}
          className="w-full flex items-center justify-between p-3 bg-secondary hover:bg-muted rounded-md transition-colors"
        >
          <span className="font-medium text-sm text-foreground">Central</span>
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform ${
              expandedSections.centrais ? 'rotate-180' : ''
            }`}
          />
        </button>
        {expandedSections.centrais && (
          <div className="space-y-2 pl-2">
            {centrais.map(central => (
              <label key={central} className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedCentrais.has(central)}
                  onChange={() =>
                    handleCheckboxChange(central, selectedCentrais, onCentraisChange)
                  }
                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                  {central}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Agenda Filter */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('agendas')}
          className="w-full flex items-center justify-between p-3 bg-secondary hover:bg-muted rounded-md transition-colors"
        >
          <span className="font-medium text-sm text-foreground">Agenda</span>
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform ${
              expandedSections.agendas ? 'rotate-180' : ''
            }`}
          />
        </button>
        {expandedSections.agendas && (
          <div className="space-y-2 max-h-48 overflow-y-auto pl-2">
            {agendas.map(agenda => (
              <label key={agenda} className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedAgendas.has(agenda)}
                  onChange={() =>
                    handleCheckboxChange(agenda, selectedAgendas, onAgendasChange)
                  }
                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {agenda}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Filter Summary */}
      {(selectedAgendas.size > 0 || selectedCentrais.size > 0 || selectedEspecialidades.size > 0) && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-3">Filtros aplicados:</p>
          <div className="space-y-2">
            {selectedEspecialidades.size > 0 && (
              <div className="text-xs">
                <span className="font-medium text-foreground">Especialidades:</span>
                <span className="text-muted-foreground ml-2">{selectedEspecialidades.size}</span>
              </div>
            )}
            {selectedCentrais.size > 0 && (
              <div className="text-xs">
                <span className="font-medium text-foreground">Centrais:</span>
                <span className="text-muted-foreground ml-2">{selectedCentrais.size}</span>
              </div>
            )}
            {selectedAgendas.size > 0 && (
              <div className="text-xs">
                <span className="font-medium text-foreground">Agendas:</span>
                <span className="text-muted-foreground ml-2">{selectedAgendas.size}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
