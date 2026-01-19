/**
 * Tipos TypeScript para notificações de tarefas
 * 
 * Define interfaces e tipos usados no sistema de notificações
 * de tarefas vencidas.
 */

import { TaskPriority, TaskStatus, TaskType } from '@prisma/client';

/**
 * Estatísticas de processamento de notificações
 */
export interface NotificationStats {
  totalFound: number;
  totalProcessed: number;
  totalSent: number;
  totalFailed: number;
  errors: Array<{ taskId: string; error: string }>;
  duration: number; // ms
  tenantId?: string;
}

/**
 * Tarefa vencida com relacionamentos carregados
 */
export interface OverdueTaskWithRelations {
  id: string;
  title: string;
  description?: string | null;
  dueDate: Date | null; // Pode ser null no schema, mas será filtrado na query
  priority: TaskPriority;
  status: TaskStatus;
  type: TaskType;
  tenantId: string;
  assignedToId?: string | null;
  createdById: string;
  lastNotificationSentAt?: Date | null;
  assignedTo?: { id: string; name: string; email: string; status: string } | null;
  createdBy?: { id: string; name: string; email: string; status: string } | null;
  relatedEntityType: string;
  relatedEntityId: string;
  tenant?: { id: string; name: string } | null;
}
