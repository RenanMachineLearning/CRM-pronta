/**
 * Hook customizado para gerenciar listagem de notas
 * Gerencia estado, loading, erro e refetch
 */

import { useState, useEffect, useCallback } from 'react';
import { listNotes } from '../services/noteService';
import type {
  Note,
  NoteFilters,
  NotePaginationParams,
  NoteListResponse,
} from '../types/note';

interface UseNotesResult {
  notes: Note[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  refetch: () => Promise<void>;
  setFilters: (filters: NoteFilters | undefined) => void;
  setPagination: (pagination: NotePaginationParams) => void;
}

/**
 * Hook para listagem de notas
 * 
 * @param initialFilters - Filtros iniciais (opcional)
 * @param initialPagination - Paginação inicial (opcional)
 * @returns Objeto com notas, loading, error, pagination e funções de controle
 */
export function useNotes(
  initialFilters?: NoteFilters,
  initialPagination?: NotePaginationParams
): UseNotesResult {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NoteFilters | undefined>(initialFilters);
  const [pagination, setPaginationState] = useState<NotePaginationParams>(
    initialPagination || { limit: 20, offset: 0, orderBy: 'createdAt', order: 'desc' }
  );
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    limit: 20,
    offset: 0,
  });

  // Função para buscar notas
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: NoteListResponse = await listNotes(filters, pagination);
      setNotes(response.data);
      setPaginationInfo(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar notas';
      setError(errorMessage);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination]);

  // Buscar notas quando filters ou pagination mudarem
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: NoteFilters | undefined) => {
    setFilters(newFilters);
    // Resetar offset quando filtros mudarem
    setPaginationState((prev) => ({ ...prev, offset: 0 }));
  }, []);

  // Função para atualizar paginação
  const updatePagination = useCallback((newPagination: NotePaginationParams) => {
    setPaginationState((prev) => ({ ...prev, ...newPagination }));
  }, []);

  return {
    notes,
    loading,
    error,
    pagination: paginationInfo,
    refetch: fetchNotes,
    setFilters: updateFilters,
    setPagination: updatePagination,
  };
}
