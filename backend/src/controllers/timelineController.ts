/**
 * Controller de timeline
 * 
 * Handlers para rotas de timeline/histórico de atividades.
 * Orquestra chamadas ao TimelineService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { TimelineService, PaginationParams } from '../services/timelineService';

/**
 * GET /api/timeline/:entityType/:entityId
 * 
 * Obtém timeline de atividades relacionadas a uma entidade
 * 
 * @param req - Request com params (entityType, entityId) e query (limit, offset)
 * @param res - Response com timeline
 */
export async function getTimeline(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair params
    const entityType = req.params.entityType as string;
    const entityId = req.params.entityId as string;

    // Extrair query params
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    // Validar entityType
    const validEntityTypes = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task'];
    if (!validEntityTypes.includes(entityType)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: `Tipo de entidade inválido: ${entityType}. Valores válidos: ${validEntityTypes.join(', ')}`,
      });
      return;
    }

    // Validar entityId (formato UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(entityId)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'ID da entidade deve ser um UUID válido',
      });
      return;
    }

    // Validar limit
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'limit deve ser um número entre 1 e 100',
      });
      return;
    }

    // Validar offset
    if (offset !== undefined && (isNaN(offset) || offset < 0)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'offset deve ser um número maior ou igual a 0',
      });
      return;
    }

    // Construir parâmetros de paginação
    const pagination: PaginationParams = {};
    if (limit !== undefined) {
      pagination.limit = limit;
    }
    if (offset !== undefined) {
      pagination.offset = offset;
    }

    // Buscar timeline
    const timeline = await TimelineService.getTimeline(
      entityType,
      entityId,
      tenantId,
      pagination
    );

    // Retornar resposta
    res.status(200).json(timeline);
  } catch (error) {
    // Tratar erros do service
    if (error instanceof Error) {
      // Erro de entidade não encontrada ou não pertence ao tenant
      if (
        error.message.includes('não encontrado') ||
        error.message.includes('não pertence') ||
        error.message.includes('foi deletado')
      ) {
        res.status(404).json({
          error: 'Não encontrado',
          message: error.message,
        });
        return;
      }

      // Erro de validação (entityType inválido, UUID inválido, etc.)
      if (
        error.message.includes('inválido') ||
        error.message.includes('UUID')
      ) {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: error.message,
        });
        return;
      }
    }

    // Erro inesperado
    console.error('Erro ao buscar timeline:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar timeline',
    });
  }
}
