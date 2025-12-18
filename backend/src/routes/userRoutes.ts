/**
 * Rotas de usuários
 * 
 * Define endpoints para gestão de usuários (CRUD).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/users
 * 
 * Lista usuários do tenant atual com paginação e filtros.
 * 
 * Requer autenticação e permissão "User.list"
 * 
 * Query params:
 * - limit: número (opcional, default: 20, max: 100)
 * - offset: número (opcional, default: 0)
 * - status: string (opcional: ACTIVE, INACTIVE, BLOCKED)
 * - roleId: string (opcional: filtrar por role)
 * 
 * Response 200:
 * {
 *   "data": [...],
 *   "pagination": { "total": 100, "limit": 20, "offset": 0 }
 * }
 * 
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/',
  authorizationMiddleware('User', 'list'),
  listUsers
);

/**
 * GET /api/users/:id
 * 
 * Obtém usuário específico do tenant atual.
 * 
 * Requer autenticação e permissão "User.read"
 * 
 * Response 200: Usuário encontrado
 * Response 404: Usuário não encontrado ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/:id',
  authorizationMiddleware('User', 'read'),
  getUser
);

/**
 * POST /api/users
 * 
 * Cria novo usuário no tenant atual.
 * 
 * Requer autenticação e permissão "User.create"
 * 
 * Body:
 * {
 *   "email": "user@example.com",
 *   "name": "Nome do Usuário",
 *   "password": "senha123",
 *   "roleIds": ["uuid-role-1", "uuid-role-2"] (opcional)
 * }
 * 
 * Response 201: Usuário criado
 * Response 400: Dados inválidos
 * Response 409: Email já está em uso
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/',
  authorizationMiddleware('User', 'create'),
  createUser
);

/**
 * PUT /api/users/:id
 * 
 * Atualiza usuário existente no tenant atual.
 * 
 * Requer autenticação e permissão "User.update"
 * 
 * Body (todos opcionais):
 * {
 *   "name": "Novo Nome",
 *   "email": "novo@example.com",
 *   "status": "ACTIVE",
 *   "roleIds": ["uuid-role-1"] (substitui completamente as roles)
 * }
 * 
 * Nota: Alteração de senha não faz parte deste endpoint.
 * Password será tratado em endpoint específico.
 * 
 * Response 200: Usuário atualizado
 * Response 400: Dados inválidos
 * Response 404: Usuário não encontrado
 * Response 409: Email já está em uso
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.put(
  '/:id',
  authorizationMiddleware('User', 'update'),
  updateUser
);

/**
 * DELETE /api/users/:id
 * 
 * Deleta usuário (soft delete - marca como INACTIVE).
 * 
 * Requer autenticação e permissão "User.delete"
 * 
 * Response 200: Usuário deletado com sucesso
 * Response 404: Usuário não encontrado
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: Se o usuário já estiver INACTIVE, retorna 200 OK (idempotência).
 */
router.delete(
  '/:id',
  authorizationMiddleware('User', 'delete'),
  deleteUser
);

export default router;

