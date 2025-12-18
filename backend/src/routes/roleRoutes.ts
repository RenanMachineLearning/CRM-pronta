/**
 * Rotas de roles
 * 
 * Define endpoints para gestão de roles (CRUD).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/roleController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/roles
 * 
 * Lista roles do tenant atual (apenas ativas por padrão).
 * 
 * Requer autenticação e permissão "Role.list"
 * 
 * Response 200:
 * {
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "name": "Admin",
 *       "description": "Administrador com acesso total",
 *       "isActive": true,
 *       "permissionsCount": 42,
 *       "usersCount": 5,
 *       "createdAt": "2024-01-01T00:00:00.000Z"
 *     }
 *   ]
 * }
 * 
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/',
  authorizationMiddleware('Role', 'list'),
  listRoles
);

/**
 * GET /api/roles/:id
 * 
 * Obtém role específica do tenant atual com permissões.
 * 
 * Requer autenticação e permissão "Role.read"
 * 
 * Response 200: Role encontrada com permissões
 * Response 404: Role não encontrada ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/:id',
  authorizationMiddleware('Role', 'read'),
  getRole
);

/**
 * POST /api/roles
 * 
 * Cria nova role no tenant atual.
 * 
 * Requer autenticação e permissão "Role.create"
 * 
 * Body:
 * {
 *   "name": "Gerente",
 *   "description": "Gerente de vendas",
 *   "permissionIds": ["uuid-perm-1", "uuid-perm-2"] (opcional)
 * }
 * 
 * Response 201: Role criada
 * Response 400: Dados inválidos
 * Response 409: Nome já está em uso
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/',
  authorizationMiddleware('Role', 'create'),
  createRole
);

/**
 * PUT /api/roles/:id
 * 
 * Atualiza role existente no tenant atual.
 * 
 * Requer autenticação e permissão "Role.update"
 * 
 * Body (todos opcionais):
 * {
 *   "name": "Gerente Atualizado",
 *   "description": "Nova descrição",
 *   "permissionIds": ["uuid-perm-1"] (substitui completamente as permissões)
 * }
 * 
 * Nota: Se permissionIds for fornecido, substitui completamente as permissões atuais.
 * Se permissionIds for omitido, as permissões permanecem inalteradas.
 * 
 * Response 200: Role atualizada
 * Response 400: Dados inválidos
 * Response 404: Role não encontrada
 * Response 409: Nome já está em uso
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.put(
  '/:id',
  authorizationMiddleware('Role', 'update'),
  updateRole
);

/**
 * DELETE /api/roles/:id
 * 
 * Deleta role (soft delete - marca isActive = false).
 * 
 * Requer autenticação e permissão "Role.delete"
 * 
 * Response 200: Role deletada com sucesso
 * Response 404: Role não encontrada
 * Response 409: Role está em uso por usuários
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: Se a role já estiver com isActive = false, retorna 200 OK (idempotência).
 * Se a role estiver em uso por usuários, retorna 409 Conflict.
 */
router.delete(
  '/:id',
  authorizationMiddleware('Role', 'delete'),
  deleteRole
);

export default router;

