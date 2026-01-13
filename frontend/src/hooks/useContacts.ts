/**
 * Hook customizado para gerenciar listagem de contatos
 * Gerencia estado, loading, erro e refetch
 */

import { useState, useEffect, useCallback } from 'react';
import { listContacts } from '../services/contactService';
import type {
  Contact,
  ContactFilters,
  PaginationParams,
  ContactListResponse,
} from '../types/contact';

interface UseContactsResult {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  refetch: () => Promise<void>;
  setFilters: (filters: ContactFilters | undefined) => void;
  setPagination: (pagination: PaginationParams) => void;
}

/**
 * Hook para listagem de contatos
 * 
 * @param initialFilters - Filtros iniciais (opcional)
 * @param initialPagination - Paginação inicial (opcional)
 * @returns Objeto com contatos, loading, error, pagination e funções de controle
 */
export function useContacts(
  initialFilters?: ContactFilters,
  initialPagination?: PaginationParams
): UseContactsResult {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContactFilters | undefined>(initialFilters);
  const [pagination, setPaginationState] = useState<PaginationParams>(
    initialPagination || { limit: 20, offset: 0, orderBy: 'createdAt', order: 'desc' }
  );
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    limit: 20,
    offset: 0,
  });

  // Função para buscar contatos
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: ContactListResponse = await listContacts(filters, pagination);
      setContacts(response.data);
      setPaginationInfo(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar contatos';
      setError(errorMessage);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination]);

  // Buscar contatos quando filters ou pagination mudarem
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: ContactFilters | undefined) => {
    setFilters(newFilters);
    // Resetar offset quando filtros mudarem
    setPaginationState((prev) => ({ ...prev, offset: 0 }));
  }, []);

  // Função para atualizar paginação
  const updatePagination = useCallback((newPagination: PaginationParams) => {
    setPaginationState((prev) => ({ ...prev, ...newPagination }));
  }, []);

  return {
    contacts,
    loading,
    error,
    pagination: paginationInfo,
    refetch: fetchContacts,
    setFilters: updateFilters,
    setPagination: updatePagination,
  };
}

