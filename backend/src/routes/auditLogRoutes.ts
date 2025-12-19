/**
 * Rotas de logs de auditoria
 * 
 * Define endpoints para consulta de histórico de alterações.
 * Todas as rotas requerem autenticação e permissão "AuditLog.read".
 */

import express from 'express';
import {
  listAuditLogs,
  getEntityHistory,
} from '../controllers/auditLogController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/audit-logs
 * 
 * Lista logs de auditoria do tenant atual com filtros e paginação.
 * 
 * Requer autenticação e permissão "AuditLog.read"
 * 
 * Query params:
 * - limit: número (opcional, default: 20, max: 100)
 * - offset: número (opcional, default: 0)
 * - entityType: string (opcional: "User", "Role")
 * - entityId: UUID string (opcional)
 * - userId: UUID string (opcional)
 * - action: string (opcional: "create", "update", "delete")
 * - dateFrom: ISO date string (opcional)
 * - dateTo: ISO date string (opcional)
 * 
 * Response 200:
 * {
 *   "data": [
 *     {
 *       "id": "...",
 *       "entityType": "User",
 *       "entityId": "...",
 *       "action": "update",
 *       "userId": "...",
 *       "userName": "Admin User",
 *       "tenantId": "...",
 *       "changes": { "name": { "old": "...", "new": "..." } },
 *       "timestamp": "2024-01-01T00:00:00.000Z"
 *     }
 *   ],
 *   "pagination": { "total": 100, "limit": 20, "offset": 0 }
 * }
 * 
 * Response 400: Parâmetros inválidos
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/',
  authorizationMiddleware('AuditLog', 'read'),
  listAuditLogs
);

/**
 * GET /api/audit-logs/:entityType/:entityId
 * 
 * Retorna histórico completo de alterações de um registro específico.
 * 
 * Requer autenticação e permissão "AuditLog.read"
 * 
 * Params:
 * - entityType: string (valores do enum AuditEntity: "User", "Role")
 * - entityId: UUID string
 * 
 * Response 200:
 * [
 *   {
 *     "id": "...",
 *     "entityType": "User",
 *     "entityId": "...",
 *     "action": "create",
 *     "userId": "...",
 *     "userName": "Admin User", // ou null se usuário foi deletado
 *     "tenantId": "...",
 *     "changes": null,
 *     "timestamp": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 * 
 * Nota: Sempre retorna 200, mesmo se array estiver vazio.
 * Entidade pode existir sem histórico de alterações.
 * 
 * Response 400: Parâmetros inválidos (entityType inválido)
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/:entityType/:entityId',
  authorizationMiddleware('AuditLog', 'read'),
  getEntityHistory
);

export default router;

