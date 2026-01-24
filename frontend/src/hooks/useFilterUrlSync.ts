/**
 * Hook para sincronizar filtros com a URL
 * Permite compartilhar e restaurar filtros via URL
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Filter } from '../types/filter';

export function useFilterUrlSync(initialFilters: Filter[] = []) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filter[]>(initialFilters);
  
  // Ler da URL ao montar
  useEffect(() => {
    const filtersParam = searchParams.get('filters');
    if (filtersParam) {
      try {
        const parsed = JSON.parse(filtersParam);
        if (Array.isArray(parsed)) {
          setFilters(parsed);
        }
      } catch {
        // Ignorar erro de parsing
      }
    }
  }, []);
  
  // Escrever na URL quando filtros mudarem
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (filters.length > 0) {
      newParams.set('filters', JSON.stringify(filters));
    } else {
      newParams.delete('filters');
    }
    setSearchParams(newParams, { replace: true });
  }, [filters, searchParams, setSearchParams]);
  
  return [filters, setFilters] as const;
}
