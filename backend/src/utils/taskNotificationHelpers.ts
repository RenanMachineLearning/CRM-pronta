/**
 * Funções auxiliares para notificações de tarefas
 * 
 * Utilitários para formatação e tradução de dados de tarefas
 * para uso em emails e notificações.
 */

import { TaskPriority, TaskStatus, TaskType } from '@prisma/client';

/**
 * Formata data para exibição em email (formato brasileiro)
 * 
 * @param date - Data a ser formatada
 * @returns Data formatada como DD/MM/AAAA
 */
export function formatDateForEmail(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Traduz prioridade da tarefa para português
 * 
 * @param priority - Prioridade da tarefa
 * @returns Prioridade traduzida
 */
export function translateTaskPriority(priority: TaskPriority): string {
  const translations: Record<TaskPriority, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
  };
  return translations[priority] || priority;
}

/**
 * Traduz status da tarefa para português
 * 
 * @param status - Status da tarefa
 * @returns Status traduzido
 */
export function translateTaskStatus(status: TaskStatus): string {
  const translations: Record<TaskStatus, string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada',
  };
  return translations[status] || status;
}

/**
 * Traduz tipo da tarefa para português
 * 
 * @param type - Tipo da tarefa
 * @returns Tipo traduzido
 */
export function translateTaskType(type: TaskType): string {
  const translations: Record<TaskType, string> = {
    CALL: 'Ligação',
    EMAIL: 'Email',
    MEETING: 'Reunião',
    OTHER: 'Outro',
  };
  return translations[type] || type;
}

/**
 * Calcula quantos dias a tarefa está vencida
 * 
 * @param dueDate - Data de vencimento
 * @returns Número de dias vencidos (positivo) ou dias até vencimento (negativo)
 */
export function getDaysOverdue(dueDate: Date): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  today.setUTCMilliseconds(0);
  
  const due = new Date(dueDate);
  due.setUTCHours(0, 0, 0, 0);
  due.setUTCMilliseconds(0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return -diffDays; // Negativo = vencido, positivo = ainda não vencido
}
