/**
 * Serviço para gestão de notas
 * 
 * Lógica de negócio para operações CRUD de notas.
 * Regra de ouro: Controller orquestra, Service decide.
 * 
 * Funcionalidades:
 * - CRUD completo de notas
 * - Validação de relacionamentos polimórficos
 * - Integração com auditoria
 * - Permissões por campo
 * - Soft delete
 * - Filtros e paginação
 * - Validação de permissões de edição (apenas criador ou Admin)
 */

import { PrismaClient, NoteType } from '@prisma/client';
import { filterFieldsByPermission, validateFieldPermissionsForUpdate } from '../utils/fieldPermissions';
import { logAudit } from '../utils/auditLog';

const prisma = new PrismaClient();

// Interface para filtros de listagem
export interface NoteFilters {
  type?: NoteType;
  relatedEntityType?: 'Contact' | 'Company' | 'Lead' | 'Opportunity' | 'Task';
  relatedEntityId?: string;
}

// Interface para paginação
export interface PaginationParams {
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt';
  order?: 'asc' | 'desc';
}

// Interface para dados de criação
export interface CreateNoteData {
  content: string;
  type?: NoteType;
  relatedEntityType: 'Contact' | 'Company' | 'Lead' | 'Opportunity' | 'Task';
  relatedEntityId: string;
}

// Interface para dados de atualização
export interface UpdateNoteData {
  content?: string;
  type?: NoteType;
}

// Interface para resposta de Note
export interface NoteResponse {
  id: string;
  tenantId: string;
  content: string;
  type: NoteType;
  relatedEntityType: string;
  relatedEntityId: string;
  createdById: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Relacionamentos
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  // Registro relacionado (polimórfico)
  relatedEntity?: {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    title?: string; // Para Task relacionada
  } | null;
  // Campos customizados mesclados (se aplicável)
  [key: string]: any;
}

/**
 * Valida que entidade relacionada existe e pertence ao tenant
 * 
 * @param relatedEntityType - Tipo da entidade (Contact, Company, Lead, Opportunity, Task)
 * @param relatedEntityId - ID da entidade
 * @param tenantId - ID do tenant
 * @throws Error se entidade não encontrada, não pertence ao tenant ou está soft deleted
 */
async function validateRelatedEntity(
  relatedEntityType: string,
  relatedEntityId: string,
  tenantId: string
): Promise<void> {
  // Validar formato UUID
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(relatedEntityId)) {
    throw new Error(`${relatedEntityType} ID inválido`);
  }

  let exists = false;
  let entityName = '';

  switch (relatedEntityType) {
    case 'Contact':
      const contact = await prisma.contact.findFirst({
        where: { 
          id: relatedEntityId, 
          tenantId, 
          deletedAt: null 
        },
        select: { id: true }
      });
      exists = !!contact;
      entityName = 'Contato';
      break;
      
    case 'Company':
      const company = await prisma.company.findFirst({
        where: { 
          id: relatedEntityId, 
          tenantId, 
          deletedAt: null 
        },
        select: { id: true }
      });
      exists = !!company;
      entityName = 'Empresa';
      break;
      
    case 'Lead':
      const lead = await prisma.lead.findFirst({
        where: { 
          id: relatedEntityId, 
          tenantId, 
          deletedAt: null 
        },
        select: { id: true }
      });
      exists = !!lead;
      entityName = 'Lead';
      break;
      
    case 'Opportunity':
      const opportunity = await prisma.opportunity.findFirst({
        where: { 
          id: relatedEntityId, 
          tenantId, 
          deletedAt: null 
        },
        select: { id: true }
      });
      exists = !!opportunity;
      entityName = 'Oportunidade';
      break;

    case 'Task':
      const task = await prisma.task.findFirst({
        where: { 
          id: relatedEntityId, 
          tenantId, 
          deletedAt: null 
        },
        select: { id: true }
      });
      exists = !!task;
      entityName = 'Tarefa';
      break;
      
    default:
      throw new Error(`Tipo de entidade relacionada inválido: ${relatedEntityType}`);
  }

  if (!exists) {
    throw new Error(`${entityName} não encontrado, não pertence ao seu tenant ou foi deletado`);
  }
}

/**
 * Busca informações básicas do registro relacionado para exibição
 * 
 * @param relatedEntityType - Tipo da entidade
 * @param relatedEntityId - ID da entidade
 * @param tenantId - ID do tenant
 * @returns Objeto com informações básicas ou null se não encontrado
 */
