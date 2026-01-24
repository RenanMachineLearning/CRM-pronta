/**
 * Processador de importação em lote
 * 
 * Implementa a lógica de processamento de dados em lote para importação,
 * incluindo validação, normalização, criação/atualização de registros
 * e coleta de estatísticas e erros.
 */

import { Prisma, Contact, Company, Lead, Opportunity } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { 
  ProcessImportResult, 
  ImportError, 
  ImportWarning, 
  ProcessOptions, 
  FieldMapping,
  BatchValidationResult,
  ProcessingStats,
  CancellationToken
} from '../types/importProcessing.types';
import { IMPORT_CONFIG, getEntityImportConfig } from '../config/importConfig';
import { validateImportRow } from '../utils/importValidator';
import { normalizeValue } from '../utils/valueNormalizer';
import { mapFieldsToEntity } from '../utils/fieldMapper';
// import { createAuditLog } from '../services/auditLogService'; // Temporarily commented out due to build errors

// Interface para dados de criação de entidade
interface EntityCreationData {
  tenantId: string;
  userId: string;
  [key: string]: any;
}

/**
 * Processa um batch de dados de importação
 */
export async function processImportBatch(
  rows: any[],
  mappings: FieldMapping[],
  entityType: string,
  tenantId: string,
  userId: string,
  options: ProcessOptions = {},
  cancellationToken?: CancellationToken
): Promise<ProcessImportResult> {
  const startTime = new Date();
  const importId = generateImportId();

  // Verificar limites de segurança antes de começar
  if (rows.length > IMPORT_CONFIG.MAX_ROWS_PER_IMPORT) {
    throw new Error(`Número de linhas excede o limite permitido: ${IMPORT_CONFIG.MAX_ROWS_PER_IMPORT}`);
  }

  // Inicializar estatísticas
  const stats: ProcessingStats = {
    totalRows: rows.length,
    processedRows: 0,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    duplicateCount: 0,
    startTime,
    peakMemoryUsage: getPeakMemoryUsage(),
  };

  // Inicializar coletores de erros e avisos
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  try {
    // Validar configurações
    validateBatchConfiguration(rows, mappings, entityType, options);

    // Obter configurações específicas da entidade
    const entityConfig = getEntityImportConfig(entityType);
    
    // Dividir linhas em batches menores se necessário
    const batchSize = Math.min(
      options.batchSize || IMPORT_CONFIG.BATCH_SIZE,
      entityConfig.maxBatchSize,
      IMPORT_CONFIG.MAX_BATCH_SIZE
    );
    
    const batches = createBatches(rows, batchSize);
    
    // Processar cada batch
    for (const [batchIndex, batch] of batches.entries()) {
      // Verificar token de cancelamento
      if (cancellationToken?.isCancelled) {
        stats.status = 'cancelled';
        break;
      }

      // Processar batch individual
      const batchResult = await processSingleBatch(
        batch,
        batchIndex * batchSize,
        mappings,
        entityType,
        tenantId,
        userId,
        options,
        entityConfig,
        cancellationToken
      );

      // Atualizar estatísticas
      stats.successCount += batchResult.successCount;
      stats.errorCount += batchResult.errorCount;
      stats.skippedCount += batchResult.skippedCount;
      stats.duplicateCount += batchResult.duplicateCount;
      stats.processedRows += batch.length;

      // Adicionar erros e avisos
      errors.push(...batchResult.errors);
      warnings.push(...batchResult.warnings);

      // Verificar limites de erros
      if (errors.length >= IMPORT_CONFIG.MAX_ERRORS_PER_IMPORT) {
        break;
      }
    }

    // Calcular métricas finais
    const endTime = new Date();
    stats.endTime = endTime;
    stats.durationMs = endTime.getTime() - startTime.getTime();
    if (stats.processedRows > 0 && stats.durationMs > 0) {
      stats.recordsPerSecond = Math.round((stats.processedRows / stats.durationMs) * 1000);
    }

    // Registrar auditoria - função não disponível no momento
    // await createAuditLog({
    //   tenantId,
    //   userId,
    //   action: 'IMPORT',
    //   entity: entityType,
    //   entityId: importId,
    //   details: {
    //     totalRows: stats.totalRows,
    //     processedRows: stats.processedRows,
    //     successCount: stats.successCount,
    //     errorCount: stats.errorCount,
    //     durationMs: stats.durationMs,
    //   },
    // });

    return {
      importId,
      totalRows: stats.totalRows,
      successCount: stats.successCount,
      errorCount: stats.errorCount,
      skippedCount: stats.skippedCount,
      duplicateCount: stats.duplicateCount,
      processedCount: stats.processedRows,
      errors,
      warnings,
      processingTime: stats.durationMs || 0,
      status: cancellationToken?.isCancelled ? 'cancelled' : 
              (stats.errorCount === 0 ? 'completed' : 
              (stats.successCount > 0 ? 'partial' : 'failed')),
    };
  } catch (error) {
    // Em caso de erro crítico, retornar resultado com erro
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    
    const criticalError: ImportError = {
      row: -1,
      code: 'CRITICAL_ERROR',
      message: `Erro crítico durante o processamento: ${(error as Error).message}`,
      severity: 'error',
    };

    return {
      importId,
      totalRows: stats.totalRows,
      successCount: 0,
      errorCount: 1,
      skippedCount: stats.totalRows,
      duplicateCount: 0,
      processedCount: 0,
      errors: [criticalError],
      warnings: [],
      processingTime: durationMs,
      status: 'failed',
    };
  }
}

