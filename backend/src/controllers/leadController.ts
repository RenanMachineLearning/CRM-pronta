/**
 * Controller de leads
 * 
 * Handlers para rotas de gestão de leads (CRUD).
 * Orquestra chamadas ao LeadService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { LeadService } from '../services/leadService';
import { LeadConversionService } from '../services/leadConversionService';
import { LeadStatus } from '@prisma/client';
import { validateEmail, validatePhone, validatePositiveNumber, validateProbability, validateDateNotPast } from '../utils/validators';
import { FieldValidationError } from '../utils/fieldValueValidator';
import { UniqueFieldValidationError } from '../utils/uniqueFieldValidator';
import { validateSearchQuery } from '../utils/entitySearchHelpers';
import { SearchError } from '../types/search.types';
import { Filter, FilterError } from '../types/filter.types';
import { processOrderByParams, OrderByError } from '../utils/orderByHelpers';
import { processPaginationParams, PaginationError } from '../utils/paginationHelper';

/**
 * Lista leads com paginação e filtros
 * 
 * @param req - Request com query params (limit, offset, status, source, converted, orderBy, order, q)
 * @param res - Response para retornar lista de leads
 * 
 * Query params:
 * - limit: número (opcional, default: 20, max: 100)
 * - offset: número (opcional, default: 0)
 * - status: string (opcional: NEW, QUALIFIED, CONVERTED, LOST)
 * - source: string (opcional: filtro por origem)
 * - converted: boolean (opcional: true, false)
 * - orderBy: string (opcional: createdAt, firstName, lastName, default: createdAt)
 * - order: string (opcional: asc, desc, default: desc)
 * - q: string (opcional) - Termo de busca em nome, email, telefone, empresa, origem
 * - filters: JSON (opcional) - Filtros avançados
 */
export async function listLeads(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair query params
    const status = req.query.status as string | undefined;
    const source = req.query.source as string | undefined;
    const converted = req.query.converted as string | undefined;
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
    if (status && !['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'].includes(status)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'status deve ser NEW, QUALIFIED, CONVERTED ou LOST',
      });
      return;
    }

    // Validar converted (boolean)
    let convertedBool: boolean | undefined = undefined;
    if (converted !== undefined) {
      if (converted === 'true') {
        convertedBool = true;
      } else if (converted === 'false') {
        convertedBool = false;
      } else {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: 'converted deve ser true ou false',
        });
        return;
      }
    }

    // Processar e validar parâmetros de ordenação usando helper centralizado
    try {
      processOrderByParams(req.query, 'lead');
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
      const result = await LeadService.listLeads(
        tenantId,
        {
          status: status as LeadStatus | undefined,
          source,
          converted: convertedBool,
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
    console.error('Erro ao listar leads:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar leads',
    });
  }
}

/**
 * Obtém lead específico
 * 
 * @param req - Request com id nos params
 * @param res - Response para retornar lead
 */
export async function getLead(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const leadId = req.params.id;
    if (!leadId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do lead',
      });
      return;
    }

    // Chamar service
    const lead = await LeadService.getLeadById(leadId, tenantId, userId);

    if (!lead) {
      res.status(404).json({
        error: 'Lead não encontrado',
        message: 'Lead não encontrado ou não pertence ao seu tenant',
      });
      return;
    }

    res.status(200).json(lead);
  } catch (error: any) {
    console.error('Erro ao buscar lead:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar lead',
    });
  }
}

/**
 * Cria novo lead
 * 
 * @param req - Request com dados do lead no body
 * @param res - Response para retornar lead criado
 */
