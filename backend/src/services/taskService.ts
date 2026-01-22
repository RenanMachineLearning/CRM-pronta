/**
 * Serviço para gestão de tarefas
 * 
 * Lógica de negócio para operações CRUD de tarefas.
 * Regra de ouro: Controller orquestra, Service decide.
 * 
 * Funcionalidades:
 * - CRUD completo de tarefas
 * - Validação de relacionamentos polimórficos
 * - Integração com auditoria
 * - Permissões por campo
 * - Soft delete
 * - Filtros e paginação avançados
 */

import { PrismaClient, TaskType, TaskStatus, TaskPriority } from '@prisma/client';
import { filterFieldsByPermission, validateFieldPermissionsForUpdate } from '../utils/fieldPermissions';
import { logAudit } from '../utils/auditLog';
import { isValidDateNotPast } from '../utils/validators';
import { validateFilters } from '../utils/filterValidator';
import { buildFilterQuery } from '../utils/filterBuilder';
import { buildOrderBy } from '../utils/orderByHelpers';

const prisma = new PrismaClient();

// Interface para filtros de listagem
export interface TaskFilters {
  status?: TaskStatus;
  type?: TaskType;
  assignedToId?: string;
  relatedEntityType?: 'Contact' | 'Company' | 'Lead' | 'Opportunity';
  relatedEntityId?: string;
  dueDateFrom?: Date | string; // Aceitar string para facilitar uso em controllers
  dueDateTo?: Date | string;
  // Filtros avançados
  overdue?: boolean; // Tarefas vencidas (dueDate < hoje e status != COMPLETED)
  completed?: boolean; // Apenas concluídas ou não concluídas
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
export interface CreateTaskData {
  title: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  dueDate?: Date | string;
  priority?: TaskPriority;
  assignedToId?: string;
  relatedEntityType: 'Contact' | 'Company' | 'Lead' | 'Opportunity';
  relatedEntityId: string;
}

// Interface para dados de atualização
export interface UpdateTaskData {
  title?: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  dueDate?: Date | string | null; // Permitir null para remover dueDate
  priority?: TaskPriority;
  assignedToId?: string | null; // Permitir null para remover atribuição
  relatedEntityType?: 'Contact' | 'Company' | 'Lead' | 'Opportunity';
  relatedEntityId?: string;
}

// Interface para resposta de Task
export interface TaskResponse {
  id: string;
  tenantId: string;
  title: string;
  description?: string | null;
  type: TaskType;
  status: TaskStatus;
  dueDate?: Date | null;
  completedAt?: Date | null;
  priority: TaskPriority;
  assignedToId?: string | null;
  createdById: string;
  relatedEntityType: string;
  relatedEntityId: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Relacionamentos
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  // Registro relacionado (polimórfico - informações básicas)
  relatedEntity?: {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    title?: string; // Para Task relacionada a outra Task (via Note)
  } | null;
  // Campos customizados mesclados (se aplicável)
  [key: string]: any;
}

/**
 * Valida que entidade relacionada existe e pertence ao tenant
 * 
 * @param relatedEntityType - Tipo da entidade (Contact, Company, Lead, Opportunity)
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
 * Normaliza data (aceita Date ou string)
 * 
 * @param date - Data como Date ou string
 * @returns Date normalizado ou null
 */
function normalizeDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

export class TaskService {
  /**
   * Lista tarefas com filtros e paginação
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param filters - Filtros opcionais
   * @param pagination - Parâmetros de paginação
   * @param userId - ID do usuário (para filtrar campos por permissão)
   * @returns Objeto com lista de tarefas e informações de paginação
   */
  static async listTasks(
    tenantId: string,
    filters?: TaskFilters,
    pagination?: PaginationParams,
    userId?: string
  ): Promise<{
    data: TaskResponse[];
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
    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters?.relatedEntityType) {
      where.relatedEntityType = filters.relatedEntityType;
    }

    if (filters?.relatedEntityId) {
      where.relatedEntityId = filters.relatedEntityId;
    }

