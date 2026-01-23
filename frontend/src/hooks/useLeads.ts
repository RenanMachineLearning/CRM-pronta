/**
 * Hook customizado para gerenciar listagem de leads
 * Gerencia estado, loading, erro e refetch
 */

import { useState, useEffect, useCallback } from 'react';
import { listLeads } from '../services/leadService';
import type {
  Lead,
  LeadFilters,
  LeadPaginationParams,
  LeadListResponse,
} from '../types/lead';
import type { Filter } from '../types/filter';

interface UseLeadsResult {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  refetch: () => Promise<void>;
  setFilters: (filters: LeadFilters | undefined) => void;
  setPagination: (pagination: LeadPaginationParams) => void;
  setAdvancedFilters: (filters: Filter[]) => void;
}

/**
 * Hook para listagem de leads
 * 
 * @param initialFilters - Filtros iniciais (opcional)
 * @param initialPagination - Paginação inicial (opcional)
 * @param initialAdvancedFilters - Filtros avançados iniciais (opcional)
 * @returns Objeto com leads, loading, error, pagination e funções de controle
 */
export function useLeads(
  initialFilters?: LeadFilters,
  initialPagination?: LeadPaginationParams,
  initialAdvancedFilters?: Filter[]
): UseLeadsResult {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilters | undefined>(initialFilters);
  const [advancedFilters, setAdvancedFilters] = useState<Filter[]>(initialAdvancedFilters || []);
  const [pagination, setPaginationState] = useState<LeadPaginationParams>(
    initialPagination || { limit: 20, offset: 0, orderBy: 'createdAt', order: 'desc' }
  );
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    limit: 20,
    offset: 0,
  });

  // Função para buscar leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: LeadListResponse = await listLeads(filters, pagination, advancedFilters);
      setLeads(response.data);
      setPaginationInfo(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar leads';
      setError(errorMessage);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination, advancedFilters]);

  // Buscar leads quando filters ou pagination mudarem
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: LeadFilters | undefined) => {
    setFilters(newFilters);
    // Resetar offset quando filtros mudarem
    setPaginationState((prev) => ({ ...prev, offset: 0 }));
  }, []);

  // Função para atualizar paginação
  const updatePagination = useCallback((newPagination: LeadPaginationParams) => {
    setPaginationState((prev) => ({ ...prev, ...newPagination }));
  }, []);

  // Função para atualizar filtros avançados
  const updateAdvancedFilters = useCallback((newAdvancedFilters: Filter[]) => {
    setAdvancedFilters(newAdvancedFilters);
    // Resetar offset quando filtros avançados mudarem
    setPaginationState((prev) => ({ ...prev, offset: 0 }));
  }, []);

  return {
    leads,
    loading,
    error,
    pagination: paginationInfo,
    refetch: fetchLeads,
    setFilters: updateFilters,
    setPagination: updatePagination,
    setAdvancedFilters: updateAdvancedFilters,
  };
}