/**
 * Processa um único batch de dados
 */
async function processSingleBatch(
  batch: any[],
  startIndex: number,
  mappings: FieldMapping[],
  entityType: string,
  tenantId: string,
  userId: string,
  options: ProcessOptions,
  entityConfig: ReturnType<typeof getEntityImportConfig>,
  cancellationToken?: CancellationToken
): Promise<{
  successCount: number;
  errorCount: number;
  skippedCount: number;
  duplicateCount: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}> {
  const result = {
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    duplicateCount: 0,
    errors: [] as ImportError[],
    warnings: [] as ImportWarning[],
  };

  // Validar e normalizar o batch
  const validationResult = await validateAndNormalizeBatch(
    batch,
    startIndex,
    mappings,
    entityType,
    tenantId,
    options,
    entityConfig
  );

  // Separar linhas válidas e inválidas
  const validRows = validationResult.validRows;
  const invalidRows = validationResult.invalidRows;
  result.warnings.push(...validationResult.warnings);

  // Processar linhas inválidas
  for (const invalidRow of invalidRows) {
    result.errorCount += invalidRow.errors.length;
    result.errors.push(
      ...invalidRow.errors.map(error => ({
        ...error,
        row: error.row + startIndex // Ajustar número da linha
      }))
    );
    
    if (options.skipErrors) {
      result.skippedCount++;
    } else {
      // Se não for para pular erros, adicionar à contagem de erros
      continue;
    }
  }

  // Se não houver linhas válidas, retornar resultados parciais
  if (validRows.length === 0) {
    return result;
  }

  // Processar linhas válidas
  try {
    // Verificar duplicatas se necessário
    if (options.validateUniqueness !== false && entityConfig.validateUniqueness) {
      const duplicates = await checkForDuplicates(validRows, mappings, entityType, tenantId);
      
      if (duplicates.length > 0) {
        result.duplicateCount += duplicates.length;
        
        if (options.continueOnDuplicate === false) {
          // Se não for para continuar com duplicatas, tratar como erros
          for (const dup of duplicates) {
            const duplicateError: ImportError = {
              row: dup.rowIndex + startIndex,
              code: 'DUPLICATE_KEY',
              message: `Registro duplicado encontrado: ${dup.field} = ${dup.value}`,
              severity: 'error',
              field: dup.field,
              value: dup.value,
              originalRow: dup.originalRow,
            };
            result.errors.push(duplicateError);
            result.errorCount++;
          }
          
          // Remover duplicatas das linhas válidas
          const duplicateIndices = new Set(duplicates.map(d => d.rowIndex));
          const filteredValidRows = validRows.filter((_, idx) => !duplicateIndices.has(idx));
          
          if (filteredValidRows.length === 0) {
            return result;
          }
          
          // Prosseguir com linhas filtradas
          await processValidRows(filteredValidRows, mappings, entityType, tenantId, userId, options, result);
        } else {
          // Se for para continuar com duplicatas, tratar de acordo com a ação especificada
          const duplicateAction = options.duplicateAction || 'error';
          
          switch (duplicateAction) {
            case 'skip':
              result.skippedCount += duplicates.length;
              // Remover duplicatas das linhas válidas
              const duplicateIndices = new Set(duplicates.map(d => d.rowIndex));
              const filteredValidRows = validRows.filter((_, idx) => !duplicateIndices.has(idx));
              await processValidRows(filteredValidRows, mappings, entityType, tenantId, userId, options, result);
              break;
              
            case 'update':
              // Atualizar registros existentes
              await updateExistingRecords(duplicates, mappings, entityType, tenantId, userId, result);
              // Processar registros não duplicados
              const nonDuplicateIndices = new Set(duplicates.map(d => d.rowIndex));
              const nonDuplicateRows = validRows.filter((_, idx) => !nonDuplicateIndices.has(idx));
              await processValidRows(nonDuplicateRows, mappings, entityType, tenantId, userId, options, result);
              break;
              
            case 'error':
            default:
              for (const dup of duplicates) {
                const duplicateError: ImportError = {
                  row: dup.rowIndex + startIndex,
                  code: 'DUPLICATE_KEY',
                  message: `Registro duplicado encontrado: ${dup.field} = ${dup.value}`,
                  severity: 'error',
                  field: dup.field,
                  value: dup.value,
                  originalRow: dup.originalRow,
                };
                result.errors.push(duplicateError);
                result.errorCount++;
              }
              // Prosseguir com linhas válidas (mesmo com duplicatas)
              await processValidRows(validRows, mappings, entityType, tenantId, userId, options, result);
              break;
          }
        }
      } else {
        // Nenhuma duplicata encontrada, processar todas as linhas válidas
        await processValidRows(validRows, mappings, entityType, tenantId, userId, options, result);
      }
    } else {
      // Validação de unicidade desabilitada, processar todas as linhas válidas
      await processValidRows(validRows, mappings, entityType, tenantId, userId, options, result);
    }
  } catch (error) {
    // Em caso de erro ao processar o batch, tratar como erros
    for (const [idx, row] of validRows.entries()) {
      const batchError: ImportError = {
        row: idx + startIndex,
        code: 'BATCH_PROCESSING_ERROR',
        message: `Erro ao processar linha: ${(error as Error).message}`,
        severity: 'error',
        originalRow: row,
      };
      result.errors.push(batchError);
      result.errorCount++;
    }
  }

  return result;
}