async function getRelatedEntityInfo(
  relatedEntityType: string,
  relatedEntityId: string,
  tenantId: string
): Promise<{ id: string; name?: string; firstName?: string; lastName?: string; title?: string } | null> {
  try {
    switch (relatedEntityType) {
      case 'Contact':
        const contact = await prisma.contact.findFirst({
          where: { id: relatedEntityId, tenantId, deletedAt: null },
          select: { id: true, firstName: true, lastName: true }
        });
        if (!contact) return null;
        return {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName || undefined
        };

      case 'Company':
        const company = await prisma.company.findFirst({
          where: { id: relatedEntityId, tenantId, deletedAt: null },
          select: { id: true, name: true }
        });
        if (!company) return null;
        return { id: company.id, name: company.name };

      case 'Lead':
        const lead = await prisma.lead.findFirst({
          where: { id: relatedEntityId, tenantId, deletedAt: null },
          select: { id: true, firstName: true, lastName: true }
        });
        if (!lead) return null;
        return {
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName || undefined
        };

      case 'Opportunity':
        const opportunity = await prisma.opportunity.findFirst({
          where: { id: relatedEntityId, tenantId, deletedAt: null },
          select: { id: true, name: true }
        });
        if (!opportunity) return null;
        return { id: opportunity.id, name: opportunity.name };

      case 'Task':
        const task = await prisma.task.findFirst({
          where: { id: relatedEntityId, tenantId, deletedAt: null },
          select: { id: true, title: true }
        });
        if (!task) return null;
        return { id: task.id, title: task.title };

      default:
        return null;
    }
  } catch (error) {
    // Em caso de erro, retornar null (não quebrar a resposta)
    console.error('Erro ao buscar informações da entidade relacionada:', error);
    return null;
  }
}

/**
 * Valida que usuário existe e pertence ao tenant
 * 
 * @param userId - ID do usuário
 * @param tenantId - ID do tenant
 * @throws Error se usuário não encontrado ou não pertence ao tenant
 */
async function validateUserExists(userId: string, tenantId: string): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error('ID de usuário inválido');
  }

  const user = await prisma.user.findFirst({
    where: { 
      id: userId, 
      tenantId 
    },
    select: { id: true }
  });

  if (!user) {
    throw new Error('Usuário não encontrado ou não pertence ao seu tenant');
  }
}

/**
 * Verifica se usuário tem role Admin
 * 
 * @param userId - ID do usuário
 * @param tenantId - ID do tenant
 * @returns true se usuário é admin, false caso contrário
 */
async function checkIsAdmin(userId: string, tenantId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        userRoles: {
          where: {
            role: {
              isActive: true,
              tenantId
            }
          },
          include: {
            role: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!user) return false;

    return user.userRoles.some((ur) => ur.role.name === 'Admin');
  } catch (error) {
    console.error('Erro ao verificar role admin:', error);
    return false;
  }
}

export class NoteService {
  /**
   * Lista notas com filtros e paginação
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param filters - Filtros opcionais
   * @param pagination - Parâmetros de paginação
   * @param userId - ID do usuário (para filtrar campos por permissão)
   * @returns Objeto com lista de notas e informações de paginação
   */
  static async listNotes(
    tenantId: string,
    filters?: NoteFilters,
    pagination?: PaginationParams,
    userId?: string
  ): Promise<{
    data: NoteResponse[];
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

    // Adicionar filtros opcionais
    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.relatedEntityType) {
      where.relatedEntityType = filters.relatedEntityType;
    }

    if (filters?.relatedEntityId) {
      where.relatedEntityId = filters.relatedEntityId;
    }

    // Configurar ordenação (padrão: createdAt DESC - mais recente primeiro)
    const orderByField = pagination?.orderBy || 'createdAt';
    const orderDirection = pagination?.order || 'desc';

    const orderBy: any = {};
    if (orderByField === 'createdAt') {
      orderBy.createdAt = orderDirection;
    } else {
      // Fallback para createdAt desc se campo inválido
      orderBy.createdAt = 'desc';
    }

