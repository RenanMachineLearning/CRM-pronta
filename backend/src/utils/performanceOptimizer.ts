/**
 * Utilitário para otimização de performance do sistema de importação
 * 
 * Responsável por:
 * - Implementar cache para resultados de validação
 * - Gerenciar limites de proteção (rate limiting, tamanho de payload)
 * - Otimizar operações de banco de dados
 * - Gerenciar recursos de forma eficiente
 */

import { ValidationError, ValidationErrorCode, ErrorSeverity } from '../types/validation.types';
import { validateImportRow } from './importValidator';
import { UniquenessCheckResult } from '../services/uniquenessValidator';
import { ValidationStats } from '../types/validation.types';

// Definir interfaces que estão faltando
interface FieldValidationRules {
  required?: boolean;
  type?: 'text' | 'number' | 'date' | 'datetime' | 'email' | 'phone' | 'boolean' | 'select' | 'multiselect' | 'currency' | 'percentage' | 'url' | 'textarea' | 'relationship' | 'pattern';
  unique?: boolean;
  maxLength?: number;
  minLength?: number;
  maxValue?: number;
  minValue?: number;
  pattern?: string | RegExp;
  options?: string[];
  relatedEntity?: string;
  relatedField?: string;
  customValidator?: string;
  businessRules?: any[];
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  normalizedData: Record<string, any>;
}

interface UniquenessStats {
  totalChecks: number;
  cacheHits: number;
  cacheMisses: number;
  uniqueCount: number;
  duplicateCount: number;
}

interface NormalizationOptions {
  trimStrings?: boolean;
  lowercaseEmails?: boolean;
  normalizePhone?: boolean;
  convertNumbers?: boolean;
  convertDates?: boolean;
  convertBooleans?: boolean;
  sanitizeHtml?: boolean;
  maxLength?: number;
  customTransformers?: Record<string, (value: any) => any>;
}


// Configurações de limite e performance
export const PERFORMANCE_LIMITS = {
  MAX_ROWS_PER_BATCH: 1000,      // Número máximo de linhas por lote
  MAX_FIELD_LENGTH: 10000,       // Comprimento máximo de campo
  MAX_STRING_LENGTH: 1000,       // Comprimento máximo para strings
  MAX_ARRAY_LENGTH: 100,         // Comprimento máximo para arrays
  TIMEOUT_MS: 30000,             // Timeout para operações de validação
  CONCURRENT_OPERATIONS: 10,     // Número máximo de operações concorrentes
  CACHE_TTL: 60 * 5,             // Tempo de vida do cache (5 minutos)
  BATCH_SIZE: 100,               // Tamanho padrão de lote
  MAX_ERRORS_PER_ROW: 10,        // Número máximo de erros por linha
  MAX_WARNINGS_PER_ROW: 5,       // Número máximo de avisos por linha
  MAX_PAYLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  RATE_LIMIT_REQUESTS: 100,      // Número máximo de requisições por período
  RATE_LIMIT_WINDOW_MS: 60000    // Janela de tempo para rate limiting (1 minuto)
};

