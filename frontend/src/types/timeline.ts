/**
 * Tipos relacionados à Timeline/Histórico de Atividades
 * Baseados na API backend (timelineService.ts)
 * 
 * A timeline agrega tarefas, notas e logs de auditoria relacionados
 * a uma entidade específica, ordenados por data (mais recente primeiro).
 */

// Tipo de item da timeline
export type TimelineItemType = 'task' | 'note' | 'audit';

// Tipos de entidades suportadas pela timeline
export type EntityType = 'Contact' | 'Company' | 'Lead' | 'Opportunity' | 'Task';

// Enums de tarefa (reutilizados do backend)
export type TaskType = 'CALL' | 'EMAIL' | 'MEETING' | 'OTHER';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

// Enum de tipo de nota
export type NoteType = 'NOTE' | 'COMMENT' | 'ANNOTATION';

// Ações de auditoria
export type AuditAction = 'create' | 'update' | 'delete';

/**
 * Dados de tarefa na timeline
 * Contém informações resumidas da tarefa para exibição
 */
export interface TaskTimelineData {
  title: string;
  description?: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null; // ISO string
  completedAt?: string | null; // ISO string
  assignedToId?: string | null;
  assignedToName?: string | null;
}

/**
 * Dados de nota na timeline
 * Contém informações resumidas da nota para exibição
 */
export interface NoteTimelineData {
  content: string;
  noteType: NoteType;
}

/**
 * Dados de auditoria na timeline
 * Contém informações sobre a ação e mudanças realizadas
 */
export interface AuditTimelineData {
  action: AuditAction;
  changes?: Record<string, { old?: any; new?: any }> | null;
}

/**
 * Item individual da timeline
 * Representa uma atividade (tarefa, nota ou auditoria)
 */
export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  timestamp: string; // ISO string da API
  userId: string;
  userName: string | null; // Pode ser null se usuário foi deletado
  data: TaskTimelineData | NoteTimelineData | AuditTimelineData;
}

/**
 * Informações da entidade relacionada à timeline
 */
export interface TimelineEntityInfo {
  type: string;
  id: string;
  name?: string; // Contact: firstName + lastName, Company: name, etc.
}

/**
 * Resposta da API de timeline
 */
export interface TimelineResponse {
  data: TimelineItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  entity: TimelineEntityInfo;
}

/**
 * Parâmetros de paginação para timeline
 */
export interface TimelinePaginationParams {
  limit?: number; // Default: 20, Max: 100
  offset?: number; // Default: 0
}

/**
 * Grupo de atividades por data
 * Usado para agrupar itens na UI (Hoje, Ontem, Esta semana, etc.)
 */
export interface TimelineGroup {
  label: string; // "Hoje", "Ontem", "Esta semana", "Este mês", "Anterior"
  date: Date;
  items: TimelineItem[];
}
