/**
 * Serviço para interagir com a API de tarefas
 */

import { apiRequest } from '../utils/api';
import type {
  Task,
  TaskListResponse,
  TaskFilters,
  TaskPaginationParams,
  TaskFormData,
  TaskUpdateData,
  TaskType,
  TaskStatus,
  TaskPriority,
} from '../types/task';

/**
 * Lista tarefas com filtros e paginação
 * 
 * @param filters - Filtros opcionais (status, type, priority, assignedToId, relatedEntityType, relatedEntityId, dueDateFrom, dueDateTo, overdue, completed)
 * @param pagination - Parâmetros de paginação (limit, offset, orderBy, order)
 * @returns Promise com lista de tarefas e informações de paginação
 * @throws Error se requisição falhar (400, 401, 403, 500)
 */
export async function listTasks(
  filters?: TaskFilters,
  pagination?: TaskPaginationParams
): Promise<TaskListResponse> {
  // Construir query params
  const params = new URLSearchParams();

  // Adicionar filtros
  if (filters?.status) {
    params.append('status', filters.status);
  }
  if (filters?.type) {
    params.append('type', filters.type);
  }
  if (filters?.priority) {
    params.append('priority', filters.priority);
  }
  if (filters?.assignedToId) {
    params.append('assignedToId', filters.assignedToId);
  }
  if (filters?.relatedEntityType) {
    params.append('relatedEntityType', filters.relatedEntityType);
  }
  if (filters?.relatedEntityId) {
    params.append('relatedEntityId', filters.relatedEntityId);
  }
  if (filters?.dueDateFrom) {
    params.append('dueDateFrom', filters.dueDateFrom);
  }
  if (filters?.dueDateTo) {
    params.append('dueDateTo', filters.dueDateTo);
  }
  if (filters?.overdue !== undefined) {
    params.append('overdue', filters.overdue.toString());
  }
  if (filters?.completed !== undefined) {
    params.append('completed', filters.completed.toString());
  }

  // Adicionar paginação
  if (pagination?.limit) {
    params.append('limit', pagination.limit.toString());
  }
  if (pagination?.offset) {
    params.append('offset', pagination.offset.toString());
  }
  if (pagination?.orderBy) {
    params.append('orderBy', pagination.orderBy);
  }
  if (pagination?.order) {
    params.append('order', pagination.order);
  }

  // Construir URL com query params
  const queryString = params.toString();
  const endpoint = `/api/tasks${queryString ? `?${queryString}` : ''}`;

  try {
    return await apiRequest<TaskListResponse>(endpoint);
  } catch (error) {
    if (error instanceof Error) {
      // Extrair mensagem de erro da API se disponível
      if (error.message.includes('401')) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      if (error.message.includes('403')) {
        throw new Error('Você não tem permissão para realizar esta ação.');
      }
      if (error.message.includes('500')) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      }
      throw error;
    }
    throw new Error('Erro desconhecido ao carregar tarefas.');
  }
}

/**
 * Obtém tarefa por ID
 * 
 * @param id - ID da tarefa (UUID)
 * @returns Promise com tarefa completa (incluindo assignedTo, createdBy, relatedEntity)
 * @throws Error se tarefa não encontrada (404) ou sem permissão (403)
 */
export async function getTaskById(id: string): Promise<Task> {
  // Validar UUID básico
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da tarefa inválido.');
  }

  try {
    return await apiRequest<Task>(`/api/tasks/${id}`);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        throw new Error('Tarefa não encontrada.');
      }
      if (error.message.includes('403')) {
        throw new Error('Você não tem permissão para visualizar esta tarefa.');
      }
      throw error;
    }
    throw new Error('Erro desconhecido ao carregar tarefa.');
  }
}

/**
 * Cria nova tarefa
 * 
 * Endpoint: POST /api/tasks
 * Permissão: Task.create
 * 
 * @param data - Dados da tarefa (TaskFormData)
 * @returns Promise com tarefa criada
 * @throws Error se validações falharem (400) ou sem permissão (403)
 */
