/**
 * Rotas de entidades (metadados)
 * 
 * Define endpoints para gestão de entidades (CRUD).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  listEntities,
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
} from '../controllers/entityController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/entities
 * 
 * Lista entidades do tenant atual com contagem de campos.
 * 
 * Requer autenticação e permissão "Entity.list"
 * 
 * Response 200:
 * [
 *   {
 *     "id": "uuid",
 *     "name": "Contact",
 *     "label": "Contato",
 *     "tenantId": "uuid",
 *     "isSystem": true,
 *     "fieldsCount": 6,
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "updatedAt": "2024-01-01T00:00:00.000Z"
 *   },
 *   ...
 * ]
 * 
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/',
  authorizationMiddleware('Entity', 'list'),
  listEntities
);

/**
 * GET /api/entities/:id
 * 
 * Obtém entidade específica do tenant atual com campos e relacionamentos.
 * 
 * Requer autenticação e permissão "Entity.read"
 * 
 * Response 200:
 * {
 *   "id": "uuid",
 *   "name": "Contact",
 *   "label": "Contato",
 *   "tenantId": "uuid",
 *   "isSystem": true,
 *   "fields": [...],
 *   "relationships": [...],
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-01T00:00:00.000Z"
 * }
 * 
 * Response 404: Entidade não encontrada ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/:id',
  authorizationMiddleware('Entity', 'read'),
  getEntity
);

/**
 * POST /api/entities
 * 
 * Cria nova entidade customizada no tenant atual.
 * 
 * Requer autenticação e permissão "Entity.create"
 * 
 * Body:
 * {
 *   "name": "CustomEntity",
 *   "label": "Entidade Customizada"
 * }
 * 
 * Response 201: Entidade criada
 * Response 400: Dados inválidos
 * Response 409: Nome já está em uso
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/',
  authorizationMiddleware('Entity', 'create'),
  createEntity
);

/**
 * PUT /api/entities/:id
 * 
 * Atualiza entidade existente no tenant atual (apenas label, name não pode ser alterado).
 * 
 * Requer autenticação e permissão "Entity.update"
 * 
 * Body:
 * {
 *   "label": "Novo Label"
 * }
 * 
 * Nota: Entidades do sistema não podem ser alteradas.
 * 
 * Response 200: Entidade atualizada
 * Response 400: Dados inválidos ou entidade do sistema
 * Response 404: Entidade não encontrada
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.put(
  '/:id',
  authorizationMiddleware('Entity', 'update'),
  updateEntity
);

/**
 * DELETE /api/entities/:id
 * 
 * Deleta entidade customizada (não pode deletar entidades do sistema).
 * 
 * Requer autenticação e permissão "Entity.delete"
 * 
 * Nota: Não é possível deletar entidade com campos associados.
 * Delete os campos primeiro.
 * 
 * Response 200: Entidade deletada com sucesso
 * Response 400: Entidade do sistema ou tem campos associados
 * Response 404: Entidade não encontrada
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.delete(
  '/:id',
  authorizationMiddleware('Entity', 'delete'),
  deleteEntity
);

export default router;

