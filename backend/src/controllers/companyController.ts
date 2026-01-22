/**
 * Controller de empresas
 * 
 * Handlers para rotas de gestão de empresas (CRUD).
 * Orquestra chamadas ao CompanyService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { CompanyService } from '../services/companyService';
import { ContactService } from '../services/contactService';
import { CompanySize, ContactStatus } from '@prisma/client';
import { validateUrl, normalizeUrl } from '../utils/validators';
import { FieldValidationError } from '../utils/fieldValueValidator';
import { UniqueFieldValidationError } from '../utils/uniqueFieldValidator';
import { validateSearchQuery } from '../utils/entitySearchHelpers';
import { SearchError } from '../types/search.types';
import { Filter, FilterError } from '../types/filter.types';
import { processOrderByParams, OrderByError } from '../utils/orderByHelpers';

/**
 * Lista empresas com paginação e filtros
 * 
 * @param req - Request com query params (limit, offset, industry, size, orderBy, order, q)
 * @param res - Response para retornar lista de empresas
 * 
 * Query params:
 * - limit: número (opcional, default: 20, max: 100)
 * - offset: número (opcional, default: 0)
 * - industry: string (opcional: filtro por indústria)
 * - size: string (opcional: SMALL, MEDIUM, LARGE, ENTERPRISE)
 * - orderBy: string (opcional: name, createdAt, default: name)
 * - order: string (opcional: asc, desc, default: asc para name, desc para createdAt)
 * - q: string (opcional) - Termo de busca em nome, website, indústria
 * - filters: JSON (opcional) - Filtros avançados
 *
 * Exemplo de filtros avançados:
 * ?filters=[{"field":"status","operator":"equals","value":"ACTIVE"},{"field":"createdAt","operator":"greaterThan","value":"2024-01-01"}]
 */
export async function listCompanies(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair query params
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    const industry = req.query.industry as string | undefined;
    const size = req.query.size as string | undefined;
    const q = req.query.q as string | undefined; // NOVO: Parâmetro de busca

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

    // Validar size
    if (size && !['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'].includes(size)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'size deve ser SMALL, MEDIUM, LARGE ou ENTERPRISE',
      });
      return;
    }

    // Processar e validar parâmetros de ordenação usando helper centralizado
    try {
      processOrderByParams(req.query, 'company');
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

    // Extrair filtros específicos por entidade
    const hasContacts = req.query.hasContacts !== undefined 
      ? req.query.hasContacts === 'true' 
      : undefined; // NOVO: Empresa tem contatos?

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

    // Buscar empresas
    try {
      const result = await CompanyService.listCompanies(
        tenantId,
        {
          industry,
          size: size as CompanySize | undefined,
          q: searchQuery,
          hasContacts, // NOVO: Filtro específico
          advancedFilters, // Filtros avançados
        },
      {
        limit,
        offset,
        // Passar parâmetros de ordenação do query string para o service
        sortBy: req.query.sortBy as string | string[] | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | ('asc' | 'desc')[] | undefined,
        orderBy: req.query.orderBy as string | string[] | undefined, // Legado
        order: req.query.order as 'asc' | 'desc' | ('asc' | 'desc')[] | undefined, // Legado
      },
      req.userId
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
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar empresas',
    });
  }
}

/**
 * Obtém empresa específica por ID
 * 
 * @param req - Request com companyId nos params
 * @param res - Response para retornar empresa
 */
export async function getCompany(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair ID dos params
    const companyId = req.params.id;
    if (!companyId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da empresa',
      });
      return;
    }

    // Buscar empresa
    const company = await CompanyService.getCompanyById(companyId, tenantId, req.userId);

    if (!company) {
      res.status(404).json({
        error: 'Empresa não encontrada',
        message: 'A empresa especificada não existe ou não pertence ao seu tenant',
      });
      return;
    }

    res.status(200).json(company);
  } catch (error: any) {
    console.error('Erro ao buscar empresa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar empresa',
    });
  }
}

/**
 * Cria nova empresa
 * 
 * @param req - Request com dados da empresa no body
 * @param res - Response para retornar empresa criada
 */
