/**
 * Serviço para validação de unicidade de campos
 * 
 * Responsável por:
 * - Verificar se valores são únicos dentro de um tenant
 * - Implementar cache para melhor performance
 * - Gerenciar locks para evitar race conditions
 * - Fornecer resultados consistentes para validações concorrentes
 */

import { prisma } from '../utils/prisma';
import { UniquenessCheckResult } from '../types/validation.types';
import { cacheManager } from '../cache/cacheManager';
import { generateCacheKey } from '../cache/cacheKeys';

// Tempo de vida do cache para verificações de unicidade (em segundos)
const UNIQUENESS_CACHE_TTL = 60 * 5; // 5 minutos

// Tempo de vida do lock para evitar race conditions (em segundos)
const LOCK_TTL = 30; // 30 segundos

/**
 * Valida a unicidade de um valor para um campo específico
 */
export async function validateUniqueness(
  value: any,
  fieldName: string,
  entityType: string,
  tenantId: string,
  userId?: string
): Promise<UniquenessCheckResult> {
  // Gera chaves de cache e lock
  const cacheKey = generateUniquenessCacheKey(value, fieldName, entityType, tenantId);
  const lockKey = generateUniquenessLockKey(value, fieldName, entityType, tenantId);

  // Tenta obter do cache primeiro
  const cachedResult = await cacheManager.get<UniquenessCheckResult>(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Implementa mecanismo de lock para evitar race conditions
  const lockAcquired = await acquireLock(lockKey);
  if (!lockAcquired) {
    // Se não conseguir o lock, espera um pouco e tenta novamente
    await new Promise(resolve => setTimeout(resolve, 100));
    return await validateUniqueness(value, fieldName, entityType, tenantId, userId);
  }

  try {
    // Realiza a verificação de unicidade no banco de dados
    const result = await performUniquenessCheck(value, fieldName, entityType, tenantId);
    
    // Armazena no cache se for único (valores não únicos não são cacheados para evitar inconsistências)
    if (result.isUnique) {
      await cacheManager.set(cacheKey, result, UNIQUENESS_CACHE_TTL);
    }
    
    return result;
  } finally {
    // Libera o lock
    await releaseLock(lockKey);
  }
}

/**
 * Realiza a verificação de unicidade no banco de dados
 */
async function performUniquenessCheck(
  value: any,
  fieldName: string,
  entityType: string,
  tenantId: string
): Promise<UniquenessCheckResult> {
  try {
    // Mapeia o nome da entidade para o modelo do Prisma
    const model = getModelForEntityType(entityType);
    if (!model) {
      return {
        isUnique: false,
        error: {
          field: fieldName,
          code: 'INVALID_FIELD',
          message: `Entidade "${entityType}" não suportada para validação de unicidade`,
          severity: 'error',
          value: value
        }
      };
    }

    // Monta a cláusula WHERE para a consulta
    const whereClause: any = {
      tenantId: tenantId,
      [fieldName]: value,
      deletedAt: null // Considera apenas registros não deletados
    };

    // Consulta no banco de dados
    const existingRecords = await model.findMany({
      where: whereClause,
      select: { id: true }
    });

    if (existingRecords.length > 0) {
      return {
        isUnique: false,
        conflictingIds: existingRecords.map((record: { id: string }) => record.id)
      };
    }

    return { isUnique: true };
  } catch (error) {
    console.error(`Erro ao verificar unicidade para campo "${fieldName}" na entidade "${entityType}":`, error);
    return {
      isUnique: false,
      error: {
        field: fieldName,
        code: 'UNIQUENESS_CHECK_ERROR',
        message: `Erro ao verificar unicidade do campo "${fieldName}": ${(error as Error).message}`,
        severity: 'error',
        value: value,
        details: { originalError: (error as Error).message }
      }
    };
  }
}

/**
 * Mapeia o nome da entidade para o modelo do Prisma correspondente
 */
function getModelForEntityType(entityType: string): any {
  switch (entityType.toLowerCase()) {
    case 'contact':
      return prisma.contact;
    case 'company':
      return prisma.company;
    case 'lead':
      return prisma.lead;
    case 'opportunity':
      return prisma.opportunity;
    case 'task':
      return prisma.task;
    case 'note':
      return prisma.note;
    case 'user':
      return prisma.user;
    case 'tenant':
      return prisma.tenant;
    default:
      // Para entidades dinâmicas ou customizadas, talvez seja necessário um tratamento especial
      // Por enquanto, retornamos null para tipos desconhecidos
      return null;
  }
}

/**
 * Gera chave de cache para verificação de unicidade
 */
function generateUniquenessCacheKey(
  value: any,
  fieldName: string,
  entityType: string,
  tenantId: string
): string {
  const valueHash = hashValue(value);
  return generateCacheKey(`uniqueness:${entityType}:${fieldName}:${valueHash}`, { tenantId }, tenantId);
}

/**
 * Gera chave de lock para evitar race conditions
 */
function generateUniquenessLockKey(
  value: any,
  fieldName: string,
  entityType: string,
  tenantId: string
): string {
  const valueHash = hashValue(value);
  return `lock:uniqueness:${entityType}:${fieldName}:${valueHash}:${tenantId}`;
}

/**
 * Gera hash simples de um valor
 */
function hashValue(value: any): string {
  const str = JSON.stringify(value);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converte para 32-bit integer
  }
  
  return hash.toString();
}

/**
 * Adquire um lock para evitar race conditions
 */
