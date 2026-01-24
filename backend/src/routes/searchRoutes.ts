/**
 * Rotas de busca global
 *
 * Define endpoints para busca global em múltiplas entidades.
 * Todas as rotas requerem autenticação.
 */

import express from 'express';
import { globalSearch } from '../controllers/searchController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
// Nota: Não usamos authorizationMiddleware para busca, pois permission check é feito no service

const router = express.Router();

/**
 * GET /api/search
 *
 * Busca global em múltiplas entidades.
 *
 * Requer autenticação.
 * Permissões são verificadas por entidade no service.
 *
 * Query params:
 * - q: string (obrigatório) - Termo de busca (tolerante a diacríticos)
 *   A busca é tolerante a acentos: buscar "jose" encontra "José", buscar "sao paulo" encontra "São Paulo"
 * - entities: string[] (opcional) - Entidades a buscar (contact, company, lead, opportunity)
 * - limit: number (opcional, default: 10, max: 100) - Limite por entidade
 *
 * Response 200: Resultados agregados por entidade
 * Response 400: Parâmetros inválidos
 * Response 401: Não autenticado
 */
router.get(
  '/',
  tenantContextMiddleware,
  authMiddleware,
  globalSearch
);

export default router;
