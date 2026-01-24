/**
 * Hook customizado para gerenciar listagem de empresas
 * Gerencia estado, loading, erro e refetch
 */

import { useState, useEffect, useCallback } from 'react';
import { listCompanies } from '../services/companyService';
import type {
  Company,
  CompanyFilters,
  CompanyPaginationParams,
  CompanyListResponse,
} from '../types/company';
import type { Filter } from '../types/filter';

interface UseCompaniesResult {
  companies: Company[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  refetch: () => Promise<void>;
  setFilters: (filters: CompanyFilters | undefined) => void;
  setPagination: (pagination: CompanyPaginationParams) => void;
  setAdvancedFilters: (filters: Filter[]) => void;
}

/**
 * Hook para listagem de empresas
 * 
 * @param initialFilters - Filtros iniciais (opcional)
 * @param initialPagination - Paginação inicial (opcional)
 * @param initialAdvancedFilters - Filtros avançados iniciais (opcional)
 * @returns Objeto com empresas, loading, error, pagination e funções de controle
 */
export function useCompanies(
  initialFilters?: CompanyFilters,
  initialPagination?: CompanyPaginationParams,
  initialAdvancedFilters?: Filter[]
): UseCompaniesResult {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CompanyFilters | undefined>(initialFilters);
  const [advancedFilters, setAdvancedFilters] = useState<Filter[]>(initialAdvancedFilters || []);
  const [pagination, setPaginationState] = useState<CompanyPaginationParams>(
    initialPagination || { limit: 20, offset: 0, orderBy: 'name', order: 'asc' }
  );
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    limit: 20,
    offset: 0,
  });

  // Função para buscar empresas
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: CompanyListResponse = await listCompanies(filters, pagination, advancedFilters);
      setCompanies(response.data);
      setPaginationInfo(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar empresas';
      setError(errorMessage);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination, advancedFilters]);

  // Buscar empresas quando filters ou pagination mudarem
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: CompanyFilters | undefined) => {
    setFilters(newFilters);
    // Resetar offset quando filtros mudarem
    setPaginationState((prev) => ({ ...prev, offset: 0 }));
  }, []);

  // Função para atualizar paginação
  const updatePagination = useCallback((newPagination: CompanyPaginationParams) => {
    setPaginationState((prev) => ({ ...prev, ...newPagination }));
  }, []);

  // Função para atualizar filtros avançados
  const updateAdvancedFilters = useCallback((newAdvancedFilters: Filter[]) => {
    setAdvancedFilters(newAdvancedFilters);
    // Resetar offset quando filtros avançados mudarem
    setPaginationState((prev) => ({ ...prev, offset: 0 }));
  }, []);

  return {
    companies,
    loading,
    error,
    pagination: paginationInfo,
    refetch: fetchCompanies,
    setFilters: updateFilters,
    setPagination: updatePagination,
    setAdvancedFilters: updateAdvancedFilters,
  };
}

