import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'regulacao_filtros_v1';

interface FiltersState {
  selectedAgendas: string[];
  selectedCentrais: string[];
  selectedEspecialidades: string[];
  sortColumn: number;
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_FILTERS: FiltersState = {
  selectedAgendas: [],
  selectedCentrais: [],
  selectedEspecialidades: [],
  sortColumn: 7,
  sortOrder: 'desc',
};

function loadFromStorage(): FiltersState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<FiltersState>;
    return {
      selectedAgendas: Array.isArray(parsed.selectedAgendas) ? parsed.selectedAgendas : [],
      selectedCentrais: Array.isArray(parsed.selectedCentrais) ? parsed.selectedCentrais : [],
      selectedEspecialidades: Array.isArray(parsed.selectedEspecialidades) ? parsed.selectedEspecialidades : [],
      sortColumn: typeof parsed.sortColumn === 'number' ? parsed.sortColumn : 7,
      sortOrder: parsed.sortOrder === 'asc' || parsed.sortOrder === 'desc' ? parsed.sortOrder : 'desc',
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function saveToStorage(filters: FiltersState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // localStorage pode estar indisponível (modo privado, etc.)
  }
}

export function usePersistedFilters() {
  const [filters, setFilters] = useState<FiltersState>(() => loadFromStorage());

  // Persiste no localStorage sempre que os filtros mudarem
  useEffect(() => {
    saveToStorage(filters);
  }, [filters]);

  const setSelectedAgendas = useCallback((value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setFilters(prev => {
      const current = new Set(prev.selectedAgendas);
      const next = typeof value === 'function' ? value(current) : value;
      return { ...prev, selectedAgendas: Array.from(next) };
    });
  }, []);

  const setSelectedCentrais = useCallback((value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setFilters(prev => {
      const current = new Set(prev.selectedCentrais);
      const next = typeof value === 'function' ? value(current) : value;
      return { ...prev, selectedCentrais: Array.from(next) };
    });
  }, []);

  const setSelectedEspecialidades = useCallback((value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setFilters(prev => {
      const current = new Set(prev.selectedEspecialidades);
      const next = typeof value === 'function' ? value(current) : value;
      return { ...prev, selectedEspecialidades: Array.from(next) };
    });
  }, []);

  const setSortColumn = useCallback((column: number) => {
    setFilters(prev => ({ ...prev, sortColumn: column }));
  }, []);

  const setSortOrder = useCallback((order: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sortOrder: order }));
  }, []);

  return {
    selectedAgendas: new Set(filters.selectedAgendas),
    selectedCentrais: new Set(filters.selectedCentrais),
    selectedEspecialidades: new Set(filters.selectedEspecialidades),
    sortColumn: filters.sortColumn,
    sortOrder: filters.sortOrder,
    setSelectedAgendas,
    setSelectedCentrais,
    setSelectedEspecialidades,
    setSortColumn,
    setSortOrder,
  };
}