    // Filtro de data de vencimento
    if (filters?.dueDateFrom || filters?.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) {
        where.dueDate.gte = normalizeDate(filters.dueDateFrom);
      }
      if (filters.dueDateTo) {
        where.dueDate.lte = normalizeDate(filters.dueDateTo);
      }
    }

    // Filtro de tarefas vencidas
    if (filters?.overdue === true) {
      where.dueDate = {
        ...where.dueDate,
        lt: new Date()
      };
      where.status = { not: 'COMPLETED' };
    }

    // Filtro de concluídas
    if (filters?.completed !== undefined) {
      if (filters.completed) {
        where.status = 'COMPLETED';
      } else {
        where.status = { not: 'COMPLETED' };
      }
    }

    // Adicionar filtros avançados (após filtros simples)
    if (filters?.advancedFilters && filters.advancedFilters.length > 0) {
      try {
        validateFilters(filters.advancedFilters, 'task');
        const advancedWhere = buildFilterQuery(filters.advancedFilters, 'task');
        Object.assign(where, advancedWhere);
      } catch (error) {
        throw error;
      }
    }

    // Configurar ordenação usando helper centralizado
    // Priorizar sortBy/sortOrder (novo) sobre orderBy/order (legado)
    const orderBy = buildOrderBy(
      pagination?.sortBy || pagination?.orderBy,
      pagination?.sortOrder || pagination?.order,
      'task'
    );

