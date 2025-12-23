/**
 * Controller para lookup de entidades
 * 
 * Handler para rota de lookup de registros de uma entidade.
 * Retorna apenas id e label para uso em campos lookup.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { EntityLookupService } from '../services/entityLookupService';

/**
 * Busca registros de uma entidade para lookup
 * 
 * Retorna array de registros com id e label formatado.
 * 
 * @param req - Request com entityId nos params e query/limit nos query params
 * @param res - Response para retornar lista de registros
 */
export async function lookupEntity(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair ID dos params
    const entityId = req.params.entityId;
    if (!entityId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da entidade',
      });
      return;
    }

    // Extrair query params
    const query = req.query.query as string | undefined;
    const limitParam = req.query.limit as string | undefined;

    // Validar e processar limit
    let limit: number | undefined;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: 'limit deve ser um número entre 1 e 100',
        });
        return;
      }
      limit = parsedLimit;
    }

    // Buscar registros para lookup
    const records = await EntityLookupService.lookupEntityRecords(
      tenantId,
      entityId,
      query,
      limit
    );

    res.status(200).json(records);
  } catch (error: any) {
    if (error.message === 'Entidade não encontrada') {
      res.status(404).json({
        error: 'Entidade não encontrada',
        message: 'Entidade não encontrada ou não pertence ao tenant',
      });
      return;
    }

    console.error('Erro ao buscar lookup:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar registros para lookup',
    });
  }
}

