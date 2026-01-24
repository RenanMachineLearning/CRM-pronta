/**
 * Helpers para geração de chaves de cache consistentes
 */

import * as crypto from 'crypto';

/**
 * Gera chave de cache baseada em operação, parâmetros e tenant
 * 
 * @param operation - Nome da operação (ex: 'listContacts', 'searchGlobal')
 * @param params - Parâmetros da operação
 * @param tenantId - ID do tenant
 * @returns Chave de cache única
 */
export function generateCacheKey(
  operation: string,
  params: Record<string, any>,
  tenantId: string
): string {
  // Normalizar parâmetros (ordenar chaves para garantir consistência)
  const normalizedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  const paramStr = JSON.stringify(normalizedParams);
  const hash = crypto.createHash('md5').update(paramStr).digest('hex').substring(0, 8);
  return `cache:${operation}:${tenantId}:${hash}`;
}

/**
 * Retorna tags de cache para uma entidade
 * Útil para invalidação em cascata
 * 
 * @param entity - Nome da entidade (ex: 'contact', 'note')
 * @returns Array de tags
 */
export function getEntityCacheTags(entity: string): string[] {
  return [`entity:${entity}`, `search:${entity}`, `list:${entity}`];
}