export async function createCompany(req: Request, res: Response): Promise<void> {
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
    const { name, website, industry, size, status, addresses, tagIds, customFields } = req.body;

    // Validar name obrigatório
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        error: 'name inválido',
        message: 'name é obrigatório e deve ser uma string não vazia',
      });
      return;
    }

    // Validar e normalizar website se fornecido
    let normalizedWebsite: string | undefined = website;
    if (website !== undefined && website !== null) {
      if (typeof website !== 'string') {
        res.status(400).json({
          error: 'website inválido',
          message: 'website deve ser uma string',
        });
        return;
      }

      if (website.trim().length > 0) {
        // Normalizar primeiro (adicionar http:// se necessário)
        const normalized = normalizeUrl(website);
        
        // Validar formato
        if (!validateUrl(normalized)) {
          res.status(400).json({
            error: 'website inválido',
            message: 'website deve ser uma URL válida',
          });
          return;
        }
        
        // Usar website normalizado
        normalizedWebsite = normalized;
      }
    }

    // Validar size se fornecido
    if (size !== undefined && size !== null) {
      if (!['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'].includes(size)) {
        res.status(400).json({
          error: 'size inválido',
          message: 'size deve ser SMALL, MEDIUM, LARGE ou ENTERPRISE',
        });
        return;
      }
    }

    // Validar status se fornecido
    if (status !== undefined && !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        error: 'status inválido',
        message: 'status deve ser ACTIVE, INACTIVE ou ARCHIVED',
      });
      return;
    }

    // Validar addresses se fornecidos
    if (addresses !== undefined) {
      if (!Array.isArray(addresses)) {
        res.status(400).json({
          error: 'addresses inválido',
          message: 'addresses deve ser um array',
        });
        return;
      }

      for (const addr of addresses) {
        if (!addr.street || typeof addr.street !== 'string' || addr.street.trim().length === 0) {
          res.status(400).json({
            error: 'Endereço inválido',
            message: 'Cada endereço deve ter um campo street válido',
          });
          return;
        }

        if (!addr.city || typeof addr.city !== 'string' || addr.city.trim().length === 0) {
          res.status(400).json({
            error: 'Endereço inválido',
            message: 'Cada endereço deve ter um campo city válido',
          });
          return;
        }

        if (!addr.state || typeof addr.state !== 'string' || addr.state.trim().length === 0) {
          res.status(400).json({
            error: 'Endereço inválido',
            message: 'Cada endereço deve ter um campo state válido',
          });
          return;
        }

        if (!addr.zipCode || typeof addr.zipCode !== 'string' || addr.zipCode.trim().length === 0) {
          res.status(400).json({
            error: 'Endereço inválido',
            message: 'Cada endereço deve ter um campo zipCode válido',
          });
          return;
        }

        if (addr.type && !['BILLING', 'SHIPPING', 'OTHER'].includes(addr.type)) {
          res.status(400).json({
            error: 'Tipo de endereço inválido',
            message: 'Tipo deve ser BILLING, SHIPPING ou OTHER',
          });
          return;
        }
      }
    }

    // Validar tagIds se fornecido
    if (tagIds !== undefined && !Array.isArray(tagIds)) {
      res.status(400).json({
        error: 'tagIds inválido',
        message: 'tagIds deve ser um array',
      });
      return;
    }

    // Criar empresa
    const company = await CompanyService.createCompany(
      {
        name,
        website: normalizedWebsite,
        industry,
        size,
        status,
        addresses,
        tagIds,
        customFields,
      },
      tenantId,
      userId
    );

    res.status(201).json(company);
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
      error.message.includes('não pertence')
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
      error.message.includes('URL')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao criar empresa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao criar empresa',
    });
  }
}

/**
 * Atualiza empresa existente
 * 
 * @param req - Request com companyId nos params e dados no body
 * @param res - Response para retornar empresa atualizada
 */