/**
 * Valida e normaliza um batch de dados
 */
async function validateAndNormalizeBatch(
  batch: any[],
  startIndex: number,
  mappings: FieldMapping[],
  entityType: string,
  tenantId: string,
  options: ProcessOptions,
  entityConfig: ReturnType<typeof getEntityImportConfig>
): Promise<BatchValidationResult> {
  const validRows: any[] = [];
  const invalidRows: Array<{
    rowIndex: number;
    errors: ImportError[];
    originalRow: any;
  }> = [];
  const warnings: ImportWarning[] = [];

  // Processar cada linha do batch
  for (let i = 0; i < batch.length; i++) {
    const row = batch[i];
    const rowIndex = startIndex + i;

    try {
      // Mapear campos da linha
      const mappedRow = mapFieldsToEntity(row, mappings, entityType);
      
      // Validar a linha
      const validationErrors = await validateImportRow(
        mappedRow,
        entityType,
        mappings,
        tenantId,
        options
      );

      if (validationErrors.length > 0) {
        // Adicionar erros de validação
        invalidRows.push({
          rowIndex,
          errors: validationErrors.map(error => ({
            ...error,
            row: rowIndex,
          })),
          originalRow: row,
        });
      } else {
        // Linha válida, adicionar às linhas válidas
        // Normalizar valores
        const normalizedRow = normalizeRowValues(mappedRow, mappings);
        validRows.push(normalizedRow);
      }
    } catch (error) {
      // Erro ao mapear ou validar a linha
      const rowError: ImportError = {
        row: rowIndex,
        code: 'ROW_PROCESSING_ERROR',
        message: `Erro ao processar linha: ${(error as Error).message}`,
        severity: 'error',
        originalRow: row,
      };
      
      invalidRows.push({
        rowIndex,
        errors: [rowError],
        originalRow: row,
      });
    }
  }

  return { validRows, invalidRows, warnings };
}

/**
 * Normaliza os valores de uma linha
 */
function normalizeRowValues(row: any, mappings: FieldMapping[]): any {
  const normalizedRow = { ...row };
  
  for (const mapping of mappings) {
    const fieldName = mapping.fieldName;
    if (normalizedRow[fieldName] !== undefined) {
      normalizedRow[fieldName] = normalizeValue(normalizedRow[fieldName], fieldName);
    }
  }
  
  return normalizedRow;
}

