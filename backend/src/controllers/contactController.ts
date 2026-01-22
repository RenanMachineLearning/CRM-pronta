/**
 * Controller de contatos
 * 
 * Handlers para rotas de gestão de contatos (CRUD).
 * Orquestra chamadas ao ContactService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { ContactService } from '../services/contactService';
import { ContactStatus } from '@prisma/client';
import { validateEmail, validatePhone, validateDateNotFuture } from '../utils/validators';
import { FieldValidationError } from '../utils/fieldValueValidator';
import { UniqueFieldValidationError } from '../utils/uniqueFieldValidator';
import { validateSearchQuery } from '../utils/entitySearchHelpers';
import { SearchError } from '../types/search.types';
import { Filter, FilterError } from '../types/filter.types';
import { processOrderByParams, OrderByError } from '../utils/orderByHelpers';

/**
 * Lista contatos com paginação e filtros
 * 
 * @param req - Request com query params (limit, offset, companyId, status, tagId, orderBy, order, q)
 * @param res - Response para retornar lista de contatos
 * 
 * Query params:
 * - limit: número (opcional, default: 20, max: 100)
 * - offset: número (opcional, default: 0)
 * - companyId: string (opcional: UUID da empresa)
 * - status: string (opcional: ACTIVE, INACTIVE, ARCHIVED)
 * - tagId: string (opcional: UUID da tag)
 * - orderBy: string (opcional: firstName, lastName, createdAt, default: createdAt)
 * - order: string (opcional: asc, desc, default: desc)
 * - q: string (opcional) - Termo de busca em nome, email, telefone, etc.
 * - filters: JSON (opcional) - Filtros avançados
 *
 * Exemplo de filtros avançados:
 * ?filters=[{"field":"status","operator":"equals","value":"ACTIVE"},{"field":"createdAt","operator":"greaterThan","value":"2024-01-01"}]
 */
export async function listContacts(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair query params
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    const companyId = req.query.companyId as string | undefined;
    const status = req.query.status as string | undefined;
    const tagId = req.query.tagId as string | undefined;
    const q = req.query.q as string | undefined; // NOVO: Parâmetro de busca
    const hasEmail = req.query.hasEmail !== undefined 
      ? req.query.hasEmail === 'true' 
      : undefined; // NOVO: Contato tem email?
    const hasPhone = req.query.hasPhone !== undefined 
      ? req.query.hasPhone === 'true' 
      : undefined; // NOVO: Contato tem telefone?

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

    // Processar e validar parâmetros de ordenação usando helper centralizado
    try {
      processOrderByParams(req.query, 'contact');
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

        // Validar que é array
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

    // userId já validado pelo middleware
    const userId = req.userId!;

    // Buscar contatos
    const result = await ContactService.listContacts(
      tenantId,
      {
        companyId,
        status: status as ContactStatus | undefined,
        tagId,
        q: searchQuery,
        hasEmail, // NOVO: Filtro específico
        hasPhone, // NOVO: Filtro específico
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

    console.error('Erro ao listar contatos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar contatos',
    });
  }
}

/**
 * Obtém contato por ID
 * 
 * @param req - Request com contactId nos params
 * @param res - Response para retornar contato
 */
export async function getContact(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const contactId = req.params.id;
    if (!contactId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do contato',
      });
      return;
    }

    // Buscar contato
    const contact = await ContactService.getContactById(contactId, tenantId, userId);

    if (!contact) {
      res.status(404).json({
        error: 'Contato não encontrado',
        message: 'O contato especificado não existe ou não pertence ao seu tenant',
      });
      return;
    }

    res.status(200).json(contact);
  } catch (error: any) {
    console.error('Erro ao buscar contato:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar contato',
    });
  }
}

/**
 * Cria novo contato
 * 
 * @param req - Request com dados do contato no body
 * @param res - Response para retornar contato criado
 */
