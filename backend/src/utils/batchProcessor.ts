/**
 * Processador de importação em lote
 * 
 * Implementa a lógica de processamento de dados em lote para importação,
 * incluindo validação, normalização, criação/atualização de registros
 * e coleta de estatísticas e erros.
 */

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
import { logAudit } from '../utils/auditLog';
import { FieldValidationRules } from '../types/validation.types';

/**
 * Mapeia uma única linha para a entidade
 * Wrapper para mapFieldsToEntity que aceita uma única linha como objeto
 */
async function mapSingleRowToEntity(
  row: any,
  mappings: FieldMapping[],
  entityType: string,
  tenantId: string,
  userId?: string
): Promise<Record<string, any>> {
  // Converter objeto para array de valores baseado nos mapeamentos
  const rowArray: any[] = [];
  const maxColumnIndex = Math.max(...mappings.map(m => m.columnIndex));
  
  // Criar array com valores nas posições corretas
  for (let i = 0; i <= maxColumnIndex; i++) {
    // Se row é um objeto, tentar acessar por índice ou chave
    if (Array.isArray(row)) {
      rowArray[i] = row[i];
    } else if (typeof row === 'object' && row !== null) {
      // Tentar encontrar valor por índice de coluna ou por nome de campo
      const mapping = mappings.find(m => m.columnIndex === i);
      if (mapping) {
        rowArray[i] = row[mapping.fieldName] ?? row[i] ?? null;
      } else {
        rowArray[i] = row[i] ?? null;
      }
    } else {
      rowArray[i] = null;
    }
  }
  
  // Chamar mapFieldsToEntity com array de uma linha
  const mappedRows = await mapFieldsToEntity([rowArray], mappings, entityType, tenantId, userId);
  
  // Retornar apenas os dados mapeados da primeira (e única) linha
  return mappedRows[0]?.mappedData || {};
}

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

      // Interromper se exceder o tempo máximo (ex.: TIMEOUT_SYNC)
      if (checkTimeout(startTime, IMPORT_CONFIG.TIMEOUT_SYNC)) {
        stats.status = 'cancelled';
        break;
      }

      // Verificar uso de memória antes de processar o próximo batch
      checkMemoryUsage();

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

      // Sugerir GC entre batches (efetivo apenas se Node rodar com --expose-gc)
      releaseMemory();

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

    // Registrar auditoria (não bloqueia se falhar)
    logAudit(
      entityType as any,
      importId,
      'create',
      userId,
      tenantId,
      {
        totalRows: { new: stats.totalRows },
        processedRows: { new: stats.processedRows },
        successCount: { new: stats.successCount },
        errorCount: { new: stats.errorCount },
        durationMs: { new: stats.durationMs },
      }
    ).catch(() => {
      // Erro na auditoria não deve impedir o retorno do resultado
    });

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
  // Verificar token de cancelamento se fornecido
  if (cancellationToken?.isCancelled) {
    return {
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      duplicateCount: 0,
      errors: [],
      warnings: [],
    };
  }

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
  _options: ProcessOptions, // Prefixo _ indica intencionalmente não usado (pode ser usado no futuro)
  _entityConfig: ReturnType<typeof getEntityImportConfig> // Prefixo _ indica intencionalmente não usado
): Promise<BatchValidationResult> {
  // options e entityConfig podem ser usados no futuro para validações específicas
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
      const mappedRow = await mapSingleRowToEntity(row, mappings, entityType, tenantId, undefined);
      
      // Converter FieldMapping[] para Record<string, FieldValidationRules>
      const fieldRules: Record<string, FieldValidationRules> = {};
      for (const mapping of mappings) {
        fieldRules[mapping.fieldName] = {
          required: mapping.required,
          unique: mapping.unique,
        };
      }
      
      // Validar a linha
      const validationResult = await validateImportRow(
        mappedRow,
        entityType,
        fieldRules,
        tenantId,
        undefined, // userId opcional
        undefined // normalizationOptions opcional
      );

      if (!validationResult.isValid && validationResult.errors.length > 0) {
        // Adicionar erros de validação
        invalidRows.push({
          rowIndex,
          errors: validationResult.errors.map((error: any) => ({
            row: rowIndex,
            field: error.field,
            code: error.code,
            message: error.message,
            severity: error.severity || 'error',
            value: error.value,
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
  _mappings: FieldMapping[], // Prefixo _ indica intencionalmente não usado
  entityType: string,
  tenantId: string,
  userId: string,
  _options: ProcessOptions, // Prefixo _ indica intencionalmente não usado
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
      const mappedRow = await mapSingleRowToEntity(dup.originalRow, mappings, entityType, tenantId, userId);
      
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
  _userId: string // Prefixo _ indica intencionalmente não usado (pode ser usado para auditoria futura)
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
              } as any,
            });
            break;

          case 'company':
            createdRecord = await tx.company.create({
              data: ({
                ...entityData,
                tenantId,
              }) as any,
            });
            break;

          case 'lead':
            createdRecord = await tx.lead.create({
              data: {
                ...entityData,
                tenantId,
              } as any,
            });
            break;

          case 'opportunity':
            createdRecord = await tx.opportunity.create({
              data: {
                ...entityData,
                tenantId,
              } as any,
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
 * @deprecated Esta função não está sendo usada atualmente
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars

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

    // Construir where clause dinâmico
    const whereClause: any = {
      tenantId,
      [uniqueField]: uniqueValue,
    };

    switch (entityType.toLowerCase()) {
      case 'contact': {
        const existing = await tx.contact.findFirst({ where: whereClause });
        if (existing) {
          updatedRecord = await tx.contact.update({
            where: { id: existing.id },
            data: updateData,
          });
        } else {
          updatedRecord = await tx.contact.create({
            data: {
              ...updateData,
              tenantId,
            },
          });
        }
        break;
      }

      case 'company': {
        const existing = await tx.company.findFirst({ where: whereClause });
        if (existing) {
          updatedRecord = await tx.company.update({
            where: { id: existing.id },
            data: updateData,
          });
        } else {
          updatedRecord = await tx.company.create({
            data: {
              ...updateData,
              tenantId,
            },
          });
        }
        break;
      }

      case 'lead': {
        const existing = await tx.lead.findFirst({ where: whereClause });
        if (existing) {
          updatedRecord = await tx.lead.update({
            where: { id: existing.id },
            data: updateData,
          });
        } else {
          updatedRecord = await tx.lead.create({
            data: {
              ...updateData,
              tenantId,
            },
          });
        }
        break;
      }

      case 'opportunity': {
        const existing = await tx.opportunity.findFirst({ where: whereClause });
        if (existing) {
          updatedRecord = await tx.opportunity.update({
            where: { id: existing.id },
            data: updateData,
          });
        } else {
          updatedRecord = await tx.opportunity.create({
            data: {
              ...updateData,
              tenantId,
            },
          });
        }
        break;
      }

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
 * @deprecated Esta função não está sendo usada atualmente
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars

/**
 * Atualiza registros existentes com controle de versão otimista
 * @deprecated Esta função não está sendo usada atualmente
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
 * Verifica uso de memória e lança erro se exceder o limite configurado.
 * Chamada antes de cada batch em processImportBatch para evitar OOM.
 */
function checkMemoryUsage(): void {
  const usage = process.memoryUsage();
  if (usage.heapUsed > IMPORT_CONFIG.MEMORY_LIMIT) {
    throw new Error(`Limite de memória excedido: ${usage.heapUsed} bytes`);
  }
}

/**
 * Tenta liberar memória entre batches.
 * Só tem efeito se o Node estiver rodando com --expose-gc; caso contrário é no-op.
 */
function releaseMemory(): void {
  if (global.gc) {
    global.gc();
  }
}

/**
 * Verifica se o tempo decorrido desde startTime ultrapassou maxDuration (ms).
 * Usado no loop de batches para interromper importações que excedem TIMEOUT_SYNC.
 */
function checkTimeout(startTime: Date, maxDuration: number): boolean {
  return (Date.now() - startTime.getTime()) > maxDuration;
}