    // Buscar notas com relacionamentos
    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
      }),
      prisma.note.count({ where }),
    ]);

    // Formatar resposta e buscar informações de entidades relacionadas
    let data: NoteResponse[] = await Promise.all(
      notes.map(async (note) => {
        const relatedEntity = await getRelatedEntityInfo(
          note.relatedEntityType,
          note.relatedEntityId,
          tenantId
        );

        return {
          id: note.id,
          tenantId: note.tenantId,
          content: note.content,
          type: note.type,
          relatedEntityType: note.relatedEntityType,
          relatedEntityId: note.relatedEntityId,
          createdById: note.createdById,
          deletedAt: note.deletedAt,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          createdBy: {
            id: note.createdBy.id,
            name: note.createdBy.name,
            email: note.createdBy.email,
          },
          relatedEntity,
        };
      })
    );

    // Filtrar campos baseado em permissões do usuário
    if (userId) {
      data = (await filterFieldsByPermission(
        data,
        userId,
        tenantId,
        'Note',
        'read'
      )) as NoteResponse[];
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
   * Obtém nota por ID
   * 
   * @param noteId - ID da nota
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param userId - ID do usuário (para filtrar campos por permissão)
   * @returns Nota encontrada
   * @throws Error se nota não encontrada
   */
  static async getNoteById(
    noteId: string,
    tenantId: string,
    userId?: string
  ): Promise<NoteResponse> {
    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(noteId)) {
      throw new Error('ID da nota inválido');
    }

    // Buscar nota com relacionamentos
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!note) {
      throw new Error('Nota não encontrada, não pertence ao seu tenant ou foi deletada');
    }

    // Buscar informações da entidade relacionada
    const relatedEntity = await getRelatedEntityInfo(
      note.relatedEntityType,
      note.relatedEntityId,
      tenantId
    );

    // Formatar resposta
    let noteResponse: NoteResponse = {
      id: note.id,
      tenantId: note.tenantId,
      content: note.content,
      type: note.type,
      relatedEntityType: note.relatedEntityType,
      relatedEntityId: note.relatedEntityId,
      createdById: note.createdById,
      deletedAt: note.deletedAt,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      createdBy: {
        id: note.createdBy.id,
        name: note.createdBy.name,
        email: note.createdBy.email,
      },
      relatedEntity,
    };

    // Filtrar campos baseado em permissões do usuário
    if (userId) {
      noteResponse = (await filterFieldsByPermission(
        noteResponse,
        userId,
        tenantId,
        'Note',
        'read'
      )) as NoteResponse;
    }

    return noteResponse;
  }

  /**
   * Cria nota
   * 
   * @param data - Dados da nota
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está criando (obrigatório)
   * @returns Nota criada
   * @throws Error se validações falharem
   */
  static async createNote(
    data: CreateNoteData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<NoteResponse> {
    // Validar requestingUserId
    if (!requestingUserId) {
      throw new Error('ID do usuário é obrigatório para criar nota');
    }

    // Validar dados obrigatórios
    if (!data.content || !data.content.trim()) {
      throw new Error('Conteúdo da nota é obrigatório');
    }

    // Validar limite de tamanho do conteúdo (10.000 caracteres)
    if (data.content.trim().length > 10000) {
      throw new Error('Conteúdo da nota não pode exceder 10.000 caracteres');
    }

    // Validar enum type se fornecido
    if (data.type && !Object.values(NoteType).includes(data.type)) {
      throw new Error(`Tipo de nota inválido. Valores permitidos: ${Object.values(NoteType).join(', ')}`);
    }

    // Validar relacionamentos (incluindo Task)
    await validateRelatedEntity(data.relatedEntityType, data.relatedEntityId, tenantId);

    // Validar requestingUserId
    await validateUserExists(requestingUserId, tenantId);

    // Criar nota
    const note = await prisma.note.create({
      data: {
        tenantId,
        content: data.content.trim(),
        type: data.type || NoteType.NOTE,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
        createdById: requestingUserId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Buscar informações da entidade relacionada
    const relatedEntity = await getRelatedEntityInfo(
      note.relatedEntityType,
      note.relatedEntityId,
      tenantId
    );

    // Formatar resposta
    const noteResponse: NoteResponse = {
      id: note.id,
      tenantId: note.tenantId,
      content: note.content,
      type: note.type,
      relatedEntityType: note.relatedEntityType,
      relatedEntityId: note.relatedEntityId,
      createdById: note.createdById,
      deletedAt: note.deletedAt,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      createdBy: {
        id: note.createdBy.id,
        name: note.createdBy.name,
        email: note.createdBy.email,
      },
      relatedEntity,
    };

    // Registrar auditoria (após commit bem-sucedido)
    if (requestingUserId) {
      logAudit('Note', note.id, 'create', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return noteResponse;
  }

  /**
   * Atualiza nota
   * 
   * @param noteId - ID da nota a ser atualizada
   * @param data - Dados para atualização
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (para validar permissões)
   * @returns Nota atualizada
   * @throws Error se nota não encontrada, validações falharem ou usuário não tiver permissão
   */
  static async updateNote(
    noteId: string,
    data: UpdateNoteData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<NoteResponse> {
    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(noteId)) {
      throw new Error('ID da nota inválido');
    }

    // Verificar se nota existe e pertence ao tenant
    const existingNote = await prisma.note.findFirst({
      where: {
        id: noteId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
    });

    if (!existingNote) {
      throw new Error('Nota não encontrada, não pertence ao seu tenant ou foi deletada');
    }

    // Validar que usuário é o criador OU tem role Admin
    if (requestingUserId) {
      const isCreator = existingNote.createdById === requestingUserId;
      const isAdmin = await checkIsAdmin(requestingUserId, tenantId);

      if (!isCreator && !isAdmin) {
        throw new Error('Você não tem permissão para editar esta nota. Apenas o criador ou um administrador podem editar.');
      }
    }

    // Capturar dados antigos para auditoria (antes de atualizar)
    const oldData = {
      content: existingNote.content,
      type: existingNote.type,
    };

    // Validar permissões de campo antes de atualizar
    if (requestingUserId) {
      // Preparar objeto com apenas campos primitivos
      const primitiveFields: Record<string, any> = {};
      if (data.content !== undefined) primitiveFields.content = data.content;
      if (data.type !== undefined) primitiveFields.type = data.type;

      const validation = await validateFieldPermissionsForUpdate(
        primitiveFields,
        requestingUserId,
        tenantId,
        'Note'
      );

      if (!validation.allowed) {
        throw new Error(
          `Você não tem permissão para atualizar os seguintes campos: ${validation.forbiddenFields.join(', ')}`
        );
      }
    }

    // Validar content se fornecido (não vazio, máximo 10.000 caracteres)
    if (data.content !== undefined) {
      if (!data.content.trim()) {
        throw new Error('Conteúdo da nota não pode ser vazio');
      }
      if (data.content.trim().length > 10000) {
        throw new Error('Conteúdo da nota não pode exceder 10.000 caracteres');
      }
    }

    // Validar enum type se fornecido
    if (data.type !== undefined && !Object.values(NoteType).includes(data.type)) {
      throw new Error(`Tipo de nota inválido. Valores permitidos: ${Object.values(NoteType).join(', ')}`);
    }

    // Preparar objeto de atualização apenas com campos fornecidos
    const updateData: any = {};

    if (data.content !== undefined) {
      updateData.content = data.content.trim();
    }

    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    // Atualizar nota
    const note = await prisma.note.update({
      where: { id: noteId },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Buscar informações da entidade relacionada
    const relatedEntity = await getRelatedEntityInfo(
      note.relatedEntityType,
      note.relatedEntityId,
      tenantId
    );

    // Formatar resposta
    const noteResponse: NoteResponse = {
      id: note.id,
      tenantId: note.tenantId,
      content: note.content,
      type: note.type,
      relatedEntityType: note.relatedEntityType,
      relatedEntityId: note.relatedEntityId,
      createdById: note.createdById,
      deletedAt: note.deletedAt,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      createdBy: {
        id: note.createdBy.id,
        name: note.createdBy.name,
        email: note.createdBy.email,
      },
      relatedEntity,
    };

    // Preparar changes para auditoria
    const changes: Record<string, { old?: any; new?: any }> = {};
    if (data.content !== undefined && data.content.trim() !== oldData.content) {
      changes.content = { old: oldData.content, new: data.content.trim() };
    }
    if (data.type !== undefined && data.type !== oldData.type) {
      changes.type = { old: oldData.type, new: data.type };
    }

    // Registrar auditoria com changes (após commit bem-sucedido)
    if (requestingUserId && Object.keys(changes).length > 0) {
      logAudit('Note', note.id, 'update', requestingUserId, tenantId, changes).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return noteResponse;
  }

  /**
   * Deleta nota (soft delete)
   * 
   * @param noteId - ID da nota a ser deletada
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @throws Error se nota não encontrada ou usuário não tiver permissão
   */
  static async deleteNote(
    noteId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<void> {
    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(noteId)) {
      throw new Error('ID da nota inválido');
    }

    // Buscar nota e validar que pertence ao tenant e não está soft deleted
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
    });

    if (!note) {
      throw new Error('Nota não encontrada, não pertence ao seu tenant ou foi deletada');
    }

    // Validar que usuário é o criador OU tem role Admin
    if (requestingUserId) {
      const isCreator = note.createdById === requestingUserId;
      const isAdmin = await checkIsAdmin(requestingUserId, tenantId);

      if (!isCreator && !isAdmin) {
        throw new Error('Você não tem permissão para deletar esta nota. Apenas o criador ou um administrador podem deletar.');
      }
    }

    // Soft delete (marcar deletedAt com timestamp atual)
    await prisma.note.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });

    // Registrar auditoria (após commit bem-sucedido)
    if (requestingUserId) {
      logAudit('Note', noteId, 'delete', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }
  }
}