/**
 * Processa linhas válidas (cria registros)
 */
async function processValidRows(
  validRows: any[],
  mappings: FieldMapping[],
  entityType: string,
  tenantId: string,
  userId: string,
  options: ProcessOptions,
  result: {
    successCount: number;
    errorCount: number;
    skippedCount: number;
    duplicateCount: number;
    errors: ImportError[];
    warnings: ImportWarning[];
  }
) {
  if (validRows.length === 0) return;

  try {
    // Converter linhas para dados de entidade
    const entityDataList = validRows.map(row => ({
      ...row,
      tenantId,
      userId, // Adicionando userId para auditoria
    }));

    // Criar registros em lote
    const createdRecords = await createRecordsInBatch(
      entityDataList,
      entityType,
      tenantId,
      userId
    );

    result.successCount += createdRecords.length;
  } catch (error) {
    // Em caso de erro ao criar registros, tratar como erros
    for (const [idx, row] of validRows.entries()) {
      const creationError: ImportError = {
        row: idx,
        code: 'RECORD_CREATION_ERROR',
        message: `Erro ao criar registro: ${(error as Error).message}`,
        severity: 'error',
        originalRow: row,
      };
      result.errors.push(creationError);
      result.errorCount++;
    }
  }
}

/**
 * Coleção abrangente de erros e estatísticas
 */
class ErrorCollector {
  private errors: ImportError[] = [];
  private warnings: ImportWarning[] = [];
  private stats: ProcessingStats;
  private readonly maxErrors: number;
  private readonly maxWarnings: number;

  constructor(initialStats: ProcessingStats, maxErrors?: number, maxWarnings?: number) {
    this.stats = { ...initialStats };
    this.maxErrors = maxErrors || IMPORT_CONFIG.MAX_ERRORS_PER_IMPORT;
    this.maxWarnings = maxWarnings || IMPORT_CONFIG.MAX_WARNINGS_PER_IMPORT;
  }

  addError(error: ImportError): void {
    if (this.errors.length < this.maxErrors) {
      this.errors.push(error);
      this.stats.errorCount++;
    } else {
      // Quando atinge o limite de erros, adicionar um erro indicando que há mais
      if (!this.errors.some(e => e.code === 'ERROR_LIMIT_EXCEEDED')) {
        this.errors.push({
          row: -1,
          code: 'ERROR_LIMIT_EXCEEDED',
          message: `Limite de ${this.maxErrors} erros atingido. Mais erros podem existir.`,
          severity: 'error',
        });
      }
    }
  }

  addWarning(warning: ImportWarning): void {
    if (this.warnings.length < this.maxWarnings) {
      this.warnings.push(warning);
      this.stats.errorCount++; // Avisos também contam como problemas
    } else {
      // Quando atinge o limite de avisos, adicionar um aviso indicando que há mais
      if (!this.warnings.some(w => w.code === 'WARNING_LIMIT_EXCEEDED')) {
        this.warnings.push({
          row: -1,
          code: 'WARNING_LIMIT_EXCEEDED',
          message: `Limite de ${this.maxWarnings} avisos atingido. Mais avisos podem existir.`,
          field: 'system',
        });
      }
    }
  }

  incrementSuccessCount(count: number = 1): void {
    this.stats.successCount += count;
  }

  incrementSkippedCount(count: number = 1): void {
    this.stats.skippedCount += count;
  }

  incrementDuplicateCount(count: number = 1): void {
    this.stats.duplicateCount += count;
  }

  updateProcessedCount(count: number = 1): void {
    this.stats.processedRows += count;
  }

  getErrors(): ImportError[] {
    return [...this.errors]; // Retornar cópia
  }

  getWarnings(): ImportWarning[] {
    return [...this.warnings]; // Retornar cópia
  }

  getStats(): ProcessingStats {
    return { ...this.stats }; // Retornar cópia
  }

  hasReachedErrorLimit(): boolean {
    return this.errors.length >= this.maxErrors;
  }

  getTotalIssues(): number {
    return this.errors.length + this.warnings.length;
  }

