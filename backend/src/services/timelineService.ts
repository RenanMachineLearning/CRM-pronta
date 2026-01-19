/**
 * Service para timeline/histórico de atividades
 * 
 * Agrega tarefas, notas e logs de auditoria relacionados a uma entidade específica,
 * ordenados por data (mais recente primeiro).
 * 
 * Funcionalidades:
 * - Validação de existência da entidade
 * - Agregação de tarefas, notas e auditoria
 * - Ordenação por timestamp
 * - Paginação
 * - Isolamento multi-tenant
 */

import { PrismaClient, TaskType, TaskStatus, TaskPriority, NoteType } from '@prisma/client';
import { AuditLogService, AuditLogResponse } from './auditLogService';

const prisma = new PrismaClient();

// Item da timeline (tarefa, nota ou auditoria)
export interface TimelineItem {
  id: string;
  type: 'task' | 'note' | 'audit';
  timestamp: Date; // createdAt para task/note, timestamp para audit
  // Informações comuns
  userId: string;
  userName: string | null; // Nome do usuário (pode ser null se deletado)
  // Dados específicos por tipo
  data: TaskTimelineData | NoteTimelineData | AuditTimelineData;
}

// Dados de tarefa na timeline
export interface TaskTimelineData {
  title: string;
  description?: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date | null;
  completedAt?: Date | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
}

// Dados de nota na timeline
export interface NoteTimelineData {
  content: string;
  noteType: NoteType;
}

// Dados de auditoria na timeline
export interface AuditTimelineData {
  action: 'create' | 'update' | 'delete';
  changes?: Record<string, { old?: any; new?: any }> | null;
}

// Resposta da timeline
export interface TimelineResponse {
  data: TimelineItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  entity: {
    type: string;
    id: string;
    // Informações básicas da entidade (opcional, para contexto)
    name?: string; // Contact: firstName + lastName, Company: name, etc.
  };
}

// Parâmetros de paginação
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Valida que uma entidade existe e pertence ao tenant
 * 
 * Validações:
 * - entityType deve ser um dos valores válidos
 * - entityId deve ser UUID válido
 * - Entidade deve existir no banco
 * - Entidade deve pertencer ao tenant
 * - Entidade não deve estar soft deleted
 * 
 * @param entityType - Tipo de entidade (Contact, Company, Lead, Opportunity, Task)
 * @param entityId - ID da entidade (UUID)
 * @param tenantId - ID do tenant
 * @throws Error se validação falhar
 */
async function validateEntityExists(
  entityType: string,
  entityId: string,
  tenantId: string
): Promise<void> {
  // Validar entityType
  const validEntityTypes = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task'];
  if (!validEntityTypes.includes(entityType)) {
    throw new Error(
      `Tipo de entidade inválido: ${entityType}. Valores válidos: ${validEntityTypes.join(', ')}`
    );
  }

  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(entityId)) {
    throw new Error('ID da entidade deve ser um UUID válido');
  }

  // Validar tenantId (formato UUID)
  if (!uuidRegex.test(tenantId)) {
    throw new Error('ID do tenant deve ser um UUID válido');
  }

  let exists = false;
  let entityName = '';

  // Buscar entidade específica por tipo
  switch (entityType) {
    case 'Contact':
      const contact = await prisma.contact.findFirst({
        where: { id: entityId, tenantId, deletedAt: null },
        select: { id: true }, // Apenas ID para validação (otimização)
      });
      exists = !!contact;
      entityName = 'Contato';
      break;
      
    case 'Company':
      const company = await prisma.company.findFirst({
        where: { id: entityId, tenantId, deletedAt: null },
        select: { id: true },
      });
      exists = !!company;
      entityName = 'Empresa';
      break;
      
    case 'Lead':
      const lead = await prisma.lead.findFirst({
        where: { id: entityId, tenantId, deletedAt: null },
        select: { id: true },
      });
      exists = !!lead;
      entityName = 'Lead';
      break;
      
    case 'Opportunity':
      const opportunity = await prisma.opportunity.findFirst({
        where: { id: entityId, tenantId, deletedAt: null },
        select: { id: true },
      });
      exists = !!opportunity;
      entityName = 'Oportunidade';
      break;
      
    case 'Task':
      const task = await prisma.task.findFirst({
        where: { id: entityId, tenantId, deletedAt: null },
        select: { id: true },
      });
      exists = !!task;
      entityName = 'Tarefa';
      break;
      
    default:
      // Não deve chegar aqui devido à validação anterior, mas por segurança:
      throw new Error(`Tipo de entidade inválido: ${entityType}`);
  }

  if (!exists) {
    throw new Error(
      `${entityName} não encontrado, não pertence ao seu tenant ou foi deletado`
    );
  }
}

