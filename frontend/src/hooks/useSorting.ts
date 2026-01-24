/**
 * Hook para gerenciar estado de ordenação
 * Suporta estado "default" para voltar à ordenação padrão
 */

import { useState, useCallback } from 'react';
import type { SortingState, SortingParams, SortOrder } from '../types/pagination.types';

export function useSorting(
  initialSortBy?: string | null,
  initialSortOrder: SortOrder = 'default'
) {
  const [sorting, setSorting] = useState<SortingState>({
    sortBy: initialSortBy || null,
    sortOrder: initialSortOrder,
  });

  const updateSorting = useCallback((field: string) => {
    setSorting(prev => {
      // Se clicou no mesmo campo
      if (prev.sortBy === field) {
        // Ciclo: asc -> desc -> default -> asc
        if (prev.sortOrder === 'asc') {
          return { sortBy: field, sortOrder: 'desc' };
        } else if (prev.sortOrder === 'desc') {
          return { sortBy: null, sortOrder: 'default' };
        } else {
          return { sortBy: field, sortOrder: 'asc' };
        }
      } else {
        // Novo campo: sempre começar com asc
        return { sortBy: field, sortOrder: 'asc' };
      }
    });
  }, []);

  const resetSorting = useCallback(() => {
    setSorting({ sortBy: null, sortOrder: 'default' });
  }, []);

  // Definir estado diretamente (útil para sincronização com URL)
  const setSortingState = useCallback((newSort: SortingState) => {
    setSorting(newSort);
  }, []);

  // Converter para parâmetros do backend
  const toBackendParams = useCallback((): SortingParams => {
    if (sorting.sortBy && sorting.sortOrder !== 'default') {
      return {
        orderBy: sorting.sortBy,
        order: sorting.sortOrder as 'asc' | 'desc',
      };
    }
    return {};
  }, [sorting]);

  return {
    sorting,
    updateSorting,
    resetSorting,
    setSortingState,
    toBackendParams,
  };
}
