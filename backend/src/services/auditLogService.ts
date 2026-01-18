/**
 * Service para consulta de logs de auditoria
 * 
 * Fornece métodos para listar e consultar histórico de alterações
 * registradas na tabela AuditLog, com suporte a filtros e paginação.
 * 
 * Garante isolamento multi-tenant em todas as queries.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Enum de entidades auditáveis
 * 
 * Centralizado para facilitar extensão futura (Parte 10+)
 * sem necessidade de refatoração
 */
export enum AuditEntityEnum {
  User = 'User',
  Role = 'Role',
  Entity = 'Entity',
  Field = 'Field',
  Relationship = 'Relationship',
  Contact = 'Contact',
  Company = 'Company',
  ContactEmail = 'ContactEmail',
  ContactPhone = 'ContactPhone',
  Address = 'Address',
  Tag = 'Tag',
  Lead = 'Lead',
  Opportunity = 'Opportunity',
  Pipeline = 'Pipeline',
  PipelineStage = 'PipelineStage',
}

/**
 * Filtros para listagem de logs de auditoria
 */
export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string; // Validar contra AuditAction se fornecido
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Parâmetros de paginação
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Resposta de log de auditoria
 */
export interface AuditLogResponse {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName?: string | null; // Nome do usuário (via LEFT JOIN - pode ser null se usuário deletado)
  tenantId: string;
  changes: any | null;
  timestamp: Date;
}

/**
 * Service para consulta de logs de auditoria
 */
export class AuditLogService {
  /**
   * Lista logs de auditoria com filtros e paginação
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param filters - Filtros opcionais (entityType, entityId, userId, action, dateFrom, dateTo)
   * @param pagination - Parâmetros de paginação (limit, offset)
   * @returns Objeto com lista de logs e informações de paginação
   */
  static async listAuditLogs(
    tenantId: string,
    filters?: AuditLogFilters,
    pagination?: PaginationParams
  ): Promise<{
    data: AuditLogResponse[];
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
    };

    // Adicionar filtros se fornecidos
    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    // Filtros de data
    if (filters?.dateFrom || filters?.dateTo) {
      where.timestamp = {};
      if (filters.dateFrom) {
        where.timestamp.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.timestamp.lte = filters.dateTo;
      }
    }

    // Buscar logs com LEFT JOIN para incluir nome do usuário
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc', // Mais recente primeiro
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Formatar resposta
    const data: AuditLogResponse[] = logs.map((log) => ({
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      userId: log.userId,
      userName: log.user?.name || null, // LEFT JOIN - pode ser null se usuário deletado
      tenantId: log.tenantId,
      changes: log.changes,
      timestamp: log.timestamp,
    }));

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
   * Obtém histórico completo de alterações de uma entidade específica
   * 
   * @param entityType - Tipo de entidade (deve ser valor do enum AuditEntity)
   * @param entityId - ID da entidade
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @returns Array de logs ordenado por timestamp DESC (pode ser array vazio)
   */
  static async getEntityHistory(
    entityType: string,
    entityId: string,
    tenantId: string
  ): Promise<AuditLogResponse[]> {
    // Validar que entityType é válido
    const validEntityTypes = Object.values(AuditEntityEnum);
    if (!validEntityTypes.includes(entityType as AuditEntityEnum)) {
      throw new Error(`entityType inválido: ${entityType}. Valores válidos: ${validEntityTypes.join(', ')}`);
    }

    // Buscar logs com LEFT JOIN para incluir nome do usuário
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId, // Isolamento multi-tenant obrigatório
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc', // Mais recente primeiro
      },
    });

    // Formatar resposta
    return logs.map((log) => ({
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      userId: log.userId,
      userName: log.user?.name || null, // LEFT JOIN - pode ser null se usuário deletado
      tenantId: log.tenantId,
      changes: log.changes,
      timestamp: log.timestamp,
    }));
  }
}

