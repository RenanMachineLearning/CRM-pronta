/**
 * Controller de oportunidades
 * 
 * Handlers para rotas de gestão de oportunidades (CRUD).
 * Orquestra chamadas ao OpportunityService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { OpportunityService } from '../services/opportunityService';
import { OpportunityStatus } from '@prisma/client';
import { validatePositiveNumber, validateDateNotPast, validateProbability } from '../utils/validators';
import { FieldValidationError } from '../utils/fieldValueValidator';
import { UniqueFieldValidationError } from '../utils/uniqueFieldValidator';

/**
 * Lista oportunidades com paginação e filtros
 * 
 * @param req - Request com query params (limit, offset, stageId, status, contactId, companyId, orderBy, order)
 * @param res - Response para retornar lista de oportunidades
 */
export async function listOpportunities(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair query params
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    const stageId = req.query.stageId as string | undefined;
    const status = req.query.status as string | undefined;
    const contactId = req.query.contactId as string | undefined;
    const companyId = req.query.companyId as string | undefined;
    const orderBy = req.query.orderBy as string | undefined;
    const order = req.query.order as string | undefined;

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

    // Validar status
    if (status && !['OPEN', 'WON', 'LOST', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'status deve ser OPEN, WON, LOST ou ARCHIVED',
      });
      return;
    }

    // Validar UUIDs se fornecidos
    if (stageId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stageId)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'stageId deve ser um UUID válido',
      });
      return;
    }

    if (contactId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'contactId deve ser um UUID válido',
      });
      return;
    }

    if (companyId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'companyId deve ser um UUID válido',
      });
      return;
    }

    // Validar orderBy
    if (orderBy && !['value', 'closeDate', 'createdAt'].includes(orderBy)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'orderBy deve ser value, closeDate ou createdAt',
      });
      return;
    }

    // Validar order
    if (order && !['asc', 'desc'].includes(order)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'order deve ser asc ou desc',
      });
      return;
    }

    // Chamar service
    const result = await OpportunityService.listOpportunities(
      tenantId,
      {
        stageId,
        status: status as OpportunityStatus | undefined,
        contactId,
        companyId,
      },
      {
        limit,
        offset,
        orderBy: orderBy as 'value' | 'closeDate' | 'createdAt' | undefined,
        order: order as 'asc' | 'desc' | undefined,
      },
      userId
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao listar oportunidades:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar oportunidades',
    });
  }
}

/**
 * Obtém oportunidade específica
 * 
 * @param req - Request com id nos params
 * @param res - Response para retornar oportunidade
 */
export async function getOpportunity(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const opportunityId = req.params.id;
    if (!opportunityId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da oportunidade',
      });
      return;
    }

    // Chamar service
    const opportunity = await OpportunityService.getOpportunityById(opportunityId, tenantId, userId);

    if (!opportunity) {
      res.status(404).json({
        error: 'Oportunidade não encontrada',
        message: 'Oportunidade não encontrada ou não pertence ao seu tenant',
      });
      return;
    }

    res.status(200).json(opportunity);
  } catch (error: any) {
    console.error('Erro ao buscar oportunidade:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar oportunidade',
    });
  }
}

/**
 * Cria nova oportunidade
 * 
 * @param req - Request com dados da oportunidade no body
 * @param res - Response para retornar oportunidade criada
 */
export async function createOpportunity(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Validar que id não foi fornecido (gerado automaticamente)
    if (req.body.id !== undefined) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'Não é permitido fornecer id ao criar oportunidade',
      });
      return;
    }

    // Extrair dados do body
    const {
      name,
      value,
      currency,
      stageId,
      status,
      closeDate,
      probability,
      contactId,
      companyId,
      leadId,
      tagIds,
      customFields,
    } = req.body;

    // Validar dados obrigatórios
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'name é obrigatório e não pode ser vazio',
      });
      return;
    }

    if (value === undefined || value === null) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'value é obrigatório',
      });
      return;
    }

    if (!stageId || typeof stageId !== 'string') {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'stageId é obrigatório',
      });
      return;
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stageId)) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'stageId deve ser um UUID válido',
      });
      return;
    }

    // Validar value
    try {
      validatePositiveNumber(value);
    } catch (error: any) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message || 'value deve ser um número positivo',
      });
      return;
    }

    // Validar closeDate se fornecido
    if (closeDate !== undefined && closeDate !== null) {
      try {
        validateDateNotPast(closeDate);
      } catch (error: any) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: error.message || 'closeDate inválida',
        });
        return;
      }
    }

    // Validar probability se fornecido
    if (probability !== undefined && probability !== null) {
      try {
        validateProbability(probability);
      } catch (error: any) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: error.message || 'probability deve estar entre 0 e 100',
        });
        return;
      }
    }

    // Validar status se fornecido
    if (status && !['OPEN', 'WON', 'LOST', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'status deve ser OPEN, WON, LOST ou ARCHIVED',
      });
      return;
    }

    // Chamar service
    try {
      const opportunity = await OpportunityService.createOpportunity(
        {
          name,
          value,
          currency,
          stageId,
          status,
          closeDate,
          probability,
          contactId,
          companyId,
          leadId,
          tagIds,
          customFields,
        },
        tenantId,
        userId
      );

      res.status(201).json(opportunity);
    } catch (error: any) {
      // Tratar erros específicos
      if (error.message?.includes('não encontrado')) {
        res.status(404).json({
          error: 'Recurso não encontrado',
          message: error.message,
        });
        return;
      }

      if (error instanceof FieldValidationError) {
        res.status(400).json({
          error: 'Validação de campo falhou',
          message: error.message,
          field: error.fieldName,
        });
        return;
      }

      if (error instanceof UniqueFieldValidationError) {
        res.status(409).json({
          error: 'Campo único duplicado',
          message: error.message,
          field: error.fieldName,
        });
        return;
      }

      console.error('Erro ao criar oportunidade:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message || 'Falha ao criar oportunidade',
      });
    }
  } catch (error: any) {
    console.error('Erro ao criar oportunidade:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao criar oportunidade',
    });
  }
}

