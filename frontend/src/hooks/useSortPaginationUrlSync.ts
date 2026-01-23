/**
 * Hook para sincronizar ordenação e paginação com a URL
 * Permite compartilhar e restaurar estado via URL
 */

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortingState, PaginationState } from '../types/pagination.types';

export function useSortPaginationUrlSync(
  sorting: SortingState,
  pagination: PaginationState,
  onSortingChange: (sorting: SortingState) => void,
  onPaginationChange: (pagination: Partial<PaginationState>) => void
) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Ler da URL ao montar (apenas uma vez)
  useEffect(() => {
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    // Apenas atualizar se houver valores na URL
    if (sortBy && sortOrder) {
      onSortingChange({ sortBy, sortOrder });
    }

    if (page) {
      const pageNum = parseInt(page, 10);
      if (!isNaN(pageNum) && pageNum >= 1) {
        onPaginationChange({ page: pageNum });
      }
    }

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && [10, 20, 50, 100].includes(limitNum)) {
        onPaginationChange({ limit: limitNum as any });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Apenas ao montar

  // Escrever na URL quando mudarem
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);

    // Ordenação
    if (sorting.sortBy && sorting.sortOrder !== 'default') {
      newParams.set('sortBy', sorting.sortBy);
      newParams.set('sortOrder', sorting.sortOrder);
    } else {
      newParams.delete('sortBy');
      newParams.delete('sortOrder');
    }

    // Paginação
    if (pagination.page > 1) {
      newParams.set('page', pagination.page.toString());
    } else {
      newParams.delete('page');
    }

    if (pagination.limit !== 20) {
      newParams.set('limit', pagination.limit.toString());
    } else {
      newParams.delete('limit');
    }

    setSearchParams(newParams, { replace: true });
  }, [sorting, pagination, searchParams, setSearchParams]);
}