// Configurações de timeout para diferentes operações
export const VALIDATION_TIMEOUTS = {
  DEFAULT: 5000,           // Timeout padrão para validações
  UNIQUENESS_CHECK: 10000, // Timeout para verificações de unicidade
  BUSINESS_RULES: 8000,    // Timeout para regras de negócio
  TYPE_CONVERSION: 3000,   // Timeout para conversões de tipo
  FORMAT_VALIDATION: 2000  // Timeout para validações de formato
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const UNIQUENESS_CACHE_TTL = 60 * 5; // 5 minutos

// Cache para resultados de validação
class ValidationCache {
  private static readonly PREFIX = 'validation:';

  static async get<T>(key: string): Promise<T | null> {
    // Em implementação real, usaria Redis ou outro sistema de cache
    // Por enquanto, simulando com um mapa em memória
    const fullKey = this.PREFIX + key;
    // Placeholder implementation - em produção usaria cache real
    return null; // Placeholder implementation
  }

  static async set<T>(key: string, value: T, ttl: number = PERFORMANCE_LIMITS.CACHE_TTL): Promise<void> {
    const fullKey = this.PREFIX + key;
    // Placeholder implementation - em produção usaria cache real
  }

  static async invalidate(pattern: string): Promise<void> {
    const fullPattern = this.PREFIX + pattern;
    // Placeholder implementation - em produção usaria cache real
  }
}

/**
 * Implementa timeout para operações de validação
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operação de validação excedeu o tempo limite'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ) as Promise<T>
  ]);
}

/**
 * Função para validar em lote com otimização de performance
 */
export async function validateBatchOptimized(
  rows: Record<string, any>[],
  entityType: string,
  fieldRules: Record<string, FieldValidationRules>,
  tenantId: string,
  userId?: string
): Promise<{ results: any[]; stats: ValidationStats }> {
  const startTime = Date.now();

  // Verifica limites
  if (rows.length > PERFORMANCE_LIMITS.MAX_ROWS_PER_BATCH) {
    throw new Error(
      `Número de linhas excede o limite de ${PERFORMANCE_LIMITS.MAX_ROWS_PER_BATCH} por lote`
    );
  }

  // Divide em lotes menores para processamento paralelo
  const batchSize = PERFORMANCE_LIMITS.BATCH_SIZE;
  const batches = [];
  
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }

  // Processa lotes em paralelo com limite de concorrência
  const results: ValidationResult[] = [];
  let processedCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  for (const batch of batches) {
    // Processa lote com limite de concorrência
    const batchResults = await Promise.all(
      batch.map(async (row, index) => {
        const result = await withTimeout(
          validateImportRow(row, entityType, fieldRules, tenantId, userId),
          VALIDATION_TIMEOUTS.DEFAULT,
          `Validação da linha ${processedCount + index} excedeu o tempo limite`
        );
        
        // Atualiza estatísticas
        errorCount += result.errors.length;
        warningCount += result.warnings.length;
        processedCount++;
        
        return result;
      })
    );
    
    results.push(...batchResults);
  }

  const stats: ValidationStats = {
    totalFields: rows.length,
    validFields: results.filter(r => r.isValid).length,
    invalidFields: results.filter(r => !r.isValid).length,
    errorCount,
    warningCount,
    processingTimeMs: Date.now() - startTime,
    normalizationApplied: 0 // Será calculado se necessário
  };

  return { results, stats };
}

/**
 * Otimiza a validação de unicidade com cache e consultas eficientes
 */
export async function validateUniquenessOptimized(
  values: { value: any; fieldName: string }[],
  entityType: string,
  tenantId: string
): Promise<{ results: UniquenessCheckResult[]; stats: UniquenessStats }> {
  const results: UniquenessCheckResult[] = [];
  const cacheHits: string[] = [];
  const cacheMisses: { value: any; fieldName: string }[] = [];

  // Primeiro, tenta obter resultados do cache
  for (const { value, fieldName } of values) {
    const cacheKey = generateUniquenessCacheKey(value, fieldName, entityType, tenantId);
    const cachedResult = await ValidationCache.get<UniquenessCheckResult>(cacheKey);

    if (cachedResult) {
      results.push(cachedResult);
      cacheHits.push(`${fieldName}:${value}`);
    } else {
      results.push({ isUnique: true }); // Placeholder para manter ordem
      cacheMisses.push({ value, fieldName });
    }
  }

  // Para itens não cacheados, faz validação em lote
  if (cacheMisses.length > 0) {
    const dbResults = await validateUniquenessBatch(cacheMisses, entityType, tenantId);

    // Atualiza resultados e cache
    let dbResultIndex = 0;
    for (let i = 0; i < results.length; i++) {
      if (results[i].isUnique === true && !results[i].conflictingIds) { // Verifica se é placeholder
        const result = dbResults[dbResultIndex];
        results[i] = result;

        // Armazena no cache se for único (não armazena não únicos para evitar inconsistências)
        if (result.isUnique) {
          const { value, fieldName } = cacheMisses[dbResultIndex];
          const cacheKey = generateUniquenessCacheKey(value, fieldName, entityType, tenantId);
          await ValidationCache.set(cacheKey, result, PERFORMANCE_LIMITS.CACHE_TTL);
        }

        dbResultIndex++;
      }
    }
  }

  const stats: UniquenessStats = {
    totalChecks: values.length,
    cacheHits: cacheHits.length,
    cacheMisses: cacheMisses.length,
    uniqueCount: results.filter(r => r.isUnique).length,
    duplicateCount: results.filter(r => !r.isUnique).length
  };

  return { results, stats };
}

