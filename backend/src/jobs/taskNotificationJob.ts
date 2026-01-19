/**
 * Job agendado para notificações de tarefas vencidas
 * 
 * Executa periodicamente (via node-cron) para buscar e enviar
 * notificações de tarefas vencidas.
 * 
 * Funcionalidades:
 * - Agendamento via cron expression
 * - Prevenção de execuções concorrentes
 * - Timeout de execução
 * - Logging estruturado
 * - Health check
 * - Tratamento robusto de erros
 */

import * as cron from 'node-cron';
import { processOverdueTasks } from '../services/taskNotificationService';
import type { NotificationStats } from '../types/taskNotification';

// Estado do job
let isProcessing = false;
let lastExecutionTime: Date | null = null;
let lastExecutionStats: NotificationStats | null = null;
let cronJob: cron.ScheduledTask | null = null;

/**
 * Interface para health check do job
 */
export interface JobHealth {
  isRunning: boolean;
  lastExecution?: Date;
  lastExecutionStats?: NotificationStats;
  isEnabled: boolean;
  cronExpression?: string;
}

/**
 * Logging estruturado
 */
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  service: 'task-notification';
  event: string;
  timestamp: string;
  [key: string]: any;
}

function log(entry: LogEntry): void {
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(entry));
  } else {
    console.log(`[${entry.level.toUpperCase()}] ${entry.event}`, entry);
  }
}

/**
 * Valida configurações do job
 */
function validateConfig(): {
  cronExpression: string;
  batchSize: number;
  timeoutMs: number;
  maxRetries: number;
} {
  const cronExpression =
    process.env.TASK_NOTIFICATION_CRON || '0 * * * *'; // A cada hora
  const batchSize =
    parseInt(process.env.TASK_NOTIFICATION_BATCH_SIZE || '100', 10) || 100;
  const timeoutMs =
    parseInt(process.env.TASK_NOTIFICATION_TIMEOUT_MS || '300000', 10) || 300000; // 5 minutos
  const maxRetries =
    parseInt(process.env.TASK_NOTIFICATION_MAX_RETRIES || '3', 10) || 3;

  // Validar batch size
  if (batchSize <= 0 || batchSize > 1000) {
    log({
      level: 'warn',
      service: 'task-notification',
      event: 'config-validation',
      timestamp: new Date().toISOString(),
      message: `Batch size ${batchSize} fora do range recomendado (1-1000), usando 100`,
    });
  }

  // Validar timeout
  if (timeoutMs <= 0 || timeoutMs > 600000) {
    log({
      level: 'warn',
      service: 'task-notification',
      event: 'config-validation',
      timestamp: new Date().toISOString(),
      message: `Timeout ${timeoutMs}ms fora do range recomendado (1-600000), usando 300000`,
    });
  }

  // Validar max retries
  if (maxRetries < 0 || maxRetries > 10) {
    log({
      level: 'warn',
      service: 'task-notification',
      event: 'config-validation',
      timestamp: new Date().toISOString(),
      message: `Max retries ${maxRetries} fora do range recomendado (0-10), usando 3`,
    });
  }

  return {
    cronExpression,
    batchSize: Math.max(1, Math.min(1000, batchSize)),
    timeoutMs: Math.max(1000, Math.min(600000, timeoutMs)),
    maxRetries: Math.max(0, Math.min(10, maxRetries)),
  };
}

/**
 * Executa processamento de tarefas vencidas com timeout
 */