/**
 * Converte tarefa para item da timeline
 * 
 * @param task - Tarefa com relacionamentos (createdBy, assignedTo)
 * @returns TimelineItem com type 'task'
 */
function taskToTimelineItem(
  task: any & { 
    createdBy: { id: string; name: string; email?: string } 
    assignedTo?: { id: string; name: string; email?: string } | null 
  }
): TimelineItem {
  return {
    id: task.id,
    type: 'task',
    timestamp: task.createdAt, // Usar createdAt como timestamp
    userId: task.createdById,
    userName: task.createdBy.name || null, // Pode ser null se usuário deletado
    data: {
      title: task.title,
      description: task.description || null,
      type: task.type,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || null,
      completedAt: task.completedAt || null,
      assignedToId: task.assignedToId || null,
      assignedToName: task.assignedTo?.name || null,
    },
  };
}

/**
 * Converte nota para item da timeline
 * 
 * @param note - Nota com relacionamento (createdBy)
 * @returns TimelineItem com type 'note'
 */
function noteToTimelineItem(
  note: any & { 
    createdBy: { id: string; name: string; email?: string } 
  }
): TimelineItem {
  return {
    id: note.id,
    type: 'note',
    timestamp: note.createdAt, // Usar createdAt como timestamp
    userId: note.createdById,
    userName: note.createdBy.name || null, // Pode ser null se usuário deletado
    data: {
      content: note.content,
      noteType: note.type,
    },
  };
}

/**
 * Converte log de auditoria para item da timeline
 * 
 * @param log - Log de auditoria (AuditLogResponse)
 * @returns TimelineItem com type 'audit'
 */
function auditLogToTimelineItem(log: AuditLogResponse): TimelineItem {
  return {
    id: log.id,
    type: 'audit',
    timestamp: log.timestamp, // Usar timestamp do log de auditoria
    userId: log.userId,
    userName: log.userName || null, // Pode ser null se usuário deletado
    data: {
      action: log.action as 'create' | 'update' | 'delete',
      changes: log.changes || null, // Pode ser null se não houver mudanças
    },
  };
}

/**
 * Obtém informações básicas da entidade para contexto na timeline
 * 
 * @param entityType - Tipo de entidade
 * @param entityId - ID da entidade
 * @param tenantId - ID do tenant
 * @returns Objeto com nome/título da entidade ou undefined
 */
async function getEntityInfo(
  entityType: string,
  entityId: string,
  tenantId: string
): Promise<{ name?: string }> {
  switch (entityType) {
    case 'Contact':
      const contact = await prisma.contact.findFirst({
        where: { id: entityId, tenantId, deletedAt: null },
        select: { firstName: true, lastName: true },
      });
      return { 
        name: contact ? `${contact.firstName} ${contact.lastName || ''}`.trim() : undefined 
      };
      
    case 'Company':
      const company = await prisma.company.findFirst({
        where: { id: entityId, tenantId, deletedAt: null },
        select: { name: true },
      });
      return { name: company?.name };
      
    case 'Lead':
      const lead = await prisma.lead.findFirst({
        where: { id: entityId, tenantId, deletedAt: null },
        select: { firstName: true, lastName: true },
      });
      return { 
        name: lead ? `${lead.firstName} ${lead.lastName || ''}`.trim() : undefined 
      };
      
    case 'Opportunity':
      const opportunity = await prisma.opportunity.findFirst({
        where: { id: entityId, tenantId, deletedAt: null },
        select: { name: true },
      });
      return { name: opportunity?.name };
      
    case 'Task':
      const task = await prisma.task.findFirst({
        where: { id: entityId, tenantId, deletedAt: null },
        select: { title: true },
      });
      return { name: task?.title };
      
    default:
      return {};
  }
}

