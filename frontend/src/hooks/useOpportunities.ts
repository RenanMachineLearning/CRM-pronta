/**
 * Hook customizado para gerenciar listagem de oportunidades
 * Gerencia estado, loading, erro e refetch
 */

import { useState, useEffect, useCallback } from 'react';
import { listOpportunities } from '../services/opportunityService';
import type {
  Opportunity,
  OpportunityFilters,
  OpportunityPaginationParams,
  OpportunityListResponse,
} from '../types/opportunity';
import type { Filter } from '../types/filter';

interface UseOpportunitiesResult {
  opportunities: Opportunity[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  refetch: () => Promise<void>;
  setFilters: (filters: OpportunityFilters | undefined) => void;
  setPagination: (pagination: OpportunityPaginationParams) => void;
  setAdvancedFilters: (filters: Filter[]) => void;
}

/**
 * Hook para listagem de oportunidades
 * 
 * @param initialFilters - Filtros iniciais (opcional)
 * @param initialPagination - Paginação inicial (opcional)
 * @param initialAdvancedFilters - Filtros avançados iniciais (opcional)
 * @returns Objeto com opportunities, loading, error, pagination e funções de controle
 */
export function useOpportunities(
  initialFilters?: OpportunityFilters,
  initialPagination?: OpportunityPaginationParams,
  initialAdvancedFilters?: Filter[]
): UseOpportunitiesResult {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OpportunityFilters | undefined>(initialFilters);
  const [advancedFilters, setAdvancedFilters] = useState<Filter[]>(initialAdvancedFilters || []);
  const [pagination, setPaginationState] = useState<OpportunityPaginationParams>(
    initialPagination || { limit: 20, offset: 0, orderBy: 'createdAt', order: 'desc' }
  );
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    limit: 20,
    offset: 0,
  });

  // Função para buscar oportunidades
  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: OpportunityListResponse = await listOpportunities(filters, pagination, advancedFilters);
      setOpportunities(response.data);
      setPaginationInfo(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar oportunidades';
      setError(errorMessage);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination, advancedFilters]);

  // Buscar oportunidades quando filters ou pagination mudarem
  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: OpportunityFilters | undefined) => {
    setFilters(newFilters);
    // Resetar offset quando filtros mudarem
    setPaginationState((prev) => ({ ...prev, offset: 0 }));
  }, []);

  // Função para atualizar paginação
  const updatePagination = useCallback((newPagination: OpportunityPaginationParams) => {
    setPaginationState((prev) => ({ ...prev, ...newPagination }));
  }, []);

  // Função para atualizar filtros avançados
  const updateAdvancedFilters = useCallback((newAdvancedFilters: Filter[]) => {
    setAdvancedFilters(newAdvancedFilters);
    // Resetar offset quando filtros avançados mudarem
    setPaginationState((prev) => ({ ...prev, offset: 0 }));
  }, []);

  return {
    opportunities,
    loading,
    error,
    pagination: paginationInfo,
    refetch: fetchOpportunities,
    setFilters: updateFilters,
    setPagination: updatePagination,
    setAdvancedFilters: updateAdvancedFilters,
  };
}
