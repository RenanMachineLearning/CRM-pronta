/**
 * Rotas de oportunidades
 * 
 * Define endpoints para gestão de oportunidades (CRUD).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  listOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
} from '../controllers/opportunityController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/opportunities
 * 
 * Lista oportunidades do tenant atual com paginação e filtros.
 * 
 * Requer autenticação e permissão "Opportunity.list"
 * 
 * Query params:
 * - limit: número (opcional, default: 20, max: 100)
 * - offset: número (opcional, default: 0)
 * - stageId: string (opcional: UUID do estágio do pipeline)
 * - status: string (opcional: OPEN, WON, LOST, ARCHIVED)
 * - contactId: string (opcional: UUID do contato)
 * - companyId: string (opcional: UUID da empresa)
 * - orderBy: string (opcional: value, closeDate, createdAt, default: createdAt)
 * - order: string (opcional: asc, desc, default: desc)
 * - q: string (opcional) - Termo de busca textual
 * - filters: JSON (opcional) - Filtros avançados (array de objetos Filter)
 * 
 * Exemplo de filtros avançados:
 * ?filters=[{"field":"status","operator":"equals","value":"OPEN"},{"field":"value","operator":"greaterThan","value":10000}]
 * 
 * Response 200:
 * {
 *   "data": [...],
 *   "pagination": { "total": 100, "limit": 20, "offset": 0 }
 * }
 * 
 * Response 400: Parâmetros inválidos
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/',
  authorizationMiddleware('Opportunity', 'list'),
  listOpportunities
);

/**
 * GET /api/opportunities/:id
 * 
 * Obtém oportunidade específica do tenant atual.
 * 
 * Requer autenticação e permissão "Opportunity.read"
 * 
 * Response 200: Oportunidade encontrada (com campos filtrados por permissão)
 * Response 404: Oportunidade não encontrada ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/:id',
  authorizationMiddleware('Opportunity', 'read'),
  getOpportunity
);

/**
 * POST /api/opportunities
 * 
 * Cria nova oportunidade no tenant atual.
 * 
 * Requer autenticação e permissão "Opportunity.create"
 * 
 * Body:
 * {
 *   "name": "Negócio ABC" (obrigatório),
 *   "value": 50000.00 (obrigatório, número positivo),
 *   "currency": "BRL" (opcional, default: "BRL"),
 *   "stageId": "uuid-stage" (obrigatório, UUID do PipelineStage),
 *   "status": "OPEN" (opcional: OPEN, WON, LOST, ARCHIVED, default: OPEN),
 *   "closeDate": "2024-12-31T00:00:00Z" (opcional, deve ser futura ou presente),
 *   "probability": 60 (opcional, 0-100, se não fornecido usa do PipelineStage),
 *   "contactId": "uuid-contact" (opcional),
 *   "companyId": "uuid-company" (opcional),
 *   "leadId": "uuid-lead" (opcional),
 *   "tagIds": ["uuid-tag-1", "uuid-tag-2"] (opcional),
 *   "customFields": { ... } (opcional)
 * }
 * 
 * Response 201: Oportunidade criada (com campos filtrados por permissão)
 * Response 400: Dados inválidos
 * Response 404: PipelineStage, Contact, Company ou Lead não encontrado (se fornecido)
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/',
  authorizationMiddleware('Opportunity', 'create'),
  createOpportunity
);

/**
 * PUT /api/opportunities/:id
 * 
 * Atualiza oportunidade existente no tenant atual.
 * 
 * Requer autenticação e permissão "Opportunity.update"
 * 
 * Body (todos opcionais):
 * {
 *   "name": "Negócio ABC",
 *   "value": 60000.00 (número positivo),
 *   "currency": "BRL",
 *   "stageId": "uuid-stage" (UUID do PipelineStage),
 *   "status": "OPEN",
 *   "closeDate": "2024-12-31T00:00:00Z" (ou null para remover),
 *   "probability": 70 (0-100, ou null para remover),
 *   "contactId": "uuid-contact" (ou null para remover associação),
 *   "companyId": "uuid-company" (ou null para remover associação),
 *   "leadId": "uuid-lead" (ou null para remover associação),
 *   "tagIds": [...] (substitui completamente as tags existentes),
 *   "customFields": { ... }
 * }
 * 
 * Nota: Arrays de relacionamentos (tagIds) substituem completamente os existentes.
 * 
 * Response 200: Oportunidade atualizada (com campos filtrados por permissão)
 * Response 400: Dados inválidos
 * Response 403: Sem permissão para atualizar campos específicos
 * Response 404: Oportunidade, PipelineStage, Contact, Company ou Lead não encontrado
 * Response 401: Não autenticado
 */
router.put(
  '/:id',
  authorizationMiddleware('Opportunity', 'update'),
  updateOpportunity
);

/**
 * DELETE /api/opportunities/:id
 * 
 * Deleta oportunidade (soft delete - marca deletedAt).
 * 
 * Requer autenticação e permissão "Opportunity.delete"
 * 
 * Response 200: { "message": "Oportunidade deletada com sucesso", "id": "uuid" }
 * Response 404: Oportunidade não encontrada ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: OpportunityTag são deletados automaticamente via cascade.
 */
router.delete(
  '/:id',
  authorizationMiddleware('Opportunity', 'delete'),
  deleteOpportunity
);

export default router;
