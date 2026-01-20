/**
 * Serviço para gestão de contatos
 * 
 * Lógica de negócio para operações CRUD de contatos.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { PrismaClient, ContactStatus } from '@prisma/client';
import { filterFieldsByPermission, validateFieldPermissionsForUpdate } from '../utils/fieldPermissions';
import { logAudit } from '../utils/auditLog';
import { validateEmail, validatePhone, validateDateNotFuture } from '../utils/validators';
import { processAndValidateFieldValue } from '../utils/fieldValueValidator';
import { validateUniqueField } from '../utils/uniqueFieldValidator';
import { EntityService } from './entityService';
import { FieldService } from './fieldService';
import { EntityDataService } from './entityDataService';
import { buildSearchConditions } from '../utils/entitySearchHelpers';

const prisma = new PrismaClient();

// Interface para filtros de listagem
export interface ContactFilters {
  companyId?: string;
  status?: ContactStatus;
  tagId?: string;
  q?: string; // Termo de busca
}

// Interface para paginação
export interface PaginationParams {
  limit?: number;
  offset?: number;
  orderBy?: 'firstName' | 'lastName' | 'createdAt';
  order?: 'asc' | 'desc';
}

// Interface para criação de contato
export interface CreateContactData {
  firstName: string;
  lastName?: string;
  title?: string;
  gender?: string;
  birthDate?: Date | string;
  notes?: string;
  status?: ContactStatus;
  companyId?: string;
  emails?: Array<{
    email: string;
    type: 'WORK' | 'HOME' | 'OTHER';
    isPrimary?: boolean;
  }>;
  phones?: Array<{
    phone: string;
    type: 'WORK' | 'HOME' | 'MOBILE' | 'OTHER';
    isPrimary?: boolean;
  }>;
  addresses?: Array<{
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    type: 'BILLING' | 'SHIPPING' | 'OTHER';
  }>;
  tagIds?: string[];
  customFields?: Record<string, any>; // Campos customizados
}

// Interface para atualização de contato
export interface UpdateContactData extends Partial<CreateContactData> {}

// Interface para resposta de contato
export interface ContactResponse {
  id: string;
  tenantId: string;
  firstName: string;
  lastName?: string | null;
  title?: string | null;
  gender?: string | null;
  birthDate?: Date | null;
  notes?: string | null;
  status: ContactStatus;
  companyId?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  company?: {
    id: string;
    name: string;
  } | null;
  emails: Array<{
    id: string;
    email: string;
    type: string;
    isPrimary: boolean;
  }>;
  phones: Array<{
    id: string;
    phone: string;
    type: string;
    isPrimary: boolean;
  }>;
  addresses: Array<{
    id: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    type: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

export class ContactService {
  /**
   * Lista contatos com filtros e paginação
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param filters - Filtros opcionais (companyId, status, tagId)
   * @param pagination - Parâmetros de paginação (limit, offset)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Objeto com lista de contatos e informações de paginação
   */
  static async listContacts(
    tenantId: string,
    filters?: ContactFilters,
    pagination?: PaginationParams,
    userId?: string
  ): Promise<{
    data: ContactResponse[];
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

    // Adicionar filtro de companyId se fornecido
    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    // Adicionar filtro de status se fornecido
    if (filters?.status) {
      where.status = filters.status;
    }

    // Adicionar filtro de tagId se fornecido
    if (filters?.tagId) {
      where.tags = {
        some: {
          tagId: filters.tagId,
          tag: {
            tenantId, // Garantir que tag pertence ao tenant
          },
        },
      };
    }

    // Adicionar condição de busca se `q` for fornecido
    // IMPORTANTE: Usar AND entre filtros existentes e OR para busca
    if (filters?.q) {
      const searchConditions = buildSearchConditions('contact', filters.q);
      if (searchConditions.length > 0) {
        // Combinar filtros existentes (AND) com busca (OR)
        const andConditions: any[] = [];

        // Adicionar condições base (tenantId e deletedAt) sempre
        andConditions.push({ tenantId });
        andConditions.push({ deletedAt: null });

        // Adicionar filtros existentes como condições AND
        if (filters.companyId) {
          andConditions.push({ companyId: filters.companyId });
        }
        if (filters.status) {
          andConditions.push({ status: filters.status });
        }
        if (filters.tagId) {
          andConditions.push({
            tags: {
              some: {
                tagId: filters.tagId,
                tag: {
                  tenantId,
                },
              },
            },
          });
        }

        // Adicionar busca como OR dentro do AND
        andConditions.push({ OR: searchConditions });

        // Usar estrutura AND para combinar tudo
        where.AND = andConditions;
      }
    }

    // Configurar ordenação
    const orderByField = pagination?.orderBy || 'createdAt';
    const orderDirection = pagination?.order || 'desc';

    const orderBy: any = {};
    if (orderByField === 'firstName' || orderByField === 'lastName' || orderByField === 'createdAt') {
      orderBy[orderByField] = orderDirection;
    } else {
      // Fallback para createdAt desc se campo inválido
      orderBy.createdAt = 'desc';
    }

    // Buscar contatos com relacionamentos
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          emails: true,
          phones: true,
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
        },
        orderBy,
      }),
      prisma.contact.count({ where }),
    ]);

    // Formatar resposta
    let data: ContactResponse[] = contacts.map((contact) => ({
      id: contact.id,
      tenantId: contact.tenantId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      gender: contact.gender,
      birthDate: contact.birthDate,
      notes: contact.notes,
      status: contact.status,
      companyId: contact.companyId,
      deletedAt: contact.deletedAt,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      company: contact.company
        ? {
            id: contact.company.id,
            name: contact.company.name,
          }
        : null,
      emails: contact.emails.map((email) => ({
        id: email.id,
        email: email.email,
        type: email.type,
        isPrimary: email.isPrimary,
      })),
      phones: contact.phones.map((phone) => ({
        id: phone.id,
        phone: phone.phone,
        type: phone.type,
        isPrimary: phone.isPrimary,
      })),
      addresses: contact.addresses.map((address) => ({
        id: address.id,
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        type: address.type,
      })),
      tags: contact.tags.map((ct) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        color: ct.tag.color,
      })),
    }));

    // Buscar campos customizados para cada contato (batch)
    try {
      const contactEntity = await EntityService.getEntityByName(tenantId, 'Contact');
      const recordIds = data.map(c => c.id);
      const entityDataMap = await EntityDataService.getEntityDataByRecords(
        tenantId,
        contactEntity.id,
        recordIds
      );
      
      // Mesclar campos customizados com cada contato
      data = data.map(contact => ({
        ...contact,
        ...(entityDataMap.get(contact.id)?.data || {}),
      })) as ContactResponse[];
    } catch (error) {
      // Se não conseguir buscar campos customizados, continuar sem eles
      // (pode ser que entidade Contact não exista ainda no sistema de metadados)
    }

    // Filtrar campos baseado em permissões do usuário
    if (userId) {
      data = (await filterFieldsByPermission(
        data,
        userId,
        tenantId,
        'Contact',
        'read'
      )) as ContactResponse[];
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
   * Obtém contato por ID
   * 
   * @param contactId - ID do contato
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Contato encontrado ou null se não encontrado
   */
  static async getContactById(
    contactId: string,
    tenantId: string,
    userId?: string
  ): Promise<ContactResponse | null> {
    // Buscar contato com relacionamentos
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        emails: true,
        phones: true,
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
      },
    });

    if (!contact) {
      return null;
    }

    // Formatar resposta
    let contactResponse: ContactResponse = {
      id: contact.id,
      tenantId: contact.tenantId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      gender: contact.gender,
      birthDate: contact.birthDate,
      notes: contact.notes,
      status: contact.status,
      companyId: contact.companyId,
      deletedAt: contact.deletedAt,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      company: contact.company
        ? {
            id: contact.company.id,
            name: contact.company.name,
          }
        : null,
      emails: contact.emails.map((email) => ({
        id: email.id,
        email: email.email,
        type: email.type,
        isPrimary: email.isPrimary,
      })),
      phones: contact.phones.map((phone) => ({
        id: phone.id,
        phone: phone.phone,
        type: phone.type,
        isPrimary: phone.isPrimary,
      })),
      addresses: contact.addresses.map((address) => ({
        id: address.id,
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        type: address.type,
      })),
      tags: contact.tags.map((ct) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        color: ct.tag.color,
      })),
    };

    // Buscar campos customizados para incluir na resposta
    let customFieldsData: Record<string, any> = {};
    try {
      const contactEntity = await EntityService.getEntityByName(tenantId, 'Contact');
      const entityData = await EntityDataService.getEntityDataByRecord(
        tenantId,
        contactEntity.id,
        contact.id
      );
      if (entityData) {
        customFieldsData = entityData.data;
      }
    } catch (error) {
      // Se não conseguir buscar campos customizados, continuar sem eles
      // (pode ser que entidade Contact não exista ainda no sistema de metadados)
    }

    // Mesclar campos customizados com resposta
    contactResponse = {
      ...contactResponse,
      ...customFieldsData,
    } as ContactResponse;

    // Filtrar campos baseado em permissões do usuário
    if (userId) {
      contactResponse = (await filterFieldsByPermission(
        contactResponse,
        userId,
        tenantId,
        'Contact',
        'read'
      )) as ContactResponse;
    }

    return contactResponse;
  }

  /**
   * Lista contatos de uma empresa específica
   * 
   * @param companyId - ID da empresa
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param filters - Filtros opcionais (status, tagId) - excluir companyId pois já está no parâmetro
   * @param pagination - Parâmetros de paginação (limit, offset, orderBy, order)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Objeto com lista de contatos e informações de paginação
   * @throws Error se empresa não encontrada, não pertence ao tenant ou está soft deleted
   */
  static async listContactsByCompany(
    companyId: string,
    tenantId: string,
    filters?: Omit<ContactFilters, 'companyId'>, // Excluir companyId pois já está no parâmetro
    pagination?: PaginationParams,
    userId?: string
  ): Promise<{
    data: ContactResponse[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }> {
    // Validar formato UUID (se aplicável)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
      throw new Error('ID da empresa inválido');
    }

    // Validar que empresa existe, pertence ao tenant e não está soft deleted
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Empresa não pode estar soft deleted
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!company) {
      throw new Error('Empresa não encontrada, não pertence ao seu tenant ou foi deletada');
    }

    // Valores padrão para paginação
    const limit = Math.min(pagination?.limit || 20, 100); // Máximo 100
    const offset = pagination?.offset || 0;

    // Construir condições de filtro
    const where: any = {
      tenantId, // Isolamento multi-tenant obrigatório
      companyId, // Filtro principal - contatos desta empresa
      deletedAt: null, // Excluir soft deleted
    };

    // Adicionar filtro de status se fornecido
    if (filters?.status) {
      where.status = filters.status;
    }

    // Adicionar filtro de tagId se fornecido
    if (filters?.tagId) {
      where.tags = {
        some: {
          tagId: filters.tagId,
          tag: {
            tenantId, // Garantir que tag pertence ao tenant
          },
        },
      };
    }

    // Configurar ordenação
    const orderByField = pagination?.orderBy || 'createdAt';
    const orderDirection = pagination?.order || 'desc';

    const orderBy: any = {};
    if (orderByField === 'firstName' || orderByField === 'lastName' || orderByField === 'createdAt') {
      orderBy[orderByField] = orderDirection;
    } else {
      // Fallback para createdAt desc se campo inválido
      orderBy.createdAt = 'desc';
    }

    // Buscar contatos com relacionamentos e contagem total
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          emails: true,
          phones: true,
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
        },
        orderBy,
      }),
      prisma.contact.count({ where }),
    ]);

    // Formatar resposta
    let data: ContactResponse[] = contacts.map((contact) => ({
      id: contact.id,
      tenantId: contact.tenantId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      gender: contact.gender,
      birthDate: contact.birthDate,
      notes: contact.notes,
      status: contact.status,
      companyId: contact.companyId,
      deletedAt: contact.deletedAt,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      company: contact.company
        ? {
            id: contact.company.id,
            name: contact.company.name,
          }
        : null,
      emails: contact.emails.map((email) => ({
        id: email.id,
        email: email.email,
        type: email.type,
        isPrimary: email.isPrimary,
      })),
      phones: contact.phones.map((phone) => ({
        id: phone.id,
        phone: phone.phone,
        type: phone.type,
        isPrimary: phone.isPrimary,
      })),
      addresses: contact.addresses.map((address) => ({
        id: address.id,
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        type: address.type,
      })),
      tags: contact.tags.map((ct) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        color: ct.tag.color,
      })),
    }));

    // Filtrar campos baseado em permissões do usuário
    if (userId) {
      data = (await filterFieldsByPermission(
        data,
        userId,
        tenantId,
        'Contact',
        'read'
      )) as ContactResponse[];
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
   * Cria contato e relacionamentos
   * 
   * @param data - Dados do contato
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Contato criado
   * @throws Error se validações falharem
   */
  static async createContact(
    data: CreateContactData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<ContactResponse> {
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

    // Validar emails se fornecidos
    if (data.emails) {
      for (const emailData of data.emails) {
        if (!validateEmail(emailData.email)) {
          throw new Error(`Email inválido: ${emailData.email}`);
        }
      }
    }

    // Validar telefones se fornecidos
    if (data.phones) {
      for (const phoneData of data.phones) {
        if (!validatePhone(phoneData.phone)) {
          throw new Error(`Telefone inválido: ${phoneData.phone}`);
        }
      }
    }

    // Validar birthDate se fornecido
    if (data.birthDate) {
      if (!validateDateNotFuture(data.birthDate)) {
        throw new Error('Data de nascimento não pode ser futura');
      }
    }

    // Validar e normalizar gender se fornecido
    let normalizedGender: string | null | undefined = undefined;
    if (data.gender !== undefined) {
      if (data.gender === null) {
        // Permitir null explicitamente
        normalizedGender = null;
      } else {
        const validGenders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
        normalizedGender = (data.gender as string).trim().toUpperCase();
        if (!validGenders.includes(normalizedGender)) {
          throw new Error(`gender deve ser um dos valores: ${validGenders.join(', ')}`);
        }
      }
    }

    // Validar companyId se fornecido
    if (data.companyId) {
      // Validação de formato UUID (opcional, mas recomendado para robustez)
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.companyId)) {
        throw new Error('companyId deve ser um UUID válido');
      }

      const company = await prisma.company.findFirst({
        where: {
          id: data.companyId,
          tenantId, // Garantir isolamento multi-tenant
          deletedAt: null, // Empresa não pode estar soft deleted
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

      if (!company) {
        throw new Error('Empresa não encontrada, não pertence ao seu tenant ou foi deletada');
      }
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

    // Normalizar emails (lowercase)
    const normalizedEmails = data.emails?.map((e) => ({
      ...e,
      email: e.email.trim().toLowerCase(),
    }));

    // Verificar duplicatas dentro do array de emails fornecido
    if (normalizedEmails && normalizedEmails.length > 0) {
      const emailSet = new Set<string>();
      for (const emailData of normalizedEmails) {
        if (emailSet.has(emailData.email)) {
          throw new Error(`Email duplicado no array: ${emailData.email}`);
        }
        emailSet.add(emailData.email);
      }
    }

    // Garantir que apenas um email seja primary
    if (normalizedEmails && normalizedEmails.length > 0) {
      const primaryEmails = normalizedEmails.filter((e) => e.isPrimary);
      if (primaryEmails.length > 1) {
        // Manter apenas o primeiro como primary
        let firstPrimaryFound = false;
        normalizedEmails.forEach((e) => {
          if (e.isPrimary && !firstPrimaryFound) {
            firstPrimaryFound = true;
          } else {
            e.isPrimary = false;
          }
        });
      }
    }

    // Garantir que apenas um telefone seja primary
    if (data.phones && data.phones.length > 0) {
      const primaryPhones = data.phones.filter((p) => p.isPrimary);
      if (primaryPhones.length > 1) {
        // Manter apenas o primeiro como primary
        let firstPrimaryFound = false;
        data.phones.forEach((p) => {
          if (p.isPrimary && !firstPrimaryFound) {
            firstPrimaryFound = true;
          } else {
            p.isPrimary = false;
          }
        });
      }
    }

    // Converter birthDate para Date se for string
    const birthDate = data.birthDate
      ? data.birthDate instanceof Date
        ? data.birthDate
        : new Date(data.birthDate)
      : undefined;

    // Criar contato e relacionamentos em uma transação
    const contact = await prisma.$transaction(async (tx) => {
      // Criar contato
      const newContact = await tx.contact.create({
        data: {
          tenantId,
          firstName: data.firstName?.trim() || '',
          lastName: data.lastName?.trim() || null,
          title: data.title?.trim() || null,
          gender: normalizedGender,
          birthDate,
          notes: data.notes?.trim() || null,
          status: data.status || 'ACTIVE',
          companyId: data.companyId || null,
        },
      });

      // Criar emails se fornecidos
      if (normalizedEmails && normalizedEmails.length > 0) {
        await tx.contactEmail.createMany({
          data: normalizedEmails.map((emailData) => ({
            tenantId,
            contactId: newContact.id,
            email: emailData.email,
            type: emailData.type,
            isPrimary: emailData.isPrimary || false,
          })),
        });
      }

      // Criar telefones se fornecidos
      if (data.phones && data.phones.length > 0) {
        await tx.contactPhone.createMany({
          data: data.phones.map((phoneData) => ({
            tenantId,
            contactId: newContact.id,
            phone: phoneData.phone.trim(),
            type: phoneData.type,
            isPrimary: phoneData.isPrimary || false,
          })),
        });
      }

      // Criar endereços se fornecidos
      if (data.addresses && data.addresses.length > 0) {
        await tx.address.createMany({
          data: data.addresses.map((addressData) => ({
            tenantId,
            contactId: newContact.id,
            companyId: null,
            street: addressData.street.trim(),
            city: addressData.city.trim(),
            state: addressData.state.trim(),
            zipCode: addressData.zipCode.trim(),
            country: addressData.country?.trim() || 'Brasil',
            type: addressData.type,
          })),
        });
      }

      // Criar associações de tags se fornecidas
      if (data.tagIds && data.tagIds.length > 0) {
        await tx.contactTag.createMany({
          data: data.tagIds.map((tagId) => ({
            contactId: newContact.id,
            tagId,
          })),
          skipDuplicates: true,
        });
      }

      // Buscar contato criado com relacionamentos
      return await tx.contact.findUnique({
        where: { id: newContact.id },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          emails: true,
          phones: true,
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
        },
      });
    });

    if (!contact) {
      throw new Error('Erro ao criar contato');
    }

    // Validar e salvar campos customizados se fornecidos
    // Processar campos customizados se fornecidos (mesmo que vazio, para validar obrigatórios)
    if (data.customFields !== undefined) {
      try {
        // Buscar entidade Contact
        const contactEntity = await EntityService.getEntityByName(tenantId, 'Contact');
        
        // Buscar campos customizados da entidade
        const customFields = await FieldService.listFields(tenantId, contactEntity.id);
        
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
              await validateUniqueField(tenantId, contactEntity.id, field.id, validatedValue);
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
            contactEntity.id,
            contact.id,
            validatedCustomFields
          );
        }
      } catch (error: any) {
        // Se houver erro ao salvar campos customizados, deletar contato criado
        await prisma.contact.delete({ where: { id: contact.id } }).catch(() => {
          // Ignorar erro ao deletar (pode já ter sido deletado)
        });
        throw error;
      }
    }

    // Buscar campos customizados para incluir na resposta
    let customFieldsData: Record<string, any> = {};
    try {
      const contactEntity = await EntityService.getEntityByName(tenantId, 'Contact');
      const entityData = await EntityDataService.getEntityDataByRecord(
        tenantId,
        contactEntity.id,
        contact.id
      );
      if (entityData) {
        customFieldsData = entityData.data;
      }
    } catch (error) {
      // Se não conseguir buscar campos customizados, continuar sem eles
      // (pode ser que entidade Contact não exista ainda no sistema de metadados)
    }

    // Formatar resposta
    const contactResponse: ContactResponse = {
      id: contact.id,
      tenantId: contact.tenantId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      gender: contact.gender,
      birthDate: contact.birthDate,
      notes: contact.notes,
      status: contact.status,
      companyId: contact.companyId,
      deletedAt: contact.deletedAt,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      company: contact.company
        ? {
            id: contact.company.id,
            name: contact.company.name,
          }
        : null,
      emails: contact.emails.map((email) => ({
        id: email.id,
        email: email.email,
        type: email.type,
        isPrimary: email.isPrimary,
      })),
      phones: contact.phones.map((phone) => ({
        id: phone.id,
        phone: phone.phone,
        type: phone.type,
        isPrimary: phone.isPrimary,
      })),
      addresses: contact.addresses.map((address) => ({
        id: address.id,
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        type: address.type,
      })),
      tags: contact.tags.map((ct) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        color: ct.tag.color,
      })),
      ...customFieldsData, // Mesclar campos customizados
    } as ContactResponse;

    // Registrar auditoria (após commit bem-sucedido)
    if (requestingUserId) {
      logAudit('Contact', contact.id, 'create', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return contactResponse;
  }

  /**
   * Atualiza contato e relacionamentos
   * 
   * @param contactId - ID do contato a ser atualizado
   * @param data - Dados para atualização
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (para validar permissões de campo)
   * @returns Contato atualizado
   * @throws Error se contato não encontrado ou validações falharem
   */
  static async updateContact(
    contactId: string,
    data: UpdateContactData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<ContactResponse> {
    // Verificar se contato existe e pertence ao tenant
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
    });

    if (!existingContact) {
      throw new Error('Contato não encontrado');
    }

    // Capturar dados antigos para auditoria (antes de atualizar)
    const oldData = {
      firstName: existingContact.firstName,
      lastName: existingContact.lastName,
      title: existingContact.title,
      gender: existingContact.gender,
      birthDate: existingContact.birthDate,
      notes: existingContact.notes,
      status: existingContact.status,
      companyId: existingContact.companyId,
    };

    // Validar permissões de campo antes de atualizar
    if (requestingUserId) {
      // Preparar objeto com apenas campos primitivos
      const primitiveFields: Record<string, any> = {};
      if (data.firstName !== undefined) primitiveFields.firstName = data.firstName;
      if (data.lastName !== undefined) primitiveFields.lastName = data.lastName;
      if (data.title !== undefined) primitiveFields.title = data.title;
      if (data.gender !== undefined) primitiveFields.gender = data.gender;
      if (data.birthDate !== undefined) primitiveFields.birthDate = data.birthDate;
      if (data.notes !== undefined) primitiveFields.notes = data.notes;
      if (data.status !== undefined) primitiveFields.status = data.status;
      if (data.companyId !== undefined) primitiveFields.companyId = data.companyId;

      const validation = await validateFieldPermissionsForUpdate(
        primitiveFields,
        requestingUserId,
        tenantId,
        'Contact'
      );

      if (!validation.allowed) {
        throw new Error(
          `Você não tem permissão para atualizar os seguintes campos: ${validation.forbiddenFields.join(', ')}`
        );
      }
    }

    // Validar que pelo menos firstName ou lastName estará presente após atualização
    const finalFirstName = data.firstName !== undefined ? data.firstName : existingContact.firstName;
    const finalLastName = data.lastName !== undefined ? data.lastName : existingContact.lastName;
    
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

    // Validar emails se fornecidos
    if (data.emails) {
      for (const emailData of data.emails) {
        if (!validateEmail(emailData.email)) {
          throw new Error(`Email inválido: ${emailData.email}`);
        }
      }
    }

    // Validar telefones se fornecidos
    if (data.phones) {
      for (const phoneData of data.phones) {
        if (!validatePhone(phoneData.phone)) {
          throw new Error(`Telefone inválido: ${phoneData.phone}`);
        }
      }
    }

    // Validar birthDate se fornecido
    if (data.birthDate) {
      if (!validateDateNotFuture(data.birthDate)) {
        throw new Error('Data de nascimento não pode ser futura');
      }
    }

    // Validar e normalizar gender se fornecido
    let normalizedGender: string | null | undefined = undefined;
    if (data.gender !== undefined) {
      if (data.gender === null) {
        // Permitir null explicitamente para remover gender
        normalizedGender = null;
      } else {
        const validGenders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
        normalizedGender = (data.gender as string).trim().toUpperCase();
        if (!validGenders.includes(normalizedGender)) {
          throw new Error(`gender deve ser um dos valores: ${validGenders.join(', ')}`);
        }
      }
    }

    // Validar companyId se fornecido
    if (data.companyId !== undefined) {
      if (data.companyId === null) {
        // Desassociação explícita - permitir sem validação adicional
      } else {
        // Validação de formato UUID (opcional, mas recomendado para robustez)
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.companyId)) {
          throw new Error('companyId deve ser um UUID válido');
        }

        // Validar empresa existe, pertence ao tenant e não está soft deleted
        const company = await prisma.company.findFirst({
          where: {
            id: data.companyId,
            tenantId, // Garantir isolamento multi-tenant
            deletedAt: null, // Empresa não pode estar soft deleted
          },
          select: {
            id: true,
            name: true,
            status: true,
          },
        });

        if (!company) {
          throw new Error('Empresa não encontrada, não pertence ao seu tenant ou foi deletada');
        }
      }
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

    // Normalizar emails (lowercase)
    const normalizedEmails = data.emails?.map((e) => ({
      ...e,
      email: e.email.trim().toLowerCase(),
    }));

    // Verificar duplicatas dentro do array de emails fornecido
    if (normalizedEmails && normalizedEmails.length > 0) {
      const emailSet = new Set<string>();
      for (const emailData of normalizedEmails) {
        if (emailSet.has(emailData.email)) {
          throw new Error(`Email duplicado no array: ${emailData.email}`);
        }
        emailSet.add(emailData.email);
      }
    }

    // Garantir que apenas um email seja primary
    if (normalizedEmails && normalizedEmails.length > 0) {
      const primaryEmails = normalizedEmails.filter((e) => e.isPrimary);
      if (primaryEmails.length > 1) {
        // Manter apenas o primeiro como primary
        let firstPrimaryFound = false;
        normalizedEmails.forEach((e) => {
          if (e.isPrimary && !firstPrimaryFound) {
            firstPrimaryFound = true;
          } else {
            e.isPrimary = false;
          }
        });
      }
    }

    // Garantir que apenas um telefone seja primary
    if (data.phones && data.phones.length > 0) {
      const primaryPhones = data.phones.filter((p) => p.isPrimary);
      if (primaryPhones.length > 1) {
        // Manter apenas o primeiro como primary
        let firstPrimaryFound = false;
        data.phones.forEach((p) => {
          if (p.isPrimary && !firstPrimaryFound) {
            firstPrimaryFound = true;
          } else {
            p.isPrimary = false;
          }
        });
      }
    }

    // Converter birthDate para Date se for string
    const birthDate = data.birthDate
      ? data.birthDate instanceof Date
        ? data.birthDate
        : new Date(data.birthDate)
      : undefined;

    // Atualizar contato e relacionamentos em uma transação
    const contact = await prisma.$transaction(async (tx) => {
      // Preparar dados de atualização
      const updateData: any = {};
      if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
      if (data.lastName !== undefined) updateData.lastName = data.lastName?.trim();
      if (data.title !== undefined) updateData.title = data.title?.trim();
      if (normalizedGender !== undefined) updateData.gender = normalizedGender;
      if (data.birthDate !== undefined) updateData.birthDate = birthDate;
      if (data.notes !== undefined) updateData.notes = data.notes?.trim();
      if (data.status !== undefined) updateData.status = data.status;
      if (data.companyId !== undefined) updateData.companyId = data.companyId || null;

      // Atualizar contato
      await tx.contact.update({
        where: { id: contactId },
        data: updateData,
      });

      // Substituir emails completamente
      if (data.emails !== undefined) {
        // Deletar todos os emails existentes
        await tx.contactEmail.deleteMany({
          where: { contactId },
        });

        // Criar novos emails se fornecidos
        if (normalizedEmails && normalizedEmails.length > 0) {
          await tx.contactEmail.createMany({
            data: normalizedEmails.map((emailData) => ({
              tenantId,
              contactId,
              email: emailData.email,
              type: emailData.type,
              isPrimary: emailData.isPrimary || false,
            })),
          });
        }
      }

      // Substituir telefones completamente
      if (data.phones !== undefined) {
        // Deletar todos os telefones existentes
        await tx.contactPhone.deleteMany({
          where: { contactId },
        });

        // Criar novos telefones se fornecidos
        if (data.phones.length > 0) {
          await tx.contactPhone.createMany({
            data: data.phones.map((phoneData) => ({
              tenantId,
              contactId,
              phone: phoneData.phone.trim(),
              type: phoneData.type,
              isPrimary: phoneData.isPrimary || false,
            })),
          });
        }
      }

      // Substituir endereços completamente
      if (data.addresses !== undefined) {
        // Deletar todos os endereços existentes
        await tx.address.deleteMany({
          where: { contactId },
        });

        // Criar novos endereços se fornecidos
        if (data.addresses.length > 0) {
          await tx.address.createMany({
            data: data.addresses.map((addressData) => ({
              tenantId,
              contactId,
              companyId: null,
              street: addressData.street.trim(),
              city: addressData.city.trim(),
              state: addressData.state.trim(),
              zipCode: addressData.zipCode.trim(),
              country: addressData.country?.trim() || 'Brasil',
              type: addressData.type,
            })),
          });
        }
      }

      // Substituir tags completamente
      if (data.tagIds !== undefined) {
        // Deletar todas as associações de tags existentes
        await tx.contactTag.deleteMany({
          where: { contactId },
        });

        // Criar novas associações se fornecidas
        if (data.tagIds.length > 0) {
          await tx.contactTag.createMany({
            data: data.tagIds.map((tagId) => ({
              contactId,
              tagId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Validar e atualizar campos customizados se fornecidos
      if (data.customFields !== undefined) {
        try {
          // Buscar entidade Contact
          const contactEntity = await EntityService.getEntityByName(tenantId, 'Contact');
          
          // Buscar campos customizados da entidade
          const customFields = await FieldService.listFields(tenantId, contactEntity.id);
          
          // Buscar dados customizados existentes
          const existingEntityData = await EntityDataService.getEntityDataByRecord(
            tenantId,
            contactEntity.id,
            contactId
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
              await validateUniqueField(tenantId, contactEntity.id, field.id, validatedValue, contactId);
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
          
          // Salvar em EntityData
          await EntityDataService.saveEntityData(
            tenantId,
            contactEntity.id,
            contactId,
            validatedCustomFields
          );
        } catch (error: any) {
          throw error;
        }
      }

      // Buscar contato atualizado com relacionamentos
      return await tx.contact.findUnique({
        where: { id: contactId },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          emails: true,
          phones: true,
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
        },
      });
    });

    if (!contact) {
      throw new Error('Erro ao atualizar contato');
    }

    // Formatar resposta
    let contactResponse: ContactResponse = {
      id: contact.id,
      tenantId: contact.tenantId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      gender: contact.gender,
      birthDate: contact.birthDate,
      notes: contact.notes,
      status: contact.status,
      companyId: contact.companyId,
      deletedAt: contact.deletedAt,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      company: contact.company
        ? {
            id: contact.company.id,
            name: contact.company.name,
          }
        : null,
      emails: contact.emails.map((email) => ({
        id: email.id,
        email: email.email,
        type: email.type,
        isPrimary: email.isPrimary,
      })),
      phones: contact.phones.map((phone) => ({
        id: phone.id,
        phone: phone.phone,
        type: phone.type,
        isPrimary: phone.isPrimary,
      })),
      addresses: contact.addresses.map((address) => ({
        id: address.id,
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        type: address.type,
      })),
      tags: contact.tags.map((ct) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        color: ct.tag.color,
      })),
    };

    // Buscar campos customizados para incluir na resposta
    let customFieldsData: Record<string, any> = {};
    try {
      const contactEntity = await EntityService.getEntityByName(tenantId, 'Contact');
      const entityData = await EntityDataService.getEntityDataByRecord(
        tenantId,
        contactEntity.id,
        contact.id
      );
      if (entityData) {
        customFieldsData = entityData.data;
      }
    } catch (error) {
      // Se não conseguir buscar campos customizados, continuar sem eles
      // (pode ser que entidade Contact não exista ainda no sistema de metadados)
    }

    // Mesclar campos customizados com resposta
    contactResponse = {
      ...contactResponse,
      ...customFieldsData,
    } as ContactResponse;

    // Filtrar campos baseado em permissões do usuário
    if (requestingUserId) {
      contactResponse = (await filterFieldsByPermission(
        contactResponse,
        requestingUserId,
        tenantId,
        'Contact',
        'read'
      )) as ContactResponse;
    }

    // Comparar campos alterados para auditoria
    const changes: Record<string, { old?: any; new?: any }> = {};
    if (data.firstName !== undefined && data.firstName !== oldData.firstName) {
      changes.firstName = { old: oldData.firstName, new: contact.firstName };
    }
    if (data.lastName !== undefined && data.lastName !== oldData.lastName) {
      changes.lastName = { old: oldData.lastName, new: contact.lastName };
    }
    if (data.title !== undefined && data.title !== oldData.title) {
      changes.title = { old: oldData.title, new: contact.title };
    }
    if (data.gender !== undefined && data.gender !== oldData.gender) {
      changes.gender = { old: oldData.gender, new: contact.gender };
    }
    if (data.birthDate !== undefined && data.birthDate !== oldData.birthDate) {
      changes.birthDate = { old: oldData.birthDate, new: contact.birthDate };
    }
    if (data.notes !== undefined && data.notes !== oldData.notes) {
      changes.notes = { old: oldData.notes, new: contact.notes };
    }
    if (data.status !== undefined && data.status !== oldData.status) {
      changes.status = { old: oldData.status, new: contact.status };
    }
    if (data.companyId !== undefined && data.companyId !== oldData.companyId) {
      changes.companyId = { old: oldData.companyId, new: contact.companyId };
    }

    // Registrar auditoria com changes (após commit bem-sucedido)
    if (requestingUserId) {
      logAudit('Contact', contact.id, 'update', requestingUserId, tenantId, changes).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return contactResponse;
  }

  /**
   * Deleta contato (soft delete)
   * 
   * @param contactId - ID do contato
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns true se deletado, false se já estava deletado
   * @throws Error se contato não encontrado
   */
  static async deleteContact(
    contactId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<boolean> {
    // Verificar se contato existe e pertence ao tenant
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
    });

    if (!contact) {
      throw new Error('Contato não encontrado');
    }

    // Soft delete: marcar deletedAt
    await prisma.contact.update({
      where: { id: contactId },
      data: { deletedAt: new Date() },
    });

    // ContactEmail, ContactPhone, Address, ContactTag são deletados automaticamente via Prisma cascade
    // Não é necessário deletar manualmente

    // Registrar auditoria (após commit bem-sucedido)
    if (requestingUserId) {
      logAudit('Contact', contactId, 'delete', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return true;
  }
}

