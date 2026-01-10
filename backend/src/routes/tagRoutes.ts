/**
 * Rotas de tags
 * 
 * Define endpoints para gestão de tags (CRUD).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  listTags,
  createTag,
  updateTag,
  deleteTag,
} from '../controllers/tagController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/tags
 * 
 * Lista tags do tenant atual com paginação e ordenação.
 * 
 * Requer autenticação (sem permissão específica - qualquer usuário autenticado pode listar).
 * 
 * Query params:
 * - limit: número (opcional, default: 100, max: 1000)
 * - offset: número (opcional, default: 0)
 * - orderBy: string (opcional: name, createdAt, default: name)
 * - order: string (opcional: asc, desc, default: asc)
 * 
 * @returns Array de tags
 */
router.get(
  '/',
  listTags
);

/**
 * POST /api/tags
 * 
 * Cria nova tag.
 * 
 * Requer autenticação e permissão "Tag.create".
 * 
 * Body:
 * - name: string (obrigatório)
 * - color: string (opcional, formato hex #RRGGBB ou #RRGGBBAA, padrão: #3B82F6)
 * 
 * @returns Tag criada
 */
router.post(
  '/',
  authorizationMiddleware('Tag', 'create'),
  createTag
);

/**
 * PUT /api/tags/:id
 * 
 * Atualiza tag existente.
 * 
 * Requer autenticação e permissão "Tag.update".
 * 
 * Params:
 * - id: string (UUID da tag)
 * 
 * Body:
 * - name: string (opcional)
 * - color: string (opcional, formato hex #RRGGBB ou #RRGGBBAA)
 * 
 * @returns Tag atualizada
 */
router.put(
  '/:id',
  authorizationMiddleware('Tag', 'update'),
  updateTag
);

/**
 * DELETE /api/tags/:id
 * 
 * Deleta tag (hard delete).
 * Remove automaticamente todas as associações (ContactTag e CompanyTag) via cascade.
 * 
 * Requer autenticação e permissão "Tag.delete".
 * 
 * Params:
 * - id: string (UUID da tag)
 * 
 * @returns Confirmação de deleção
 */
router.delete(
  '/:id',
  authorizationMiddleware('Tag', 'delete'),
  deleteTag
);

export default router;