  /**
   * Gera um relatório detalhado de erros e estatísticas
   */
  generateReport(): ProcessImportResult {
    const endTime = new Date();
    this.stats.endTime = endTime;
    if (this.stats.startTime) {
      this.stats.durationMs = endTime.getTime() - this.stats.startTime.getTime();
      if (this.stats.processedRows > 0 && this.stats.durationMs > 0) {
        this.stats.recordsPerSecond = Math.round((this.stats.processedRows / this.stats.durationMs) * 1000);
      }
    }

    return {
      importId: this.stats.hasOwnProperty('importId') ? (this.stats as any).importId : generateImportId(),
      totalRows: this.stats.totalRows,
      successCount: this.stats.successCount,
      errorCount: this.stats.errorCount,
      skippedCount: this.stats.skippedCount,
      duplicateCount: this.stats.duplicateCount,
      processedCount: this.stats.processedRows,
      errors: this.getErrors(),
      warnings: this.getWarnings(),
      processingTime: this.stats.durationMs || 0,
      status: this.stats.errorCount === 0 ? 'completed' :
              (this.stats.successCount > 0 ? 'partial' : 'failed'),
    };
  }
}

/**
 * Função auxiliar para coletar erros de forma padronizada
 */
function collectError(
  collector: ErrorCollector,
  rowIndex: number,
  errorCode: string,
  message: string,
  severity: 'error' | 'warning' | 'info' = 'error',
  field?: string,
  value?: any,
  originalRow?: any
): void {
  const error: ImportError = {
    row: rowIndex,
    field,
    code: errorCode,
    message,
    severity,
    value,
    originalRow,
  };

  if (severity === 'error' || severity === 'info') {
    collector.addError(error);
  } else {
    collector.addWarning({
      ...error,
      code: errorCode,
    } as ImportWarning);
  }
}

/**
 * Atualiza registros existentes
 */
async function updateExistingRecords(
  duplicates: Array<{ rowIndex: number; field: string; value: any; originalRow: any }>,
  mappings: FieldMapping[],
  entityType: string,
  tenantId: string,
  userId: string,
  result: {
    successCount: number;
    errorCount: number;
    skippedCount: number;
    duplicateCount: number;
    errors: ImportError[];
    warnings: ImportWarning[];
  }
) {
  // Implementação para atualizar registros existentes
  // Esta é uma implementação básica - pode ser expandida conforme necessário
  for (const dup of duplicates) {
    try {
      // Mapear campos da linha duplicada
      const mappedRow = mapFieldsToEntity(dup.originalRow, mappings, entityType);
      
      // Normalizar valores
      const normalizedRow = normalizeRowValues(mappedRow, mappings);
      
      // Atualizar registro existente
      await updateRecordByUniqueField(
        normalizedRow,
        dup.field,
        dup.value,
        entityType,
        tenantId,
        userId
      );
      
      result.successCount++; // Considerar atualização como sucesso
    } catch (error) {
      const updateError: ImportError = {
        row: dup.rowIndex,
        code: 'RECORD_UPDATE_ERROR',
        message: `Erro ao atualizar registro existente: ${(error as Error).message}`,
        severity: 'error',
        originalRow: dup.originalRow,
      };
      result.errors.push(updateError);
      result.errorCount++;
    }
  }
}

/**
 * Cria registros em lote com verificações de segurança
 */
async function createRecordsInBatch(
  entityDataList: EntityCreationData[],
  entityType: string,
  tenantId: string,
  userId: string
): Promise<any[]> {
  if (entityDataList.length === 0) {
    return [];
  }

  // Verificar limite de criação por batch
  if (entityDataList.length > IMPORT_CONFIG.MAX_BATCH_SIZE) {
    throw new Error(`Número de registros excede o limite por batch: ${IMPORT_CONFIG.MAX_BATCH_SIZE}`);
  }

  // Criar transação para garantir atomicidade
  return prisma.$transaction(async (tx) => {
    const createdRecords = [];

    // Processar registros individualmente para melhor controle de erros
    for (const [index, entityData] of entityDataList.entries()) {
      try {
        let createdRecord;

        switch (entityType.toLowerCase()) {
          case 'contact':
            createdRecord = await tx.contact.create({
              data: {
                ...entityData,
                tenantId,
                userId,
              },
            });
            break;

          case 'company':
            createdRecord = await tx.company.create({
              data: {
                ...entityData,
                tenantId,
                userId,
              },
            });
            break;

          case 'lead':
            createdRecord = await tx.lead.create({
              data: {
                ...entityData,
                tenantId,
                userId,
              },
            });
            break;

          case 'opportunity':
            createdRecord = await tx.opportunity.create({
              data: {
                ...entityData,
                tenantId,
                userId,
              },
            });
            break;

          default:
            throw new Error(`Tipo de entidade não suportado: ${entityType}`);
        }

        createdRecords.push(createdRecord);
      } catch (error) {
        // Em caso de erro ao criar um registro, lançar com contexto
        throw new Error(`Erro ao criar registro na posição ${index}: ${(error as Error).message}`);
      }
    }

    return createdRecords;
  }, {
    // Configurações de transação para segurança
    timeout: IMPORT_CONFIG.TIMEOUT_BATCH,
    maxWait: IMPORT_CONFIG.TIMEOUT_BATCH,
    isolationLevel: 'ReadCommitted', // Nível de isolamento para concorrência
  });
}