async function acquireLock(lockKey: string): Promise<boolean> {
  // Em uma implementação real, isso usaria Redis ou outro sistema de cache com suporte a locks
  // Por enquanto, simulamos o comportamento
  try {
    // Tenta definir a chave com um TTL
    await cacheManager.set(lockKey, 'locked', LOCK_TTL);
    return true; // Retorna true se conseguiu definir o lock
  } catch {
    // Se der erro ao definir o lock, assume que já estava bloqueado
    return false;
  }
}

/**
 * Libera um lock
 */
async function releaseLock(lockKey: string): Promise<void> {
  // Em uma implementação real, isso liberaria o lock no Redis
  try {
    await cacheManager.invalidate(lockKey);
  } catch {
    // Se der erro ao liberar o lock, ignora (pode ter expirado)
  }
}

/**
 * Validação de campos compostos únicos (ex: firstName + lastName combinados)
 */
export async function validateCompositeUniqueness(
  fieldValues: Record<string, any>,
  entityType: string,
  tenantId: string,
  userId?: string
): Promise<UniquenessCheckResult> {
  // Gera chave de cache e lock para campos compostos
  const cacheKey = generateCompositeUniquenessCacheKey(fieldValues, entityType, tenantId);
  const lockKey = generateCompositeUniquenessLockKey(fieldValues, entityType, tenantId);

  // Tenta obter do cache primeiro
  const cachedResult = await cacheManager.get<UniquenessCheckResult>(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Implementa mecanismo de lock
  const lockAcquired = await acquireLock(lockKey);
  if (!lockAcquired) {
    // Se não conseguir o lock, espera um pouco e tenta novamente
    await new Promise(resolve => setTimeout(resolve, 100));
    return await validateCompositeUniqueness(fieldValues, entityType, tenantId, userId);
  }

  try {
    // Realiza a verificação de unicidade composta no banco de dados
    const result = await performCompositeUniquenessCheck(fieldValues, entityType, tenantId);
    
    // Armazena no cache se for único
    if (result.isUnique) {
      await cacheManager.set(cacheKey, result, UNIQUENESS_CACHE_TTL);
    }
    
    return result;
  } finally {
    // Libera o lock
    await releaseLock(lockKey);
  }
}

/**
 * Realiza a verificação de unicidade composta no banco de dados
 */
async function performCompositeUniquenessCheck(
  fieldValues: Record<string, any>,
  entityType: string,
  tenantId: string
): Promise<UniquenessCheckResult> {
  try {
    // Mapeia o nome da entidade para o modelo do Prisma
    const model = getModelForEntityType(entityType);
    if (!model) {
      const fieldList = Object.keys(fieldValues).join(', ');
      return {
        isUnique: false,
        error: {
          field: fieldList,
          code: 'INVALID_FIELD',
          message: `Entidade "${entityType}" não suportada para validação de unicidade composta`,
          severity: 'error',
          value: fieldValues
        }
      };
    }

    // Monta a cláusula WHERE para a consulta composta
    const whereClause: any = {
      tenantId: tenantId,
      AND: Object.entries(fieldValues).map(([field, value]) => ({
        [field]: value
      })),
      deletedAt: null // Considera apenas registros não deletados
    };

    // Consulta no banco de dados
    const existingRecords = await model.findMany({
      where: whereClause,
      select: { id: true }
    });

    if (existingRecords.length > 0) {
      return {
        isUnique: false,
        conflictingIds: existingRecords.map((record: { id: string }) => record.id)
      };
    }

    return { isUnique: true };
  } catch (error) {
    const fieldList = Object.keys(fieldValues).join(', ');
    console.error(`Erro ao verificar unicidade composta para campos "${fieldList}" na entidade "${entityType}":`, error);
    return {
      isUnique: false,
      error: {
        field: fieldList,
        code: 'COMPOSITE_UNIQUENESS_CHECK_ERROR',
        message: `Erro ao verificar unicidade composta dos campos "${fieldList}": ${(error as Error).message}`,
        severity: 'error',
        value: fieldValues,
        details: { originalError: (error as Error).message }
      }
    };
  }
}

/**
 * Gera chave de cache para verificação de unicidade composta
 */
function generateCompositeUniquenessCacheKey(
  fieldValues: Record<string, any>,
  entityType: string,
  tenantId: string
): string {
  const valuesHash = Object.entries(fieldValues)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([field, value]) => `${field}:${hashValue(value)}`)
    .join('|');
  
  return generateCacheKey(`composite-uniqueness:${entityType}:${valuesHash}`, { tenantId }, tenantId);
}

/**
 * Gera chave de lock para unicidade composta
 */
function generateCompositeUniquenessLockKey(
  fieldValues: Record<string, any>,
  entityType: string,
  tenantId: string
): string {
  const valuesHash = Object.entries(fieldValues)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([field, value]) => `${field}:${hashValue(value)}`)
    .join('|');
  
  return `lock:composite-uniqueness:${entityType}:${valuesHash}:${tenantId}`;
}

/**
 * Limpa o cache de unicidade para um tenant
 */
export async function clearUniquenessCache(tenantId: string): Promise<void> {
  // Em uma implementação real, isso limparia as entradas de cache específicas do tenant
  // usando tags ou padrões de chave
  const tags = [`uniqueness-${tenantId}`];
  await cacheManager.invalidateByTags(tags);
}

/**
 * Validação de unicidade em batch para múltiplos valores
 */
export async function validateBatchUniqueness(
  values: { value: any; fieldName: string }[],
  entityType: string,
  tenantId: string,
  userId?: string
): Promise<UniquenessCheckResult[]> {
  // Executa as validações em paralelo
  const results = await Promise.all(
    values.map(({ value, fieldName }) => 
      validateUniqueness(value, fieldName, entityType, tenantId, userId)
    )
  );

  return results;
}