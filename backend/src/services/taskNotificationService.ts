/**
 * Serviço de notificações de tarefas vencidas
 * 
 * Gerencia busca e envio de notificações para tarefas vencidas.
 * Funcionalidades:
 * - Buscar tarefas vencidas com filtros apropriados
 * - Determinar destinatário (assignedTo ou createdBy)
 * - Enviar notificações via EmailService
 * - Atualizar lastNotificationSentAt para evitar spam
 * - Processar tarefas em lotes
 * - Retry com backoff exponencial
 * - Estatísticas de processamento
 */

import { PrismaClient, TaskStatus, UserStatus } from '@prisma/client';
import { EmailService } from './emailService';
import type { OverdueTaskWithRelations, NotificationStats } from '../types/taskNotification';

const prisma = new PrismaClient();

/**
 * Retry com backoff exponencial
 * 
 * @param fn - Função a ser executada com retry
 * @param maxRetries - Número máximo de tentativas
 * @param baseDelay - Delay base em ms
 * @returns Resultado da função
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries - 1) throw error;
      // Verificar se erro é recuperável
      if (!isRecoverableError(error)) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Verifica se erro é recuperável (pode tentar novamente)
 * 
 * @param error - Erro a ser verificado
 * @returns true se erro é recuperável
 */
function isRecoverableError(error: any): boolean {
  // Erros recuperáveis: timeout, conexão, rate limit
  // Erros não recuperáveis: email inválido, usuário não encontrado
  return (
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNREFUSED' ||
    error.message?.includes('rate limit') ||
    error.message?.includes('timeout')
  );
}

/**
 * Busca tarefas vencidas
 * 
 * @param tenantId - ID do tenant (opcional, para processamento isolado)
 * @param batchSize - Tamanho do lote (default: 100)
 * @returns Lista de tarefas vencidas com relacionamentos
 */
export async function findOverdueTasks(
  tenantId?: string,
  batchSize: number = 100
): Promise<OverdueTaskWithRelations[]> {
  // Obter início do dia atual (UTC para consistência)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  today.setUTCMilliseconds(0);

  const overdueTasks = await prisma.task.findMany({
    where: {
      // Filtro por tenant (se fornecido - para processamento isolado)
      ...(tenantId ? { tenantId } : {}),

      // Tarefa vencida (dueDate < hoje, sem considerar hora)
      dueDate: {
        lt: today,
      },

      // Status que permite notificação
      status: {
        in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
      },

      // Não soft deleted
      deletedAt: null,

      // Não notificar se já foi notificado hoje
      // (lastNotificationSentAt é null OU < hoje)
      AND: [
        {
          OR: [
            { lastNotificationSentAt: null },
            { lastNotificationSentAt: { lt: today } },
          ],
        },
        // Deve ter pelo menos um usuário para notificar (createdById é obrigatório no schema)
        {
          createdById: { not: '' }, // Sempre haverá createdById, pois é campo obrigatório
        },
      ],
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true, // Verificar se usuário está ativo
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true, // Verificar se usuário está ativo
        },
      },
      tenant: {
        select: {
          id: true,
          name: true, // Para contexto no email
        },
      },
    },
    // Ordenar por prioridade e data de vencimento (mais urgentes primeiro)
    orderBy: [
      { priority: 'desc' }, // HIGH primeiro
      { dueDate: 'asc' }, // Mais antigas primeiro
    ],
    // Limite para evitar sobrecarga (processar em lotes)
    take: batchSize,
  });

  return overdueTasks as OverdueTaskWithRelations[];
}

/**
 * Determina destinatário da notificação
 * 
 * Prioridade:
 * 1. assignedTo (se existir e estiver ativo)
 * 2. createdBy (fallback, se estiver ativo)
 * 
 * @param task - Tarefa com relacionamentos
 * @returns Usuário destinatário ou null se nenhum válido
 */
function determineRecipient(
  task: OverdueTaskWithRelations
): { id: string; name: string; email: string } | null {
  // Priorizar assignedTo se existir e estiver ativo
  if (
    task.assignedTo &&
    task.assignedTo.status === UserStatus.ACTIVE &&
    task.assignedTo.email
  ) {
    return {
      id: task.assignedTo.id,
      name: task.assignedTo.name,
      email: task.assignedTo.email,
    };
  }

  // Fallback para createdBy se estiver ativo
  if (
    task.createdBy &&
    task.createdBy.status === UserStatus.ACTIVE &&
    task.createdBy.email
  ) {
    return {
      id: task.createdBy.id,
      name: task.createdBy.name,
      email: task.createdBy.email,
    };
  }

  return null;
}