/**
 * Service para timeline de atividades
 */
export class TimelineService {
  /**
   * Obtém timeline de atividades relacionadas a uma entidade
   * 
   * Agrega tarefas, notas e logs de auditoria relacionados à entidade,
   * ordenados por data (mais recente primeiro).
   * 
   * @param entityType - Tipo de entidade (Contact, Company, Lead, Opportunity, Task)
   * @param entityId - ID da entidade (UUID)
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param pagination - Parâmetros de paginação (limit, offset)
   * @returns Timeline unificada com atividades ordenadas por data
   * @throws Error se entidade não existir ou não pertencer ao tenant
   */
  static async getTimeline(
    entityType: string,
    entityId: string,
    tenantId: string,
    pagination?: PaginationParams
  ): Promise<TimelineResponse> {
    // Validar entidade primeiro (antes de buscar atividades)
    await validateEntityExists(entityType, entityId, tenantId);

    // Valores padrão para paginação
    const limit = Math.min(pagination?.limit || 20, 100); // Máximo 100
    const offset = pagination?.offset || 0;

    // Buscar tarefas, notas e auditoria em paralelo (otimização de performance)
    const [tasks, notes, auditLogs] = await Promise.all([
      // Buscar tarefas relacionadas
      prisma.task.findMany({
        where: {
          tenantId,
          relatedEntityType: entityType,
          relatedEntityId: entityId,
          deletedAt: null, // Excluir soft deleted
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        // Não ordenar aqui - ordenação será feita após agregação
      }),
      
      // Buscar notas relacionadas
      prisma.note.findMany({
        where: {
          tenantId,
          relatedEntityType: entityType,
          relatedEntityId: entityId,
          deletedAt: null, // Excluir soft deleted
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      
      // Buscar logs de auditoria
      AuditLogService.getEntityHistory(entityType, entityId, tenantId),
    ]);

    // Converter para TimelineItem
    const taskItems = tasks.map(taskToTimelineItem);
    const noteItems = notes.map(noteToTimelineItem);
    const auditItems = auditLogs.map(auditLogToTimelineItem);

    // Combinar todos os itens
    const allItems: TimelineItem[] = [
      ...taskItems,
      ...noteItems,
      ...auditItems,
    ];

    // Ordenar por timestamp DESC (mais recente primeiro)
    // Usar getTime() para comparação numérica precisa
    allItems.sort((a, b) => {
      const timeA = a.timestamp.getTime();
      const timeB = b.timestamp.getTime();
      // Se timestamps são iguais, manter ordem estável (por tipo, depois por ID)
      if (timeA === timeB) {
        const typeOrder = { task: 1, note: 2, audit: 3 };
        const typeDiff = (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
        if (typeDiff !== 0) return typeDiff;
        return a.id.localeCompare(b.id);
      }
      return timeB - timeA; // DESC
    });

    // Aplicar paginação
    const total = allItems.length;
    const paginatedItems = allItems.slice(offset, offset + limit);

    // Obter informações da entidade (opcional, para contexto)
    const entityInfo = await getEntityInfo(entityType, entityId, tenantId);

    return {
      data: paginatedItems,
      pagination: {
        total,
        limit,
        offset,
      },
      entity: {
        type: entityType,
        id: entityId,
        name: entityInfo.name,
      },
    };
  }
}
