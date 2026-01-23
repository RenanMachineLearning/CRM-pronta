/**
 * Hook para gerenciar estado de paginação
 */

import { useState, useCallback, useMemo } from 'react';
import type { PaginationState, PaginationParams, ItemsPerPageOption } from '../types/pagination.types';
import { ITEMS_PER_PAGE_OPTIONS } from '../types/pagination.types';

export function usePagination(
  initialPage: number = 1,
  initialLimit: ItemsPerPageOption = 20,
  initialTotal: number = 0
) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState<ItemsPerPageOption>(initialLimit);
  const [total, setTotal] = useState(initialTotal);

  const totalPages = useMemo(() => {
    return Math.ceil(total / limit) || 1;
  }, [total, limit]);

  const pagination: PaginationState = useMemo(() => ({
    page,
    limit,
    total,
    totalPages,
  }), [page, limit, total, totalPages]);

  const updatePage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  const updateLimit = useCallback((newLimit: ItemsPerPageOption) => {
    setLimit(newLimit);
    // Ajustar página atual proporcionalmente
    const newTotalPages = Math.ceil(total / newLimit) || 1;
    const newPage = Math.min(page, newTotalPages);
    setPage(newPage || 1);
  }, [total, page]);

  const updateTotal = useCallback((newTotal: number) => {
    setTotal(newTotal);
    // Ajustar página se necessário
    const newTotalPages = Math.ceil(newTotal / limit) || 1;
    if (page > newTotalPages) {
      setPage(newTotalPages || 1);
    }
  }, [limit, page]);

  // Converter para parâmetros do backend
  const toBackendParams = useCallback((): PaginationParams => {
    return {
      limit,
      offset: (page - 1) * limit,
    };
  }, [page, limit]);

  return {
    pagination,
    updatePage,
    updateLimit,
    updateTotal,
    toBackendParams,
  };
}
