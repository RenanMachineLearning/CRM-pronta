/**
 * Componente para exibir um filtro aplicado como chip
 * Permite remoção do filtro
 */

import React from 'react';
import type { FilterChipProps } from './types';

export function FilterChip({ 
  filter, 
  fieldLabel, 
  operatorLabel, 
  valueLabel, 
  onRemove 
}: FilterChipProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm">
      <span className="font-medium">{fieldLabel}</span>
      <span className="text-blue-600">{operatorLabel}</span>
      {valueLabel && (
        <span className="font-semibold">{valueLabel}</span>
      )}
      <button
        onClick={onRemove}
        className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
        aria-label="Remover filtro"
        type="button"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