export async function createLead(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Validar que id não foi fornecido (gerado automaticamente)
    if (req.body.id !== undefined) {
      res.status(400).json({
        error: 'Campo id não permitido',
        message: 'O ID é gerado automaticamente e não pode ser fornecido',
      });
      return;
    }

    // Extrair dados do body
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      source,
      status,
      tagIds,
      customFields,
    } = req.body;

    // Validar que pelo menos firstName ou lastName é fornecido
    const hasFirstName = firstName && typeof firstName === 'string' && firstName.trim().length > 0;
    const hasLastName = lastName && typeof lastName === 'string' && lastName.trim().length > 0;

    if (!hasFirstName && !hasLastName) {
      res.status(400).json({
        error: 'Campos obrigatórios inválidos',
        message: 'Pelo menos firstName ou lastName deve ser fornecido',
      });
      return;
    }

    // Validar email se fornecido
    if (email !== undefined && email !== null) {
      if (typeof email !== 'string') {
        res.status(400).json({
          error: 'email inválido',
          message: 'email deve ser uma string',
        });
        return;
      }

      if (email.trim().length > 0 && !validateEmail(email)) {
        res.status(400).json({
          error: 'email inválido',
          message: 'Formato de email inválido',
        });
        return;
      }
    }

    // Validar telefone se fornecido
    if (phone !== undefined && phone !== null) {
      if (typeof phone !== 'string') {
        res.status(400).json({
          error: 'phone inválido',
          message: 'phone deve ser uma string',
        });
        return;
      }

      if (phone.trim().length > 0 && !validatePhone(phone)) {
        res.status(400).json({
          error: 'phone inválido',
          message: 'Formato de telefone inválido',
        });
        return;
      }
    }

    // Validar status se fornecido
    if (status !== undefined && !['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'].includes(status)) {
      res.status(400).json({
        error: 'Status inválido',
        message: 'Status deve ser NEW, QUALIFIED, CONVERTED ou LOST',
      });
      return;
    }

    // Validar tagIds se fornecido
    if (tagIds !== undefined && !Array.isArray(tagIds)) {
      res.status(400).json({
        error: 'tagIds inválido',
        message: 'tagIds deve ser um array',
      });
      return;
    }

    // Criar lead
    const lead = await LeadService.createLead(
      {
        firstName,
        lastName,
        email,
        phone,
        company,
        source,
        status,
        tagIds,
        customFields,
      },
      tenantId,
      userId
    );

    res.status(201).json(lead);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (error instanceof FieldValidationError || error instanceof UniqueFieldValidationError) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('não encontrada') ||
      error.message.includes('não encontradas') ||
      error.message.includes('não pertence') ||
      error.message.includes('foi deletada')
    ) {
      res.status(404).json({
        error: 'Recurso não encontrado',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('inválido') ||
      error.message.includes('obrigatório') ||
      error.message.includes('UUID')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao criar lead:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message || 'Falha ao criar lead',
    });
  }
}

/**
 * Atualiza lead existente
 * 
 * @param req - Request com id nos params e dados no body
 * @param res - Response para retornar lead atualizado
 */
