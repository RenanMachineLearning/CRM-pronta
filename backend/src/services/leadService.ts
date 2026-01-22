/**
 * Serviço para gestão de leads
 * 
 * Lógica de negócio para operações CRUD de leads.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { PrismaClient, LeadStatus } from '@prisma/client';
import { filterFieldsByPermission, validateFieldPermissionsForUpdate } from '../utils/fieldPermissions';
import { logAudit } from '../utils/auditLog';
import { validateEmail, validatePhone } from '../utils/validators';
import { processAndValidateFieldValue } from '../utils/fieldValueValidator';
import { validateUniqueField } from '../utils/uniqueFieldValidator';
import { validateLeadStatusTransition } from '../utils/statusTransitions';
import { EntityService } from './entityService';
import { FieldService } from './fieldService';
import { EntityDataService } from './entityDataService';
import { buildSearchConditions } from '../utils/entitySearchHelpers';
import { validateFilters } from '../utils/filterValidator';
import { buildFilterQuery } from '../utils/filterBuilder';
import { buildOrderBy } from '../utils/orderByHelpers';

const prisma = new PrismaClient();

// Interface para filtros de listagem
export interface LeadFilters {
  status?: LeadStatus;
  source?: string;
  converted?: boolean;
  q?: string; // Termo de busca
  advancedFilters?: import('../types/filter.types').Filter[]; // Filtros avançados
}

// Interface para paginação
export interface PaginationParams {
  limit?: number;
  offset?: number;
  orderBy?: string | string[]; // Manter para compatibilidade
  order?: 'asc' | 'desc' | ('asc' | 'desc')[]; // Manter para compatibilidade
  sortBy?: string | string[]; // NOVO
  sortOrder?: 'asc' | 'desc' | ('asc' | 'desc')[]; // NOVO
}

// Interface para dados de criação
export interface CreateLeadData {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status?: LeadStatus;
  tagIds?: string[]; // IDs das tags a serem associadas
  customFields?: Record<string, any>;
}

// Interface para dados de atualização
export interface UpdateLeadData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status?: LeadStatus;
  tagIds?: string[]; // IDs das tags (substitui completamente as tags existentes)
  customFields?: Record<string, any>;
}

// Interface para resposta de Lead
export interface LeadResponse {
  id: string;
  tenantId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  status: LeadStatus;
  converted: boolean;
  convertedAt?: Date | null;
  convertedToContactId?: string | null;
  convertedToOpportunityId?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Informações de conversão (opcional, para listagem)
  convertedToContact?: {
    id: string;
    firstName: string;
    lastName?: string | null;
  } | null;
  convertedToOpportunity?: {
    id: string;
    name: string;
  } | null;
  // Tags associadas
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  // Campos customizados mesclados
  [key: string]: any;
}

export class LeadService {
  /**
   * Lista leads com filtros e paginação
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param filters - Filtros opcionais (status, source, converted)
   * @param pagination - Parâmetros de paginação (limit, offset, orderBy, order)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Objeto com lista de leads e informações de paginação
   */
  static async listLeads(
    tenantId: string,
    filters?: LeadFilters,
    pagination?: PaginationParams,
    userId?: string
  ): Promise<{
    data: LeadResponse[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }> {
    // Valores padrão para paginação
    const limit = Math.min(pagination?.limit || 20, 100); // Máximo 100
    const offset = pagination?.offset || 0;

    // Construir condições de filtro
    const where: any = {
      tenantId, // Isolamento multi-tenant obrigatório
      deletedAt: null, // Excluir soft deleted
    };

    // Adicionar filtro de status se fornecido
    if (filters?.status) {
      where.status = filters.status;
    }

    // Adicionar filtro de source se fornecido (busca parcial case-insensitive)
    if (filters?.source) {
      where.source = {
        contains: filters.source.trim(),
        mode: 'insensitive', // Case-insensitive
      };
    }

    // Adicionar filtro de converted se fornecido
    if (filters?.converted !== undefined) {
      where.converted = filters.converted;
    }

    // Adicionar filtros avançados (após filtros simples)
    if (filters?.advancedFilters && filters.advancedFilters.length > 0) {
      try {
        validateFilters(filters.advancedFilters, 'lead');
        const advancedWhere = buildFilterQuery(filters.advancedFilters, 'lead');
        Object.assign(where, advancedWhere);
      } catch (error) {
        throw error;
      }
    }

    // Adicionar condição de busca se `q` for fornecido
    if (filters?.q) {
      const searchConditions = buildSearchConditions('lead', filters.q);
      if (searchConditions.length > 0) {
        if (Object.keys(where).length > 2 || where.AND) {
          const andConditions: any[] = [];
          andConditions.push({ tenantId });
          andConditions.push({ deletedAt: null });

          if (where.status) {
            andConditions.push({ status: where.status });
            delete where.status;
          }
          if (where.source) {
            andConditions.push({ source: where.source });
            delete where.source;
          }
          if (where.converted !== undefined) {
            andConditions.push({ converted: where.converted });
            delete where.converted;
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
      'lead'
    );

    // Buscar leads com relacionamentos
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          convertedToContact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          convertedToOpportunity: {
            select: {
              id: true,
              name: true,
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
      prisma.lead.count({ where }),
    ]);

    // Formatar resposta
    let data: LeadResponse[] = leads.map((lead) => ({
      id: lead.id,
      tenantId: lead.tenantId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      status: lead.status,
      converted: lead.converted,
      convertedAt: lead.convertedAt,
      convertedToContactId: lead.convertedToContactId,
      convertedToOpportunityId: lead.convertedToOpportunityId,
      deletedAt: lead.deletedAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      convertedToContact: lead.convertedToContact
        ? {
            id: lead.convertedToContact.id,
            firstName: lead.convertedToContact.firstName,
            lastName: lead.convertedToContact.lastName,
          }
        : null,
      convertedToOpportunity: lead.convertedToOpportunity
        ? {
            id: lead.convertedToOpportunity.id,
            name: lead.convertedToOpportunity.name,
          }
        : null,
      tags: lead.tags.map((lt) => ({
        id: lt.tag.id,
        name: lt.tag.name,
        color: lt.tag.color,
      })),
    }));

    // Buscar campos customizados para cada lead (batch)
    try {
      const leadEntity = await EntityService.getEntityByName(tenantId, 'Lead');
      const recordIds = data.map(l => l.id);
      const entityDataMap = await EntityDataService.getEntityDataByRecords(
        tenantId,
        leadEntity.id,
        recordIds
      );
      
      // Mesclar campos customizados com cada lead
      data = data.map(lead => ({
        ...lead,
        ...(entityDataMap.get(lead.id)?.data || {}),
      })) as LeadResponse[];
    } catch (error) {
      // Se não conseguir buscar campos customizados, continuar sem eles
      // (pode ser que entidade Lead não exista ainda no sistema de metadados)
    }

    // Filtrar campos baseado em permissões do usuário
    if (userId) {
      data = (await filterFieldsByPermission(
        data,
        userId,
        tenantId,
        'Lead',
        'read'
      )) as LeadResponse[];
    }

    return {
      data,
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }

  /**
   * Obtém lead por ID
   * 
   * @param leadId - ID do lead
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Lead encontrado ou null se não encontrado
   */
  static async getLeadById(
    leadId: string,
    tenantId: string,
    userId?: string
  ): Promise<LeadResponse | null> {
    // Buscar lead com relacionamentos
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
      include: {
        convertedToContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        convertedToOpportunity: {
          select: {
            id: true,
            name: true,
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

    if (!lead) {
      return null;
    }

    // Formatar resposta
    let leadResponse: LeadResponse = {
      id: lead.id,
      tenantId: lead.tenantId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      status: lead.status,
      converted: lead.converted,
      convertedAt: lead.convertedAt,
      convertedToContactId: lead.convertedToContactId,
      convertedToOpportunityId: lead.convertedToOpportunityId,
      deletedAt: lead.deletedAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      convertedToContact: lead.convertedToContact
        ? {
            id: lead.convertedToContact.id,
            firstName: lead.convertedToContact.firstName,
            lastName: lead.convertedToContact.lastName,
          }
        : null,
      convertedToOpportunity: lead.convertedToOpportunity
        ? {
            id: lead.convertedToOpportunity.id,
            name: lead.convertedToOpportunity.name,
          }
        : null,
      tags: lead.tags.map((lt) => ({
        id: lt.tag.id,
        name: lt.tag.name,
        color: lt.tag.color,
      })),
    };

    // Buscar campos customizados
    let customFieldsData: Record<string, any> = {};
    try {
      const leadEntity = await EntityService.getEntityByName(tenantId, 'Lead');
      const entityData = await EntityDataService.getEntityDataByRecord(
        tenantId,
        leadEntity.id,
        lead.id
      );
      if (entityData) {
        customFieldsData = entityData.data;
      }
    } catch (error) {
      // Se não conseguir buscar campos customizados, continuar sem eles
      // (pode ser que entidade Lead não exista ainda no sistema de metadados)
    }

    // Mesclar campos customizados com resposta
    leadResponse = {
      ...leadResponse,
      ...customFieldsData,
    } as LeadResponse;

    // Filtrar campos baseado em permissões do usuário
    if (userId) {
      leadResponse = (await filterFieldsByPermission(
        leadResponse,
        userId,
        tenantId,
        'Lead',
        'read'
      )) as LeadResponse;
    }

    return leadResponse;
  }

  /**
   * Cria novo lead
   * 
   * @param data - Dados do lead
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Lead criado
   * @throws Error se validações falharem
   */
  static async createLead(
    data: CreateLeadData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<LeadResponse> {
    // Validar que id não foi fornecido (gerado automaticamente)
    if ((data as any).id !== undefined) {
      throw new Error('O ID é gerado automaticamente e não pode ser fornecido');
    }

    // Validar que pelo menos firstName ou lastName é fornecido
    const hasFirstName = data.firstName && data.firstName.trim().length > 0;
    const hasLastName = data.lastName && data.lastName.trim().length > 0;

    if (!hasFirstName && !hasLastName) {
      throw new Error('Pelo menos firstName ou lastName deve ser fornecido');
    }

    // Validar email se fornecido
    if (data.email && !validateEmail(data.email)) {
      throw new Error(`Email inválido: ${data.email}`);
    }

    // Validar telefone se fornecido
    if (data.phone && !validatePhone(data.phone)) {
      throw new Error(`Telefone inválido: ${data.phone}`);
    }

    // Validar status (enum)
    if (data.status && !['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'].includes(data.status)) {
      throw new Error('Status inválido. Deve ser NEW, QUALIFIED, CONVERTED ou LOST');
    }

    // Validar tagIds se fornecidos
    if (data.tagIds && data.tagIds.length > 0) {
      const tags = await prisma.tag.findMany({
        where: {
          id: { in: data.tagIds },
          tenantId, // Garantir que tags pertencem ao tenant
        },
      });

      if (tags.length !== data.tagIds.length) {
        throw new Error('Uma ou mais tags não foram encontradas ou não pertencem ao tenant');
      }
    }

    // Criar lead em transação
    const lead = await prisma.$transaction(async (tx) => {
      // Criar lead
      const createdLead = await tx.lead.create({
        data: {
          tenantId,
          firstName: data.firstName.trim(),
          lastName: data.lastName?.trim() || null,
          email: data.email?.trim() || null,
          phone: data.phone?.trim() || null,
          company: data.company?.trim() || null,
          source: data.source?.trim() || null,
          status: data.status || 'NEW',
          converted: false,
        },
      });

      // Associar tags se fornecidas
      if (data.tagIds && data.tagIds.length > 0) {
        await tx.leadTag.createMany({
          data: data.tagIds.map(tagId => ({
            leadId: createdLead.id,
            tagId,
          })),
        });
      }

      // Validar e salvar campos customizados se fornecidos
      if (data.customFields !== undefined) {
        try {
          // Buscar entidade Lead
          const leadEntity = await EntityService.getEntityByName(tenantId, 'Lead');
          
          // Buscar campos customizados da entidade
          const customFields = await FieldService.listFields(tenantId, leadEntity.id);
          
          // Validar cada campo customizado fornecido
          const validatedCustomFields: Record<string, any> = {};
          if (data.customFields && Object.keys(data.customFields).length > 0) {
            for (const [fieldName, value] of Object.entries(data.customFields)) {
              const field = customFields.find(f => f.name === fieldName);
              if (!field) {
                throw new Error(`Campo customizado '${fieldName}' não encontrado`);
              }
              
              // Processar e validar valor
              const validatedValue = processAndValidateFieldValue(field, value);
              validatedCustomFields[fieldName] = validatedValue;
              
              // Validar unicidade se necessário
              if (field.unique) {
                await validateUniqueField(tenantId, leadEntity.id, field.id, validatedValue);
              }
            }
          }
          
          // Validar campos obrigatórios que não foram fornecidos
          for (const field of customFields) {
            if (field.required && !(field.name in validatedCustomFields)) {
              // Verificar se tem valor padrão
              if (field.defaultValue === null || field.defaultValue === undefined) {
                throw new Error(`Campo customizado obrigatório '${field.label}' (${field.name}) não foi fornecido`);
              }
              // Usar valor padrão se disponível
              validatedCustomFields[field.name] = field.defaultValue;
            }
          }
          
          // Salvar em EntityData apenas se houver campos para salvar
          if (Object.keys(validatedCustomFields).length > 0) {
            await EntityDataService.saveEntityData(
              tenantId,
              leadEntity.id,
              createdLead.id,
              validatedCustomFields
            );
          }
        } catch (error) {
          // Se não conseguir processar campos customizados, lançar erro
          throw error;
        }
      }

      return createdLead;
    });

    // Registrar auditoria (após commit bem-sucedido)
    if (requestingUserId) {
      logAudit('Lead', lead.id, 'create', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    // Buscar lead completo com relacionamentos
    const createdLead = await this.getLeadById(lead.id, tenantId, requestingUserId);
    if (!createdLead) {
      throw new Error('Erro ao buscar lead criado');
    }

    return createdLead;
  }

  /**
   * Atualiza lead e relacionamentos
   * 
   * @param leadId - ID do lead a ser atualizado
   * @param data - Dados para atualização
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (para validar permissões de campo)
   * @returns Lead atualizado
   * @throws Error se lead não encontrado ou validações falharem
   */
  static async updateLead(
    leadId: string,
    data: UpdateLeadData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<LeadResponse> {
    // Verificar se lead existe e pertence ao tenant
    const existingLead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
    });

    if (!existingLead) {
      throw new Error('Lead não encontrado, não pertence ao seu tenant ou foi deletado');
    }

    // Capturar dados antigos para auditoria (antes de atualizar)
    const oldData = {
      firstName: existingLead.firstName,
      lastName: existingLead.lastName,
      email: existingLead.email,
      phone: existingLead.phone,
      company: existingLead.company,
      source: existingLead.source,
      status: existingLead.status,
    };

    // Validar permissões de campo antes de atualizar
    if (requestingUserId) {
      // Preparar objeto com apenas campos primitivos
      const primitiveFields: Record<string, any> = {};
      if (data.firstName !== undefined) primitiveFields.firstName = data.firstName;
      if (data.lastName !== undefined) primitiveFields.lastName = data.lastName;
      if (data.email !== undefined) primitiveFields.email = data.email;
      if (data.phone !== undefined) primitiveFields.phone = data.phone;
      if (data.company !== undefined) primitiveFields.company = data.company;
      if (data.source !== undefined) primitiveFields.source = data.source;
      if (data.status !== undefined) primitiveFields.status = data.status;

      const validation = await validateFieldPermissionsForUpdate(
        primitiveFields,
        requestingUserId,
        tenantId,
        'Lead'
      );

      if (!validation.allowed) {
        throw new Error(
          `Você não tem permissão para atualizar os seguintes campos: ${validation.forbiddenFields.join(', ')}`
        );
      }
    }

    // Validar que pelo menos firstName ou lastName estará presente após atualização
    const finalFirstName = data.firstName !== undefined ? data.firstName : existingLead.firstName;
    const finalLastName = data.lastName !== undefined ? data.lastName : existingLead.lastName;
    
    const hasFirstName = finalFirstName && finalFirstName.trim().length > 0;
    const hasLastName = finalLastName && finalLastName.trim().length > 0;

    if (!hasFirstName && !hasLastName) {
      throw new Error('Pelo menos firstName ou lastName deve estar presente');
    }

    // Validar firstName se fornecido
    if (data.firstName !== undefined && data.firstName.trim().length === 0) {
      throw new Error('firstName não pode ser vazio');
    }

    // Validar lastName se fornecido
    if (data.lastName !== undefined && data.lastName.trim().length === 0) {
      throw new Error('lastName não pode ser vazio');
    }

    // Validar email se fornecido
    if (data.email !== undefined && data.email !== null && !validateEmail(data.email)) {
      throw new Error(`Email inválido: ${data.email}`);
    }

    // Validar telefone se fornecido
    if (data.phone !== undefined && data.phone !== null && !validatePhone(data.phone)) {
      throw new Error(`Telefone inválido: ${data.phone}`);
    }

    // Validar status (enum)
    if (data.status && !['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'].includes(data.status)) {
      throw new Error('Status inválido. Deve ser NEW, QUALIFIED, CONVERTED ou LOST');
    }

    // Validar transição de status se status está sendo alterado
    if (data.status && data.status !== existingLead.status) {
      // Validação adicional: Lead convertido não pode mudar de status
      if (existingLead.converted) {
        throw new Error('Lead convertido não pode ter seu status alterado');
      }
      
      // Validar transição de status
      validateLeadStatusTransition(existingLead.status, data.status, false);
    }

    // Validar tagIds se fornecidos
    if (data.tagIds !== undefined && data.tagIds.length > 0) {
      const tags = await prisma.tag.findMany({
        where: {
          id: { in: data.tagIds },
          tenantId, // Garantir que tags pertencem ao tenant
        },
      });

      if (tags.length !== data.tagIds.length) {
        throw new Error('Uma ou mais tags não foram encontradas ou não pertencem ao tenant');
      }
    }

    // Atualizar lead em transação
    await prisma.$transaction(async (tx) => {
      // Atualizar campos primitivos do lead
      await tx.lead.update({
        where: { id: leadId },
        data: {
          firstName: data.firstName !== undefined ? data.firstName.trim() : undefined,
          lastName: data.lastName !== undefined ? (data.lastName.trim() || null) : undefined,
          email: data.email !== undefined ? (data.email?.trim() || null) : undefined,
          phone: data.phone !== undefined ? (data.phone?.trim() || null) : undefined,
          company: data.company !== undefined ? (data.company?.trim() || null) : undefined,
          source: data.source !== undefined ? (data.source?.trim() || null) : undefined,
          status: data.status !== undefined ? data.status : undefined,
        },
      });

      // Atualizar tags se fornecidas (substitui completamente)
      if (data.tagIds !== undefined) {
        // Remover todas as tags existentes
        await tx.leadTag.deleteMany({
          where: {
            leadId,
          },
        });

        // Adicionar novas tags se houver
        if (data.tagIds.length > 0) {
          await tx.leadTag.createMany({
            data: data.tagIds.map(tagId => ({
              leadId,
              tagId,
            })),
          });
        }
      }

      // Validar e atualizar campos customizados se fornecidos
      if (data.customFields !== undefined) {
        try {
          // Buscar entidade Lead
          const leadEntity = await EntityService.getEntityByName(tenantId, 'Lead');
          
          // Buscar campos customizados da entidade
          const customFields = await FieldService.listFields(tenantId, leadEntity.id);
          
          // Buscar dados customizados existentes
          const existingEntityData = await EntityDataService.getEntityDataByRecord(
            tenantId,
            leadEntity.id,
            leadId
          );
          const existingCustomFields = existingEntityData?.data || {};
          
          // Mesclar campos customizados existentes com novos
          const mergedCustomFields = { ...existingCustomFields, ...data.customFields };
          
          // Validar cada campo customizado
          const validatedCustomFields: Record<string, any> = {};
          for (const [fieldName, value] of Object.entries(mergedCustomFields)) {
            const field = customFields.find(f => f.name === fieldName);
            if (!field) {
              // Se campo não existe mais, ignorar (pode ter sido deletado)
              continue;
            }
            
            // Processar e validar valor
            const validatedValue = processAndValidateFieldValue(field, value);
            validatedCustomFields[fieldName] = validatedValue;
            
            // Validar unicidade se necessário
            if (field.unique) {
              await validateUniqueField(tenantId, leadEntity.id, field.id, validatedValue, leadId);
            }
          }
          
          // Validar campos obrigatórios que não foram fornecidos
          for (const field of customFields) {
            if (field.required && !(field.name in validatedCustomFields)) {
              // Verificar se tem valor padrão
              if (field.defaultValue === null || field.defaultValue === undefined) {
                throw new Error(`Campo customizado obrigatório '${field.label}' (${field.name}) não foi fornecido`);
              }
              // Usar valor padrão se disponível
              validatedCustomFields[field.name] = field.defaultValue;
            }
          }
          
          // Salvar campos customizados
          await EntityDataService.saveEntityData(
            tenantId,
            leadEntity.id,
            leadId,
            validatedCustomFields
          );
        } catch (error) {
          // Se não conseguir processar campos customizados, lançar erro
          throw error;
        }
      }
    });

    // Buscar lead atualizado com relacionamentos
    const updatedLead = await this.getLeadById(leadId, tenantId, requestingUserId);
    if (!updatedLead) {
      throw new Error('Erro ao buscar lead atualizado');
    }

    // Comparar campos alterados para auditoria
    const changes: Record<string, { old?: any; new?: any }> = {};
    if (data.firstName !== undefined && data.firstName !== oldData.firstName) {
      changes.firstName = { old: oldData.firstName, new: updatedLead.firstName };
    }
    if (data.lastName !== undefined && data.lastName !== oldData.lastName) {
      changes.lastName = { old: oldData.lastName, new: updatedLead.lastName };
    }
    if (data.email !== undefined && data.email !== oldData.email) {
      changes.email = { old: oldData.email, new: updatedLead.email };
    }
    if (data.phone !== undefined && data.phone !== oldData.phone) {
      changes.phone = { old: oldData.phone, new: updatedLead.phone };
    }
    if (data.company !== undefined && data.company !== oldData.company) {
      changes.company = { old: oldData.company, new: updatedLead.company };
    }
    if (data.source !== undefined && data.source !== oldData.source) {
      changes.source = { old: oldData.source, new: updatedLead.source };
    }
    if (data.status !== undefined && data.status !== oldData.status) {
      changes.status = { old: oldData.status, new: updatedLead.status };
    }

    // Registrar auditoria com changes (após commit bem-sucedido)
    if (requestingUserId) {
      logAudit('Lead', leadId, 'update', requestingUserId, tenantId, changes).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return updatedLead;
  }

  /**
   * Deleta lead (soft delete)
   * 
   * @param leadId - ID do lead
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns ID do lead deletado
   * @throws Error se lead não encontrado
   */
  static async deleteLead(
    leadId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<string> {
    // Verificar se lead existe e pertence ao tenant
    const existingLead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
    });

    if (!existingLead) {
      throw new Error('Lead não encontrado, não pertence ao seu tenant ou já foi deletado');
    }

    // Soft delete: marcar deletedAt
    await prisma.lead.update({
      where: { id: leadId },
      data: { deletedAt: new Date() },
    });

    // LeadTag são deletados automaticamente via Prisma cascade
    // Não é necessário deletar manualmente

    // Registrar auditoria (após commit bem-sucedido)
    if (requestingUserId) {
      logAudit('Lead', leadId, 'delete', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return leadId;
  }
}
