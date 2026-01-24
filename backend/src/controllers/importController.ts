/**
 * Controller para operações de importação
 * 
 * Implementa endpoints para processamento de importação de dados,
 * incluindo tanto operações síncronas quanto assíncronas.
 */

import { Request, Response } from 'express';
import { processImportBatch } from '../utils/batchProcessor';
import { temporaryFileStorage } from '../services/uploadService';
import { IMPORT_CONFIG } from '../config/importConfig';
import { ProcessImportRequest } from '../types/importProcessing.types';
import { parseCSV } from '../utils/csvParser';
import { parseExcel } from '../utils/excelParser';
import { ImportJobService } from '../services/importJobService';

/**
 * Processa um arquivo de importação
 * 
 * Endpoint: POST /api/import/:fileId/process
 * 
 * Estratégia:
 * - Arquivos < 1000 linhas OU < 5MB: Processamento síncrono
 * - Arquivos >= 1000 linhas OU >= 5MB: Processamento assíncrono
 */
export async function processImport(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já devem estar disponíveis via middleware
    const tenantId = req.tenantId;
    const userId = req.userId;

    if (!tenantId || !userId) {
      res.status(401).json({
        error: 'Não autorizado',
        message: 'Tenant ou usuário não identificado'
      });
      return;
    }

    const { fileId } = req.params;
    const requestData: ProcessImportRequest = req.body;

    // Validar parâmetros
    if (!fileId) {
      res.status(400).json({
        error: 'fileId é obrigatório',
        message: 'O ID do arquivo é necessário para o processamento'
      });
      return;
    }

    if (!requestData) {
      res.status(400).json({
        error: 'Dados de requisição são obrigatórios',
        message: 'O corpo da requisição deve conter as configurações de importação'
      });
      return;
    }

    // Validar formato dos dados de requisição
    const validationError = validateProcessImportRequest(requestData);
    if (validationError) {
      res.status(400).json({
        error: 'Dados de requisição inválidos',
        message: validationError
      });
      return;
    }

    // Obter arquivo temporário
    const fileData = temporaryFileStorage.getFile(fileId);
    if (!fileData) {
      res.status(404).json({
        error: 'Arquivo não encontrado',
        message: 'O arquivo especificado não existe ou expirou'
      });
      return;
    }

    // Verificar se o usuário tem acesso ao arquivo
    if (!temporaryFileStorage.validateAccess(fileId, userId, tenantId)) {
      res.status(403).json({
        error: 'Acesso negado',
        message: 'Você não tem permissão para acessar este arquivo'
      });
      return;
    }

    // Determinar tipo de arquivo
    const fileName = fileData.metadata.originalName.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isXlsx = fileName.endsWith('.xlsx');
    const isXls = fileName.endsWith('.xls');

    if (!isCsv && !isXlsx && !isXls) {
      res.status(400).json({
        error: 'Tipo de arquivo não suportado',
        message: 'Apenas arquivos CSV, XLSX e XLS são permitidos'
      });
      return;
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

    // Decidir estratégia de processamento (síncrono vs assíncrono)
    const isLargeFile = 
      rows.length >= IMPORT_CONFIG.SYNC_THRESHOLD_ROWS || 
      fileData.buffer.length >= IMPORT_CONFIG.SYNC_THRESHOLD_SIZE;

    if (isLargeFile) {
      // Processamento assíncrono
      const job = await ImportJobService.createJob({
        fileId,
        entityType: requestData.entityType,
        mappings: requestData.mappings,
        options: requestData.options || {},
        tenantId,
        userId,
        totalRows: rows.length,
        priority: (requestData.options?.priority as 'LOW' | 'NORMAL' | 'HIGH') || 'NORMAL',
      });

      // Iniciar processamento em background
      ImportJobService.startJobProcessing(job.id);

      res.status(202).json({
        message: 'Importação iniciada em segundo plano',
        jobId: job.id,
        status: 'queued',
        estimatedCompletion: job.estimatedCompletion,
        totalRows: rows.length,
      });
    } else {
      // Processamento síncrono
      const result = await processImportBatch(
        rows,
        requestData.mappings,
        requestData.entityType,
        tenantId,
        userId,
        requestData.options || {}
      );

      // Verificar se o tempo de processamento excedeu o limite
      if (result.processingTime > IMPORT_CONFIG.TIMEOUT_SYNC) {
        // Mesmo sendo um arquivo pequeno, se demorou muito, retornar como assíncrono
        const job = await ImportJobService.createJob({
          fileId,
          entityType: requestData.entityType,
          mappings: requestData.mappings,
          options: requestData.options || {},
          tenantId,
          userId,
          totalRows: rows.length,
          priority: 'NORMAL',
        });

        // Iniciar processamento em background
        ImportJobService.startJobProcessing(job.id);

        res.status(202).json({
          message: 'Importação transferida para processamento em segundo plano devido ao tempo de execução',
          jobId: job.id,
          status: 'queued',
          estimatedCompletion: job.estimatedCompletion,
          totalRows: rows.length,
        });
      } else {
        // Retornar resultado imediato
        res.status(200).json({
          message: 'Importação concluída com sucesso',
          ...result,
        });
      }
    }
  } catch (error) {
    console.error('Erro ao processar importação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao processar importação',
      details: (error as Error).message
    });
  }
}