/**
 * Cria registros em lote usando createMany (mais eficiente para grandes volumes)
 */
async function createRecordsInBatchOptimized(
  entityDataList: EntityCreationData[],
  entityType: string,
  tenantId: string,
  userId: string
): Promise<any[]> {
  if (entityDataList.length === 0) {
    return [];
  }

  // Verificar limite de criação por batch
  if (entityDataList.length > IMPORT_CONFIG.MAX_BATCH_SIZE) {
    throw new Error(`Número de registros excede o limite por batch: ${IMPORT_CONFIG.MAX_BATCH_SIZE}`);
  }

  // Adicionar campos comuns a todos os registros
  const recordsWithCommonFields = entityDataList.map(data => ({
    ...data,
    tenantId,
    userId,
  }));

  try {
    let createdRecords;

    switch (entityType.toLowerCase()) {
      case 'contact':
        createdRecords = await prisma.contact.createMany({
          data: recordsWithCommonFields as any,
          skipDuplicates: true, // Ignorar duplicatas
        });
        break;

      case 'company':
        createdRecords = await prisma.company.createMany({
          data: recordsWithCommonFields as any,
          skipDuplicates: true, // Ignorar duplicatas
        });
        break;

      case 'lead':
        createdRecords = await prisma.lead.createMany({
          data: recordsWithCommonFields as any,
          skipDuplicates: true, // Ignorar duplicatas
        });
        break;

      case 'opportunity':
        createdRecords = await prisma.opportunity.createMany({
          data: recordsWithCommonFields as any,
          skipDuplicates: true, // Ignorar duplicatas
        });
        break;

      default:
        throw new Error(`Tipo de entidade não suportado para createMany: ${entityType}`);
    }

    // Para createMany, retornamos o número de registros criados
    // Em vez dos registros em si, pois createMany não retorna os dados
    return Array(createdRecords.count).fill({}); // Placeholder - precisaremos buscar os registros criados
  } catch (error) {
    // Em caso de erro, tentar criar registros individualmente para identificar o problema
    console.warn(`createMany falhou para ${entityType}, revertendo para criação individual:`, error);
    return createRecordsInBatch(entityDataList, entityType, tenantId, userId);
  }
}

/**
 * Atualiza registro por campo único com controle de concorrência
 */
async function updateRecordByUniqueField(
  entityData: any,
  uniqueField: string,
  uniqueValue: any,
  entityType: string,
  tenantId: string,
  userId: string
): Promise<any> {
  // Atualizar transação para garantir atomicidade e controle de concorrência
  return prisma.$transaction(async (tx) => {
    let updatedRecord;

    // Adicionar timestamp de atualização e usuário
    const updateData = {
      ...entityData,
      updatedAt: new Date(),
      updatedBy: userId, // Adicionando usuário que atualizou
    };

    switch (entityType.toLowerCase()) {
      case 'contact':
        // Usar upsert para criar ou atualizar
        updatedRecord = await tx.contact.upsert({
          where: {
            // Criar condição única com tenantId e campo único
            [`${uniqueField}_tenantId`]: {
              [uniqueField]: uniqueValue,
              tenantId,
            } as any,
          },
          update: updateData,
          create: {
            ...updateData,
            tenantId,
            userId, // Usuário que criou (também)
          },
        });
        break;

      case 'company':
        updatedRecord = await tx.company.upsert({
          where: {
            [`${uniqueField}_tenantId`]: {
              [uniqueField]: uniqueValue,
              tenantId,
            } as any,
          },
          update: updateData,
          create: {
            ...updateData,
            tenantId,
            userId,
          },
        });
        break;

      case 'lead':
        updatedRecord = await tx.lead.upsert({
          where: {
            [`${uniqueField}_tenantId`]: {
              [uniqueField]: uniqueValue,
              tenantId,
            } as any,
          },
          update: updateData,
          create: {
            ...updateData,
            tenantId,
            userId,
          },
        });
        break;

      case 'opportunity':
        updatedRecord = await tx.opportunity.upsert({
          where: {
            [`${uniqueField}_tenantId`]: {
              [uniqueField]: uniqueValue,
              tenantId,
            } as any,
          },
          update: updateData,
          create: {
            ...updateData,
            tenantId,
            userId,
          },
        });
        break;

      default:
        throw new Error(`Tipo de entidade não suportado para atualização: ${entityType}`);
    }

    return updatedRecord;
  }, {
    // Configurações de transação para controle de concorrência
    timeout: IMPORT_CONFIG.TIMEOUT_BATCH,
    maxWait: IMPORT_CONFIG.TIMEOUT_BATCH,
    isolationLevel: 'ReadCommitted',
  });
}