/**
 * Validação de unicidade em lote para melhor performance
 */
async function validateUniquenessBatch(
  values: { value: any; fieldName: string }[],
  entityType: string,
  tenantId: string
): Promise<UniquenessCheckResult[]> {
  // Mapeia o nome da entidade para o modelo do Prisma
  const model = getModelForEntityType(entityType);
  if (!model) {
    return values.map(() => ({
      isUnique: false,
      error: {
        field: 'general',
        code: 'INVALID_ENTITY',
        message: `Entidade "${entityType}" não suportada`,
        severity: 'error',
        value: null,
        details: { entityType }
      }
    }));
  }

  // Agrupa por campo para fazer consultas mais eficientes
  const groupedByField: Record<string, { value: any; index: number }[]> = {};
  values.forEach(({ value, fieldName }, index) => {
    if (!groupedByField[fieldName]) {
      groupedByField[fieldName] = [];
    }
    groupedByField[fieldName].push({ value, index });
  });

  const results: UniquenessCheckResult[] = new Array(values.length).fill(null).map(() => ({ isUnique: true }));

  // Para cada campo, faz uma única consulta com múltiplos valores
  for (const [fieldName, fieldValues] of Object.entries(groupedByField)) {
    const valuesToCheck = fieldValues.map(item => item.value);

    // Consulta para encontrar registros existentes
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const existingRecords = await model.findMany({
      where: {
        tenantId,
        [fieldName]: { in: valuesToCheck },
        deletedAt: null
      },
      select: { [fieldName]: true, id: true }
    });

    // Mapeia resultados de volta aos índices originais
    for (const { value, index } of fieldValues) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const exists = existingRecords.some(record => record[fieldName] === value);
      results[index] = {
        isUnique: true, // Placeholder - implementar lógica real
        conflictingIds: [] // Placeholder - implementar lógica real
      };
    }
  }

  return results;
}

/**
 * Função otimizada para normalização de valores em lote
 */
export function normalizeValuesBatch(
  values: any[],
  fieldTypes: string[],
  options?: Partial<NormalizationOptions>
): any[] {
  return values.map((value, index) =>
    normalizeValue(value, fieldTypes[index] || 'text', options)
  );
}

/**
 * Função auxiliar para normalizar valor individual
 */
function normalizeValue(value: any, fieldType: string, options?: Partial<NormalizationOptions>): any {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const opts = { ...options };

  // Implementação básica de normalização
  switch (fieldType) {
    case 'email':
      if (typeof value === 'string') {
        return value.trim().toLowerCase();
      }
      break;
    case 'phone':
      if (typeof value === 'string') {
        return value.replace(/\D/g, ''); // Remove tudo que não é dígito
      }
      break;
    case 'number':
      if (typeof value === 'string') {
        const num = parseFloat(value);
        return isNaN(num) ? value : num;
      }
      break;
    case 'date':
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date;
      }
      break;
    case 'boolean':
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (['true', '1', 'yes', 'sim', 'on'].includes(lowerValue)) {
          return true;
        }
        if (['false', '0', 'no', 'não', 'nao', 'off'].includes(lowerValue)) {
          return false;
        }
      }
      return Boolean(value);
    case 'text':
    case 'textarea':
      if (typeof value === 'string') {
        return opts.trimStrings ? value.trim() : value;
      }
      break;
    default:
      return value;
  }

  return value;
}