export async function createContact(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

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
      title,
      gender,
      birthDate,
      notes,
      status,
      companyId,
      emails,
      phones,
      addresses,
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

    // Validar emails se fornecidos
    if (emails !== undefined) {
      if (!Array.isArray(emails)) {
        res.status(400).json({
          error: 'emails inválido',
          message: 'emails deve ser um array',
        });
        return;
      }

      for (const emailData of emails) {
        if (!emailData.email || typeof emailData.email !== 'string') {
          res.status(400).json({
            error: 'Email inválido',
            message: 'Cada email deve ter um campo email válido',
          });
          return;
        }

        if (!validateEmail(emailData.email)) {
          res.status(400).json({
            error: 'Email inválido',
            message: `Formato de email inválido: ${emailData.email}`,
          });
          return;
        }

        if (emailData.type && !['WORK', 'HOME', 'OTHER'].includes(emailData.type)) {
          res.status(400).json({
            error: 'Tipo de email inválido',
            message: 'Tipo deve ser WORK, HOME ou OTHER',
          });
          return;
        }
      }
    }

    // Validar telefones se fornecidos
    if (phones !== undefined) {
      if (!Array.isArray(phones)) {
        res.status(400).json({
          error: 'phones inválido',
          message: 'phones deve ser um array',
        });
        return;
      }

      for (const phoneData of phones) {
        if (!phoneData.phone || typeof phoneData.phone !== 'string') {
          res.status(400).json({
            error: 'Telefone inválido',
            message: 'Cada telefone deve ter um campo phone válido',
          });
          return;
        }

        if (!validatePhone(phoneData.phone)) {
          res.status(400).json({
            error: 'Telefone inválido',
            message: `Formato de telefone inválido: ${phoneData.phone}`,
          });
          return;
        }

        if (phoneData.type && !['WORK', 'HOME', 'MOBILE', 'OTHER'].includes(phoneData.type)) {
          res.status(400).json({
            error: 'Tipo de telefone inválido',
            message: 'Tipo deve ser WORK, HOME, MOBILE ou OTHER',
          });
          return;
        }
      }
    }

    // Validar birthDate se fornecido
    if (birthDate !== undefined) {
      if (typeof birthDate !== 'string' && !(birthDate instanceof Date)) {
        res.status(400).json({
          error: 'birthDate inválido',
          message: 'birthDate deve ser uma string ISO ou Date',
        });
        return;
      }
      
      // Adicionar validação de data não futura
      const dateObj = birthDate instanceof Date ? birthDate : new Date(birthDate);
      if (!validateDateNotFuture(dateObj)) {
        res.status(400).json({
          error: 'birthDate inválido',
          message: 'Data de nascimento não pode ser futura',
        });
        return;
      }
    }

    // Validar gender se fornecido
    if (gender !== undefined && gender !== null) {
      if (typeof gender !== 'string') {
        res.status(400).json({
          error: 'gender inválido',
          message: 'gender deve ser uma string',
        });
        return;
      }
      
      const validGenders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
      const normalizedGender = gender.trim().toUpperCase();
      if (!validGenders.includes(normalizedGender)) {
        res.status(400).json({
          error: 'gender inválido',
          message: `gender deve ser um dos valores: ${validGenders.join(', ')}`,
        });
        return;
      }
    }

    // Validar status se fornecido
    if (status !== undefined && !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        error: 'Status inválido',
        message: 'Status deve ser ACTIVE, INACTIVE ou ARCHIVED',
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

    // Criar contato
    const contact = await ContactService.createContact(
      {
        firstName,
        lastName,
        title,
        gender,
        birthDate,
        notes,
        status,
        companyId,
        emails,
        phones,
        addresses,
        tagIds,
        customFields,
      },
      tenantId,
      req.userId!
    );

    res.status(201).json(contact);
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
      error.message.includes('futura') ||
      error.message.includes('UUID')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao criar contato:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao criar contato',
    });
  }
}

/**
 * Atualiza contato existente
 * 
 * @param req - Request com contactId nos params e dados no body
 * @param res - Response para retornar contato atualizado
 */