/**
 * Atualiza múltiplos registros em lote com controle de concorrência
 */
async function updateRecordsInBatch(
  updates: Array<{
    entityData: any;
    uniqueField: string;
    uniqueValue: any
  }>,
  entityType: string,
  tenantId: string,
  userId: string
): Promise<{ success: number; errors: Array<{ index: number; error: Error }> }> {
  if (updates.length === 0) {
    return { success: 0, errors: [] };
  }

  let successCount = 0;
  const errors: Array<{ index: number; error: Error }> = [];

  // Processar atualizações individualmente para melhor controle de erros
  for (const [index, update] of updates.entries()) {
    try {
      await updateRecordByUniqueField(
        update.entityData,
        update.uniqueField,
        update.uniqueValue,
        entityType,
        tenantId,
        userId
      );
      successCount++;
    } catch (error) {
      errors.push({ index, error: error as Error });
    }
  }

  return { success: successCount, errors };
}

/**
 * Atualiza registros existentes com controle de versão otimista
 */
async function updateExistingRecordsWithConcurrencyControl(
  duplicates: Array<{ rowIndex: number; field: string; value: any; originalRow: any }>,
  mappings: FieldMapping[],
  entityType: string,
  tenantId: string,
  userId: string,
  result: {
    successCount: number;
    errorCount: number;
    skippedCount: number;
    duplicateCount: number;
    errors: ImportError[];
    warnings: ImportWarning[];
  }
) {
  // Implementação para atualizar registros existentes com controle de concorrência
  for (const dup of duplicates) {
    try {
      // Mapear campos da linha duplicada
      const mappedRow = mapFieldsToEntity(dup.originalRow, mappings, entityType);

      // Normalizar valores
      const normalizedRow = normalizeRowValues(mappedRow, mappings);

      // Atualizar registro existente com controle de concorrência
      const updatedRecord = await updateRecordByUniqueField(
        normalizedRow,
        dup.field,
        dup.value,
        entityType,
        tenantId,
        userId
      );

      result.successCount++; // Considerar atualização como sucesso

      // Adicionar aviso sobre atualização
      result.warnings.push({
        row: dup.rowIndex,
        field: dup.field,
        code: 'RECORD_UPDATED',
        message: `Registro existente atualizado: ${dup.field} = ${dup.value}`,
        value: dup.value,
      });
    } catch (error) {
      const updateError: ImportError = {
        row: dup.rowIndex,
        code: 'RECORD_UPDATE_ERROR',
        message: `Erro ao atualizar registro existente: ${(error as Error).message}`,
        severity: 'error',
        originalRow: dup.originalRow,
      };
      result.errors.push(updateError);
      result.errorCount++;
    }
  }
}

/**
 * Verifica duplicatas em um batch
 */
async function checkForDuplicates(
  validRows: any[],
  mappings: FieldMapping[],
  entityType: string,
  tenantId: string
): Promise<Array<{ rowIndex: number; field: string; value: any; originalRow: any }>> {
  const duplicates: Array<{ rowIndex: number; field: string; value: any; originalRow: any }> = [];
  
  // Obter campos únicos do mapeamento
  const uniqueFields = mappings.filter(m => m.unique).map(m => m.fieldName);
  
  if (uniqueFields.length === 0) {
    return duplicates; // Nenhum campo único para verificar
  }
  
  // Verificar cada campo único
  for (const uniqueField of uniqueFields) {
    // Extrair valores únicos do campo
    const valuesToCheck = validRows
      .map((row, idx) => ({ value: row[uniqueField], rowIndex: idx, originalRow: row }))
      .filter(item => item.value !== undefined && item.value !== null);
    
    if (valuesToCheck.length === 0) continue;
    
    // Verificar existência no banco de dados
    const existingRecords = await findExistingByUniqueFields(uniqueField, valuesToCheck.map(v => v.value), entityType, tenantId);
    const existingValues = new Set(existingRecords.map(r => r[uniqueField]));
    
    // Identificar duplicatas
    for (const item of valuesToCheck) {
      if (existingValues.has(item.value)) {
        duplicates.push({
          rowIndex: item.rowIndex,
          field: uniqueField,
          value: item.value,
          originalRow: item.originalRow,
        });
      }
    }
  }
  
  return duplicates;
}