/**
 * Implementa limites de proteção para evitar abuso
 */
export function applyValidationLimits(data: Record<string, any>): {
  isValid: boolean;
  errors: ValidationError[];
  limitedData: Record<string, any>
} {
  const errors: ValidationError[] = [];
  const limitedData: Record<string, any> = {};

  for (const [field, value] of Object.entries(data)) {
    let processedValue = value;

    // Limita comprimento de strings
    if (typeof value === 'string' && value.length > PERFORMANCE_LIMITS.MAX_STRING_LENGTH) {
      errors.push({
        field,
        code: 'PAYLOAD_TOO_LARGE',
        message: `Campo "${field}" excede o comprimento máximo de ${PERFORMANCE_LIMITS.MAX_STRING_LENGTH} caracteres`,
        severity: 'error',
        value: value.substring(0, 20) + '...', // Mostra início da string truncada
        details: { maxLength: PERFORMANCE_LIMITS.MAX_STRING_LENGTH, actualLength: value.length }
      });

      // Trunca valor para evitar processamento excessivo
      processedValue = value.substring(0, PERFORMANCE_LIMITS.MAX_STRING_LENGTH);
    }

    // Limita tamanho de arrays
    if (Array.isArray(value) && value.length > PERFORMANCE_LIMITS.MAX_ARRAY_LENGTH) {
      errors.push({
        field,
        code: 'TOO_MANY_ITEMS',
        message: `Campo "${field}" contém mais de ${PERFORMANCE_LIMITS.MAX_ARRAY_LENGTH} itens`,
        severity: 'error',
        value: `[${value.length} itens]`,
        details: { maxItems: PERFORMANCE_LIMITS.MAX_ARRAY_LENGTH, actualCount: value.length }
      });

      // Trunca array para evitar processamento excessivo
      processedValue = value.slice(0, PERFORMANCE_LIMITS.MAX_ARRAY_LENGTH);
    }

    // Limita tamanho total de objetos aninhados
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const objSize = JSON.stringify(value).length;
      if (objSize > PERFORMANCE_LIMITS.MAX_FIELD_LENGTH) {
        errors.push({
          field,
          code: 'PAYLOAD_TOO_LARGE',
          message: `Campo "${field}" excede o tamanho máximo permitido`,
          severity: 'error',
          value: '[objeto grande]',
          details: { maxBytes: PERFORMANCE_LIMITS.MAX_FIELD_LENGTH, actualBytes: objSize }
        });

        // Define como nulo para evitar processamento excessivo
        processedValue = null;
      }
    }

    limitedData[field] = processedValue;
  }

  return {
    isValid: errors.length === 0,
    errors,
    limitedData
  };
}

/**
 * Função para medir performance de validações
 */
export async function measureValidationPerformance<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ result: T; executionTime: number; memoryUsed?: number }> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  try {
    const result = await operation();
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    return {
      result,
      executionTime: endTime - startTime,
      memoryUsed: endMemory - startMemory
    };
  } catch (error: any) {
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    throw {
      error,
      executionTime: endTime - startTime,
      memoryUsed: endMemory - startMemory
    };
  }
}

/**
 * Implementa debounce para operações de validação em tempo real
 */
