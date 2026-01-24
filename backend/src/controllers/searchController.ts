/**
 * Controller de busca global
 *
 * Handlers para rotas de busca global.
 * Orquestra chamadas ao SearchService.
 *
 * Nota: Verificações de autorização são feitas via middleware.
 */

import { Request, Response } from 'express';
import { SearchService } from '../services/searchService';
import { validateSearchParams } from '../utils/searchHelpers';
import { SearchError } from '../types/search.types';
import type { GlobalSearchParams, SearchableEntity } from '../types/search.types';

/**
 * Busca global em múltiplas entidades
 *
 * @param req - Request com query params (q, entities[], limit)
 * @param res - Response para retornar resultados agregados
 *
 * Query params:
 * - q: string (obrigatório) - Termo de busca
 * - entities: string[] (opcional) - Entidades a buscar (contact, company, lead, opportunity)
 * - limit: number (opcional, default: 10, max: 100) - Limite por entidade
 *
 * Response 200:
 * {
 *   "query": "joão",
 *   "timestamp": "2024-01-15T10:30:00.000Z",
 *   "results": {
 *     "contacts": [...],
 *     "companies": [...],
 *     "leads": [...],
 *     "opportunities": [...]
 *   },
 *   "totals": {
 *     "contacts": 150,
 *     "companies": 45,
 *     "leads": 200,
 *     "opportunities": 75
 *   }
 * }
 *
 * Response 400: Parâmetros inválidos
 * Response 401: Não autenticado
 * Response 500: Erro interno
 */
export async function searchGlobal(req: Request, res: Response, next: any): Promise<void> {
  try {
    // Validar tenantId e userId (inseridos pelos middlewares)
    const tenantId = req.tenantId;
    const userId = req.userId;

    if (!tenantId || !userId) {
      res.status(401).json({
        error: 'Não autenticado',
        message: 'Requer autenticação',
      });
      return;
    }

    // Extrair parâmetros
    let entities: SearchableEntity[] | undefined;
    if (req.query.entities) {
      if (typeof req.query.entities === 'string') {
        entities = [req.query.entities as SearchableEntity];
      } else if (Array.isArray(req.query.entities)) {
        entities = req.query.entities as SearchableEntity[];
      }
    }

    const params: GlobalSearchParams = {
      query: req.query.q as string,
      entities,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    // Validar parâmetros
    validateSearchParams(params);

    // Executar busca global
    const result = await SearchService.searchGlobal(
      params,
      tenantId,
      userId
    );

    res.status(200).json(result);
  } catch (error: any) {
    // Tratar erros específicos
    if (error instanceof SearchError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }

    console.error('Erro ao executar busca global:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao executar busca',
    });
  }
}