    // Buscar tarefas com relacionamentos
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
      prisma.task.count({ where }),
    ]);

    // Formatar resposta e buscar informações de entidades relacionadas
    let data: TaskResponse[] = await Promise.all(
      tasks.map(async (task) => {
        const relatedEntity = await getRelatedEntityInfo(
          task.relatedEntityType,
          task.relatedEntityId,
          tenantId
        );

        return {
          id: task.id,
          tenantId: task.tenantId,
          title: task.title,
          description: task.description,
          type: task.type,
          status: task.status,
          dueDate: task.dueDate,
          completedAt: task.completedAt,
          priority: task.priority,
          assignedToId: task.assignedToId,
          createdById: task.createdById,
          relatedEntityType: task.relatedEntityType,
          relatedEntityId: task.relatedEntityId,
          deletedAt: task.deletedAt,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          assignedTo: task.assignedTo
            ? {
                id: task.assignedTo.id,
                name: task.assignedTo.name,
                email: task.assignedTo.email,
              }
            : null,
          createdBy: {
            id: task.createdBy.id,
            name: task.createdBy.name,
            email: task.createdBy.email,
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
        'Task',
        'read'
      )) as TaskResponse[];
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
   * Obtém tarefa por ID
   * 
   * @param taskId - ID da tarefa
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param userId - ID do usuário (para filtrar campos por permissão)
   * @returns Tarefa encontrada
   * @throws Error se tarefa não encontrada
   */
  static async getTaskById(
    taskId: string,
    tenantId: string,
    userId?: string
  ): Promise<TaskResponse> {
    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      throw new Error('ID da tarefa inválido');
    }

    // Buscar tarefa com relacionamentos
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error('Tarefa não encontrada, não pertence ao seu tenant ou foi deletada');
    }

    // Buscar informações da entidade relacionada
    const relatedEntity = await getRelatedEntityInfo(
      task.relatedEntityType,
      task.relatedEntityId,
      tenantId
    );

    // Formatar resposta
    let taskResponse: TaskResponse = {
      id: task.id,
      tenantId: task.tenantId,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      priority: task.priority,
      assignedToId: task.assignedToId,
      createdById: task.createdById,
      relatedEntityType: task.relatedEntityType,
      relatedEntityId: task.relatedEntityId,
      deletedAt: task.deletedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      assignedTo: task.assignedTo
        ? {
            id: task.assignedTo.id,
            name: task.assignedTo.name,
            email: task.assignedTo.email,
          }
        : null,
      createdBy: {
        id: task.createdBy.id,
        name: task.createdBy.name,
        email: task.createdBy.email,
      },
      relatedEntity,
    };

    // Filtrar campos baseado em permissões do usuário
    if (userId) {
      taskResponse = (await filterFieldsByPermission(
        taskResponse,
        userId,
        tenantId,
        'Task',
        'read'
      )) as TaskResponse;
    }

    return taskResponse;
  }

  /**
   * Cria tarefa
   * 
   * @param data - Dados da tarefa
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está criando (obrigatório)
   * @returns Tarefa criada
   * @throws Error se validações falharem
   */
  static async createTask(
    data: CreateTaskData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<TaskResponse> {
    // Validar requestingUserId
    if (!requestingUserId) {
      throw new Error('ID do usuário é obrigatório para criar tarefa');
    }

    // Validar dados obrigatórios
    if (!data.title || !data.title.trim()) {
      throw new Error('Título da tarefa é obrigatório');
    }

    // Validar enums
    if (data.type && !Object.values(TaskType).includes(data.type)) {
      throw new Error(`Tipo de tarefa inválido. Valores permitidos: ${Object.values(TaskType).join(', ')}`);
    }

    if (data.status && !Object.values(TaskStatus).includes(data.status)) {
      throw new Error(`Status inválido. Valores permitidos: ${Object.values(TaskStatus).join(', ')}`);
    }

    if (data.priority && !Object.values(TaskPriority).includes(data.priority)) {
      throw new Error(`Prioridade inválida. Valores permitidos: ${Object.values(TaskPriority).join(', ')}`);
    }

    // Validar dueDate (não pode ser passada, mas pode ser futura)
    if (data.dueDate) {
      const dueDate = normalizeDate(data.dueDate);
      if (!dueDate) {
        throw new Error('Data de vencimento inválida');
      }
      if (!isValidDateNotPast(dueDate)) {
        throw new Error('Data de vencimento não pode ser passada');
      }
    }

    // Validar relacionamentos
    await validateRelatedEntity(data.relatedEntityType, data.relatedEntityId, tenantId);

    // Validar assignedToId se fornecido
    if (data.assignedToId) {
      await validateUserExists(data.assignedToId, tenantId);
    }

    // Validar requestingUserId
    await validateUserExists(requestingUserId, tenantId);

    // Criar tarefa
    const task = await prisma.task.create({
      data: {
        tenantId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        type: data.type || TaskType.OTHER,
        status: data.status || TaskStatus.PENDING,
        dueDate: data.dueDate ? normalizeDate(data.dueDate) : null,
        priority: data.priority || TaskPriority.MEDIUM,
        assignedToId: data.assignedToId || null,
        createdById: requestingUserId,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
      task.relatedEntityType,
      task.relatedEntityId,
      tenantId
    );

    // Formatar resposta
    const taskResponse: TaskResponse = {
      id: task.id,
      tenantId: task.tenantId,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      priority: task.priority,
      assignedToId: task.assignedToId,
      createdById: task.createdById,
      relatedEntityType: task.relatedEntityType,
      relatedEntityId: task.relatedEntityId,
      deletedAt: task.deletedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      assignedTo: task.assignedTo
        ? {
            id: task.assignedTo.id,
            name: task.assignedTo.name,
            email: task.assignedTo.email,
          }
        : null,
      createdBy: {
        id: task.createdBy.id,
        name: task.createdBy.name,
        email: task.createdBy.email,
      },
      relatedEntity,
    };

    // Registrar auditoria (após commit bem-sucedido)
    if (requestingUserId) {
      logAudit('Task', task.id, 'create', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return taskResponse;
  }

  /**
   * Atualiza tarefa
   * 
   * @param taskId - ID da tarefa a ser atualizada
   * @param data - Dados para atualização
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (para validar permissões de campo)
   * @returns Tarefa atualizada
   * @throws Error se tarefa não encontrada ou validações falharem
   */
  static async updateTask(
    taskId: string,
    data: UpdateTaskData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<TaskResponse> {
    // Validar formato UUID do taskId
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      throw new Error('ID da tarefa inválido');
    }

    // Verificar se tarefa existe e pertence ao tenant
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
    });

    if (!existingTask) {
      throw new Error('Tarefa não encontrada, não pertence ao seu tenant ou foi deletada');
    }

    // Capturar dados antigos para auditoria (antes de atualizar)
    const oldData = {
      title: existingTask.title,
      description: existingTask.description,
      type: existingTask.type,
      status: existingTask.status,
      dueDate: existingTask.dueDate,
      priority: existingTask.priority,
      assignedToId: existingTask.assignedToId,
      relatedEntityType: existingTask.relatedEntityType,
      relatedEntityId: existingTask.relatedEntityId,
    };

    // Validar permissões de campo antes de atualizar
    if (requestingUserId) {
      // Preparar objeto com apenas campos primitivos
      const primitiveFields: Record<string, any> = {};
      if (data.title !== undefined) primitiveFields.title = data.title;
      if (data.description !== undefined) primitiveFields.description = data.description;
      if (data.type !== undefined) primitiveFields.type = data.type;
      if (data.status !== undefined) primitiveFields.status = data.status;
      if (data.dueDate !== undefined) primitiveFields.dueDate = data.dueDate;
      if (data.priority !== undefined) primitiveFields.priority = data.priority;
      if (data.assignedToId !== undefined) primitiveFields.assignedToId = data.assignedToId;

      const validation = await validateFieldPermissionsForUpdate(
        primitiveFields,
        requestingUserId,
        tenantId,
        'Task'
      );

      if (!validation.allowed) {
        throw new Error(
          `Você não tem permissão para atualizar os seguintes campos: ${validation.forbiddenFields.join(', ')}`
        );
      }
    }

    // Validar title se fornecido
    if (data.title !== undefined && !data.title.trim()) {
      throw new Error('Título da tarefa não pode ser vazio');
    }

    // Validar enums se fornecidos
    if (data.type !== undefined && !Object.values(TaskType).includes(data.type)) {
      throw new Error(`Tipo de tarefa inválido. Valores permitidos: ${Object.values(TaskType).join(', ')}`);
    }

    if (data.status !== undefined && !Object.values(TaskStatus).includes(data.status)) {
      throw new Error(`Status inválido. Valores permitidos: ${Object.values(TaskStatus).join(', ')}`);
    }

    if (data.priority !== undefined && !Object.values(TaskPriority).includes(data.priority)) {
      throw new Error(`Prioridade inválida. Valores permitidos: ${Object.values(TaskPriority).join(', ')}`);
    }

    // Validar dueDate se fornecida (não pode ser passada, mas pode ser futura)
    if (data.dueDate !== undefined && data.dueDate !== null) {
      const dueDate = normalizeDate(data.dueDate);
      if (!dueDate) {
        throw new Error('Data de vencimento inválida');
      }
      if (!isValidDateNotPast(dueDate)) {
        throw new Error('Data de vencimento não pode ser passada');
      }
    }

    // Validar relacionamentos se fornecidos
    if (data.relatedEntityType && data.relatedEntityId) {
      await validateRelatedEntity(data.relatedEntityType, data.relatedEntityId, tenantId);
    }

    // Validar assignedToId se fornecido
    if (data.assignedToId !== undefined && data.assignedToId !== null) {
      await validateUserExists(data.assignedToId, tenantId);
    }

    // Preparar objeto de atualização apenas com campos fornecidos
    const updateData: any = {};

    if (data.title !== undefined) {
      updateData.title = data.title.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
      // Lógica especial: se status mudar para COMPLETED, atualizar completedAt
      if (data.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
        updateData.completedAt = new Date();
      }
      // Lógica especial: se status mudar de COMPLETED para outro, limpar completedAt
      if (data.status !== 'COMPLETED' && existingTask.status === 'COMPLETED') {
        updateData.completedAt = null;
      }
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate === null ? null : normalizeDate(data.dueDate);
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    if (data.assignedToId !== undefined) {
      updateData.assignedToId = data.assignedToId;
    }

    if (data.relatedEntityType !== undefined) {
      updateData.relatedEntityType = data.relatedEntityType;
    }

    if (data.relatedEntityId !== undefined) {
      updateData.relatedEntityId = data.relatedEntityId;
    }

    // Atualizar tarefa
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
      task.relatedEntityType,
      task.relatedEntityId,
      tenantId
    );

    // Formatar resposta
    const taskResponse: TaskResponse = {
      id: task.id,
      tenantId: task.tenantId,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      priority: task.priority,
      assignedToId: task.assignedToId,
      createdById: task.createdById,
      relatedEntityType: task.relatedEntityType,
      relatedEntityId: task.relatedEntityId,
      deletedAt: task.deletedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      assignedTo: task.assignedTo
        ? {
            id: task.assignedTo.id,
            name: task.assignedTo.name,
            email: task.assignedTo.email,
          }
        : null,
      createdBy: {
        id: task.createdBy.id,
        name: task.createdBy.name,
        email: task.createdBy.email,
      },
      relatedEntity,
    };

    // Preparar changes para auditoria
    const changes: Record<string, { old?: any; new?: any }> = {};
    if (data.title !== undefined && data.title.trim() !== oldData.title) {
      changes.title = { old: oldData.title, new: data.title.trim() };
    }
    if (data.description !== undefined && (data.description?.trim() || null) !== oldData.description) {
      changes.description = { old: oldData.description, new: data.description?.trim() || null };
    }
    if (data.type !== undefined && data.type !== oldData.type) {
      changes.type = { old: oldData.type, new: data.type };
    }
    if (data.status !== undefined && data.status !== oldData.status) {
      changes.status = { old: oldData.status, new: data.status };
    }
    if (data.dueDate !== undefined) {
      const newDueDate = data.dueDate === null ? null : normalizeDate(data.dueDate);
      if (newDueDate?.getTime() !== oldData.dueDate?.getTime()) {
        changes.dueDate = { old: oldData.dueDate, new: newDueDate };
      }
    }
    if (data.priority !== undefined && data.priority !== oldData.priority) {
      changes.priority = { old: oldData.priority, new: data.priority };
    }
    if (data.assignedToId !== undefined && data.assignedToId !== oldData.assignedToId) {
      changes.assignedToId = { old: oldData.assignedToId, new: data.assignedToId };
    }
    if (data.relatedEntityType !== undefined && data.relatedEntityType !== oldData.relatedEntityType) {
      changes.relatedEntityType = { old: oldData.relatedEntityType, new: data.relatedEntityType };
    }
    if (data.relatedEntityId !== undefined && data.relatedEntityId !== oldData.relatedEntityId) {
      changes.relatedEntityId = { old: oldData.relatedEntityId, new: data.relatedEntityId };
    }

    // Registrar auditoria com changes (após commit bem-sucedido)
    if (requestingUserId && Object.keys(changes).length > 0) {
      logAudit('Task', task.id, 'update', requestingUserId, tenantId, changes).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return taskResponse;
  }

  /**
   * Deleta tarefa (soft delete)
   * 
   * @param taskId - ID da tarefa a ser deletada
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @throws Error se tarefa não encontrada
   */
  static async deleteTask(
    taskId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<void> {
    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      throw new Error('ID da tarefa inválido');
    }

    // Buscar tarefa e validar que pertence ao tenant e não está soft deleted
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
    });

    if (!task) {
      throw new Error('Tarefa não encontrada, não pertence ao seu tenant ou foi deletada');
    }

    // Soft delete (marcar deletedAt com timestamp atual)
    await prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    // Registrar auditoria (após commit bem-sucedido)
    if (requestingUserId) {
      logAudit('Task', taskId, 'delete', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }
  }
}