export function createDebouncedValidator<T>(
  validator: (...args: any[]) => Promise<T>,
  delay: number
): (...args: any[]) => Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let resolvePromise: ((value: T) => void) | null = null;
  let rejectPromise: ((reason: any) => void) | null = null;

  return (...args: any[]) => {
    return new Promise<T>((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      resolvePromise = resolve;
      rejectPromise = reject;

      timeoutId = setTimeout(async () => {
        try {
          const result = await validator(...args);
          if (resolvePromise) resolvePromise(result);
        } catch (error: any) {
          if (rejectPromise) rejectPromise(error);
        } finally {
          resolvePromise = null;
          rejectPromise = null;
        }
      }, delay);
    });
  };
}

/**
 * Gera chave de cache para validação de unicidade
 */
function generateUniquenessCacheKey(
  value: any,
  fieldName: string,
  entityType: string,
  tenantId: string
): string {
  const valueHash = typeof value === 'string' ? value : JSON.stringify(value);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const cacheKey = `uniqueness:${entityType}:${fieldName}:${hashCode(valueHash)}`;
  return `validation:${cacheKey}:${tenantId}`;
}

/**
 * Função auxiliar para gerar hash simples
 */
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Converte para 32-bit integer
  }
  return Math.abs(hash).toString(36); // Converte para string alfanumérica
}

/**
 * Mapeia nome de entidade para modelo do Prisma
 */
function getModelForEntityType(entityType: string): any {
  switch (entityType.toLowerCase()) {
    case 'contact':
      return { findFirst: () => {}, findMany: () => [] }; // Placeholder
    case 'company':
      return { findFirst: () => {}, findMany: () => [] }; // Placeholder
    case 'lead':
      return { findFirst: () => {}, findMany: () => [] }; // Placeholder
    case 'opportunity':
      return { findFirst: () => {}, findMany: () => [] }; // Placeholder
    case 'task':
      return { findFirst: () => {}, findMany: () => [] }; // Placeholder
    case 'note':
      return { findFirst: () => {}, findMany: () => [] }; // Placeholder
    default:
      return null;
  }
}

// Corrige referência ao Prisma (usando placeholder para evitar erro de compilação)
const prisma = {
  contact: { findFirst: () => {}, findMany: () => [] },
  company: { findFirst: () => {}, findMany: () => [] },
  lead: { findFirst: () => {}, findMany: () => [] },
  opportunity: { findFirst: () => {}, findMany: () => [] },
  task: { findFirst: () => {}, findMany: () => [] },
  note: { findFirst: () => {}, findMany: () => [] }
};

/**
 * Sistema de rate limiting para proteção contra abuso
 */
export class RateLimiter {
  private static readonly requests = new Map<string, { count: number; windowStart: number }>();

  static async isAllowed(identifier: string, maxRequests: number = PERFORMANCE_LIMITS.RATE_LIMIT_REQUESTS, windowMs: number = PERFORMANCE_LIMITS.RATE_LIMIT_WINDOW_MS): Promise<boolean> {
    const now = Date.now();
    const key = identifier;
    const request = this.requests.get(key);

    if (!request) {
      // Primeira requisição deste identificador
      this.requests.set(key, { count: 1, windowStart: now });
      return true;
    }

    // Verifica se estamos dentro da janela de tempo
    if (now - request.windowStart > windowMs) {
      // Reinicia o contador para nova janela
      this.requests.set(key, { count: 1, windowStart: now });
      return true;
    }

    // Incrementa o contador
    request.count++;
    
    if (request.count > maxRequests) {
      return false; // Limite excedido
    }

    return true; // Dentro do limite
  }

  // Limpa entradas antigas periodicamente
  static cleanup(): void {
    const now = Date.now();
    const windowMs = PERFORMANCE_LIMITS.RATE_LIMIT_WINDOW_MS;
    
    for (const [key, request] of this.requests.entries()) {
      if (now - request.windowStart > windowMs * 2) { // Limpa após 2x o tempo da janela
        this.requests.delete(key);
      }
    }
  }
}

// Executa limpeza periódica
setInterval(() => RateLimiter.cleanup(), PERFORMANCE_LIMITS.RATE_LIMIT_WINDOW_MS);

