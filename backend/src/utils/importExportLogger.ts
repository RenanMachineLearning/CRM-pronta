/**
 * Utilitário de logging para erros de importação/exportação
 * 
 * Fornece funções para registrar erros de forma detalhada com contexto
 * relevante para debugging e monitoramento.
 */

import { ImportExportError } from '../errors/ImportExportError';
import { Request } from 'express';

export interface LogContext {
  tenantId?: string;
  userId?: string;
  jobId?: string;
  entityType?: string;
  fileName?: string;
  requestId?: string;
  timestamp?: Date;
}

export interface ErrorLogEntry {
  level: 'error' | 'warn' | 'info';
  message: string;
  error?: ImportExportError | Error;
  context: LogContext;
  timestamp: Date;
}

class ImportExportLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogEntries: number;

  constructor(maxLogEntries: number = 1000) {
    this.maxLogEntries = maxLogEntries;
  }

  /**
   * Registra um erro de importação/exportação
   */
  logError(
    error: ImportExportError | Error,
    context: LogContext = {},
    level: 'error' | 'warn' | 'info' = 'error'
  ): void {
    const logEntry: ErrorLogEntry = {
      level,
      message: error.message,
      error,
      context: {
        ...context,
        timestamp: context.timestamp || new Date()
      },
      timestamp: new Date()
    };

    this.logs.push(logEntry);

    // Manter apenas os logs mais recentes
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }

    // Também logar no console para monitoramento
    this.writeToConsole(logEntry);
  }

  /**
   * Registra um erro com base em um request HTTP
   */
  logErrorFromRequest(
    error: ImportExportError | Error,
    req: Request,
    context: Omit<LogContext, 'tenantId' | 'userId'> = {},
    level: 'error' | 'warn' | 'info' = 'error'
  ): void {
    const enrichedContext: LogContext = {
      ...context,
      tenantId: req.tenantId,
      userId: req.userId,
      requestId: generateRequestId(),
      timestamp: new Date()
    };

    this.logError(error, enrichedContext, level);
  }

  /**
   * Escreve o log no console com formatação adequada
   */
  private writeToConsole(entry: ErrorLogEntry): void {
    const { level, message, error, context, timestamp } = entry;
    
    const logObject = {
      timestamp: timestamp.toISOString(),
      level,
      message,
      context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          ...(error instanceof ImportExportError && {
            code: (error as ImportExportError).code,
            details: (error as ImportExportError).details,
            jobId: (error as ImportExportError).jobId,
            tenantId: (error as ImportExportError).tenantId
          })
        }
      })
    };

    switch (level) {
      case 'error':
        console.error('[IMPORT_EXPORT_ERROR]', JSON.stringify(logObject));
        break;
      case 'warn':
        console.warn('[IMPORT_EXPORT_WARN]', JSON.stringify(logObject));
        break;
      case 'info':
        console.info('[IMPORT_EXPORT_INFO]', JSON.stringify(logObject));
        break;
    }
  }

  /**
   * Obtém os logs registrados
   */
  getLogs(): ErrorLogEntry[] {
    return [...this.logs]; // Retorna cópia para evitar mutações externas
  }

  /**
   * Limpa os logs antigos
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Obtém logs filtrados por nível
   */
  getLogsByLevel(level: 'error' | 'warn' | 'info'): ErrorLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Obtém logs por tenant
   */
  getLogsByTenant(tenantId: string): ErrorLogEntry[] {
    return this.logs.filter(log => log.context.tenantId === tenantId);
  }

  /**
   * Obtém logs por job
   */
  getLogsByJob(jobId: string): ErrorLogEntry[] {
    return this.logs.filter(log => log.context.jobId === jobId);
  }
}

// Função auxiliar para gerar ID de request
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Instância singleton do logger
export const importExportLogger = new ImportExportLogger();

/**
 * Função utilitária para log de erros de importação/exportação
 */
export function logImportExportError(
  error: ImportExportError | Error,
  context: LogContext = {},
  level: 'error' | 'warn' | 'info' = 'error'
): void {
  importExportLogger.logError(error, context, level);
}

/**
 * Função utilitária para log de erros de importação/exportação com base em request
 */
export function logImportExportErrorFromRequest(
  error: ImportExportError | Error,
  req: Request,
  context: Omit<LogContext, 'tenantId' | 'userId'> = {},
  level: 'error' | 'warn' | 'info' = 'error'
): void {
  importExportLogger.logErrorFromRequest(error, req, context, level);
}