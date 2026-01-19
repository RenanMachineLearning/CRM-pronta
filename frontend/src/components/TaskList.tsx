/**
 * Componente TaskList
 * Exibe tabela de tarefas com paginação, ordenação, filtros e ações
 */

import React, { useState, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import { updateTask } from '../services/taskService';
import { Loading } from './Loading';
import { ErrorMessage } from './ErrorMessage';
import { Button } from './Button';
import { Select } from './Select';
import { Input } from './Input';
import type {
  Task,
  TaskFilters,
  TaskStatus,
  TaskType,
  TaskPriority,
} from '../types/task';

export interface TaskListProps {
  onTaskClick?: (taskId: string) => void;
  onNewTask?: () => void;
  tasks?: Task[];
  initialFilters?: TaskFilters;
  initialPagination?: { limit?: number; offset?: number; orderBy?: string; order?: string };
  showFilters?: boolean;
  showPagination?: boolean;
  compact?: boolean;
}

export function TaskList({
  onTaskClick,
  onNewTask,
  tasks: tasksProp,
  initialFilters,
  initialPagination,
  showFilters = true,
  showPagination = true,
  compact = false,
}: TaskListProps) {
  // Estado para filtros
  const [filters, setFilters] = useState<TaskFilters>(initialFilters || {});
  
  // Estado para ordenação
  const [orderBy, setOrderBy] = useState<'dueDate' | 'priority' | 'createdAt' | 'title'>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  
  // Estado para paginação
  const [page, setPage] = useState(1);
  const limit = 20;

  // Estado para concluir tarefa
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Se tasks fornecido como prop, usar; senão, buscar com hook
  const {
    tasks: tasksFromHook,
    loading,
    error,
    pagination,
    refetch,
    setFilters: updateFilters,
    setPagination: updatePagination,
  } = useTasks(
    initialFilters || filters,
    initialPagination || {
      limit,
      offset: (page - 1) * limit,
      orderBy,
      order,
    }
  );
  
  // Usar tasks da prop se fornecido, senão usar do hook
  const tasks = tasksProp || tasksFromHook;
  
  // Se tasks vem da prop, não mostrar loading/error do hook
  const showLoading = tasksProp ? false : loading;
  const showError = tasksProp ? null : error;

  // Atualizar paginação quando page, orderBy ou order mudarem
  useEffect(() => {
    if (!tasksProp) {
      updatePagination({
        limit,
        offset: (page - 1) * limit,
        orderBy,
        order,
      });
    }
  }, [page, orderBy, order, limit, updatePagination, tasksProp]);

  // Handlers
  const handleSort = (column: 'dueDate' | 'priority' | 'createdAt' | 'title') => {
    if (orderBy === column) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(column);
      setOrder('asc');
    }
    setPage(1);
  };

  const handleFilterChange = (key: keyof TaskFilters, value: string | boolean | undefined) => {
    const newFilters = { ...filters };
    if (value !== undefined && value !== '') {
      if (key === 'overdue' || key === 'completed') {
        newFilters[key] = value === 'true' || value === true;
      } else {
        newFilters[key] = value as any;
      }
    } else {
      delete newFilters[key];
    }
    updateFilters(newFilters);
    setPage(1);
  };

  const handleClearFilters = () => {
    updateFilters({});
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (!tasksProp) {
      updatePagination({ offset: (newPage - 1) * limit });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setCompletingTaskId(taskId);
      setErrorMessage(null);
      await updateTask(taskId, { status: 'COMPLETED' });
      if (!tasksProp) {
        await refetch();
      }
      setCompletingTaskId(null);
    } catch (error) {
      console.error('Erro ao concluir tarefa:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao concluir tarefa');
      setCompletingTaskId(null);
    }
  };

  // Calcular número de páginas
  const totalPages = Math.ceil(pagination.total / limit);

  // Funções auxiliares
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isOverdue = (task: Task): boolean => {
    if (!task.dueDate || task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      return false;
    }
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const translateStatus = (status: TaskStatus): string => {
    const translations: Record<TaskStatus, string> = {
      PENDING: 'Pendente',
      IN_PROGRESS: 'Em Andamento',
      COMPLETED: 'Concluída',
      CANCELLED: 'Cancelada',
    };
    return translations[status] || status;
  };

  const translateType = (type: TaskType): string => {
    const translations: Record<TaskType, string> = {
      CALL: 'Ligação',
      EMAIL: 'Email',
      MEETING: 'Reunião',
      OTHER: 'Outro',
    };
    return translations[type] || type;
  };

  const translatePriority = (priority: TaskPriority): string => {
    const translations: Record<TaskPriority, string> = {
      LOW: 'Baixa',
      MEDIUM: 'Média',
      HIGH: 'Alta',
    };
    return translations[priority] || priority;
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTableHeader = (column: 'dueDate' | 'priority' | 'createdAt' | 'title', label: string) => {
    const isActive = orderBy === column;
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center space-x-1">
          <span>{label}</span>
          {isActive && (
            <span>{order === 'asc' ? '↑' : '↓'}</span>
          )}
        </div>
      </th>
    );
  };

  // Renderizar loading
  if (showLoading && tasks.length === 0) {
    return <Loading message="Carregando tarefas..." />;
  }

  // Renderizar erro
  if (showError && tasks.length === 0) {
    return <ErrorMessage message={showError} onRetry={refetch} />;
  }

  // Verificar se há filtros aplicados
  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-4">
      {/* Mensagem de erro ao concluir */}
      {errorMessage && (
        <ErrorMessage message={errorMessage} onRetry={() => setErrorMessage(null)} />
      )}

      {/* Barra de ações e filtros */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* Filtro de status */}
            <Select
              value={filters.status || ''}
              options={[
                { value: '', label: 'Todos os status' },
                { value: 'PENDING', label: 'Pendente' },
                { value: 'IN_PROGRESS', label: 'Em Andamento' },
                { value: 'COMPLETED', label: 'Concluída' },
                { value: 'CANCELLED', label: 'Cancelada' },
              ]}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className="w-full sm:w-48 mb-0"
            />
            
            {/* Filtro de tipo */}
            <Select
              value={filters.type || ''}
              options={[
                { value: '', label: 'Todos os tipos' },
                { value: 'CALL', label: 'Ligação' },
                { value: 'EMAIL', label: 'Email' },
                { value: 'MEETING', label: 'Reunião' },
                { value: 'OTHER', label: 'Outro' },
              ]}
              onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
              className="w-full sm:w-48 mb-0"
            />

            {/* Filtro de prioridade */}
            <Select
              value={filters.priority || ''}
              options={[
                { value: '', label: 'Todas as prioridades' },
                { value: 'LOW', label: 'Baixa' },
                { value: 'MEDIUM', label: 'Média' },
                { value: 'HIGH', label: 'Alta' },
              ]}
              onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
              className="w-full sm:w-48 mb-0"
            />

            {/* Filtro de vencidas */}
            <Select
              value={filters.overdue !== undefined ? filters.overdue.toString() : ''}
              options={[
                { value: '', label: 'Todas' },
                { value: 'true', label: 'Vencidas' },
                { value: 'false', label: 'Não vencidas' },
              ]}
              onChange={(e) => handleFilterChange('overdue', e.target.value || undefined)}
              className="w-full sm:w-48 mb-0"
            />

            {/* Botão limpar filtros */}
            {hasFilters && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearFilters}
                className="mb-0"
              >
                Limpar filtros
              </Button>
            )}
          </div>

          {onNewTask && (
            <Button onClick={onNewTask} variant="primary">
              Nova Tarefa
            </Button>
          )}
        </div>
      )}

      {/* Tabela de tarefas */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {renderTableHeader('title', 'Título')}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Atribuído a
              </th>
              {renderTableHeader('dueDate', 'Vencimento')}
              {renderTableHeader('priority', 'Prioridade')}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {hasFilters ? 'Nenhuma tarefa encontrada com os filtros aplicados' : 'Nenhuma tarefa encontrada'}
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const overdue = isOverdue(task);
                return (
                  <tr
                    key={task.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onTaskClick?.(task.id)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {task.title}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {translateType(task.type)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}
                      >
                        {translateStatus(task.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.assignedTo?.name || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {formatDate(task.dueDate)}
                        {overdue && (
                          <span className="text-red-600" title="Tarefa vencida">
                            ⚠️
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}
                      >
                        {translatePriority(task.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                      {(task.status === 'PENDING' || task.status === 'IN_PROGRESS') && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={completingTaskId === task.id}
                          aria-label={`Concluir tarefa ${task.title}`}
                          aria-busy={completingTaskId === task.id}
                        >
                          {completingTaskId === task.id ? 'Concluindo...' : 'Concluir'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {showPagination && pagination.total > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Próxima
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{pagination.offset + 1}</span> a{' '}
                <span className="font-medium">
                  {Math.min(pagination.offset + limit, pagination.total)}
                </span>{' '}
                de <span className="font-medium">{pagination.total}</span> tarefas
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="rounded-l-md"
                >
                  Anterior
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    return (
                      p === 1 ||
                      p === totalPages ||
                      (p >= page - 1 && p <= page + 1)
                    );
                  })
                  .map((p, index, array) => {
                    const prev = array[index - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                        <Button
                          variant={p === page ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handlePageChange(p)}
                          className="rounded-none"
                        >
                          {p}
                        </Button>
                      </React.Fragment>
                    );
                  })}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="rounded-r-md"
                >
                  Próxima
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
