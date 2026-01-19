/**
 * Rotas de timeline/histórico de atividades
 * 
 * Endpoints para consultar timeline de atividades relacionadas a uma entidade.
 * 
 * Todas as rotas requerem:
 * - tenantContextMiddleware: Contexto do tenant
 * - authMiddleware: Autenticação JWT
 * - authorizationMiddleware: Permissão Timeline.read
 */

import { Router } from 'express';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';
import { getTimeline } from '../controllers/timelineController';

const router = Router();

/**
 * GET /api/timeline/:entityType/:entityId
 * 
 * Obtém timeline de atividades relacionadas a uma entidade.
 * 
 * Requer autenticação e permissão "Timeline.read" (ou permissão específica da entidade)
 * 
 * Params:
 * - entityType: string (Contact, Company, Lead, Opportunity, Task)
 * - entityId: string (UUID da entidade)
 * 
 * Query params:
 * - limit: número (opcional, default: 20, max: 100)
 * - offset: número (opcional, default: 0)
 * 
 * Response 200:
 * {
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "type": "task" | "note" | "audit",
 *       "timestamp": "2024-01-01T00:00:00Z",
 *       "userId": "uuid",
 *       "userName": "Nome do Usuário",
 *       "data": { ... } // Dados específicos do tipo
 *     }
 *   ],
 *   "pagination": { "total": 100, "limit": 20, "offset": 0 },
 *   "entity": { "type": "Contact", "id": "uuid", "name": "João Silva" }
 * }
 * 
 * Response 400: Parâmetros inválidos
 * Response 404: Entidade não encontrada
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/:entityType/:entityId',
  tenantContextMiddleware,
  authMiddleware,
  authorizationMiddleware('Timeline', 'read'),
  getTimeline
);

export default router;
