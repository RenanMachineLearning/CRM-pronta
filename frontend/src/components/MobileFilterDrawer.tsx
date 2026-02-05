/**
 * MobileFilterDrawer
 * Drawer de filtros para mobile (estilo bottom sheet)
 */

import { useState } from 'react';
import { Button } from './Button';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface FilterOption {
  key: string;
  label: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options?: { value: string; label: string }[];
  type?: 'select' | 'multiselect' | 'date' | 'text';
}

interface MobileFilterDrawerProps {
  filters: FilterOption[];
  onClear: () => void;
  onApply?: () => void;
  activeFiltersCount?: number;
}

export function MobileFilterDrawer({
  filters,
  onClear,
  onApply,
  activeFiltersCount = 0,
}: MobileFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClear = () => {
    onClear();
    setIsOpen(false);
  };

  const handleApply = () => {
    onApply?.();
    setIsOpen(false);
  };

  return (
    <>
      {/* Botão flutuante para abrir filtros */}
      <button
        onClick={() => setIsOpen(true)}
        className="
          fixed bottom-4 right-4 z-40
          bg-blue-600 hover:bg-blue-700 text-white
          rounded-full p-3 shadow-lg
          flex items-center gap-2
          transition-all duration-200
          sm:hidden
        "
      >
        <FunnelIcon className="w-5 h-5" />
        <span className="text-sm font-medium">Filtros</span>
        {activeFiltersCount > 0 && (
          <span className="
            absolute -top-1 -right-1
            bg-red-500 text-white
            text-xs font-bold
            w-5 h-5 rounded-full
            flex items-center justify-center
          ">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-white rounded-t-2xl shadow-2xl
          transform transition-transform duration-300 ease-out
          sm:hidden
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ maxHeight: '85vh' }}
      >
        {/* Handle para arrastar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo dos filtros */}
        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {filters.map((filter) => (
            <div key={filter.key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {filter.label}
              </label>
              
              {filter.type === 'select' && filter.options && (
                <select
                  value={filter.value as string}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {filter.type === 'text' && (
                <input
                  type="text"
                  value={filter.value as string}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Filtrar por ${filter.label.toLowerCase()}`}
                />
              )}

              {filter.type === 'date' && (
                <input
                  type="date"
                  value={filter.value as string}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer com ações */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleClear}
          >
            Limpar Filtros
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleApply}
          >
            Aplicar Filtros
            {activeFiltersCount > 0 && ` (${activeFiltersCount})`}
          </Button>
        </div>
      </div>
    </>
  );
}

export default MobileFilterDrawer;
