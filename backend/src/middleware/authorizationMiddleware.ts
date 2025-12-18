/**
 * Middleware de autorização ACL
 * 
 * Middleware factory para verificação de permissões ACL.
 * Substitui verificações manuais nos controllers por um middleware declarativo.
 * 
 * Pré-requisitos:
 * - authMiddleware deve ter rodado antes e populado req.userId
 * - tenantContextMiddleware deve ter rodado antes e populado req.tenantId
 * 
 * Ordem obrigatória: tenantContextMiddleware → authMiddleware → authorizationMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { checkPermission } from '../utils/permissions';

/**
 * Middleware factory para verificação de permissões ACL
 * 
 * @param entity - Nome da entidade (ex: "User", "Role", "Contact")
 * @param action - Ação a ser verificada (ex: "create", "read", "update", "delete", "list")
 * @param field - Campo opcional para permissões por campo (ex: "value")
 * @returns Middleware Express que verifica permissão antes de continuar
 * 
 * @example
 * router.get(
 *   '/',
 *   tenantContextMiddleware,
 *   authMiddleware,
 *   authorizationMiddleware('User', 'list'),
 *   listUsers
 * );
 */
export function authorizationMiddleware(
  entity: string,
  action: string,
  field?: string | null
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Obter userId e tenantId dos middlewares anteriores
      const userId = req.userId;
      const tenantId = req.tenantId;

      // Validar que middlewares anteriores rodaram
      if (!userId || !tenantId) {
        res.status(401).json({
          error: 'Não autenticado',
          message: 'Token de autenticação necessário',
        });
        return;
      }

      // Verificar permissão usando helper existente
      const hasPermission = await checkPermission(userId, tenantId, entity, action, field);

      if (!hasPermission) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para realizar esta ação',
        });
        return;
      }

      // Permissão concedida, continuar para o próximo middleware/handler
      next();
    } catch (error) {
      // Em caso de erro, retornar 500 por segurança (não expor detalhes)
      console.error('Erro ao verificar permissão:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Falha ao verificar permissão',
      });
    }
  };
}

