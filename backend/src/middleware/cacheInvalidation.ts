/**
 * Middleware para invalidação automática de cache
 * Invalida cache após operações de criação, atualização ou deleção
 */

import { Request, Response, NextFunction } from 'express';
import { cacheManager } from '../cache/cacheManager';
import { getEntityCacheTags } from '../cache/cacheKeys';

/**
 * Middleware que invalida cache de uma entidade após operações CRUD
 * 
 * @param entity - Nome da entidade (ex: 'contact', 'note')
 * @returns Middleware function
 */
export function invalidateEntityCache(entity: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Continuar com a requisição original
    next();

    // Invalidar cache após resposta bem-sucedida
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const tags = getEntityCacheTags(entity);
          await cacheManager.invalidateByTags(tags);

          // Invalidar também buscas globais e listagens do tenant
          const tenantId = req.tenantId;
          if (tenantId) {
            await cacheManager.invalidate(`cache:search:*:${tenantId}:*`);
            await cacheManager.invalidate(`cache:list*:${tenantId}:*`);
          }
        } catch (error) {
          // Falha na invalidação não deve quebrar a aplicação
          console.error(`[CacheInvalidation] Erro ao invalidar cache para ${entity}:`, error);
        }
      }
    });
  };
}
