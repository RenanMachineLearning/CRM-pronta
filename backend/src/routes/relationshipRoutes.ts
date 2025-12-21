/**
 * Rotas de relacionamentos entre entidades
 * 
 * Define endpoints para gestão de relacionamentos (CRUD).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  listEntityRelationships,
  createRelationship,
  deleteRelationship,
} from '../controllers/relationshipController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/entities/:id/relationships
 * 
 * Lista relacionamentos de uma entidade específica.
 * Retorna relacionamentos onde a entidade é source ou target.
 * 
 * Requer autenticação e permissão "Relationship.list"
 * 
 * Response 200:
 * [
 *   {
 *     "id": "uuid",
 *     "type": "oneToMany",
 *     "name": "companies",
 *     "sourceEntity": {
 *       "id": "uuid",
 *       "name": "Contact",
 *       "label": "Contato"
 *     },
 *     "targetEntity": {
 *       "id": "uuid",
 *       "name": "Company",
 *       "label": "Empresa"
 *     },
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "updatedAt": "2024-01-01T00:00:00.000Z"
 *   },
 *   ...
 * ]
 * 
 * Response 404: Entidade não encontrada
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/entities/:id/relationships',
  authorizationMiddleware('Relationship', 'list'),
  listEntityRelationships
);

/**
 * POST /api/relationships
 * 
 * Cria novo relacionamento entre entidades.
 * 
 * Requer autenticação e permissão "Relationship.create"
 * 
 * Body:
 * {
 *   "sourceEntityId": "uuid",
 *   "targetEntityId": "uuid",
 *   "type": "oneToMany" | "manyToMany",
 *   "name": "companies"
 * }
 * 
 * Nota sobre direcionalidade:
 * - O modelo assume sourceEntity → targetEntity (direcional)
 * - O nome do relacionamento (name) pertence ao lado sourceEntity
 * - Exemplo: se Contact (source) tem relacionamento "companies" com Company (target),
 *   o nome "companies" é do ponto de vista de Contact
 * 
 * Response 201: Relacionamento criado
 * Response 400: Dados inválidos
 * Response 404: Entidade não encontrada
 * Response 409: Nome já está em uso para esta entidade origem
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/relationships',
  authorizationMiddleware('Relationship', 'create'),
  createRelationship
);

/**
 * DELETE /api/relationships/:id
 * 
 * Deleta relacionamento.
 * 
 * Requer autenticação e permissão "Relationship.delete"
 * 
 * Nota: EntityRelationData (links entre registros) são removidos
 * automaticamente via CASCADE no Prisma.
 * 
 * Response 200: Relacionamento deletado com sucesso
 * Response 404: Relacionamento não encontrado
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.delete(
  '/relationships/:id',
  authorizationMiddleware('Relationship', 'delete'),
  deleteRelationship
);

export default router;

