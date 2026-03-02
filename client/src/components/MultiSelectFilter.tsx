import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selectedValues: Set<string>;
  onChange: (values: Set<string>) => void;
  placeholder?: string;
}

export default function MultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Selecione...',
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleOption = (option: string) => {
    const newValues = new Set(selectedValues);
    if (newValues.has(option)) {
      newValues.delete(option);
    } else {
      newValues.add(option);
    }
    onChange(newValues);
  };

  const handleRemoveTag = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newValues = new Set(selectedValues);
    newValues.delete(option);
    onChange(newValues);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(new Set());
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Label */}
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>

      {/* Input Container */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-10 px-3 py-2 border border-border rounded-md bg-white text-foreground cursor-pointer hover:border-primary transition-colors flex items-center justify-between gap-2 flex-wrap"
      >
        {/* Selected Tags */}
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedValues.size === 0 ? (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          ) : (
            Array.from(selectedValues).map(value => (
              <span
                key={value}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium"
              >
                {value}
                <button
                  onClick={e => handleRemoveTag(value, e)}
                  className="hover:opacity-80 transition-opacity"
                >
                  <X size={14} />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Chevron Icon */}
        <ChevronDown
          size={18}
          className={`text-muted-foreground transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg z-50">
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                Nenhuma opção encontrada
              </div>
            ) : (
              filteredOptions.map(option => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-secondary cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.has(option)}
                    onChange={() => handleToggleOption(option)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                  />
                  <span className="text-sm text-foreground flex-1">{option}</span>
                </label>
              ))
            )}
          </div>

          {/* Clear All Button */}
          {selectedValues.size > 0 && (
            <div className="p-2 border-t border-border">
              <button
                onClick={handleClearAll}
                className="w-full px-3 py-2 text-sm text-destructive hover:bg-secondary rounded-md transition-colors"
              >
                Limpar tudo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