/**
 * Encontra registros existentes por campos únicos
 */
async function findExistingByUniqueFields(
  uniqueField: string,
  values: any[],
  entityType: string,
  tenantId: string
): Promise<any[]> {
  let existingRecords: any[] = [];
  
  switch (entityType.toLowerCase()) {
    case 'contact':
      existingRecords = await prisma.contact.findMany({
        where: {
          tenantId,
          [uniqueField]: { in: values },
        },
        select: { [uniqueField]: true },
      });
      break;
      
    case 'company':
      existingRecords = await prisma.company.findMany({
        where: {
          tenantId,
          [uniqueField]: { in: values },
        },
        select: { [uniqueField]: true },
      });
      break;
      
    case 'lead':
      existingRecords = await prisma.lead.findMany({
        where: {
          tenantId,
          [uniqueField]: { in: values },
        },
        select: { [uniqueField]: true },
      });
      break;
      
    case 'opportunity':
      existingRecords = await prisma.opportunity.findMany({
        where: {
          tenantId,
          [uniqueField]: { in: values },
        },
        select: { [uniqueField]: true },
      });
      break;
  }
  
  return existingRecords;
}

/**
 * Divide linhas em batches menores
 */
function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  return batches;
}

/**
 * Valida configurações do batch
 */
function validateBatchConfiguration(
  rows: any[],
  mappings: FieldMapping[],
  entityType: string,
  options: ProcessOptions
): void {
  // Validar número de linhas
  if (rows.length > IMPORT_CONFIG.MAX_ROWS_PER_IMPORT) {
    throw new Error(`Número de linhas excede o limite permitido: ${IMPORT_CONFIG.MAX_ROWS_PER_IMPORT}`);
  }
  
  // Validar tamanho do batch
  const batchSize = options.batchSize || IMPORT_CONFIG.BATCH_SIZE;
  if (batchSize < IMPORT_CONFIG.MIN_BATCH_SIZE || batchSize > IMPORT_CONFIG.MAX_BATCH_SIZE) {
    throw new Error(
      `Tamanho do batch fora dos limites permitidos: ${IMPORT_CONFIG.MIN_BATCH_SIZE}-${IMPORT_CONFIG.MAX_BATCH_SIZE}`
    );
  }
  
  // Validar tipo de entidade
  const validEntityTypes = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task', 'Note'];
  if (!validEntityTypes.includes(entityType)) {
    throw new Error(`Tipo de entidade não suportado: ${entityType}`);
  }
  
  // Validar mapeamentos
  if (!mappings || mappings.length === 0) {
    throw new Error('Mapeamentos são obrigatórios para processamento de importação');
  }
  
  // Validar opções
  if (options.batchSize && (options.batchSize < 1 || options.batchSize > IMPORT_CONFIG.MAX_BATCH_SIZE)) {
    throw new Error(`Tamanho do batch inválido: ${options.batchSize}`);
  }
}

/**
 * Gera ID único para importação
 */
function generateImportId(): string {
  return `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtém o uso de memória pico
 */
function getPeakMemoryUsage(): number {
  const usage = process.memoryUsage();
  return usage.heapUsed;
}

/**
 * Verifica uso de memória e lança erro se exceder o limite
 */
function checkMemoryUsage(): void {
  const usage = process.memoryUsage();
  if (usage.heapUsed > IMPORT_CONFIG.MEMORY_LIMIT) {
    throw new Error(`Limite de memória excedido: ${usage.heapUsed} bytes`);
  }
}

/**
 * Função para liberar memória entre batches
 */
function releaseMemory(): void {
  // Forçar garbage collection se disponível
  if (global.gc) {
    global.gc();
  }
}

/**
 * Função para verificar timeout de processamento
 */
function checkTimeout(startTime: Date, maxDuration: number): boolean {
  return (Date.now() - startTime.getTime()) > maxDuration;
}