export async function updateCompany(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const companyId = req.params.id;
    if (!companyId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da empresa',
      });
      return;
    }

    // Extrair dados do body
    const { name, website, industry, size, status, addresses, tagIds, customFields } = req.body;

    // Validar name se fornecido
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({
        error: 'name inválido',
        message: 'name deve ser uma string não vazia',
      });
      return;
    }

    // Validar e normalizar website se fornecido
    let normalizedWebsite: string | undefined = website;
    if (website !== undefined && website !== null) {
      if (typeof website !== 'string') {
        res.status(400).json({
          error: 'website inválido',
          message: 'website deve ser uma string',
        });
        return;
      }

      if (website.trim().length > 0) {
        // Normalizar primeiro (adicionar http:// se necessário)
        const normalized = normalizeUrl(website);
        
        // Validar formato
        if (!validateUrl(normalized)) {
          res.status(400).json({
            error: 'website inválido',
            message: 'website deve ser uma URL válida',
          });
          return;
        }
        
        // Usar website normalizado
        normalizedWebsite = normalized;
      }
    }

    // Validar size se fornecido
    if (size !== undefined && size !== null) {
      if (!['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'].includes(size)) {
        res.status(400).json({
          error: 'size inválido',
          message: 'size deve ser SMALL, MEDIUM, LARGE ou ENTERPRISE',
        });
        return;
      }
    }

    // Validar status se fornecido
    if (status !== undefined && !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        error: 'status inválido',
        message: 'status deve ser ACTIVE, INACTIVE ou ARCHIVED',
      });
      return;
    }

    // Validar addresses se fornecidos
    if (addresses !== undefined) {
      if (!Array.isArray(addresses)) {
        res.status(400).json({
          error: 'addresses inválido',
          message: 'addresses deve ser um array',
        });
        return;
      }

      for (const addr of addresses) {
        if (!addr.street || typeof addr.street !== 'string' || addr.street.trim().length === 0) {
          res.status(400).json({
            error: 'Endereço inválido',
            message: 'Cada endereço deve ter um campo street válido',
          });
          return;
        }

        if (!addr.city || typeof addr.city !== 'string' || addr.city.trim().length === 0) {
          res.status(400).json({
            error: 'Endereço inválido',
            message: 'Cada endereço deve ter um campo city válido',
          });
          return;
        }

        if (!addr.state || typeof addr.state !== 'string' || addr.state.trim().length === 0) {
          res.status(400).json({
            error: 'Endereço inválido',
            message: 'Cada endereço deve ter um campo state válido',
          });
          return;
        }

        if (!addr.zipCode || typeof addr.zipCode !== 'string' || addr.zipCode.trim().length === 0) {
          res.status(400).json({
            error: 'Endereço inválido',
            message: 'Cada endereço deve ter um campo zipCode válido',
          });
          return;
        }

        if (addr.type && !['BILLING', 'SHIPPING', 'OTHER'].includes(addr.type)) {
          res.status(400).json({
            error: 'Tipo de endereço inválido',
            message: 'Tipo deve ser BILLING, SHIPPING ou OTHER',
          });
          return;
        }
      }
    }

    // Validar tagIds se fornecido
    if (tagIds !== undefined && !Array.isArray(tagIds)) {
      res.status(400).json({
        error: 'tagIds inválido',
        message: 'tagIds deve ser um array',
      });
      return;
    }

    // Atualizar empresa
    const company = await CompanyService.updateCompany(
      companyId,
      {
        name,
        website: normalizedWebsite,
        industry,
        size,
        status,
        addresses,
        tagIds,
        customFields,
      },
      tenantId,
      userId
    );

    res.status(200).json(company);
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
      error.message.includes('não pertence')
    ) {
      res.status(404).json({
        error: 'Empresa não encontrada',
        message: 'A empresa especificada não existe ou não pertence ao seu tenant',
      });
      return;
    }

    if (
      error.message.includes('inválido') ||
      error.message.includes('obrigatório') ||
      error.message.includes('URL')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    // Erro de permissão (403) é tratado pelo middleware de autorização
    // Mas se o service lançar erro de permissão, tratamos aqui também
    if (error.message.includes('permissão') || error.message.includes('permissao')) {
      res.status(403).json({
        error: 'Sem permissão',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar empresa',
    });
  }
}

/**
 * Deleta empresa (soft delete)
 * 
 * @param req - Request com companyId nos params
 * @param res - Response para retornar sucesso
 */
export async function deleteCompany(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const companyId = req.params.id;
    if (!companyId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da empresa',
      });
      return;
    }

    // Deletar empresa
    const deletedId = await CompanyService.deleteCompany(companyId, tenantId, userId);

    res.status(200).json({
      message: 'Empresa deletada com sucesso',
      id: deletedId,
    });
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrada') ||
      error.message.includes('não encontradas') ||
      error.message.includes('não pertence')
    ) {
      res.status(404).json({
        error: 'Empresa não encontrada',
        message: 'A empresa especificada não existe ou não pertence ao seu tenant',
      });
      return;
    }

    // Erro 409: Empresa possui contatos associados
    if (error.message.includes('contato(s) associado(s)')) {
      res.status(409).json({
        error: 'Não é possível deletar empresa',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao deletar empresa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar empresa',
    });
  }
}

/**
 * Lista contatos de uma empresa específica
 * 
 * @param req - Request com companyId nos params e query params opcionais
 * @param res - Response para retornar lista de contatos
 */
export async function getCompanyContacts(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const companyId = req.params.id;
    if (!companyId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da empresa',
      });
      return;
    }

    // Extrair query params (mesmos de listContacts, exceto companyId)
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    const status = req.query.status as string | undefined;
    const tagId = req.query.tagId as string | undefined;
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
    if (status && !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'status deve ser ACTIVE, INACTIVE ou ARCHIVED',
      });
      return;
    }

    // Validar orderBy
    if (orderBy && !['firstName', 'lastName', 'createdAt'].includes(orderBy)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'orderBy deve ser firstName, lastName ou createdAt',
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

    // Buscar contatos da empresa
    const result = await ContactService.listContactsByCompany(
      companyId,
      tenantId,
      {
        status: status as ContactStatus | undefined,
        tagId,
      },
      {
        limit,
        offset,
        orderBy: orderBy as 'firstName' | 'lastName' | 'createdAt' | undefined,
        order: order as 'asc' | 'desc' | undefined,
      },
      userId
    );

    res.status(200).json(result);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrada') ||
      error.message.includes('não encontradas') ||
      error.message.includes('não pertence') ||
      error.message.includes('foi deletada') ||
      error.message.includes('inválido')
    ) {
      res.status(404).json({
        error: 'Empresa não encontrada',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('UUID')) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao listar contatos da empresa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar contatos da empresa',
    });
  }
}

