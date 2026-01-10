/**
 * Serviço para gestão de empresas
 * 
 * Lógica de negócio para operações CRUD de empresas.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { PrismaClient, CompanyStatus, CompanySize } from '@prisma/client';
import { filterFieldsByPermission, validateFieldPermissionsForUpdate } from '../utils/fieldPermissions';
import { logAudit } from '../utils/auditLog';
import { validateUrl, normalizeUrl } from '../utils/validators';

const prisma = new PrismaClient();

// Interface para filtros de listagem
export interface CompanyFilters {
  industry?: string;
  size?: CompanySize;
}

// Interface para paginação
export interface PaginationParams {
  limit?: number;
  offset?: number;
  orderBy?: 'name' | 'createdAt';
  order?: 'asc' | 'desc';
}

// Interface para criação de empresa
export interface CreateCompanyData {
  name: string;
  website?: string;
  industry?: string;
  size?: CompanySize;
  status?: CompanyStatus;
  addresses?: Array<{
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    type: 'BILLING' | 'SHIPPING' | 'OTHER';
  }>;
  tagIds?: string[];
}

// Interface para atualização de empresa
export interface UpdateCompanyData extends Partial<CreateCompanyData> {}

// Interface para resposta de empresa
export interface CompanyResponse {
  id: string;
  tenantId: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  size?: CompanySize | null;
  status: CompanyStatus;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  addresses: Array<{
    id: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    type: string;
  }>;
  contacts: Array<{
    id: string;
    firstName: string;
    lastName?: string | null;
    title?: string | null;
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  contactsCount?: number; // Contagem de contatos (opcional, para listagem)
}

export class CompanyService {
  /**
   * Lista empresas com filtros e paginação
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param filters - Filtros opcionais (industry, size)
   * @param pagination - Parâmetros de paginação (limit, offset, orderBy, order)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Objeto com lista de empresas e informações de paginação
   */
  static async listCompanies(
    tenantId: string,
    filters?: CompanyFilters,
    pagination?: PaginationParams,
    userId?: string
  ): Promise<{
    data: CompanyResponse[];
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

    // Adicionar filtro de industry se fornecido (busca parcial case-insensitive)
    if (filters?.industry) {
      where.industry = {
        contains: filters.industry.trim(),
        mode: 'insensitive', // Case-insensitive
      };
    }

    // Adicionar filtro de size se fornecido
    if (filters?.size) {
      where.size = filters.size;
    }

    // Configurar ordenação
    const orderByField = pagination?.orderBy || 'name';
    const orderDirection = pagination?.order || (orderByField === 'name' ? 'asc' : 'desc');

    const orderBy: any = {};
    if (orderByField === 'name' || orderByField === 'createdAt') {
      orderBy[orderByField] = orderDirection;
    } else {
      // Fallback para name asc se campo inválido
      orderBy.name = 'asc';
    }

    // Buscar empresas com relacionamentos e contagem de contatos
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          addresses: true,
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
          _count: {
            select: {
              contacts: {
                where: {
                  deletedAt: null, // Apenas contatos não deletados
                },
              },
            },
          },
        },
        orderBy,
      }),
      prisma.company.count({ where }),
    ]);

    // Formatar resposta
    let data: CompanyResponse[] = companies.map((company) => ({
      id: company.id,
      tenantId: company.tenantId,
      name: company.name,
      website: company.website,
      industry: company.industry,
      size: company.size,
      status: company.status,
      deletedAt: company.deletedAt,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      addresses: company.addresses.map((address) => ({
        id: address.id,
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        type: address.type,
      })),
      contacts: [], // Não incluir lista completa em listagem (apenas contagem)
      tags: company.tags.map((ct) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        color: ct.tag.color,
      })),
      contactsCount: company._count.contacts, // Contagem de contatos
    }));

    // Filtrar campos baseado em permissões do usuário
    if (userId) {
      data = (await filterFieldsByPermission(
        data,
        userId,
        tenantId,
        'Company',
        'read'
      )) as CompanyResponse[];
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
   * Obtém empresa por ID
   * 
   * @param companyId - ID da empresa
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Empresa encontrada ou null se não encontrada
   */
  static async getCompanyById(
    companyId: string,
    tenantId: string,
    userId?: string
  ): Promise<CompanyResponse | null> {
    // Buscar empresa com relacionamentos
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
      include: {
        addresses: true,
        contacts: {
          where: {
            deletedAt: null, // Apenas contatos não deletados
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
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

    if (!company) {
      return null;
    }

    // Formatar resposta
    let data: CompanyResponse = {
      id: company.id,
      tenantId: company.tenantId,
      name: company.name,
      website: company.website,
      industry: company.industry,
      size: company.size,
      status: company.status,
      deletedAt: company.deletedAt,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      addresses: company.addresses.map((address) => ({
        id: address.id,
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        type: address.type,
      })),
      contacts: company.contacts.map((contact) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        title: contact.title,
      })),
      tags: company.tags.map((ct) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        color: ct.tag.color,
      })),
    };

    // Filtrar campos baseado em permissões do usuário
    if (userId) {
      data = (await filterFieldsByPermission(
        data,
        userId,
        tenantId,
        'Company',
        'read'
      )) as CompanyResponse;
    }

    return data;
  }

  /**
   * Cria nova empresa
   * 
   * @param data - Dados da empresa a ser criada
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param userId - ID do usuário que está criando (para auditoria)
   * @returns Empresa criada
   * @throws Error se validações falharem
   */
  static async createCompany(
    data: CreateCompanyData,
    tenantId: string,
    userId: string
  ): Promise<CompanyResponse> {
    // Validar que id não foi fornecido (gerado automaticamente)
    if ((data as any).id !== undefined) {
      throw new Error('O ID é gerado automaticamente e não pode ser fornecido');
    }

    // Validar name obrigatório
    if (!data.name || !data.name.trim()) {
      throw new Error('Nome da empresa é obrigatório');
    }

    // Validar e normalizar website se fornecido
    let website: string | null = null;
    if (data.website) {
      // Normalizar primeiro (adicionar http:// se necessário)
      const normalizedWebsite = normalizeUrl(data.website);
      
      // Validar formato do website normalizado
      if (!validateUrl(normalizedWebsite)) {
        throw new Error('Website deve ser uma URL válida');
      }
      
      // Usar website normalizado
      website = normalizedWebsite.trim();
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
        throw new Error('Uma ou mais tags não foram encontradas ou não pertencem ao seu tenant');
      }
    }

    // Criar empresa e relacionamentos em transação
    const company = await prisma.$transaction(async (tx) => {
      // Criar empresa
      const newCompany = await tx.company.create({
        data: {
          tenantId,
          name: data.name.trim(),
          website: website,
          industry: data.industry?.trim() || null,
          size: data.size || null,
          status: data.status || CompanyStatus.ACTIVE,
        },
      });

      // Criar endereços se fornecidos
      if (data.addresses && data.addresses.length > 0) {
        await tx.address.createMany({
          data: data.addresses.map((addr) => ({
            tenantId,
            companyId: newCompany.id,
            street: addr.street.trim(),
            city: addr.city.trim(),
            state: addr.state.trim(),
            zipCode: addr.zipCode.trim(),
            country: addr.country?.trim() || 'Brasil',
            type: addr.type || 'OTHER',
          })),
        });
      }

      // Criar associações de tags se fornecidas
      if (data.tagIds && data.tagIds.length > 0) {
        await tx.companyTag.createMany({
          data: data.tagIds.map((tagId) => ({
            companyId: newCompany.id,
            tagId,
            tenantId,
          })),
        });
      }

      return newCompany;
    });

    // Registrar auditoria (não bloqueia se falhar)
    logAudit('Company', company.id, 'create', userId, tenantId).catch(() => {
      // Erro já foi logado no helper, apenas evitar unhandled rejection
    });

    // Buscar empresa criada com relacionamentos
    const createdCompany = await this.getCompanyById(company.id, tenantId, userId);
    if (!createdCompany) {
      throw new Error('Erro ao buscar empresa criada');
    }

    return createdCompany;
  }

  /**
   * Atualiza empresa existente
   * 
   * @param companyId - ID da empresa a ser atualizada
   * @param data - Dados a serem atualizados
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param userId - ID do usuário que está atualizando (para auditoria e permissões)
   * @returns Empresa atualizada
   * @throws Error se validações falharem ou empresa não encontrada
   */
  static async updateCompany(
    companyId: string,
    data: UpdateCompanyData,
    tenantId: string,
    userId: string
  ): Promise<CompanyResponse> {
    // Buscar empresa existente
    const existingCompany = await prisma.company.findFirst({
      where: {
        id: companyId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
    });

    if (!existingCompany) {
      throw new Error('Empresa não encontrada');
    }

    // Capturar dados antigos para auditoria
    const oldData = {
      name: existingCompany.name,
      website: existingCompany.website,
      industry: existingCompany.industry,
      size: existingCompany.size,
      status: existingCompany.status,
    };

    // Validar permissões por campo antes de atualizar
    if (userId) {
      // Extrair apenas campos primitivos para validação
      const primitiveFields: Record<string, any> = {};
      if (data.name !== undefined) primitiveFields.name = data.name;
      if (data.website !== undefined) primitiveFields.website = data.website;
      if (data.industry !== undefined) primitiveFields.industry = data.industry;
      if (data.size !== undefined) primitiveFields.size = data.size;
      if (data.status !== undefined) primitiveFields.status = data.status;

      const validation = await validateFieldPermissionsForUpdate(
        primitiveFields,
        userId,
        tenantId,
        'Company'
      );

      if (!validation.allowed) {
        throw new Error(
          `Sem permissão para atualizar os seguintes campos: ${validation.forbiddenFields.join(', ')}`
        );
      }
    }

    // Validar name se fornecido
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Nome da empresa não pode ser vazio');
    }

    // Validar e normalizar website se fornecido
    let website: string | null | undefined = undefined;
    if (data.website !== undefined && data.website !== null) {
      // Normalizar primeiro (adicionar http:// se necessário)
      const normalizedWebsite = normalizeUrl(data.website);
      
      // Validar formato do website normalizado
      if (!validateUrl(normalizedWebsite)) {
        throw new Error('Website deve ser uma URL válida');
      }
      
      // Usar website normalizado
      website = normalizedWebsite.trim();
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
        throw new Error('Uma ou mais tags não foram encontradas ou não pertencem ao seu tenant');
      }
    }

    // Atualizar empresa e relacionamentos em transação
    const updatedCompany = await prisma.$transaction(async (tx) => {
      // Atualizar campos primitivos da empresa
      const company = await tx.company.update({
        where: { id: companyId },
        data: {
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(website !== undefined && { website: website }),
          ...(data.industry !== undefined && { industry: data.industry?.trim() || null }),
          ...(data.size !== undefined && { size: data.size || null }),
          ...(data.status !== undefined && { status: data.status }),
        },
      });

      // Substituir endereços completamente (deletar todos e criar novos)
      if (data.addresses !== undefined) {
        // Deletar endereços existentes
        await tx.address.deleteMany({
          where: {
            companyId: company.id,
            tenantId,
          },
        });

        // Criar novos endereços se fornecidos
        if (data.addresses.length > 0) {
          await tx.address.createMany({
            data: data.addresses.map((addr) => ({
              tenantId,
              companyId: company.id,
              street: addr.street.trim(),
              city: addr.city.trim(),
              state: addr.state.trim(),
              zipCode: addr.zipCode.trim(),
              country: addr.country?.trim() || 'Brasil',
              type: addr.type || 'OTHER',
            })),
          });
        }
      }

      // Substituir tags completamente (deletar todas e criar novas)
      if (data.tagIds !== undefined) {
        // Deletar associações existentes
        await tx.companyTag.deleteMany({
          where: {
            companyId: company.id,
          },
        });

        // Criar novas associações se fornecidas
        if (data.tagIds.length > 0) {
          await tx.companyTag.createMany({
            data: data.tagIds.map((tagId) => ({
              companyId: company.id,
              tagId,
              tenantId,
            })),
          });
        }
      }

      return company;
    });

    // Comparar campos alterados para auditoria
    const changes: Record<string, { old: any; new: any }> = {};
    if (data.name !== undefined && data.name.trim() !== oldData.name) {
      changes.name = { old: oldData.name, new: data.name.trim() };
    }
    if (data.website !== undefined && data.website !== oldData.website) {
      changes.website = { old: oldData.website, new: data.website };
    }
    if (data.industry !== undefined && data.industry !== oldData.industry) {
      changes.industry = { old: oldData.industry, new: data.industry };
    }
    if (data.size !== undefined && data.size !== oldData.size) {
      changes.size = { old: oldData.size, new: data.size };
    }
    if (data.status !== undefined && data.status !== oldData.status) {
      changes.status = { old: oldData.status, new: data.status };
    }

    // Registrar auditoria com changes (não bloqueia se falhar)
    if (Object.keys(changes).length > 0) {
      logAudit('Company', companyId, 'update', userId, tenantId, changes).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    } else {
      logAudit('Company', companyId, 'update', userId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    // Buscar empresa atualizada com relacionamentos
    const updated = await this.getCompanyById(companyId, tenantId, userId);
    if (!updated) {
      throw new Error('Erro ao buscar empresa atualizada');
    }

    return updated;
  }

  /**
   * Deleta empresa (soft delete)
   * 
   * @param companyId - ID da empresa a ser deletada
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param userId - ID do usuário que está deletando (para auditoria)
   * @returns ID da empresa deletada
   * @throws Error se empresa não encontrada ou houver contatos associados
   */
  static async deleteCompany(
    companyId: string,
    tenantId: string,
    userId: string
  ): Promise<string> {
    // Buscar empresa existente
    const existingCompany = await prisma.company.findFirst({
      where: {
        id: companyId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
    });

    if (!existingCompany) {
      throw new Error('Empresa não encontrada');
    }

    // Validar contatos associados
    const contactsCount = await prisma.contact.count({
      where: {
        companyId: companyId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Apenas contatos não deletados
      },
    });

    if (contactsCount > 0) {
      throw new Error(
        `Não é possível deletar empresa: existem ${contactsCount} contato(s) associado(s). Desassocie os contatos antes de deletar.`
      );
    }

    // Soft delete: atualizar deletedAt
    await prisma.company.update({
      where: { id: companyId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Registrar auditoria (não bloqueia se falhar)
    logAudit('Company', companyId, 'delete', userId, tenantId).catch(() => {
      // Erro já foi logado no helper, apenas evitar unhandled rejection
    });

    // Nota: Address e CompanyTag são deletados automaticamente via Prisma cascade
    // (onDelete: Cascade no schema), não é necessário deletar manualmente

    return companyId;
  }
}

