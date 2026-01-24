/**
 * Serviço para gerenciamento de jobs de importação
 * 
 * Implementa a lógica para criar, gerenciar e processar jobs de importação assíncronos.
 */

import { prisma } from '../utils/prisma';

// Tipos para ImportJob (serão substituídos quando o modelo estiver disponível no Prisma Client)
export type ImportJobStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH';

// Interface para ImportJob (temporária até o modelo estar disponível no Prisma Client)
export interface ImportJob {
  id: string;
  tenantId: string;
  userId: string;
  fileId: string;
  entityType: string;
  status: ImportJobStatus;
  progress: number;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
  result: any;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedCompletion: Date | null;
  retries: number;
  priority: JobPriority;
  options: any;
  mappings: any;
  createdAt: Date;
  updatedAt: Date;
}

import { ProcessImportResult } from '../types/importProcessing.types';
import { processImportBatch } from '../utils/batchProcessor';
import { temporaryFileStorage } from '../services/uploadService';
import { parseCSV } from '../utils/csvParser';
import { parseExcel } from '../utils/excelParser';
import { IMPORT_CONFIG } from '../config/importConfig';

// Type assertion para prisma.importJob até o modelo estar disponível no Prisma Client
const importJobModel = (prisma as any).importJob;

// Interface para criação de job
export interface CreateImportJobData {
  fileId: string;
  entityType: string;
  mappings: any[];
  options: any;
  tenantId: string;
  userId: string;
  totalRows: number;
  priority?: JobPriority;
}

/**
 * Serviço para gerenciamento de jobs de importação
 */
export class ImportJobService {
  /**
   * Cria um novo job de importação
   */
  static async createJob(data: CreateImportJobData): Promise<ImportJob> {
    // Calcular tempo estimado de conclusão com base no número de linhas
    const estimatedDurationMs = this.calculateEstimatedDuration(data.totalRows);
    const estimatedCompletion = new Date(Date.now() + estimatedDurationMs);

    const job = await importJobModel.create({
      data: {
        fileId: data.fileId,
        entityType: data.entityType,
        mappings: data.mappings,
        options: data.options,
        tenantId: data.tenantId,
        userId: data.userId,
        totalRows: data.totalRows,
        priority: data.priority || 'NORMAL',
        estimatedCompletion,
        status: 'QUEUED',
      },
    });

    return job;
  }

  /**
   * Obtém um job de importação pelo ID
   */
  static async getJob(jobId: string): Promise<ImportJob | null> {
    return importJobModel.findUnique({
      where: { id: jobId },
    });
  }

  /**
   * Atualiza o status de um job
   */
  static async updateJobStatus(
    jobId: string,
    status: ImportJobStatus,
    updates?: Partial<Omit<ImportJob, 'id' | 'tenantId' | 'userId' | 'fileId' | 'entityType'>>
  ): Promise<ImportJob> {
    return importJobModel.update({
      where: { id: jobId },
      data: {
        status,
        ...(updates || {}),
      },
    });
  }

