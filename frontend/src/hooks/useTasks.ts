/**
 * Hook customizado para gerenciar listagem de tarefas
 * Gerencia estado, loading, erro e refetch
 */

import { useState, useEffect, useCallback } from 'react';
import { listTasks } from '../services/taskService';
import type {
  Task,
  TaskFilters,
  TaskPaginationParams,
  TaskListResponse,
} from '../types/task';

interface UseTasksResult {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  refetch: () => Promise<void>;
  setFilters: (filters: TaskFilters | undefined) => void;
  setPagination: (pagination: TaskPaginationParams) => void;
}

/**
 * Hook para listagem de tarefas
 * 
 * @param initialFilters - Filtros iniciais (opcional)
 * @param initialPagination - Paginação inicial (opcional)
 * @returns Objeto com tarefas, loading, error, pagination e funções de controle
 */
export function useTasks(
  initialFilters?: TaskFilters,
  initialPagination?: TaskPaginationParams
): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters | undefined>(initialFilters);
  const [pagination, setPaginationState] = useState<TaskPaginationParams>(
    initialPagination || { limit: 20, offset: 0, orderBy: 'createdAt', order: 'desc' }
  );
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    limit: 20,
    offset: 0,
  });

  // Função para buscar tarefas
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: TaskListResponse = await listTasks(filters, pagination);
      setTasks(response.data);
      setPaginationInfo(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar tarefas';
      setError(errorMessage);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination]);

  // Buscar tarefas quando filters ou pagination mudarem
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: TaskFilters | undefined) => {
    setFilters(newFilters);
    // Resetar offset quando filtros mudarem
    setPaginationState((prev) => ({ ...prev, offset: 0 }));
  }, []);

  // Função para atualizar paginação
  const updatePagination = useCallback((newPagination: TaskPaginationParams) => {
    setPaginationState((prev) => ({ ...prev, ...newPagination }));
  }, []);

  return {
    tasks,
    loading,
    error,
    pagination: paginationInfo,
    refetch: fetchTasks,
    setFilters: updateFilters,
    setPagination: updatePagination,
  };
}