async function executeWithTimeout(
  timeoutMs: number,
  maxRetries: number
): Promise<NotificationStats> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout após ${timeoutMs}ms`));
    }, timeoutMs);

    processOverdueTasks(undefined, maxRetries)
      .then((stats) => {
        clearTimeout(timeout);
        resolve(stats);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

/**
 * Executa o job de notificações
 */
async function runJob(): Promise<void> {
  // Prevenção de concorrência
  if (isProcessing) {
    log({
      level: 'warn',
      service: 'task-notification',
      event: 'job-skipped',
      timestamp: new Date().toISOString(),
      message: 'Execução anterior ainda em andamento, pulando esta execução',
    });
    return;
  }

  isProcessing = true;
  const startTime = Date.now();
  const config = validateConfig();

  log({
    level: 'info',
    service: 'task-notification',
    event: 'job-started',
    timestamp: new Date().toISOString(),
    cronExpression: config.cronExpression,
    batchSize: config.batchSize,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
  });

  try {
    // Executar com timeout
    const stats = await executeWithTimeout(config.timeoutMs, config.maxRetries);

    lastExecutionTime = new Date();
    lastExecutionStats = stats;

    const duration = Date.now() - startTime;

    log({
      level: 'info',
      service: 'task-notification',
      event: 'job-completed',
      timestamp: new Date().toISOString(),
      duration,
      stats: {
        totalFound: stats.totalFound,
        totalProcessed: stats.totalProcessed,
        totalSent: stats.totalSent,
        totalFailed: stats.totalFailed,
        errorsCount: stats.errors.length,
      },
    });

    // Logar avisos se houver erros
    if (stats.errors.length > 0) {
      log({
        level: 'warn',
        service: 'task-notification',
        event: 'job-errors',
        timestamp: new Date().toISOString(),
        errors: stats.errors.slice(0, 10), // Limitar a 10 erros no log
        totalErrors: stats.errors.length,
      });
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;

    log({
      level: 'error',
      service: 'task-notification',
      event: 'job-failed',
      timestamp: new Date().toISOString(),
      duration,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  } finally {
    isProcessing = false;
  }
}

/**
 * Inicia o job agendado
 */
export function startTaskNotificationJob(): void {
  // Verificar se job está habilitado
  const enabled =
    process.env.ENABLE_TASK_NOTIFICATIONS !== 'false' &&
    process.env.ENABLE_TASK_NOTIFICATIONS !== '0';

  if (!enabled) {
    log({
      level: 'info',
      service: 'task-notification',
      event: 'job-disabled',
      timestamp: new Date().toISOString(),
      message: 'Job desabilitado via variável de ambiente',
    });
    return;
  }

  const config = validateConfig();

  // Validar cron expression
  if (!cron.validate(config.cronExpression)) {
    log({
      level: 'error',
      service: 'task-notification',
      event: 'job-invalid-cron',
      timestamp: new Date().toISOString(),
      cronExpression: config.cronExpression,
      message: 'Cron expression inválida',
    });
    return;
  }

  // Agendar job
  cronJob = cron.schedule(config.cronExpression, runJob, {
    scheduled: true,
    timezone: 'UTC',
  });

  log({
    level: 'info',
    service: 'task-notification',
    event: 'job-started',
    timestamp: new Date().toISOString(),
    message: 'Job de notificações de tarefas vencidas iniciado',
    cronExpression: config.cronExpression,
    batchSize: config.batchSize,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
  });
}

/**
 * Para o job agendado
 */
export function stopTaskNotificationJob(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;

    log({
      level: 'info',
      service: 'task-notification',
      event: 'job-stopped',
      timestamp: new Date().toISOString(),
      message: 'Job de notificações de tarefas vencidas parado',
    });
  }
}

/**
 * Retorna health check do job
 */
export function getJobHealth(): JobHealth {
  const enabled =
    process.env.ENABLE_TASK_NOTIFICATIONS !== 'false' &&
    process.env.ENABLE_TASK_NOTIFICATIONS !== '0';

  return {
    isRunning: isProcessing,
    lastExecution: lastExecutionTime || undefined,
    lastExecutionStats: lastExecutionStats || undefined,
    isEnabled: enabled,
    cronExpression: process.env.TASK_NOTIFICATION_CRON || '0 * * * *',
  };
}