export async function updateLead(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const leadId = req.params.id;
    if (!leadId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do lead',
      });
      return;
    }

    // Extrair dados do body
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      source,
      status,
      tagIds,
      customFields,
    } = req.body;

    // Validar email se fornecido
    if (email !== undefined && email !== null) {
      if (typeof email !== 'string') {
        res.status(400).json({
          error: 'email inválido',
          message: 'email deve ser uma string',
        });
        return;
      }

      if (email.trim().length > 0 && !validateEmail(email)) {
        res.status(400).json({
          error: 'email inválido',
          message: 'Formato de email inválido',
        });
        return;
      }
    }

    // Validar telefone se fornecido
    if (phone !== undefined && phone !== null) {
      if (typeof phone !== 'string') {
        res.status(400).json({
          error: 'phone inválido',
          message: 'phone deve ser uma string',
        });
        return;
      }

      if (phone.trim().length > 0 && !validatePhone(phone)) {
        res.status(400).json({
          error: 'phone inválido',
          message: 'Formato de telefone inválido',
        });
        return;
      }
    }

    // Validar status se fornecido
    if (status !== undefined && !['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'].includes(status)) {
      res.status(400).json({
        error: 'Status inválido',
        message: 'Status deve ser NEW, QUALIFIED, CONVERTED ou LOST',
      });
      return;
    }

    // Validar tagIds se fornecido
    if (tagIds !== undefined && !Array.isArray(tagIds)) {
      res.status(400).json({
        error: 'tagIds inválido',
        message: 'tagIds deve ser um array',
      });
      return;
    }

    // Atualizar lead
    const lead = await LeadService.updateLead(
      leadId,
      {
        firstName,
        lastName,
        email,
        phone,
        company,
        source,
        status,
        tagIds,
        customFields,
      },
      tenantId,
      userId
    );

    res.status(200).json(lead);
  } catch (error: any) {
    // Tratar erros específicos
    if (error.message?.includes('não encontrado')) {
      res.status(404).json({
        error: 'Lead não encontrado',
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
    if (error.message?.includes('Transição de status inválida') || 
        error.message?.includes('Status CONVERTED só pode ser definido') ||
        error.message?.includes('Lead convertido não pode ter seu status alterado')) {
      res.status(400).json({
        error: 'Transição de status inválida',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('inválido') ||
      error.message.includes('obrigatório') ||
      error.message.includes('UUID')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao atualizar lead:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message || 'Falha ao atualizar lead',
    });
  }
}

/**
 * Deleta lead (soft delete)
 * 
 * @param req - Request com id nos params
 * @param res - Response para retornar sucesso
 */
export async function deleteLead(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const leadId = req.params.id;
    if (!leadId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do lead',
      });
      return;
    }

    // Deletar lead
    await LeadService.deleteLead(leadId, tenantId, userId);

    res.status(200).json({
      message: 'Lead deletado com sucesso',
      id: leadId,
    });
  } catch (error: any) {
    if (error.message?.includes('não encontrado')) {
      res.status(404).json({
        error: 'Lead não encontrado',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao deletar lead:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message || 'Falha ao deletar lead',
    });
  }
}

/**
 * Converte lead em contato e/ou oportunidade
 * 
 * @param req - Request com id nos params e body (createContact, createOpportunity, opportunityData)
 * @param res - Response para retornar resultado da conversão
 */
export async function convertLead(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair id dos params e validar formato UUID
    const id = req.params.id;
    if (!id) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do lead',
      });
      return;
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      res.status(400).json({
        error: 'ID inválido',
        message: 'ID deve ser um UUID válido',
      });
      return;
    }

    // Extrair dados do body
    const { createContact, createOpportunity, opportunityData } = req.body;

    // Validar que pelo menos uma opção está marcada
    if (!createContact && !createOpportunity) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'Deve criar pelo menos contato ou oportunidade',
      });
      return;
    }

    // Validar createContact e createOpportunity são boolean
    if (typeof createContact !== 'boolean') {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'createContact deve ser um boolean',
      });
      return;
    }

    if (typeof createOpportunity !== 'boolean') {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'createOpportunity deve ser um boolean',
      });
      return;
    }

    // Se createOpportunity = true, validar opportunityData.value obrigatório
    if (createOpportunity) {
      if (!opportunityData || !opportunityData.value) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: 'opportunityData.value é obrigatório quando createOpportunity é true',
        });
        return;
      }

      // Validar value > 0
      try {
        validatePositiveNumber(opportunityData.value);
      } catch (error) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: error instanceof Error ? error.message : 'value deve ser um número positivo',
        });
        return;
      }

      // Validar probability se fornecida
      if (opportunityData.probability !== undefined && opportunityData.probability !== null) {
        try {
          validateProbability(opportunityData.probability);
        } catch (error) {
          res.status(400).json({
            error: 'Dados inválidos',
            message: error instanceof Error ? error.message : 'probability deve estar entre 0 e 100',
          });
          return;
        }
      }

      // Validar closeDate se fornecida
      if (opportunityData.closeDate) {
        try {
          validateDateNotPast(opportunityData.closeDate);
        } catch (error) {
          res.status(400).json({
            error: 'Dados inválidos',
            message: error instanceof Error ? error.message : 'closeDate deve ser futura ou presente',
          });
          return;
        }
      }

      // Validar stageId se fornecido (formato UUID)
      if (opportunityData.stageId) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opportunityData.stageId)) {
          res.status(400).json({
            error: 'Dados inválidos',
            message: 'stageId deve ser um UUID válido',
          });
          return;
        }
      }
    }

    // Chamar LeadConversionService.convertLead
    const result = await LeadConversionService.convertLead(
      id,
      {
        createContact,
        createOpportunity,
        opportunityData: createOpportunity ? opportunityData : undefined,
      },
      tenantId,
      userId
    );

    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof Error) {
      // Lead já convertido
      if (error.message.includes('já foi convertido') || error.message.includes('já convertido')) {
        res.status(409).json({
          error: 'Lead já convertido',
          message: error.message,
        });
        return;
      }

      // Lead não encontrado
      if (error.message.includes('não encontrado') || error.message.includes('não pertence')) {
        res.status(404).json({
          error: 'Lead não encontrado',
          message: error.message,
        });
        return;
      }

      // Pipeline padrão não encontrado
      if (error.message.includes('pipeline padrão') || error.message.includes('Pipeline padrão')) {
        res.status(400).json({
          error: 'Pipeline padrão não encontrado',
          message: error.message,
        });
        return;
      }

      // Dados inválidos
      if (error.message.includes('obrigatório') || error.message.includes('inválido') || error.message.includes('deve')) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: error.message,
        });
        return;
      }
    }

    // Erro genérico
    console.error('Erro ao converter lead:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Ocorreu um erro ao converter o lead',
    });
  }
}