/**
 * Atualiza oportunidade existente
 * 
 * @param req - Request com id nos params e dados no body
 * @param res - Response para retornar oportunidade atualizada
 */
export async function updateOpportunity(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const opportunityId = req.params.id;
    if (!opportunityId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da oportunidade',
      });
      return;
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opportunityId)) {
      res.status(400).json({
        error: 'ID inválido',
        message: 'ID deve ser um UUID válido',
      });
      return;
    }

    // Extrair dados do body
    const {
      name,
      value,
      currency,
      stageId,
      status,
      closeDate,
      probability,
      contactId,
      companyId,
      leadId,
      tagIds,
      customFields,
    } = req.body;

    // Validar value se fornecido
    if (value !== undefined && value !== null) {
      try {
        validatePositiveNumber(value);
      } catch (error: any) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: error.message || 'value deve ser um número positivo',
        });
        return;
      }
    }

    // Validar closeDate se fornecido
    if (closeDate !== undefined && closeDate !== null) {
      try {
        validateDateNotPast(closeDate);
      } catch (error: any) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: error.message || 'closeDate inválida',
        });
        return;
      }
    }

    // Validar probability se fornecido
    if (probability !== undefined && probability !== null) {
      try {
        validateProbability(probability);
      } catch (error: any) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: error.message || 'probability deve estar entre 0 e 100',
        });
        return;
      }
    }

    // Validar status se fornecido
    if (status && !['OPEN', 'WON', 'LOST', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'status deve ser OPEN, WON, LOST ou ARCHIVED',
      });
      return;
    }

    // Chamar service
    try {
      const opportunity = await OpportunityService.updateOpportunity(
        opportunityId,
        {
          name,
          value,
          currency,
          stageId,
          status,
          closeDate,
          probability,
          contactId,
          companyId,
          leadId,
          tagIds,
          customFields,
        },
        tenantId,
        userId
      );

      res.status(200).json(opportunity);
    } catch (error: any) {
      // Tratar erros específicos
      if (error.message?.includes('não encontrado') || error.message?.includes('não encontrada')) {
        res.status(404).json({
          error: 'Oportunidade não encontrada',
          message: error.message,
        });
        return;
      }

      if (error.message?.includes('permissão')) {
        res.status(403).json({
          error: 'Sem permissão',
          message: error.message,
        });
        return;
      }

      if (error instanceof FieldValidationError) {
        res.status(400).json({
          error: 'Validação de campo falhou',
          message: error.message,
          field: error.fieldName,
        });
        return;
      }

      if (error instanceof UniqueFieldValidationError) {
        res.status(409).json({
          error: 'Campo único duplicado',
          message: error.message,
          field: error.fieldName,
        });
        return;
      }

      // Transição de status inválida
      if (error.message?.includes('Transição de status inválida')) {
        res.status(400).json({
          error: 'Transição de status inválida',
          message: error.message,
        });
        return;
      }

      console.error('Erro ao atualizar oportunidade:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message || 'Falha ao atualizar oportunidade',
      });
    }
  } catch (error: any) {
    console.error('Erro ao atualizar oportunidade:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar oportunidade',
    });
  }
}

/**
 * Deleta oportunidade (soft delete)
 * 
 * @param req - Request com id nos params
 * @param res - Response para retornar confirmação
 */
export async function deleteOpportunity(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const opportunityId = req.params.id;
    if (!opportunityId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da oportunidade',
      });
      return;
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opportunityId)) {
      res.status(400).json({
        error: 'ID inválido',
        message: 'ID deve ser um UUID válido',
      });
      return;
    }

    // Chamar service
    try {
      await OpportunityService.deleteOpportunity(opportunityId, tenantId, userId);

      res.status(200).json({
        message: 'Oportunidade deletada com sucesso',
        id: opportunityId,
      });
    } catch (error: any) {
      if (error.message?.includes('não encontrada') || error.message?.includes('não encontrado')) {
        res.status(404).json({
          error: 'Oportunidade não encontrada',
          message: error.message,
        });
        return;
      }

      console.error('Erro ao deletar oportunidade:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message || 'Falha ao deletar oportunidade',
      });
    }
  } catch (error: any) {
    console.error('Erro ao deletar oportunidade:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar oportunidade',
    });
  }
}
