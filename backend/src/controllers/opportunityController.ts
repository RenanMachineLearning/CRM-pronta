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
import { validateSearchQuery } from '../utils/entitySearchHelpers';
import { SearchError } from '../types/search.types';
import { Filter, FilterError } from '../types/filter.types';
import { processOrderByParams, OrderByError } from '../utils/orderByHelpers';
import { processPaginationParams, PaginationError } from '../utils/paginationHelper';

/**
 * Lista oportunidades com paginação e filtros
 * 
 * @param req - Request com query params (limit, offset, stageId, status, contactId, companyId, orderBy, order, q)
 * @param res - Response para retornar lista de oportunidades
 * 
 * Query params:
 * - limit: número (opcional, default: 20, max: 100)
 * - offset: número (opcional, default: 0)
 * - stageId: string (opcional: UUID do estágio)
 * - status: string (opcional: OPEN, WON, LOST, ARCHIVED)
 * - contactId: string (opcional: UUID do contato)
 * - companyId: string (opcional: UUID da empresa)
 * - orderBy: string (opcional: value, closeDate, createdAt, default: createdAt)
 * - order: string (opcional: asc, desc, default: desc)
 * - q: string (opcional) - Termo de busca em nome
 * - filters: JSON (opcional) - Filtros avançados
 */
export async function listOpportunities(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair query params
    const stageId = req.query.stageId as string | undefined;
    const status = req.query.status as string | undefined;
    const contactId = req.query.contactId as string | undefined;
    const companyId = req.query.companyId as string | undefined;
    const q = req.query.q as string | undefined; // NOVO: Parâmetro de busca

    // Processar e validar parâmetros de paginação usando helper centralizado
    let paginationParams;
    try {
      paginationParams = processPaginationParams(req.query);
    } catch (error: any) {
      if (error instanceof PaginationError) {
        res.status(error.statusCode).json({
          error: 'Parâmetro inválido',
          message: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
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

    // Processar e validar parâmetros de ordenação usando helper centralizado
    try {
      processOrderByParams(req.query, 'opportunity');
    } catch (error: any) {
      if (error instanceof OrderByError) {
        res.status(error.statusCode).json({
          error: 'Parâmetro inválido',
          message: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }

    // Validar parâmetro de busca
    let searchQuery: string | undefined;
    if (q !== undefined) {
      try {
        searchQuery = validateSearchQuery(q);
      } catch (error: any) {
        if (error instanceof SearchError) {
          res.status(error.statusCode).json({
            error: 'Parâmetro inválido',
            message: error.message,
            code: error.code,
          });
        } else {
          res.status(400).json({
            error: 'Parâmetro inválido',
            message: error.message || 'Query inválida',
          });
        }
        return;
      }
    }

    // Parsear filtros avançados
    let advancedFilters: Filter[] | undefined;
    const filtersParam = req.query.filters as string | undefined;

    if (filtersParam) {
      try {
        advancedFilters = JSON.parse(filtersParam);

        if (!Array.isArray(advancedFilters)) {
          res.status(400).json({
            error: 'Parâmetro inválido',
            message: 'filters deve ser um array JSON',
          });
          return;
        }
      } catch (error) {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: 'filters deve ser um JSON válido',
        });
        return;
      }
    }

    // Chamar service
    try {
      const result = await OpportunityService.listOpportunities(
        tenantId,
        {
          stageId,
          status: status as OpportunityStatus | undefined,
          contactId,
          companyId,
          q: searchQuery,
          advancedFilters, // NOVO: Filtros avançados
        },
      {
        page: paginationParams.page,
        limit: paginationParams.limit,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined, // Legado
        // Passar parâmetros de ordenação do query string para o service
        sortBy: req.query.sortBy as string | string[] | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | ('asc' | 'desc')[] | undefined,
        orderBy: req.query.orderBy as string | string[] | undefined, // Legado
        order: req.query.order as 'asc' | 'desc' | ('asc' | 'desc')[] | undefined, // Legado
      },
      userId
    );

      res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof FilterError) {
        res.status(error.statusCode).json({
          error: 'Filtro inválido',
          code: error.code,
          details: error.details,
          message: error.message,
        });
        return;
      }
      throw error;
    }
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