export async function updateContact(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const contactId = req.params.id;
    if (!contactId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do contato',
      });
      return;
    }

    // Extrair dados do body
    const {
      firstName,
      lastName,
      title,
      gender,
      birthDate,
      notes,
      status,
      companyId,
      emails,
      phones,
      addresses,
      tagIds,
      customFields,
    } = req.body;

    // Validar firstName se fornecido
    if (firstName !== undefined && (typeof firstName !== 'string' || firstName.trim().length === 0)) {
      res.status(400).json({
        error: 'firstName inválido',
        message: 'firstName deve ser uma string não vazia',
      });
      return;
    }

    // Validar emails se fornecidos
    if (emails !== undefined) {
      if (!Array.isArray(emails)) {
        res.status(400).json({
          error: 'emails inválido',
          message: 'emails deve ser um array',
        });
        return;
      }

      for (const emailData of emails) {
        if (!emailData.email || typeof emailData.email !== 'string') {
          res.status(400).json({
            error: 'Email inválido',
            message: 'Cada email deve ter um campo email válido',
          });
          return;
        }

        if (!validateEmail(emailData.email)) {
          res.status(400).json({
            error: 'Email inválido',
            message: `Formato de email inválido: ${emailData.email}`,
          });
          return;
        }

        if (emailData.type && !['WORK', 'HOME', 'OTHER'].includes(emailData.type)) {
          res.status(400).json({
            error: 'Tipo de email inválido',
            message: 'Tipo deve ser WORK, HOME ou OTHER',
          });
          return;
        }
      }
    }

    // Validar telefones se fornecidos
    if (phones !== undefined) {
      if (!Array.isArray(phones)) {
        res.status(400).json({
          error: 'phones inválido',
          message: 'phones deve ser um array',
        });
        return;
      }

      for (const phoneData of phones) {
        if (!phoneData.phone || typeof phoneData.phone !== 'string') {
          res.status(400).json({
            error: 'Telefone inválido',
            message: 'Cada telefone deve ter um campo phone válido',
          });
          return;
        }

        if (!validatePhone(phoneData.phone)) {
          res.status(400).json({
            error: 'Telefone inválido',
            message: `Formato de telefone inválido: ${phoneData.phone}`,
          });
          return;
        }

        if (phoneData.type && !['WORK', 'HOME', 'MOBILE', 'OTHER'].includes(phoneData.type)) {
          res.status(400).json({
            error: 'Tipo de telefone inválido',
            message: 'Tipo deve ser WORK, HOME, MOBILE ou OTHER',
          });
          return;
        }
      }
    }

    // Validar birthDate se fornecido
    if (birthDate !== undefined) {
      if (typeof birthDate !== 'string' && !(birthDate instanceof Date)) {
        res.status(400).json({
          error: 'birthDate inválido',
          message: 'birthDate deve ser uma string ISO ou Date',
        });
        return;
      }
      
      // Adicionar validação de data não futura
      const dateObj = birthDate instanceof Date ? birthDate : new Date(birthDate);
      if (!validateDateNotFuture(dateObj)) {
        res.status(400).json({
          error: 'birthDate inválido',
          message: 'Data de nascimento não pode ser futura',
        });
        return;
      }
    }

    // Validar gender se fornecido
    if (gender !== undefined && gender !== null) {
      if (typeof gender !== 'string') {
        res.status(400).json({
          error: 'gender inválido',
          message: 'gender deve ser uma string',
        });
        return;
      }
      
      const validGenders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
      const normalizedGender = gender.trim().toUpperCase();
      if (!validGenders.includes(normalizedGender)) {
        res.status(400).json({
          error: 'gender inválido',
          message: `gender deve ser um dos valores: ${validGenders.join(', ')}`,
        });
        return;
      }
    }

    // Validar status se fornecido
    if (status !== undefined && !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        error: 'Status inválido',
        message: 'Status deve ser ACTIVE, INACTIVE ou ARCHIVED',
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

    // Atualizar contato
    const contact = await ContactService.updateContact(
      contactId,
      {
        firstName,
        lastName,
        title,
        gender,
        birthDate,
        notes,
        status,
        companyId,
        emails,
        phones,
        addresses,
        tagIds,
        customFields,
      },
      tenantId,
      userId
    );

    res.status(200).json(contact);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (error instanceof FieldValidationError || error instanceof UniqueFieldValidationError) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('não encontrado')) {
      res.status(404).json({
        error: 'Contato não encontrado',
        message: 'O contato especificado não existe ou não pertence ao seu tenant',
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

    if (error.message.includes('não tem permissão para atualizar os seguintes campos')) {
      res.status(403).json({
        error: 'Acesso negado',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('inválido') ||
      error.message.includes('obrigatório') ||
      error.message.includes('futura') ||
      error.message.includes('UUID')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao atualizar contato:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar contato',
    });
  }
}

/**
 * Deleta contato (soft delete)
 * 
 * @param req - Request com contactId nos params
 * @param res - Response para retornar sucesso
 */
export async function deleteContact(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair ID dos params
    const contactId = req.params.id;
    if (!contactId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do contato',
      });
      return;
    }

    // Deletar contato (soft delete)
    await ContactService.deleteContact(contactId, tenantId, req.userId!);

    res.status(200).json({
      message: 'Contato deletado com sucesso',
      id: contactId,
    });
  } catch (error: any) {
    // Tratar erros específicos do service
    if (error.message.includes('não encontrado')) {
      res.status(404).json({
        error: 'Contato não encontrado',
        message: 'O contato especificado não existe ou não pertence ao seu tenant',
      });
      return;
    }

    console.error('Erro ao deletar contato:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar contato',
    });
  }
}

