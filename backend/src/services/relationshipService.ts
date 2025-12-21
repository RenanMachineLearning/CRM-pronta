/**
 * Serviço para gestão de relacionamentos entre entidades
 * 
 * Lógica de negócio para operações CRUD de relacionamentos.
 * Regra de ouro: Controller orquestra, Service decide.
 * 
 * IMPORTANTE - Direcionalidade:
 * - O modelo assume sourceEntity → targetEntity (direcional)
 * - O nome do relacionamento (name) pertence ao lado sourceEntity
 * - Exemplo: se Contact (source) tem relacionamento "companies" com Company (target),
 *   o nome "companies" é do ponto de vista de Contact
 * - Isso evita ambiguidade futura (ex: UI tentando criar "reverse relation")
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Interface para criação de relacionamento
export interface CreateRelationshipData {
  sourceEntityId: string;
  targetEntityId: string;
  type: 'oneToMany' | 'manyToMany';
  name: string;
}

// Interface para resposta de relacionamento
export interface RelationshipResponse {
  id: string;
  type: string;
  name: string;
  sourceEntity: {
    id: string;
    name: string;
    label: string;
  };
  targetEntity: {
    id: string;
    name: string;
    label: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class RelationshipService {
  /**
   * Lista relacionamentos de uma entidade específica
   * 
   * Retorna relacionamentos onde a entidade é source ou target.
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param entityId - ID da entidade
   * @returns Array de relacionamentos
   */
  static async listRelationshipsByEntity(
    tenantId: string,
    entityId: string
  ): Promise<RelationshipResponse[]> {
    // Verificar se entidade existe e pertence ao tenant
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!entity) {
      throw new Error('Entidade não encontrada');
    }

    // Buscar relacionamentos onde a entidade é source ou target
    const [sourceRelationships, targetRelationships] = await Promise.all([
      prisma.relationship.findMany({
        where: {
          sourceEntityId: entityId,
          tenantId, // Isolamento multi-tenant obrigatório
        },
        include: {
          sourceEntity: {
            select: {
              id: true,
              name: true,
              label: true,
            },
          },
          targetEntity: {
            select: {
              id: true,
              name: true,
              label: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.relationship.findMany({
        where: {
          targetEntityId: entityId,
          tenantId, // Isolamento multi-tenant obrigatório
        },
        include: {
          sourceEntity: {
            select: {
              id: true,
              name: true,
              label: true,
            },
          },
          targetEntity: {
            select: {
              id: true,
              name: true,
              label: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    // Formatar resposta combinando source e target
    const relationships: RelationshipResponse[] = [
      ...sourceRelationships.map((rel) => ({
        id: rel.id,
        type: rel.type,
        name: rel.name,
        sourceEntity: {
          id: rel.sourceEntity.id,
          name: rel.sourceEntity.name,
          label: rel.sourceEntity.label,
        },
        targetEntity: {
          id: rel.targetEntity.id,
          name: rel.targetEntity.name,
          label: rel.targetEntity.label,
        },
        createdAt: rel.createdAt,
        updatedAt: rel.updatedAt,
      })),
      ...targetRelationships.map((rel) => ({
        id: rel.id,
        type: rel.type,
        name: rel.name,
        sourceEntity: {
          id: rel.sourceEntity.id,
          name: rel.sourceEntity.name,
          label: rel.sourceEntity.label,
        },
        targetEntity: {
          id: rel.targetEntity.id,
          name: rel.targetEntity.name,
          label: rel.targetEntity.label,
        },
        createdAt: rel.createdAt,
        updatedAt: rel.updatedAt,
      })),
    ];

    return relationships;
  }

  /**
   * Obtém relacionamento específico por ID
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param relationshipId - ID do relacionamento
   * @returns Relacionamento encontrado
   * @throws Error se relacionamento não encontrado ou não pertence ao tenant
   */
  static async getRelationshipById(
    tenantId: string,
    relationshipId: string
  ): Promise<RelationshipResponse> {
    const relationship = await prisma.relationship.findFirst({
      where: {
        id: relationshipId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        sourceEntity: {
          select: {
            id: true,
            name: true,
            label: true,
          },
        },
        targetEntity: {
          select: {
            id: true,
            name: true,
            label: true,
          },
        },
      },
    });

    if (!relationship) {
      throw new Error('Relacionamento não encontrado');
    }

    return {
      id: relationship.id,
      type: relationship.type,
      name: relationship.name,
      sourceEntity: {
        id: relationship.sourceEntity.id,
        name: relationship.sourceEntity.name,
        label: relationship.sourceEntity.label,
      },
      targetEntity: {
        id: relationship.targetEntity.id,
        name: relationship.targetEntity.name,
        label: relationship.targetEntity.label,
      },
      createdAt: relationship.createdAt,
      updatedAt: relationship.updatedAt,
    };
  }

  /**
   * Valida invariantes de relacionamento
   * 
   * Valida que:
   * - Entidades existem e pertencem ao tenant
   * - tenantId do relacionamento é igual ao tenant das entidades
   * 
   * @param sourceEntityId - ID da entidade origem
   * @param targetEntityId - ID da entidade destino
   * @param tenantId - ID do tenant
   * @throws Error se validação falhar
   */
  static async validateRelationshipInvariants(
    sourceEntityId: string,
    targetEntityId: string,
    tenantId: string
  ): Promise<void> {
    // Buscar entidades
    const [sourceEntity, targetEntity] = await Promise.all([
      prisma.entity.findFirst({
        where: {
          id: sourceEntityId,
          tenantId, // Isolamento multi-tenant obrigatório
        },
      }),
      prisma.entity.findFirst({
        where: {
          id: targetEntityId,
          tenantId, // Isolamento multi-tenant obrigatório
        },
      }),
    ]);

    // Validar que entidades existem
    if (!sourceEntity) {
      throw new Error('Entidade origem não encontrada');
    }

    if (!targetEntity) {
      throw new Error('Entidade destino não encontrada');
    }

    // Validar que ambas pertencem ao mesmo tenant
    if (sourceEntity.tenantId !== tenantId || targetEntity.tenantId !== tenantId) {
      throw new Error('Entidades devem pertencer ao mesmo tenant');
    }

    // Validar que tenantId do relacionamento é igual ao tenant das entidades
    if (sourceEntity.tenantId !== tenantId || targetEntity.tenantId !== tenantId) {
      throw new Error('tenantId do relacionamento deve ser igual ao tenant das entidades');
    }
  }

  /**
   * Cria novo relacionamento entre entidades
   * 
   * Validações:
   * - Entidades devem existir e pertencer ao tenant
   * - tenantId do relacionamento deve ser igual ao tenant das entidades
   * - Tipo deve ser "oneToMany" ou "manyToMany"
   * - Nome deve ser único por (tenantId, sourceEntityId, name)
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param data - Dados do relacionamento
   * @param requestingUserId - ID do usuário que está criando (opcional, para auditoria)
   * @returns Relacionamento criado
   * @throws Error se validação falhar
   */
  static async createRelationship(
    tenantId: string,
    data: CreateRelationshipData,
    requestingUserId?: string
  ): Promise<RelationshipResponse> {
    // Validar tipo
    if (data.type !== 'oneToMany' && data.type !== 'manyToMany') {
      throw new Error('Tipo de relacionamento deve ser "oneToMany" ou "manyToMany"');
    }

    // Validar invariantes (entidades existem, tenantId consistente)
    await this.validateRelationshipInvariants(
      data.sourceEntityId,
      data.targetEntityId,
      tenantId
    );

    // Validar unicidade do nome por (tenantId, sourceEntityId, name)
    const existingRelationship = await prisma.relationship.findFirst({
      where: {
        tenantId,
        sourceEntityId: data.sourceEntityId,
        name: data.name,
      },
    });

    if (existingRelationship) {
      throw new Error(
        `Já existe um relacionamento com o nome "${data.name}" para esta entidade origem`
      );
    }

    // Criar relacionamento
    const relationship = await prisma.relationship.create({
      data: {
        sourceEntityId: data.sourceEntityId,
        targetEntityId: data.targetEntityId,
        type: data.type,
        name: data.name,
        tenantId,
      },
      include: {
        sourceEntity: {
          select: {
            id: true,
            name: true,
            label: true,
          },
        },
        targetEntity: {
          select: {
            id: true,
            name: true,
            label: true,
          },
        },
      },
    });

    // Registrar auditoria (após commit bem-sucedido)
    if (requestingUserId) {
      // Não aguardar auditoria para não bloquear resposta
      const { logAudit } = await import('../utils/auditLog');
      logAudit('Relationship', relationship.id, 'create', requestingUserId, tenantId).catch(
        () => {
          // Erro já foi logado no helper, apenas evitar unhandled rejection
        }
      );
    }

    return {
      id: relationship.id,
      type: relationship.type,
      name: relationship.name,
      sourceEntity: {
        id: relationship.sourceEntity.id,
        name: relationship.sourceEntity.name,
        label: relationship.sourceEntity.label,
      },
      targetEntity: {
        id: relationship.targetEntity.id,
        name: relationship.targetEntity.name,
        label: relationship.targetEntity.label,
      },
      createdAt: relationship.createdAt,
      updatedAt: relationship.updatedAt,
    };
  }

  /**
   * Deleta relacionamento
   * 
   * IMPORTANTE: EntityRelationData (links entre registros) são removidos
   * automaticamente via CASCADE no Prisma. Nenhuma lógica adicional é necessária.
   * 
   * @param relationshipId - ID do relacionamento
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está deletando (opcional, para auditoria)
   * @returns true se deletado
   * @throws Error se relacionamento não encontrado ou não pertence ao tenant
   */
  static async deleteRelationship(
    relationshipId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<boolean> {
    // Verificar se relacionamento existe e pertence ao tenant
    const relationship = await prisma.relationship.findFirst({
      where: {
        id: relationshipId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!relationship) {
      throw new Error('Relacionamento não encontrado');
    }

    // Deletar relacionamento (CASCADE remove automaticamente EntityRelationData)
    await prisma.relationship.delete({
      where: {
        id: relationshipId,
      },
    });

    // Registrar auditoria (após commit bem-sucedido)
    if (requestingUserId) {
      // Não aguardar auditoria para não bloquear resposta
      const { logAudit } = await import('../utils/auditLog');
      logAudit('Relationship', relationshipId, 'delete', requestingUserId, tenantId).catch(
        () => {
          // Erro já foi logado no helper, apenas evitar unhandled rejection
        }
      );
    }

    return true;
  }
}

