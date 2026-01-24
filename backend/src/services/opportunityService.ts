/**
 * Serviço para gestão de oportunidades
 * 
 * Lógica de negócio para operações CRUD de oportunidades.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { OpportunityStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { filterFieldsByPermission, validateFieldPermissionsForUpdate } from '../utils/fieldPermissions';
import { logAudit } from '../utils/auditLog';
import { validatePositiveNumber, validateDateNotPast, validateProbability } from '../utils/validators';
import { validateOpportunityStatusTransition } from '../utils/statusTransitions';
import { processAndValidateFieldValue } from '../utils/fieldValueValidator';
import { validateUniqueField } from '../utils/uniqueFieldValidator';
import { EntityService } from './entityService';
import { FieldService } from './fieldService';
import { EntityDataService } from './entityDataService';
import { buildSearchConditions } from '../utils/entitySearchHelpers';
import { validateFilters } from '../utils/filterValidator';
import { buildFilterQuery } from '../utils/filterBuilder';
import { buildOrderBy } from '../utils/orderByHelpers';
import { withQueryTimeout } from '../utils/queryTimeout';
import { cacheManager } from '../cache/cacheManager';
import { generateCacheKey, getEntityCacheTags } from '../cache/cacheKeys';
import { QUERY_LIMITS, QUERY_TIMEOUTS, CACHE_TTL } from '../config/constants';


// Interface para filtros de listagem
export interface OpportunityFilters {
  stageId?: string; // ID do estágio do pipeline
  status?: OpportunityStatus;
  contactId?: string;
  companyId?: string;
  q?: string; // Termo de busca
  advancedFilters?: import('../types/filter.types').Filter[]; // Filtros avançados
}

// Interface para paginação
export interface PaginationParams {
  limit?: number;
  offset?: number; // Manter para compatibilidade
  page?: number; // NOVO
  orderBy?: string | string[]; // Manter para compatibilidade
  order?: 'asc' | 'desc' | ('asc' | 'desc')[]; // Manter para compatibilidade
  sortBy?: string | string[]; // NOVO
  sortOrder?: 'asc' | 'desc' | ('asc' | 'desc')[]; // NOVO
}

// Interface para dados de criação
export interface CreateOpportunityData {
  name: string;
  value: number | string; // Decimal como number ou string
  currency?: string; // Default: "BRL"
  stageId: string; // Obrigatório - FK para PipelineStage
  status?: OpportunityStatus; // Default: OPEN
  closeDate?: Date | string; // Opcional
  probability?: number; // Opcional, 0-100
  contactId?: string; // Opcional - FK para Contact
  companyId?: string; // Opcional - FK para Company
  leadId?: string; // Opcional - FK para Lead
  tagIds?: string[]; // IDs das tags a serem associadas
  customFields?: Record<string, any>;
}

// Interface para dados de atualização
export interface UpdateOpportunityData {
  name?: string;
  value?: number | string;
  currency?: string;
  stageId?: string;
  status?: OpportunityStatus;
  closeDate?: Date | string | null; // null para remover
  actualCloseDate?: Date | string | null; // Data de fechamento real (se ganho/perdido)
  probability?: number | null; // null para remover
  contactId?: string | null; // null para remover associação
  companyId?: string | null; // null para remover associação
  leadId?: string | null; // null para remover associação
  tagIds?: string[]; // Substitui completamente as tags existentes
  customFields?: Record<string, any>;
}

// Interface para resposta de Opportunity
export interface OpportunityResponse {
  id: string;
  tenantId: string;
  name: string;
  value: number; // Decimal convertido para number
  currency: string;
  stageId: string;
  status: OpportunityStatus;
  closeDate?: Date | null;
  actualCloseDate?: Date | null;
  probability?: number | null;
  contactId?: string | null;
  companyId?: string | null;
  leadId?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Relacionamentos incluídos
  stage?: {
    id: string;
    name: string;
    order: number;
    probability: number | null;
    color: string | null;
    pipelineId: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string | null;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
  lead?: {
    id: string;
    firstName: string;
    lastName: string | null;
  } | null;
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  // Campos customizados mesclados
  [key: string]: any;
}

export class OpportunityService {
  /**
   * Lista oportunidades com filtros e paginação
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param filters - Filtros opcionais (stageId, status, contactId, companyId)
   * @param pagination - Parâmetros de paginação (limit, offset, orderBy, order)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Objeto com lista de oportunidades e informações de paginação
   */
  static async listOpportunities(
    tenantId: string,
    filters?: OpportunityFilters,
    pagination?: PaginationParams,
    userId?: string
  ): Promise<{
    data: OpportunityResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      offset?: number; // Manter para compatibilidade
    };
  }> {
    // Calcular paginação: priorizar page sobre offset
    let limit: number;
    let skip: number;
    let page: number;

    // Gerar chave de cache
    const cacheKey = generateCacheKey('listOpportunities', { tenantId, filters, pagination, userId }, tenantId);
    
    // Tentar obter do cache
    try {
      const cached = await cacheManager.get<{
        data: OpportunityResponse[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          offset?: number;
        };
      }>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Falha no cache não deve quebrar a aplicação
      console.error('[Cache] Erro ao buscar do cache:', error);
    }

    if (pagination?.page !== undefined) {
      // Usar page/limit (novo)
      limit = Math.min(pagination.limit || 20, QUERY_LIMITS.MAX_PAGE_SIZE);
      page = pagination.page;
      skip = (page - 1) * limit;
    } else if (pagination?.offset !== undefined) {
      // Usar offset (legado)
      limit = Math.min(pagination.limit || 20, QUERY_LIMITS.MAX_PAGE_SIZE);
      skip = pagination.offset;
      page = Math.floor(skip / limit) + 1;
    } else {
      // Valores padrão
      limit = 20;
      skip = 0;
      page = 1;
    }

    // Construir condições de filtro
    const where: any = {
      tenantId, // Isolamento multi-tenant obrigatório
      deletedAt: null, // Excluir soft deleted
    };

    if (filters?.stageId) {
      where.stageId = filters.stageId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.contactId) {
      where.contactId = filters.contactId;
    }

    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    // Adicionar filtros avançados (após filtros simples)
    if (filters?.advancedFilters && filters.advancedFilters.length > 0) {
      try {
        validateFilters(filters.advancedFilters, 'opportunity');
        const advancedWhere = buildFilterQuery(filters.advancedFilters, 'opportunity');
        Object.assign(where, advancedWhere);
      } catch (error) {
        throw error;
      }
    }

    // Adicionar condição de busca se `q` for fornecido
    if (filters?.q) {
      const searchConditions = buildSearchConditions('opportunity', filters.q);
      if (searchConditions.length > 0) {
        if (Object.keys(where).length > 2 || where.AND) {
          const andConditions: any[] = [];
          andConditions.push({ tenantId });
          andConditions.push({ deletedAt: null });

          if (where.stageId) {
            andConditions.push({ stageId: where.stageId });
            delete where.stageId;
          }
          if (where.status) {
            andConditions.push({ status: where.status });
            delete where.status;
          }
          if (where.contactId) {
            andConditions.push({ contactId: where.contactId });
            delete where.contactId;
          }
          if (where.companyId) {
            andConditions.push({ companyId: where.companyId });
            delete where.companyId;
          }

          const advancedFields = Object.keys(where).filter(
            key => key !== 'tenantId' && key !== 'deletedAt' && key !== 'AND'
          );
          if (advancedFields.length > 0) {
            const advancedConditions: any = {};
            for (const field of advancedFields) {
              advancedConditions[field] = where[field];
              delete where[field];
            }
            andConditions.push(advancedConditions);
          }

          andConditions.push({ OR: searchConditions });
          where.AND = andConditions;
        } else {
          where.OR = searchConditions;
        }
      }
    }

    // Configurar ordenação usando helper centralizado
    // Priorizar sortBy/sortOrder (novo) sobre orderBy/order (legado)
    const orderBy = buildOrderBy(
      pagination?.sortBy || pagination?.orderBy,
      pagination?.sortOrder || pagination?.order,
      'opportunity'
    );

    // Buscar oportunidades com relacionamentos (usando timeout)
    const [opportunities, total] = await withQueryTimeout(
      Promise.all([
        prisma.opportunity.findMany({
          where,
          take: limit,
          skip: skip,
          include: {
            stage: {
              select: {
                id: true,
                name: true,
                order: true,
                probability: true,
                color: true,
                pipelineId: true,
              },
            },
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
              },
            },
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            tags: {
              include: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
          },
          orderBy,
        }),
        prisma.opportunity.count({ where }),
      ]),
      QUERY_TIMEOUTS.LIST,
      'listOpportunities'
    );

    // Calcular totalPages
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    // Formatar resposta (converter Decimal para number)
    let data: OpportunityResponse[] = opportunities.map((opp) => ({
      id: opp.id,
      tenantId: opp.tenantId,
      name: opp.name,
      value: opp.value.toNumber(), // Converter Decimal para number
      currency: opp.currency,
      stageId: opp.stageId,
      status: opp.status,
      closeDate: opp.closeDate,
      actualCloseDate: opp.actualCloseDate,
      probability: opp.probability,
      contactId: opp.contactId,
      companyId: opp.companyId,
      leadId: opp.leadId,
      deletedAt: opp.deletedAt,
      createdAt: opp.createdAt,
      updatedAt: opp.updatedAt,
      stage: {
        id: opp.stage.id,
        name: opp.stage.name,
        order: opp.stage.order,
        probability: opp.stage.probability,
        color: opp.stage.color,
        pipelineId: opp.stage.pipelineId,
      },
      contact: opp.contact
        ? {
            id: opp.contact.id,
            firstName: opp.contact.firstName,
            lastName: opp.contact.lastName,
          }
        : null,
      company: opp.company
        ? {
            id: opp.company.id,
            name: opp.company.name,
          }
        : null,
      lead: opp.lead
        ? {
            id: opp.lead.id,
            firstName: opp.lead.firstName,
            lastName: opp.lead.lastName,
          }
        : null,
      tags: opp.tags.map((ot) => ({
        id: ot.tag.id,
        name: ot.tag.name,
        color: ot.tag.color,
      })),
    }));

    // Buscar campos customizados (batch)
    try {
      const opportunityEntity = await EntityService.getEntityByName(tenantId, 'Opportunity');
      const recordIds = data.map(o => o.id);
      const entityDataMap = await EntityDataService.getEntityDataByRecords(
        tenantId,
        opportunityEntity.id,
        recordIds
      );

      // Mesclar campos customizados com cada oportunidade
      data = data.map(opportunity => ({
        ...opportunity,
        ...(entityDataMap.get(opportunity.id)?.data || {}),
      })) as OpportunityResponse[];
    } catch (error) {
      // Se não conseguir buscar campos customizados, continuar sem eles
    }

    // Filtrar campos por permissão
    if (userId) {
      data = (await filterFieldsByPermission(
        data,
        userId,
        tenantId,
        'Opportunity',
        'read'
      )) as OpportunityResponse[];
    }

    const result = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        offset: skip, // Manter para compatibilidade
      },
    };

    // Armazenar em cache
    try {
      await cacheManager.set(cacheKey, result, CACHE_TTL.LIST, getEntityCacheTags('opportunity'));
    } catch (error) {
      // Falha no cache não deve quebrar a aplicação
      console.error('[Cache] Erro ao armazenar no cache:', error);
    }

    return result;
  }

  /**
   * Obtém oportunidade por ID
   * 
   * @param opportunityId - ID da oportunidade
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Oportunidade encontrada ou null se não encontrada
   */
  static async getOpportunityById(
    opportunityId: string,
    tenantId: string,
    userId?: string
  ): Promise<OpportunityResponse | null> {
    // Buscar oportunidade com relacionamentos
    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
      include: {
        stage: {
          select: {
            id: true,
            name: true,
            order: true,
            probability: true,
            color: true,
            pipelineId: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!opportunity) {
      return null;
    }

    // Formatar resposta (converter Decimal para number)
    let opportunityResponse: OpportunityResponse = {
      id: opportunity.id,
      tenantId: opportunity.tenantId,
      name: opportunity.name,
      value: opportunity.value.toNumber(), // Converter Decimal para number
      currency: opportunity.currency,
      stageId: opportunity.stageId,
      status: opportunity.status,
      closeDate: opportunity.closeDate,
      actualCloseDate: opportunity.actualCloseDate,
      probability: opportunity.probability,
      contactId: opportunity.contactId,
      companyId: opportunity.companyId,
      leadId: opportunity.leadId,
      deletedAt: opportunity.deletedAt,
      createdAt: opportunity.createdAt,
      updatedAt: opportunity.updatedAt,
      stage: {
        id: opportunity.stage.id,
        name: opportunity.stage.name,
        order: opportunity.stage.order,
        probability: opportunity.stage.probability,
        color: opportunity.stage.color,
        pipelineId: opportunity.stage.pipelineId,
      },
      contact: opportunity.contact
        ? {
            id: opportunity.contact.id,
            firstName: opportunity.contact.firstName,
            lastName: opportunity.contact.lastName,
          }
        : null,
      company: opportunity.company
        ? {
            id: opportunity.company.id,
            name: opportunity.company.name,
          }
        : null,
      lead: opportunity.lead
        ? {
            id: opportunity.lead.id,
            firstName: opportunity.lead.firstName,
            lastName: opportunity.lead.lastName,
          }
        : null,
      tags: opportunity.tags.map((ot) => ({
        id: ot.tag.id,
        name: ot.tag.name,
        color: ot.tag.color,
      })),
    };

    // Buscar campos customizados
    let customFieldsData: Record<string, any> = {};
    try {
      const opportunityEntity = await EntityService.getEntityByName(tenantId, 'Opportunity');
      const entityData = await EntityDataService.getEntityDataByRecord(
        tenantId,
        opportunityEntity.id,
        opportunity.id
      );
      if (entityData) {
        customFieldsData = entityData.data;
      }
    } catch (error) {
      // Se não conseguir buscar campos customizados, continuar sem eles
    }

    // Mesclar campos customizados com resposta
    opportunityResponse = {
      ...opportunityResponse,
      ...customFieldsData,
    } as OpportunityResponse;

    // Filtrar campos por permissão
    if (userId) {
      opportunityResponse = (await filterFieldsByPermission(
        opportunityResponse,
        userId,
        tenantId,
        'Opportunity',
        'read'
      )) as OpportunityResponse;
    }

    return opportunityResponse;
  }

  /**
   * Cria nova oportunidade
   * 
   * @param data - Dados da oportunidade
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Oportunidade criada
   * @throws Error se validações falharem
   */
  static async createOpportunity(
    data: CreateOpportunityData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<OpportunityResponse> {
    // Validar dados obrigatórios
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('name é obrigatório e não pode ser vazio');
    }

    if (!data.value) {
      throw new Error('value é obrigatório');
    }

    validatePositiveNumber(data.value);

    if (!data.stageId) {
      throw new Error('stageId é obrigatório');
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.stageId)) {
      throw new Error('stageId deve ser um UUID válido');
    }

    // Validar stageId (PipelineStage)
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: data.stageId,
        tenantId, // Garantir que pertence ao tenant
      },
      include: {
        pipeline: {
          select: {
            id: true,
            tenantId: true,
          },
        },
      },
    });

    if (!stage) {
      throw new Error('PipelineStage não encontrado ou não pertence ao tenant');
    }

    if (stage.pipeline.tenantId !== tenantId) {
      throw new Error('PipelineStage não pertence ao tenant');
    }

    // Validar closeDate se fornecido
    let closeDate: Date | null = null;
    if (data.closeDate) {
      closeDate = data.closeDate instanceof Date ? data.closeDate : new Date(data.closeDate);
      if (isNaN(closeDate.getTime())) {
        throw new Error('closeDate inválida');
      }
      validateDateNotPast(closeDate);
    }

    // Validar probability se fornecido
    let probability: number | null = null;
    if (data.probability !== undefined && data.probability !== null) {
      validateProbability(data.probability);
      probability = data.probability;
    } else {
      // Usar probability do PipelineStage se não fornecida
      probability = stage.probability;
    }

    // Validar contactId, companyId, leadId se fornecidos
    if (data.contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: data.contactId,
          tenantId,
          deletedAt: null,
        },
      });
      if (!contact) {
        throw new Error('Contact não encontrado, não pertence ao tenant ou foi deletado');
      }
    }

    if (data.companyId) {
      const company = await prisma.company.findFirst({
        where: {
          id: data.companyId,
          tenantId,
          deletedAt: null,
        },
      });
      if (!company) {
        throw new Error('Company não encontrada, não pertence ao tenant ou foi deletada');
      }
    }

    if (data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: {
          id: data.leadId,
          tenantId,
          deletedAt: null,
        },
      });
      if (!lead) {
        throw new Error('Lead não encontrado, não pertence ao tenant ou foi deletado');
      }
    }

    // Validar tagIds se fornecidos
    if (data.tagIds && data.tagIds.length > 0) {
      const tags = await prisma.tag.findMany({
        where: {
          id: { in: data.tagIds },
          tenantId,
        },
      });

      if (tags.length !== data.tagIds.length) {
        throw new Error('Uma ou mais tags não foram encontradas ou não pertencem ao tenant');
      }
    }

    // Converter value para Decimal
    const valueDecimal = new Prisma.Decimal(data.value);

    // Criar oportunidade em transação
    const opportunity = await prisma.$transaction(async (tx) => {
      // Criar oportunidade
      const createdOpportunity = await tx.opportunity.create({
        data: {
          tenantId,
          name: data.name.trim(),
          value: valueDecimal,
          currency: data.currency || 'BRL',
          stageId: data.stageId,
          status: data.status || 'OPEN',
          closeDate,
          probability,
          contactId: data.contactId || null,
          companyId: data.companyId || null,
          leadId: data.leadId || null,
        },
      });

      // Associar tags se fornecidas
      if (data.tagIds && data.tagIds.length > 0) {
        await tx.opportunityTag.createMany({
          data: data.tagIds.map(tagId => ({
            opportunityId: createdOpportunity.id,
            tagId,
          })),
        });
      }

      // Validar e salvar campos customizados se fornecidos
      if (data.customFields !== undefined) {
        try {
          const opportunityEntity = await EntityService.getEntityByName(tenantId, 'Opportunity');
          const customFields = await FieldService.listFields(tenantId, opportunityEntity.id);

          const validatedCustomFields: Record<string, any> = {};
          if (data.customFields && Object.keys(data.customFields).length > 0) {
            for (const [fieldName, value] of Object.entries(data.customFields)) {
              const field = customFields.find(f => f.name === fieldName);
              if (!field) {
                throw new Error(`Campo customizado '${fieldName}' não encontrado`);
              }

              const validatedValue = processAndValidateFieldValue(field, value);
              validatedCustomFields[fieldName] = validatedValue;

              if (field.unique) {
                await validateUniqueField(tenantId, opportunityEntity.id, field.id, validatedValue);
              }
            }
          }

          // Validar campos obrigatórios
          for (const field of customFields) {
            if (field.required && !(field.name in validatedCustomFields)) {
              if (field.defaultValue === null || field.defaultValue === undefined) {
                throw new Error(`Campo customizado obrigatório '${field.label}' (${field.name}) não foi fornecido`);
              }
              validatedCustomFields[field.name] = field.defaultValue;
            }
          }

          if (Object.keys(validatedCustomFields).length > 0) {
            await EntityDataService.saveEntityData(
              tenantId,
              opportunityEntity.id,
              createdOpportunity.id,
              validatedCustomFields
            );
          }
        } catch (error) {
          throw error;
        }
      }

      return createdOpportunity;
    });

    // Registrar auditoria
    if (requestingUserId) {
      try {
        await logAudit('Opportunity', opportunity.id, 'create', requestingUserId, tenantId);
      } catch (error) {
        console.error('Erro ao registrar auditoria:', error);
      }
    }

    // Retornar oportunidade criada
    const created = await this.getOpportunityById(opportunity.id, tenantId, requestingUserId);
    if (!created) {
      throw new Error('Erro ao buscar oportunidade criada');
    }

    return created;
  }

  /**
   * Atualiza oportunidade existente
   * 
   * @param opportunityId - ID da oportunidade a ser atualizada
   * @param data - Dados a serem atualizados
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está atualizando (para auditoria e permissões)
   * @returns Oportunidade atualizada
   * @throws Error se validações falharem ou oportunidade não encontrada
   */
  static async updateOpportunity(
    opportunityId: string,
    data: UpdateOpportunityData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<OpportunityResponse> {
    // Validar formato UUID e buscar oportunidade existente
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opportunityId)) {
      throw new Error('opportunityId deve ser um UUID válido');
    }

    const existingOpportunity = await prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        tenantId,
        deletedAt: null,
      },
      include: {
        stage: true,
      },
    });

    if (!existingOpportunity) {
      throw new Error('Oportunidade não encontrada, não pertence ao seu tenant ou foi deletada');
    }

    // Capturar dados antigos para auditoria
    const oldData = {
      name: existingOpportunity.name,
      value: existingOpportunity.value.toNumber(),
      currency: existingOpportunity.currency,
      stageId: existingOpportunity.stageId,
      status: existingOpportunity.status,
      closeDate: existingOpportunity.closeDate,
      probability: existingOpportunity.probability,
      contactId: existingOpportunity.contactId,
      companyId: existingOpportunity.companyId,
      leadId: existingOpportunity.leadId,
    };

    // Validar permissões por campo
    if (requestingUserId) {
      await validateFieldPermissionsForUpdate(
        data,
        requestingUserId,
        tenantId,
        'Opportunity'
      );
    }

    // Validar e processar dados (mesmas validações do create)
    let valueDecimal: Prisma.Decimal | undefined;
    if (data.value !== undefined) {
      validatePositiveNumber(data.value);
      valueDecimal = new Prisma.Decimal(data.value);
    }

    let closeDate: Date | null | undefined;
    if (data.closeDate !== undefined) {
      if (data.closeDate === null) {
        closeDate = null;
      } else {
        closeDate = data.closeDate instanceof Date ? data.closeDate : new Date(data.closeDate);
        if (isNaN(closeDate.getTime())) {
          throw new Error('closeDate inválida');
        }
        validateDateNotPast(closeDate);
      }
    }

    let probability: number | null | undefined;
    if (data.probability !== undefined) {
      if (data.probability === null) {
        probability = null;
      } else {
        validateProbability(data.probability);
        probability = data.probability;
      }
    }

    // Validar stageId se alterado
    let newStage: any = null;
    if (data.stageId && data.stageId !== existingOpportunity.stageId) {
      newStage = await prisma.pipelineStage.findFirst({
        where: {
          id: data.stageId,
          tenantId,
        },
        include: {
          pipeline: {
            select: {
              id: true,
              tenantId: true,
            },
          },
        },
      });

      if (!newStage) {
        throw new Error('PipelineStage não encontrado ou não pertence ao tenant');
      }

      if (newStage.pipeline.tenantId !== tenantId) {
        throw new Error('PipelineStage não pertence ao tenant');
      }

      // Se probability não fornecida e stageId alterado, usar probability do novo estágio
      if (probability === undefined && newStage.probability !== null) {
        probability = newStage.probability;
      }
    }

    // Validar relacionamentos se fornecidos
    if (data.contactId !== undefined) {
      if (data.contactId === null) {
        // Permitir remover associação
      } else {
        const contact = await prisma.contact.findFirst({
          where: {
            id: data.contactId,
            tenantId,
            deletedAt: null,
          },
        });
        if (!contact) {
          throw new Error('Contact não encontrado, não pertence ao tenant ou foi deletado');
        }
      }
    }

    if (data.companyId !== undefined) {
      if (data.companyId === null) {
        // Permitir remover associação
      } else {
        const company = await prisma.company.findFirst({
          where: {
            id: data.companyId,
            tenantId,
            deletedAt: null,
          },
        });
        if (!company) {
          throw new Error('Company não encontrada, não pertence ao tenant ou foi deletada');
        }
      }
    }

    if (data.leadId !== undefined) {
      if (data.leadId === null) {
        // Permitir remover associação
      } else {
        const lead = await prisma.lead.findFirst({
          where: {
            id: data.leadId,
            tenantId,
            deletedAt: null,
          },
        });
        if (!lead) {
          throw new Error('Lead não encontrado, não pertence ao tenant ou foi deletado');
        }
      }
    }

    // Validar tagIds se fornecidos
    if (data.tagIds !== undefined) {
      if (data.tagIds.length > 0) {
        const tags = await prisma.tag.findMany({
          where: {
            id: { in: data.tagIds },
            tenantId,
          },
        });

        if (tags.length !== data.tagIds.length) {
          throw new Error('Uma ou mais tags não foram encontradas ou não pertencem ao tenant');
        }
      }
    }

    // Validar transição de status se status está sendo alterado
    let actualCloseDateToUpdate: Date | null | undefined = undefined;
    if (data.status && data.status !== existingOpportunity.status) {
      // Validar transição de status
      validateOpportunityStatusTransition(existingOpportunity.status, data.status);
      
      // Se mudando para WON ou LOST, atualizar actualCloseDate se não estiver definida
      if ((data.status === 'WON' || data.status === 'LOST') && !existingOpportunity.actualCloseDate) {
        // Se usuário forneceu actualCloseDate explicitamente, usar valor fornecido
        // Caso contrário, usar data atual
        if (data.actualCloseDate !== undefined && data.actualCloseDate !== null) {
          actualCloseDateToUpdate = data.actualCloseDate instanceof Date 
            ? data.actualCloseDate 
            : new Date(data.actualCloseDate);
        } else if (data.actualCloseDate === undefined) {
          actualCloseDateToUpdate = new Date();
        }
      }
    }

    // Se usuário forneceu actualCloseDate explicitamente (independente de status), usar valor fornecido
    if (data.actualCloseDate !== undefined && actualCloseDateToUpdate === undefined) {
      if (data.actualCloseDate === null) {
        actualCloseDateToUpdate = null;
      } else {
        actualCloseDateToUpdate = data.actualCloseDate instanceof Date 
          ? data.actualCloseDate 
          : new Date(data.actualCloseDate);
      }
    }

    // Atualizar em transação
    await prisma.$transaction(async (tx) => {
      // Atualizar campos primitivos
      await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(valueDecimal !== undefined && { value: valueDecimal }),
          ...(data.currency !== undefined && { currency: data.currency }),
          ...(data.stageId !== undefined && { stageId: data.stageId }),
          ...(data.status !== undefined && { status: data.status }),
          ...(closeDate !== undefined && { closeDate }),
          ...(actualCloseDateToUpdate !== undefined && { actualCloseDate: actualCloseDateToUpdate }),
          ...(probability !== undefined && { probability }),
          ...(data.contactId !== undefined && { contactId: data.contactId }),
          ...(data.companyId !== undefined && { companyId: data.companyId }),
          ...(data.leadId !== undefined && { leadId: data.leadId }),
        },
      });

      // Atualizar tags se fornecido
      if (data.tagIds !== undefined) {
        await tx.opportunityTag.deleteMany({
          where: {
            opportunityId,
          },
        });

        if (data.tagIds.length > 0) {
          await tx.opportunityTag.createMany({
            data: data.tagIds.map(tagId => ({
              opportunityId,
              tagId,
            })),
          });
        }
      }

      // Validar e atualizar campos customizados se fornecidos
      if (data.customFields !== undefined) {
        try {
          const opportunityEntity = await EntityService.getEntityByName(tenantId, 'Opportunity');
          const customFields = await FieldService.listFields(tenantId, opportunityEntity.id);

          const existingEntityData = await EntityDataService.getEntityDataByRecord(
            tenantId,
            opportunityEntity.id,
            opportunityId
          );
          const existingCustomFields = existingEntityData?.data || {};

          const mergedCustomFields = { ...existingCustomFields, ...data.customFields };

          const validatedCustomFields: Record<string, any> = {};
          for (const [fieldName, value] of Object.entries(mergedCustomFields)) {
            const field = customFields.find(f => f.name === fieldName);
            if (!field) {
              continue;
            }

            const validatedValue = processAndValidateFieldValue(field, value);
            validatedCustomFields[fieldName] = validatedValue;

            if (field.unique) {
              await validateUniqueField(tenantId, opportunityEntity.id, field.id, validatedValue, opportunityId);
            }
          }

          for (const field of customFields) {
            if (field.required && !(field.name in validatedCustomFields)) {
              if (field.defaultValue === null || field.defaultValue === undefined) {
                throw new Error(`Campo customizado obrigatório '${field.label}' (${field.name}) não foi fornecido`);
              }
              validatedCustomFields[field.name] = field.defaultValue;
            }
          }

          await EntityDataService.saveEntityData(
            tenantId,
            opportunityEntity.id,
            opportunityId,
            validatedCustomFields
          );
        } catch (error) {
          throw error;
        }
      }
    });

    // Comparar campos alterados para auditoria
    const changes: Record<string, { old: any; new: any }> = {};

    if (data.name !== undefined && data.name.trim() !== oldData.name) {
      changes.name = { old: oldData.name, new: data.name.trim() };
    }
    if (data.value !== undefined && valueDecimal && !valueDecimal.equals(existingOpportunity.value)) {
      changes.value = { old: oldData.value, new: valueDecimal.toNumber() };
    }
    if (data.currency !== undefined && data.currency !== oldData.currency) {
      changes.currency = { old: oldData.currency, new: data.currency };
    }
    if (data.stageId !== undefined && data.stageId !== oldData.stageId) {
      changes.stageId = { old: oldData.stageId, new: data.stageId };
    }
    if (data.status !== undefined && data.status !== oldData.status) {
      changes.status = { old: oldData.status, new: data.status };
    }
    if (closeDate !== undefined) {
      const oldCloseDate = oldData.closeDate?.toISOString() || null;
      const newCloseDate = closeDate?.toISOString() || null;
      if (oldCloseDate !== newCloseDate) {
        changes.closeDate = { old: oldCloseDate, new: newCloseDate };
      }
    }
    if (probability !== undefined && probability !== oldData.probability) {
      changes.probability = { old: oldData.probability, new: probability };
    }
    if (data.contactId !== undefined && data.contactId !== oldData.contactId) {
      changes.contactId = { old: oldData.contactId, new: data.contactId };
    }
    if (data.companyId !== undefined && data.companyId !== oldData.companyId) {
      changes.companyId = { old: oldData.companyId, new: data.companyId };
    }
    if (data.leadId !== undefined && data.leadId !== oldData.leadId) {
      changes.leadId = { old: oldData.leadId, new: data.leadId };
    }

    // Registrar auditoria
    if (requestingUserId) {
      try {
        await logAudit('Opportunity', opportunityId, 'update', requestingUserId, tenantId, changes);
      } catch (error) {
        console.error('Erro ao registrar auditoria:', error);
      }
    }

    // Retornar oportunidade atualizada
    const updated = await this.getOpportunityById(opportunityId, tenantId, requestingUserId);
    if (!updated) {
      throw new Error('Erro ao buscar oportunidade atualizada');
    }

    return updated;
  }

  /**
   * Deleta oportunidade (soft delete)
   * 
   * @param opportunityId - ID da oportunidade a ser deletada
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está deletando (para auditoria)
   * @returns ID da oportunidade deletada
   * @throws Error se oportunidade não encontrada
   */
  static async deleteOpportunity(
    opportunityId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<string> {
    // Validar formato UUID e buscar oportunidade
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opportunityId)) {
      throw new Error('opportunityId deve ser um UUID válido');
    }

    const existingOpportunity = await prisma.opportunity.findFirst({
      where: {
        id: opportunityId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingOpportunity) {
      throw new Error('Oportunidade não encontrada, não pertence ao seu tenant ou já foi deletada');
    }

    // Soft delete
    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Registrar auditoria
    if (requestingUserId) {
      try {
        await logAudit('Opportunity', opportunityId, 'delete', requestingUserId, tenantId);
      } catch (error) {
        console.error('Erro ao registrar auditoria:', error);
      }
    }

    return opportunityId;
  }
}
