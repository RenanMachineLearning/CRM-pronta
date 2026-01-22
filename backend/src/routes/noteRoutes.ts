/**
 * Rotas de notas
 * 
 * Define endpoints para gestão de notas (CRUD).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
} from '../controllers/noteController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/notes
 * 
 * Lista notas do tenant atual com paginação e filtros.
 * 
 * Requer autenticação e permissão "Note.list"
 * 
 * Query params de paginação:
 * - page: número (opcional, default: 1) - Número da página (>= 1)
 * - limit: número (opcional, default: 20, max: 100) - Itens por página
 * - offset: número (opcional, legado) - Offset para paginação (compatibilidade)
 * 
 * Paginação padrão: page=1, limit=20
 * 
 * Exemplos de paginação:
 * - GET /api/notes?page=1&limit=20
 * - GET /api/notes?page=2&limit=10
 * - GET /api/notes?offset=20&limit=20 (legado, ainda funciona)
 * 
 * Query params de filtros:
 * - type: string (opcional: NOTE, COMMENT, ANNOTATION)
 * - relatedEntityType: string (opcional: Contact, Company, Lead, Opportunity, Task)
 * - relatedEntityId: string (opcional: UUID da entidade relacionada, deve ser fornecido junto com relatedEntityType)
 * - filters: JSON (opcional) - Filtros avançados (array de objetos Filter)
 * 
 * Query params de ordenação:
 * - sortBy: string | string[] (opcional) - Campo(s) para ordenação
 *   Exemplo simples: ?sortBy=createdAt
 *   Exemplo múltiplo: ?sortBy=createdAt,updatedAt
 * - sortOrder: 'asc' | 'desc' | ('asc' | 'desc')[] (opcional, default: 'asc')
 *   Exemplo simples: ?sortOrder=desc
 *   Exemplo múltiplo: ?sortOrder=desc,asc
 * - orderBy: string (opcional, legado) - Campo para ordenação (compatibilidade)
 * - order: 'asc' | 'desc' (opcional, legado) - Direção (compatibilidade)
 * 
 * Ordenação padrão: createdAt desc
 * 
 * Exemplo de filtros avançados:
 * ?filters=[{"field":"type","operator":"equals","value":"NOTE"},{"field":"createdAt","operator":"greaterThan","value":"2024-01-01"}]
 * 
 * Nota: relatedEntityType e relatedEntityId devem ser fornecidos juntos.
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
  authorizationMiddleware('Note', 'list'),
  listNotes
);

/**
 * GET /api/notes/:id
 * 
 * Obtém nota específica do tenant atual.
 * 
 * Requer autenticação e permissão "Note.read"
 * 
 * Response 200: Nota encontrada (com campos filtrados por permissão e relacionamentos: createdBy, relatedEntity)
 * Response 404: Nota não encontrada ou não pertence ao tenant
 * Response 400: ID inválido (formato UUID)
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/:id',
  authorizationMiddleware('Note', 'read'),
  getNote
);

/**
 * POST /api/notes
 * 
 * Cria nova nota no tenant atual.
 * 
 * Requer autenticação e permissão "Note.create"
 * 
 * Body:
 * {
 *   "content": "Cliente interessado em proposta. Seguir up em 2 dias." (obrigatório, máximo 10.000 caracteres),
 *   "type": "NOTE" (opcional: NOTE, COMMENT, ANNOTATION, default: NOTE),
 *   "relatedEntityType": "Contact" (obrigatório: Contact, Company, Lead, Opportunity, Task),
 *   "relatedEntityId": "uuid-entidade" (obrigatório: UUID da entidade relacionada)
 * }
 * 
 * Response 201: Nota criada (com campos filtrados por permissão)
 * Response 400: Dados inválidos (content vazio, excede 10.000 chars, UUID inválido, etc.)
 * Response 404: Entidade relacionada não encontrada ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/',
  authorizationMiddleware('Note', 'create'),
  createNote
);

/**
 * PUT /api/notes/:id
 * 
 * Atualiza nota existente no tenant atual.
 * 
 * Requer autenticação e permissão "Note.update"
 * 
 * Nota importante: Apenas o criador da nota OU um usuário com role Admin pode editar.
 * Esta validação é feita pelo service (diferente de permissões ACL).
 * 
 * Body (todos opcionais - partial update):
 * {
 *   "content": "Conteúdo atualizado da nota" (máximo 10.000 caracteres),
 *   "type": "COMMENT" (NOTE, COMMENT, ANNOTATION)
 * }
 * 
 * Nota: relatedEntityType e relatedEntityId não podem ser alterados após criação.
 * 
 * Response 200: Nota atualizada (com campos filtrados por permissão)
 * Response 400: Dados inválidos (content vazio, excede 10.000 chars, etc.)
 * Response 403: Sem permissão para editar (não é criador nem Admin) ou sem permissão para atualizar campos específicos
 * Response 404: Nota não encontrada ou não pertence ao tenant
 * Response 401: Não autenticado
 */
router.put(
  '/:id',
  authorizationMiddleware('Note', 'update'),
  updateNote
);

/**
 * DELETE /api/notes/:id
 * 
 * Deleta nota (soft delete - marca deletedAt).
 * 
 * Requer autenticação e permissão "Note.delete"
 * 
 * Nota importante: Apenas o criador da nota OU um usuário com role Admin pode deletar.
 * Esta validação é feita pelo service (diferente de permissões ACL).
 * 
 * Response 200: { "message": "Nota deletada com sucesso", "id": "uuid" }
 * Response 404: Nota não encontrada ou não pertence ao tenant
 * Response 400: ID inválido (formato UUID)
 * Response 403: Sem permissão para deletar (não é criador nem Admin)
 * Response 401: Não autenticado
 * 
 * Nota: Nota deletada não aparece em listagens (GET /api/notes).
 */
router.delete(
  '/:id',
  authorizationMiddleware('Note', 'delete'),
  deleteNote
);

export default router;
