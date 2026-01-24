/**
 * Componente reutilizável para cabeçalhos de tabela ordenáveis
 * Suporta ordenação ascendente, descendente e estado default
 */

import React from 'react';
import type { SortableTableHeaderProps } from './types';

export function SortableTableHeader({
  fieldName,
  displayName,
  currentSort,
  onSort,
  className = '',
  align = 'left',
}: SortableTableHeaderProps) {
  const isActive = currentSort.sortBy === fieldName;
  const isAsc = isActive && currentSort.sortOrder === 'asc';
  const isDesc = isActive && currentSort.sortOrder === 'desc';

  const handleClick = () => {
    onSort(fieldName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];

  return (
    <th
      className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${alignClass} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="columnheader"
      aria-sort={
        isActive
          ? isAsc
            ? 'ascending'
            : 'descending'
          : 'none'
      }
      tabIndex={0}
    >
      <div className="flex items-center space-x-1">
        <span>{displayName}</span>
        <div className="flex flex-col">
          {isActive ? (
            <>
              {isAsc && (
                <span className="text-blue-600" aria-label="Ordenado ascendente">
                  ↑
                </span>
              )}
              {isDesc && (
                <span className="text-blue-600" aria-label="Ordenado descendente">
                  ↓
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-300" aria-label="Não ordenado">
              ↕
            </span>
          )}
        </div>
      </div>
    </th>
  );
}
