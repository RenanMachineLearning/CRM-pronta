/**
 * Rotas de leads
 * 
 * Define endpoints para gestão de leads (CRUD).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  listLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  convertLead,
} from '../controllers/leadController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';
import { invalidateEntityCache } from '../middleware/cacheInvalidation';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/leads
 * 
 * Lista leads do tenant atual com paginação e filtros.
 * 
 * Requer autenticação e permissão "Lead.list"
 * 
 * Query params de paginação:
 * - page: número (opcional, default: 1) - Número da página (>= 1)
 * - limit: número (opcional, default: 20, max: 100) - Itens por página
 * - offset: número (opcional, legado) - Offset para paginação (compatibilidade)
 * 
 * Paginação padrão: page=1, limit=20
 * 
 * Exemplos de paginação:
 * - GET /api/leads?page=1&limit=20
 * - GET /api/leads?page=2&limit=10
 * - GET /api/leads?offset=20&limit=20 (legado, ainda funciona)
 * 
 * Query params de filtros:
 * - status: string (opcional: NEW, QUALIFIED, CONVERTED, LOST)
 * - source: string (opcional: busca parcial case-insensitive)
 * - converted: boolean (opcional: true ou false)
 * - q: string (opcional) - Termo de busca textual (tolerante a diacríticos)
 *   A busca é tolerante a acentos: buscar "joao" encontra "João"
 * 
 * Query params de ordenação:
 * - sortBy: string | string[] (opcional) - Campo(s) para ordenação
 *   Exemplo simples: ?sortBy=firstName
 *   Exemplo múltiplo: ?sortBy=status,firstName
 * - sortOrder: 'asc' | 'desc' | ('asc' | 'desc')[] (opcional, default: 'asc')
 *   Exemplo simples: ?sortOrder=asc
 *   Exemplo múltiplo: ?sortOrder=asc,desc
 * - orderBy: string (opcional, legado) - Campo para ordenação (compatibilidade)
 * - order: 'asc' | 'desc' (opcional, legado) - Direção (compatibilidade)
 * 
 * Ordenação padrão: createdAt desc
 * - filters: JSON (opcional) - Filtros avançados (array de objetos Filter)
 * 
 * Exemplo de filtros avançados:
 * ?filters=[{"field":"status","operator":"equals","value":"NEW"},{"field":"createdAt","operator":"greaterThan","value":"2024-01-01"}]
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
  authorizationMiddleware('Lead', 'list'),
  listLeads
);

/**
 * POST /api/leads/:id/convert
 * 
 * Converte lead em contato e/ou oportunidade.
 * 
 * Requer autenticação e permissão "Lead.convert"
 * 
 * Body:
 * {
 *   "createContact": true,
 *   "createOpportunity": true,
 *   "opportunityData": {
 *     "name": "Negócio ABC" (opcional),
 *     "value": 50000.00 (obrigatório se createOpportunity = true),
 *     "currency": "BRL" (opcional, default: "BRL"),
 *     "stageId": "uuid-stage" (opcional, usa primeiro estágio do pipeline padrão se não fornecido),
 *     "closeDate": "2024-12-31T00:00:00Z" (opcional),
 *     "probability": 60 (opcional, 0-100, usa do estágio se não fornecido)
 *   }
 * }
 * 
 * Response 200: Resultado da conversão (lead atualizado, contato e oportunidade criados)
 * Response 400: Dados inválidos
 * Response 404: Lead não encontrado
 * Response 409: Lead já convertido
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * IMPORTANTE: Esta rota deve vir ANTES da rota /:id para evitar conflito de roteamento
 */
router.post(
  '/:id/convert',
  authorizationMiddleware('Lead', 'convert'),
  convertLead
);

/**
 * GET /api/leads/:id
 * 
 * Obtém lead específico do tenant atual.
 * 
 * Requer autenticação e permissão "Lead.read"
 * 
 * Response 200: Lead encontrado (com campos filtrados por permissão)
 * Response 404: Lead não encontrado ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/:id',
  authorizationMiddleware('Lead', 'read'),
  getLead
);

/**
 * POST /api/leads
 * 
 * Cria novo lead no tenant atual.
 * 
 * Requer autenticação e permissão "Lead.create"
 * 
 * Body:
 * {
 *   "firstName": "João",
 *   "lastName": "Silva" (opcional),
 *   "email": "joao@example.com" (opcional),
 *   "phone": "+55 11 99999-9999" (opcional),
 *   "company": "Empresa ABC" (opcional),
 *   "source": "website" (opcional),
 *   "status": "NEW" (opcional: NEW, QUALIFIED, CONVERTED, LOST, default: NEW),
 *   "tagIds": ["uuid-tag-1", "uuid-tag-2"] (opcional),
 *   "customFields": { ... } (opcional)
 * }
 * 
 * Response 201: Lead criado (com campos filtrados por permissão)
 * Response 400: Dados inválidos
 * Response 404: Tag não encontrada (se tagIds fornecidos)
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/',
  authorizationMiddleware('Lead', 'create'),
  invalidateEntityCache('lead'),
  createLead
);

/**
 * PUT /api/leads/:id
 * 
 * Atualiza lead existente no tenant atual.
 * 
 * Requer autenticação e permissão "Lead.update"
 * 
 * Body (todos opcionais):
 * {
 *   "firstName": "João",
 *   "lastName": "Silva",
 *   "email": "joao@example.com",
 *   "phone": "+55 11 99999-9999",
 *   "company": "Empresa ABC",
 *   "source": "website",
 *   "status": "QUALIFIED",
 *   "tagIds": [...] (substitui completamente as tags existentes),
 *   "customFields": { ... }
 * }
 * 
 * Nota: Arrays de relacionamentos (tagIds) substituem completamente os existentes.
 * 
 * Response 200: Lead atualizado (com campos filtrados por permissão)
 * Response 400: Dados inválidos
 * Response 403: Sem permissão para atualizar campos específicos
 * Response 404: Lead ou tag não encontrada
 * Response 401: Não autenticado
 */
router.put(
  '/:id',
  authorizationMiddleware('Lead', 'update'),
  updateLead
);

/**
 * DELETE /api/leads/:id
 * 
 * Deleta lead (soft delete - marca deletedAt).
 * 
 * Requer autenticação e permissão "Lead.delete"
 * 
 * Response 200: { "message": "Lead deletado com sucesso", "id": "uuid" }
 * Response 404: Lead não encontrado ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: LeadTag são deletados automaticamente via cascade.
 */
router.delete(
  '/:id',
  authorizationMiddleware('Lead', 'delete'),
  invalidateEntityCache('lead'),
  deleteLead
);

export default router;
