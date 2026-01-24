/**
 * Rotas de tarefas
 * 
 * Define endpoints para gestão de tarefas (CRUD).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/tasks
 * 
 * Lista tarefas do tenant atual com paginação e filtros.
 * 
 * Requer autenticação e permissão "Task.list"
 * 
 * Query params de paginação:
 * - page: número (opcional, default: 1) - Número da página (>= 1)
 * - limit: número (opcional, default: 20, max: 100) - Itens por página
 * - offset: número (opcional, legado) - Offset para paginação (compatibilidade)
 * 
 * Paginação padrão: page=1, limit=20
 * 
 * Exemplos de paginação:
 * - GET /api/tasks?page=1&limit=20
 * - GET /api/tasks?page=2&limit=10
 * - GET /api/tasks?offset=20&limit=20 (legado, ainda funciona)
 * 
 * Query params de filtros:
 * - status: string (opcional: PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
 * - type: string (opcional: CALL, EMAIL, MEETING, OTHER)
 * - assignedToId: string (opcional: UUID do usuário atribuído)
 * - relatedEntityType: string (opcional: Contact, Company, Lead, Opportunity)
 * - relatedEntityId: string (opcional: UUID da entidade relacionada)
 * - dueDateFrom: string (opcional: data ISO para filtrar tarefas com dueDate >= esta data)
 * - dueDateTo: string (opcional: data ISO para filtrar tarefas com dueDate <= esta data)
 * - filters: JSON (opcional) - Filtros avançados (array de objetos Filter)
 * 
 * Exemplo de filtros avançados:
 * ?filters=[{"field":"status","operator":"equals","value":"PENDING"},{"field":"dueDate","operator":"greaterThan","value":"2024-01-01"}]
 * - overdue: boolean (opcional: true para tarefas vencidas não concluídas)
 * - completed: boolean (opcional: true para apenas concluídas, false para não concluídas)
 * 
 * Query params de ordenação:
 * - sortBy: string | string[] (opcional) - Campo(s) para ordenação
 *   Exemplo simples: ?sortBy=dueDate
 *   Exemplo múltiplo: ?sortBy=priority,dueDate
 * - sortOrder: 'asc' | 'desc' | ('asc' | 'desc')[] (opcional, default: 'asc')
 *   Exemplo simples: ?sortOrder=asc
 *   Exemplo múltiplo: ?sortOrder=asc,desc
 * - orderBy: string (opcional, legado) - Campo para ordenação (compatibilidade)
 * - order: 'asc' | 'desc' (opcional, legado) - Direção (compatibilidade)
 * 
 * Ordenação padrão: createdAt desc
 * 
 * Response 200:
 * {
 *   "data": [...],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 20,
 *     "total": 100,
 *     "totalPages": 5,
 *     "offset": 0
 *   }
 * }
 * 
 * Response 400: Parâmetros inválidos
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/',
  authorizationMiddleware('Task', 'list'),
  listTasks
);

/**
 * GET /api/tasks/:id
 * 
 * Obtém tarefa específica do tenant atual.
 * 
 * Requer autenticação e permissão "Task.read"
 * 
 * Response 200: Tarefa encontrada (com campos filtrados por permissão e relacionamentos: assignedTo, createdBy, relatedEntity)
 * Response 404: Tarefa não encontrada ou não pertence ao tenant
 * Response 400: ID inválido (formato UUID)
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/:id',
  authorizationMiddleware('Task', 'read'),
  getTask
);

/**
 * POST /api/tasks
 * 
 * Cria nova tarefa no tenant atual.
 * 
 * Requer autenticação e permissão "Task.create"
 * 
 * Body:
 * {
 *   "title": "Ligar para cliente" (obrigatório),
 *   "description": "Seguir up sobre proposta" (opcional),
 *   "type": "CALL" (opcional: CALL, EMAIL, MEETING, OTHER),
 *   "status": "PENDING" (opcional: PENDING, IN_PROGRESS, COMPLETED, CANCELLED, default: PENDING),
 *   "dueDate": "2024-12-31T23:59:59Z" (opcional: data ISO, não pode ser passada),
 *   "priority": "MEDIUM" (opcional: LOW, MEDIUM, HIGH, default: MEDIUM),
 *   "assignedToId": "uuid-usuario" (opcional: UUID do usuário atribuído),
 *   "relatedEntityType": "Contact" (obrigatório: Contact, Company, Lead, Opportunity),
 *   "relatedEntityId": "uuid-entidade" (obrigatório: UUID da entidade relacionada)
 * }
 * 
 * Response 201: Tarefa criada (com campos filtrados por permissão)
 * Response 400: Dados inválidos
 * Response 404: Entidade relacionada ou usuário atribuído não encontrado
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/',
  authorizationMiddleware('Task', 'create'),
  createTask
);

/**
 * PUT /api/tasks/:id
 * 
 * Atualiza tarefa existente no tenant atual.
 * 
 * Requer autenticação e permissão "Task.update"
 * 
 * Body (todos opcionais - partial update):
 * {
 *   "title": "Ligar para cliente",
 *   "description": "Seguir up sobre proposta" (ou null para remover),
 *   "type": "CALL",
 *   "status": "COMPLETED" (se mudar para COMPLETED, completedAt é definido automaticamente),
 *   "dueDate": "2024-12-31T23:59:59Z" (ou null para remover),
 *   "priority": "HIGH",
 *   "assignedToId": "uuid-usuario" (ou null para remover atribuição),
 *   "relatedEntityType": "Contact" (deve ser fornecido junto com relatedEntityId),
 *   "relatedEntityId": "uuid-entidade" (deve ser fornecido junto com relatedEntityType)
 * }
 * 
 * Nota: Se status mudar para COMPLETED, completedAt é definido automaticamente.
 * Se status sair de COMPLETED, completedAt é limpo automaticamente.
 * 
 * Response 200: Tarefa atualizada (com campos filtrados por permissão)
 * Response 400: Dados inválidos
 * Response 403: Sem permissão para atualizar campos específicos
 * Response 404: Tarefa, entidade relacionada ou usuário atribuído não encontrado
 * Response 401: Não autenticado
 */
router.put(
  '/:id',
  authorizationMiddleware('Task', 'update'),
  updateTask
);

/**
 * DELETE /api/tasks/:id
 * 
 * Deleta tarefa (soft delete - marca deletedAt).
 * 
 * Requer autenticação e permissão "Task.delete"
 * 
 * Response 200: { "message": "Tarefa deletada com sucesso", "id": "uuid" }
 * Response 404: Tarefa não encontrada ou não pertence ao tenant
 * Response 400: ID inválido (formato UUID)
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: Tarefa deletada não aparece em listagens (GET /api/tasks).
 */
router.delete(
  '/:id',
  authorizationMiddleware('Task', 'delete'),
  deleteTask
);

export default router;
