/**
 * Tipos relacionados a Tarefas
 * Baseados na API backend
 */

// Enums
export type TaskType = 'CALL' | 'EMAIL' | 'MEETING' | 'OTHER';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RelatedEntityType = 'Contact' | 'Company' | 'Lead' | 'Opportunity';

// Usuário atribuído (relacionamento)
export interface TaskAssignedTo {
  id: string;
  name: string;
  email: string;
}

// Usuário criador (relacionamento)
export interface TaskCreatedBy {
  id: string;
  name: string;
  email: string;
}

// Entidade relacionada (polimórfica - informações básicas)
export interface TaskRelatedEntity {
  id: string;
  // Campos variam conforme tipo:
  // Contact: firstName, lastName
  // Company: name
  // Lead: firstName, lastName
  // Opportunity: name
  [key: string]: any;
}

// Tarefa completa
export interface Task {
  id: string;
  tenantId: string;
  title: string;
  description?: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null; // ISO string da API
  completedAt?: string | null; // ISO string (quando status = COMPLETED)
  assignedToId?: string | null;
  assignedTo?: TaskAssignedTo | null;
  createdById: string;
  createdBy?: TaskCreatedBy | null;
  relatedEntityType: RelatedEntityType;
  relatedEntityId: string;
  relatedEntity?: TaskRelatedEntity | null;
  createdAt: string; // ISO string da API
  updatedAt: string; // ISO string da API
  deletedAt?: string | null; // ISO string (soft delete)
}

// Filtros para listagem
export interface TaskFilters {
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  assignedToId?: string;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string;
  dueDateFrom?: string; // ISO string
  dueDateTo?: string; // ISO string
  overdue?: boolean; // Tarefas vencidas (dueDate < hoje e status != COMPLETED)
  completed?: boolean; // Apenas concluídas ou não concluídas
}

// Parâmetros de paginação
export interface TaskPaginationParams {
  limit?: number; // Default: 20, Max: 100
  offset?: number; // Default: 0
  orderBy?: 'dueDate' | 'priority' | 'createdAt' | 'title';
  order?: 'asc' | 'desc'; // Default: desc
}

// Resposta da API de listagem
export interface TaskListResponse {
  data: Task[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Dados do formulário de tarefa (para criação)
export interface TaskFormData {
  title: string; // Obrigatório
  description?: string; // Opcional
  type?: TaskType; // Opcional, default: 'OTHER'
  status?: TaskStatus; // Opcional, default: 'PENDING'
  dueDate?: string; // Opcional, ISO string, não pode ser passada
  priority?: TaskPriority; // Opcional, default: 'MEDIUM'
  assignedToId?: string; // Opcional, UUID do usuário
  relatedEntityType: RelatedEntityType; // Obrigatório
  relatedEntityId: string; // Obrigatório, UUID válido
}

// Dados para atualização (parcial)
export interface TaskUpdateData {
  title?: string;
  description?: string | null;
  type?: TaskType;
  status?: TaskStatus; // Se mudar para COMPLETED, completedAt é definido automaticamente
  dueDate?: string | null; // ISO string ou null para remover
  priority?: TaskPriority;
  assignedToId?: string | null; // UUID ou null para remover atribuição
  relatedEntityType?: RelatedEntityType; // Deve ser fornecido junto com relatedEntityId
  relatedEntityId?: string; // Deve ser fornecido junto com relatedEntityType
}

// Erros de validação do formulário
export interface TaskFormErrors {
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  dueDate?: string;
  priority?: string;
  assignedToId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}