/**
 * Obtém o status de um job de importação
 * 
 * Endpoint: GET /api/import/jobs/:jobId
 */
export async function getImportJobStatus(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      res.status(400).json({
        error: 'jobId é obrigatório',
        message: 'O ID do job é necessário para consultar o status'
      });
      return;
    }

    const job = await ImportJobService.getJob(jobId);

    if (!job) {
      res.status(404).json({
        error: 'Job não encontrado',
        message: 'O job de importação especificado não existe'
      });
      return;
    }

    // Verificar se o usuário tem permissão para acessar este job
    if (job.userId !== req.userId) {
      res.status(403).json({
        error: 'Acesso negado',
        message: 'Você não tem permissão para acessar este job de importação'
      });
      return;
    }

    res.status(200).json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successCount: job.successCount,
      errorCount: job.errorCount,
      result: job.result,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      estimatedCompletion: job.estimatedCompletion,
      retries: job.retries,
    });
  } catch (error) {
    console.error('Erro ao obter status do job de importação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao obter status do job de importação',
      details: (error as Error).message
    });
  }
}

/**
 * Cancela um job de importação
 * 
 * Endpoint: PUT /api/import/jobs/:jobId/cancel
 */
export async function cancelImportJob(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      res.status(400).json({
        error: 'jobId é obrigatório',
        message: 'O ID do job é necessário para cancelar o job'
      });
      return;
    }

    const job = await ImportJobService.getJob(jobId);

    if (!job) {
      res.status(404).json({
        error: 'Job não encontrado',
        message: 'O job de importação especificado não existe'
      });
      return;
    }

    // Verificar se o usuário tem permissão para cancelar este job
    if (job.userId !== req.userId) {
      res.status(403).json({
        error: 'Acesso negado',
        message: 'Você não tem permissão para cancelar este job de importação'
      });
      return;
    }

    // Verificar se o job pode ser cancelado (não concluído ou falho)
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      res.status(400).json({
        error: 'Job não pode ser cancelado',
        message: 'O job de importação já está em um estado final e não pode ser cancelado'
      });
      return;
    }

    const cancelledJob = await ImportJobService.cancelJob(jobId);

    res.status(200).json({
      message: 'Job cancelado com sucesso',
      jobId: cancelledJob.id,
      status: cancelledJob.status,
    });
  } catch (error) {
    console.error('Erro ao cancelar job de importação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao cancelar job de importação',
      details: (error as Error).message
    });
  }
}

/**
 * Valida os dados da requisição de importação
 */
function validateProcessImportRequest(requestData: ProcessImportRequest): string | null {
  // Validar tipo de entidade
  const validEntityTypes = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task', 'Note'];
  if (!validEntityTypes.includes(requestData.entityType)) {
    return `Tipo de entidade inválido. Valores permitidos: ${validEntityTypes.join(', ')}`;
  }

  // Validar mapeamentos
  if (!requestData.mappings || !Array.isArray(requestData.mappings) || requestData.mappings.length === 0) {
    return 'Mapeamentos são obrigatórios e devem ser um array não vazio';
  }

  for (const [index, mapping] of requestData.mappings.entries()) {
    if (typeof mapping.columnIndex !== 'number' || mapping.columnIndex < 0) {
      return `Mapeamento inválido no índice ${index}: columnIndex deve ser um número não negativo`;
    }

    if (!mapping.fieldName || typeof mapping.fieldName !== 'string') {
      return `Mapeamento inválido no índice ${index}: fieldName é obrigatório e deve ser uma string`;
    }

    if (typeof mapping.required !== 'boolean') {
      return `Mapeamento inválido no índice ${index}: required deve ser um valor booleano`;
    }
  }

  // Validar opções
  if (requestData.options) {
    if (requestData.options.batchSize !== undefined) {
      if (typeof requestData.options.batchSize !== 'number' || 
          requestData.options.batchSize < IMPORT_CONFIG.MIN_BATCH_SIZE || 
          requestData.options.batchSize > IMPORT_CONFIG.MAX_BATCH_SIZE) {
        return `Tamanho de batch inválido: deve estar entre ${IMPORT_CONFIG.MIN_BATCH_SIZE} e ${IMPORT_CONFIG.MAX_BATCH_SIZE}`;
      }
    }

    if (requestData.options.duplicateAction !== undefined) {
      const validActions = ['skip', 'update', 'error'];
      if (!validActions.includes(requestData.options.duplicateAction)) {
        return `Ação para duplicatas inválida. Valores permitidos: ${validActions.join(', ')}`;
      }
    }
  }

  return null;
}