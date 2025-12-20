/**
 * Controller de logs de auditoria
 * 
 * Handlers para rotas de consulta de histórico de alterações.
 * Orquestra chamadas ao AuditLogService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { AuditLogService, AuditEntityEnum } from '../services/auditLogService';
import { AuditAction } from '../utils/auditLog';

/**
 * Lista logs de auditoria com paginação e filtros
 * 
 * @param req - Request com query params (limit, offset, entityType, entityId, userId, action, dateFrom, dateTo)
 * @param res - Response para retornar lista de logs
 */
export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair query params
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId as string | undefined;
    const userId = req.query.userId as string | undefined;
    const action = req.query.action as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

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

    // Validar entityType se fornecido
    if (entityType) {
      const validEntityTypes = Object.values(AuditEntityEnum);
      if (!validEntityTypes.includes(entityType as AuditEntityEnum)) {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: `entityType deve ser um dos valores: ${validEntityTypes.join(', ')}`,
        });
        return;
      }
    }

    // Validar action se fornecido
    if (action) {
      const validActions: AuditAction[] = ['create', 'update', 'delete'];
      if (!validActions.includes(action as AuditAction)) {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: `action deve ser um dos valores: ${validActions.join(', ')}`,
        });
        return;
      }
    }

    // Validar e converter dates
    let dateFromDate: Date | undefined;
    let dateToDate: Date | undefined;

    if (dateFrom) {
      dateFromDate = new Date(dateFrom);
      if (isNaN(dateFromDate.getTime())) {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: 'dateFrom deve ser uma data ISO válida',
        });
        return;
      }
    }

    if (dateTo) {
      dateToDate = new Date(dateTo);
      if (isNaN(dateToDate.getTime())) {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: 'dateTo deve ser uma data ISO válida',
        });
        return;
      }
    }

    // Buscar logs
    const result = await AuditLogService.listAuditLogs(
      tenantId,
      {
        entityType,
        entityId,
        userId,
        action,
        dateFrom: dateFromDate,
        dateTo: dateToDate,
      },
      {
        limit,
        offset,
      }
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao listar logs de auditoria:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar logs de auditoria',
    });
  }
}

/**
 * Obtém histórico completo de alterações de uma entidade específica
 * 
 * @param req - Request com entityType e entityId nos params
 * @param res - Response para retornar histórico
 */
export async function getEntityHistory(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair params da URL
    const entityType = req.params.entityType;
    const entityId = req.params.entityId;

    if (!entityType || !entityId) {
      res.status(400).json({
        error: 'Parâmetros inválidos',
        message: 'entityType e entityId são obrigatórios',
      });
      return;
    }

    // Validar entityType
    const validEntityTypes = Object.values(AuditEntityEnum);
    if (!validEntityTypes.includes(entityType as AuditEntityEnum)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: `entityType deve ser um dos valores: ${validEntityTypes.join(', ')}`,
      });
      return;
    }

    // Buscar histórico
    const history = await AuditLogService.getEntityHistory(entityType, entityId, tenantId);

    // Sempre retorna 200, mesmo se array estiver vazio
    // Entidade pode existir sem histórico de alterações
    res.status(200).json(history);
  } catch (error: any) {
    console.error('Erro ao obter histórico de entidade:', error);
    
    // Se erro de validação do service, retornar 400
    if (error.message && error.message.includes('entityType inválido')) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao obter histórico de entidade',
    });
  }
}

