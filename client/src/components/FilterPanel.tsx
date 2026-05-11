import { useState } from 'react';
import MultiSelectFilter from './MultiSelectFilter';

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
  selectedCores?: Set<string>;
  onCoresChange?: (cores: Set<string>) => void;
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
  selectedCores = new Set(),
  onCoresChange,
}: FilterPanelProps) {
  const totalFiltersApplied =
    selectedAgendas.size + selectedCentrais.size + selectedEspecialidades.size;

  const clearAllFilters = () => {
    onAgendasChange(new Set());
    onCentraisChange(new Set());
    onEspecialidadesChange(new Set());
  };

  return (
    <div className="w-full lg:w-96 bg-card border-r border-border p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Filtros</h2>
        {totalFiltersApplied > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Limpar tudo
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <MultiSelectFilter
          label="Especialidade"
          options={especialidades}
          selectedValues={selectedEspecialidades}
          onChange={onEspecialidadesChange}
          placeholder="Selecione especialidades..."
        />

        <MultiSelectFilter
          label="Central"
          options={centrais}
          selectedValues={selectedCentrais}
          onChange={onCentraisChange}
          placeholder="Selecione centrais..."
        />

        <MultiSelectFilter
          label="Agenda"
          options={agendas}
          selectedValues={selectedAgendas}
          onChange={onAgendasChange}
          placeholder="Selecione agendas..."
        />
      </div>

      {/* Filtro de Cor do Index */}
      {onCoresChange && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cor do Index</label>
          <div className="flex flex-col gap-1.5">
            {['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul', 'Roxo', 'Sem cor'].map(cor => {
              const corMap: Record<string, string> = {
                'Vermelho': 'bg-red-400', 'Laranja': 'bg-orange-400', 'Amarelo': 'bg-yellow-400',
                'Verde': 'bg-green-400', 'Azul': 'bg-blue-400', 'Roxo': 'bg-purple-400', 'Sem cor': 'bg-muted-foreground/30'
              };
              const checked = selectedCores?.has(cor) ?? false;
              return (
                <label key={cor} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                  <input type="checkbox" checked={checked}
                    onChange={() => {
                      const next = new Set(selectedCores);
                      if (next.has(cor)) next.delete(cor); else next.add(cor);
                      onCoresChange(next);
                    }}
                    className="w-3.5 h-3.5 rounded" />
                  <span className={`w-3 h-3 rounded-full ${corMap[cor]}`} />
                  <span className="text-sm text-foreground">{cor}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Summary */}
      {totalFiltersApplied > 0 && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-3 font-medium">
            {totalFiltersApplied} filtro{totalFiltersApplied !== 1 ? 's' : ''} aplicado{totalFiltersApplied !== 1 ? 's' : ''}
          </p>
          <div className="space-y-2 text-xs">
            {selectedEspecialidades.size > 0 && (
              <div className="flex justify-between">
                <span className="text-foreground">Especialidades:</span>
                <span className="text-primary font-semibold">{selectedEspecialidades.size}</span>
              </div>
            )}
            {selectedCentrais.size > 0 && (
              <div className="flex justify-between">
                <span className="text-foreground">Centrais:</span>
                <span className="text-primary font-semibold">{selectedCentrais.size}</span>
              </div>
            )}
            {selectedAgendas.size > 0 && (
              <div className="flex justify-between">
                <span className="text-foreground">Agendas:</span>
                <span className="text-primary font-semibold">{selectedAgendas.size}</span>
              </div>
            )}
            {(selectedCores?.size ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-foreground">Cores:</span>
                <span className="text-primary font-semibold">{selectedCores?.size}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