/**
 * Envia notificação de tarefa vencida para um usuário
 * 
 * @param task - Tarefa vencida
 * @param user - Usuário destinatário
 * @returns true se notificação foi enviada com sucesso
 */
async function sendOverdueTaskNotification(
  task: OverdueTaskWithRelations,
  user: { id: string; name: string; email: string }
): Promise<boolean> {
  try {
    // Validar que usuário pertence ao mesmo tenant da tarefa
    if (user.id !== task.assignedToId && user.id !== task.createdById) {
      console.warn(
        `[TaskNotification] Usuário ${user.id} não pertence à tarefa ${task.id}`
      );
      return false;
    }

    // Enviar notificação via EmailService
    await EmailService.sendOverdueTaskNotification(
      user.email,
      {
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        type: task.type,
        relatedEntityType: task.relatedEntityType,
        relatedEntityId: task.relatedEntityId,
      },
      task.tenantId,
      user.name,
      task.tenant?.name
    );

    // Atualizar lastNotificationSentAt em transação
    await prisma.$transaction(
      async (tx) => {
        await tx.task.update({
          where: { id: task.id },
          data: { lastNotificationSentAt: new Date() },
        });
      },
      {
        timeout: 10000, // 10 segundos de timeout para transação
      }
    );

    return true;
  } catch (error: any) {
    // Logar erro mas não quebrar processamento
    console.error(
      `[TaskNotification] Erro ao enviar notificação para tarefa ${task.id}:`,
      error.message
    );
    return false;
  }
}

/**
 * Processa todas as tarefas vencidas
 * 
 * @param tenantId - ID do tenant (opcional, para processamento isolado)
 * @param maxRetries - Número máximo de retries (default: 3)
 * @returns Estatísticas de processamento
 */
export async function processOverdueTasks(
  tenantId?: string,
  maxRetries: number = 3
): Promise<NotificationStats> {
  const startTime = Date.now();
  const stats: NotificationStats = {
    totalFound: 0,
    totalProcessed: 0,
    totalSent: 0,
    totalFailed: 0,
    errors: [],
    duration: 0,
    tenantId,
  };

  try {
    // Buscar tarefas vencidas
    const batchSize =
      parseInt(process.env.TASK_NOTIFICATION_BATCH_SIZE || '100', 10) || 100;
    const overdueTasks = await findOverdueTasks(tenantId, batchSize);
    stats.totalFound = overdueTasks.length;

    // Processar cada tarefa
    for (const task of overdueTasks) {
      stats.totalProcessed++;

      try {
        // Validar que dueDate não é null
        if (!task.dueDate) {
          console.warn(
            `[TaskNotification] Tarefa ${task.id} sem dueDate, pulando`
          );
          continue;
        }

        // Determinar destinatário
        const recipient = determineRecipient(task);
        if (!recipient) {
          console.warn(
            `[TaskNotification] Tarefa ${task.id} sem destinatário válido, pulando`
          );
          continue;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient.email)) {
          console.warn(
            `[TaskNotification] Email inválido para usuário ${recipient.id}: ${recipient.email}`
          );
          stats.totalFailed++;
          stats.errors.push({
            taskId: task.id,
            error: 'Email inválido',
          });
          continue;
        }

        // Enviar notificação com retry
        const sent = await retryWithBackoff(
          () => sendOverdueTaskNotification(task, recipient),
          maxRetries
        );

        if (sent) {
          stats.totalSent++;
        } else {
          stats.totalFailed++;
          stats.errors.push({
            taskId: task.id,
            error: 'Falha ao enviar notificação após retries',
          });
        }
      } catch (error: any) {
        // Erro ao processar tarefa específica
        stats.totalFailed++;
        stats.errors.push({
          taskId: task.id,
          error: error.message || 'Erro desconhecido',
        });
        console.error(
          `[TaskNotification] Erro ao processar tarefa ${task.id}:`,
          error.message
        );
      }
    }
  } catch (error: any) {
    // Erro ao buscar tarefas
    console.error('[TaskNotification] Erro ao buscar tarefas vencidas:', error);
    stats.errors.push({
      taskId: 'N/A',
      error: `Erro ao buscar tarefas: ${error.message}`,
    });
  } finally {
    stats.duration = Date.now() - startTime;
  }

  return stats;
}