  /**
   * Cancela um job de importação
   */
  static async cancelJob(jobId: string): Promise<ImportJob> {
    return importJobModel.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Inicia o processamento de um job
   */
  static async startJobProcessing(jobId: string): Promise<void> {
    // Executar o processamento em segundo plano
    setImmediate(async () => {
      try {
        await this.processJob(jobId);
      } catch (error) {
        console.error(`Erro ao processar job ${jobId}:`, error);
        try {
          await this.updateJobStatus(jobId, 'FAILED', {
            errorMessage: (error as Error).message,
            completedAt: new Date(),
          });
        } catch (updateError) {
          console.error(`Erro ao atualizar status do job ${jobId}:`, updateError);
        }
      }
    });
  }

  /**
   * Processa um job de importação
   */
  private static async processJob(jobId: string): Promise<void> {
    // Obter o job
    const job = await importJobModel.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} não encontrado`);
    }

    // Atualizar status para PROCESSING
    await this.updateJobStatus(jobId, 'PROCESSING', {
      startedAt: new Date(),
    });

    try {
      // Obter arquivo temporário
      const fileData = temporaryFileStorage.getFile(job.fileId);
      if (!fileData) {
        throw new Error(`Arquivo ${job.fileId} não encontrado para o job ${jobId}`);
      }

      // Determinar tipo de arquivo
      const fileName = fileData.metadata.originalName.toLowerCase();
      const isCsv = fileName.endsWith('.csv');
      const isXlsx = fileName.endsWith('.xlsx');
      const isXls = fileName.endsWith('.xls');

      if (!isCsv && !isXlsx && !isXls) {
        throw new Error(`Tipo de arquivo não suportado: ${fileName}`);
      }

      // Parsear o arquivo para obter as linhas
      let rows: any[] = [];
      if (isCsv) {
        // Parsear CSV
        const parseResult = await parseCSV(fileData.buffer);
        rows = parseResult.data;
      } else {
        // Parsear Excel
        const parseResult = await parseExcel(fileData.buffer, {
          sheetIndex: 0, // Usar primeira planilha por padrão
          header: true
        });
        rows = parseResult.data;
      }

      // Atualizar progresso inicial
      await this.updateJobStatus(jobId, 'PROCESSING', {
        progress: 10, // Iniciando processamento
      });

      // Processar em batches para atualizar progresso continuamente
      const batchSize = IMPORT_CONFIG.BATCH_SIZE;
      let processedRows = 0;
      let successCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;

      // Converter mappings e options de volta de JSON
      const mappings = job.mappings as any;
      const options = job.options as any;

      // Processar em batches
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        // Atualizar progresso
        const progress = Math.min(90, Math.floor((i / rows.length) * 90) + 10);
        await this.updateJobStatus(jobId, 'PROCESSING', {
          progress,
          processedRows: i,
        });

        // Processar batch
        const batchResult = await processImportBatch(
          batch,
          mappings,
          job.entityType,
          job.tenantId,
          job.userId,
          options
        );

        // Acumular resultados
        successCount += batchResult.successCount;
        errorCount += batchResult.errorCount;
        duplicateCount += batchResult.duplicateCount;
        processedRows += batch.length;
      }

      // Atualizar progresso final
      await this.updateJobStatus(jobId, 'PROCESSING', {
        progress: 95,
        processedRows,
        successCount,
        errorCount,
        duplicateCount,
      } as any); // Type assertion to bypass strict typing

      // Criar resultado final
      const finalResult: ProcessImportResult = {
        importId: jobId,
        totalRows: rows.length,
        successCount,
        errorCount,
        skippedCount: 0, // Para jobs assíncronos, skippedCount pode ser calculado de outra forma
        duplicateCount,
        processedCount: processedRows,
        errors: [], // Os erros detalhados podem ser armazenados separadamente
        warnings: [],
        processingTime: Date.now() - (job.startedAt?.getTime() || Date.now()),
        status: errorCount === 0 ? 'completed' : (successCount > 0 ? 'partial' : 'failed'),
        progress: 95,
      };

      // Atualizar job com resultado final
      await this.updateJobStatus(jobId, 'COMPLETED', {
        progress: 100,
        processedRows,
        successCount,
        errorCount,
        duplicateCount,
        result: JSON.stringify(finalResult) as any, // Convert to JSON string for storage
        completedAt: new Date(),
      });
    } catch (error) {
      // Em caso de erro, atualizar status para FAILED
      await this.updateJobStatus(jobId, 'FAILED', {
        errorMessage: (error as Error).message,
        completedAt: new Date(),
        progress: 100, // Marcar como 100% para indicar que terminou (mesmo que com erro)
      });
      throw error; // Repassar o erro para ser tratado pelo caller
    }
  }

  /**
   * Calcula tempo estimado de processamento com base no número de linhas
   */
  private static calculateEstimatedDuration(totalRows: number): number {
    // Estimativa baseada em testes: ~100 linhas por segundo
    const estimatedSeconds = Math.max(10, totalRows / 100); // Mínimo de 10 segundos
    return estimatedSeconds * 1000; // Converter para milissegundos
  }

  /**
   * Limpa jobs antigos com base na política de retenção
   */
  static async cleanupOldJobs(retentionDays: number = IMPORT_CONFIG.JOB_HISTORY_RETENTION_DAYS): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await importJobModel.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: ['COMPLETED', 'FAILED', 'CANCELLED'],
        },
      },
    });

    return result.count;
  }

  /**
   * Obtém jobs de um tenant com paginação
   */
  static async getTenantJobs(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    status?: ImportJobStatus
  ): Promise<{ jobs: ImportJob[]; totalCount: number }> {
    const skip = (page - 1) * limit;
    
    const whereClause: any = { tenantId };
    if (status) {
      whereClause.status = status;
    }

    const [jobs, totalCount] = await Promise.all([
      importJobModel.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      importJobModel.count({ where: whereClause }),
    ]);

    return { jobs, totalCount };
  }
}