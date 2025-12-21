/**
 * Rotas de campos (metadados)
 * 
 * Define endpoints para gestão de campos (CRUD).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  listFields,
  getField,
  createField,
  updateField,
  deleteField,
} from '../controllers/fieldController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/entities/:entityId/fields
 * 
 * Lista campos de uma entidade ordenados por order.
 * 
 * Requer autenticação e permissão "Field.list"
 * 
 * Query params:
 * - includeDeletedFields (opcional): Se "true", inclui campos deletados (soft delete)
 * 
 * Response 200:
 * [
 *   {
 *     "id": "uuid",
 *     "entityId": "uuid",
 *     "name": "email",
 *     "label": "E-mail",
 *     "type": "text",
 *     "required": true,
 *     "unique": true,
 *     "defaultValue": null,
 *     "options": null,
 *     "tenantId": "uuid",
 *     "order": 0,
 *     "isDeleted": false,
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
  '/entities/:entityId/fields',
  authorizationMiddleware('Field', 'list'),
  listFields
);

/**
 * GET /api/fields/:id
 * 
 * Obtém campo específico do tenant atual.
 * 
 * Requer autenticação e permissão "Field.read"
 * 
 * Response 200:
 * {
 *   "id": "uuid",
 *   "entityId": "uuid",
 *   "name": "email",
 *   "label": "E-mail",
 *   "type": "text",
 *   "required": true,
 *   "unique": true,
 *   "defaultValue": null,
 *   "options": null,
 *   "tenantId": "uuid",
 *   "order": 0,
 *   "isDeleted": false,
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-01T00:00:00.000Z",
 *   "entity": {
 *     "id": "uuid",
 *     "name": "Contact",
 *     "label": "Contato",
 *     "isSystem": true
 *   }
 * }
 * 
 * Response 404: Campo não encontrado ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/fields/:id',
  authorizationMiddleware('Field', 'read'),
  getField
);

/**
 * POST /api/entities/:entityId/fields
 * 
 * Cria novo campo customizado na entidade especificada.
 * 
 * Requer autenticação e permissão "Field.create"
 * 
 * Body:
 * {
 *   "name": "customField",
 *   "label": "Campo Customizado",
 *   "type": "text",
 *   "required": false,
 *   "unique": false,
 *   "defaultValue": null,
 *   "options": null,
 *   "order": 0
 * }
 * 
 * Tipos suportados: "text", "number", "date", "boolean", "lookup", "select"
 * 
 * Para campos "select", options deve ser:
 * [
 *   { "value": "option1", "label": "Opção 1", "color": "#FF0000" },
 *   ...
 * ]
 * 
 * Response 201: Campo criado
 * Response 400: Dados inválidos
 * Response 404: Entidade não encontrada
 * Response 409: Nome já está em uso na entidade
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/entities/:entityId/fields',
  authorizationMiddleware('Field', 'create'),
  createField
);

/**
 * PUT /api/fields/:id
 * 
 * Atualiza campo existente no tenant atual (tipo não pode ser alterado).
 * 
 * Requer autenticação e permissão "Field.update"
 * 
 * Body:
 * {
 *   "label": "Novo Label",
 *   "required": true,
 *   "unique": false,
 *   "defaultValue": null,
 *   "options": [...],
 *   "order": 1
 * }
 * 
 * Nota: Campos de entidades do sistema não podem ser alterados.
 * Nota: Tipo do campo não pode ser alterado após criação.
 * 
 * Response 200: Campo atualizado
 * Response 400: Dados inválidos ou campo do sistema
 * Response 404: Campo não encontrado
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.put(
  '/fields/:id',
  authorizationMiddleware('Field', 'update'),
  updateField
);

/**
 * DELETE /api/fields/:id
 * 
 * Soft delete do campo (marca isDeleted: true).
 * 
 * Requer autenticação e permissão "Field.delete"
 * 
 * Nota: Campos de entidades do sistema não podem ser deletados.
 * Nota: Soft delete preserva dados históricos (não apaga valores em JSON).
 * 
 * Response 200: Campo deletado com sucesso
 * Response 400: Campo do sistema
 * Response 404: Campo não encontrado
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.delete(
  '/fields/:id',
  authorizationMiddleware('Field', 'delete'),
  deleteField
);

export default router;