export async function createTask(data: TaskFormData): Promise<Task> {
  // Validações básicas no frontend
  if (!data.title || data.title.trim().length === 0) {
    throw new Error('Título da tarefa é obrigatório.');
  }
  if (!data.relatedEntityType) {
    throw new Error('Tipo de entidade relacionada é obrigatório.');
  }
  if (!data.relatedEntityId || data.relatedEntityId.trim().length === 0) {
    throw new Error('ID da entidade relacionada é obrigatório.');
  }

  // Validar enums
  const validTypes: TaskType[] = ['CALL', 'EMAIL', 'MEETING', 'OTHER'];
  if (data.type && !validTypes.includes(data.type)) {
    throw new Error('Tipo de tarefa inválido.');
  }

  const validStatuses: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (data.status && !validStatuses.includes(data.status)) {
    throw new Error('Status de tarefa inválido.');
  }

  const validPriorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
  if (data.priority && !validPriorities.includes(data.priority)) {
    throw new Error('Prioridade de tarefa inválida.');
  }

  try {
    return await apiRequest<Task>('/api/tasks', {
      method: 'POST',
      body: data,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('400')) {
        throw new Error('Dados inválidos. Verifique os campos preenchidos.');
      }
      if (error.message.includes('403')) {
        throw new Error('Você não tem permissão para criar tarefas.');
      }
      throw error;
    }
    throw new Error('Erro desconhecido ao criar tarefa.');
  }
}

/**
 * Atualiza tarefa existente
 * 
 * Endpoint: PUT /api/tasks/:id
 * Permissão: Task.update
 * 
 * @param id - ID da tarefa (UUID)
 * @param data - Dados da tarefa (parcial - TaskUpdateData)
 * @returns Promise com tarefa atualizada
 * @throws Error se validações falharem (400), não encontrada (404) ou sem permissão (403)
 */
export async function updateTask(id: string, data: TaskUpdateData): Promise<Task> {
  // Validar UUID básico
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da tarefa inválido.');
  }

  // Validar enums se fornecidos
  const validTypes: TaskType[] = ['CALL', 'EMAIL', 'MEETING', 'OTHER'];
  if (data.type && !validTypes.includes(data.type)) {
    throw new Error('Tipo de tarefa inválido.');
  }

  const validStatuses: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (data.status && !validStatuses.includes(data.status)) {
    throw new Error('Status de tarefa inválido.');
  }

  const validPriorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
  if (data.priority && !validPriorities.includes(data.priority)) {
    throw new Error('Prioridade de tarefa inválida.');
  }

  try {
    return await apiRequest<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: data,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('400')) {
        throw new Error('Dados inválidos. Verifique os campos preenchidos.');
      }
      if (error.message.includes('404')) {
        throw new Error('Tarefa não encontrada.');
      }
      if (error.message.includes('403')) {
        throw new Error('Você não tem permissão para atualizar esta tarefa.');
      }
      throw error;
    }
    throw new Error('Erro desconhecido ao atualizar tarefa.');
  }
}

/**
 * Deleta tarefa (soft delete)
 * 
 * Endpoint: DELETE /api/tasks/:id
 * Permissão: Task.delete
 * 
 * @param id - ID da tarefa (UUID)
 * @returns Promise com mensagem de sucesso
 * @throws Error se tarefa não encontrada (404) ou sem permissão (403)
 */
export async function deleteTask(id: string): Promise<{ message: string; id: string }> {
  // Validar UUID básico
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da tarefa inválido.');
  }

  try {
    return await apiRequest<{ message: string; id: string }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        throw new Error('Tarefa não encontrada.');
      }
      if (error.message.includes('403')) {
        throw new Error('Você não tem permissão para deletar esta tarefa.');
      }
      throw error;
    }
    throw new Error('Erro desconhecido ao deletar tarefa.');
  }
}
