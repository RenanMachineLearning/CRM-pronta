/**
 * Serviço para gestão de entidades (metadados)
 * 
 * Lógica de negócio para operações CRUD de entidades.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { prisma } from '../utils/prisma';


// Interface para criação de entidade
export interface CreateEntityData {
  name: string;
  label: string;
}

// Interface para atualização de entidade
export interface UpdateEntityData {
  label: string; // name não pode ser alterado
}

// Interface para resposta de campo
export interface FieldResponse {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  unique: boolean;
  order: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
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

// Interface para resposta de entidade
export interface EntityResponse {
  id: string;
  name: string;
  label: string;
  tenantId: string;
  isSystem: boolean;
  fieldsCount?: number; // para listagem
  fields?: FieldResponse[]; // para GET por ID
  relationships?: RelationshipResponse[]; // para GET por ID
  createdAt: Date;
  updatedAt: Date;
}

export class EntityService {
  /**
   * Lista entidades do tenant com contagem de campos
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @returns Array de entidades com contagem de campos
   */
  static async listEntities(tenantId: string): Promise<EntityResponse[]> {
    const entities = await prisma.entity.findMany({
      where: {
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        _count: {
          select: {
            fields: true, // Contar campos
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Formatar resposta
    return entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      label: entity.label,
      tenantId: entity.tenantId,
      isSystem: entity.isSystem,
      fieldsCount: entity._count.fields,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }));
  }

  /**
   * Obtém entidade específica com campos e relacionamentos
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param entityId - ID da entidade
   * @returns Entidade com campos e relacionamentos
   * @throws Error se entidade não encontrada ou não pertence ao tenant
   */
  static async getEntityById(tenantId: string, entityId: string): Promise<EntityResponse> {
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        fields: {
          where: {
            isDeleted: false, // Excluir campos deletados (soft delete)
          },
          orderBy: {
            order: 'asc',
          },
        },
        sourceRelationships: {
          include: {
            targetEntity: {
              select: {
                id: true,
                name: true,
                label: true,
              },
            },
          },
        },
        targetRelationships: {
          include: {
            sourceEntity: {
              select: {
                id: true,
                name: true,
                label: true,
              },
            },
          },
        },
      },
    });

    if (!entity) {
      throw new Error('Entidade não encontrada');
    }

    // Formatar relacionamentos
    const relationships: RelationshipResponse[] = [
      ...entity.sourceRelationships.map((rel) => ({
        id: rel.id,
        type: rel.type,
        name: rel.name,
        sourceEntity: {
          id: entity.id,
          name: entity.name,
          label: entity.label,
        },
        targetEntity: {
          id: rel.targetEntity.id,
          name: rel.targetEntity.name,
          label: rel.targetEntity.label,
        },
        createdAt: rel.createdAt,
        updatedAt: rel.updatedAt,
      })),
      ...entity.targetRelationships.map((rel) => ({
        id: rel.id,
        type: rel.type,
        name: rel.name,
        sourceEntity: {
          id: rel.sourceEntity.id,
          name: rel.sourceEntity.name,
          label: rel.sourceEntity.label,
        },
        targetEntity: {
          id: entity.id,
          name: entity.name,
          label: entity.label,
        },
        createdAt: rel.createdAt,
        updatedAt: rel.updatedAt,
      })),
    ];

    return {
      id: entity.id,
      name: entity.name,
      label: entity.label,
      tenantId: entity.tenantId,
      isSystem: entity.isSystem,
      fields: entity.fields.map((field) => ({
        id: field.id,
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required,
        unique: field.unique,
        order: field.order,
        isDeleted: field.isDeleted,
        createdAt: field.createdAt,
        updatedAt: field.updatedAt,
      })),
      relationships,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Cria nova entidade customizada
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param data - Dados da entidade (name, label)
   * @returns Entidade criada
   * @throws Error se nome já existe no tenant (constraint violation)
   */
  static async createEntity(
    tenantId: string,
    data: CreateEntityData
  ): Promise<EntityResponse> {
    try {
      // Validar nome (deve ser alfanumérico e começar com letra)
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(data.name)) {
        throw new Error('Nome da entidade deve começar com letra e conter apenas letras e números');
      }

      const entity = await prisma.entity.create({
        data: {
          name: data.name,
          label: data.label,
          tenantId,
          isSystem: false, // Entidades criadas via API são customizadas
        },
      });

      return {
        id: entity.id,
        name: entity.name,
        label: entity.label,
        tenantId: entity.tenantId,
        isSystem: entity.isSystem,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      };
    } catch (error: any) {
      // Capturar erro de constraint única (nome duplicado)
      if (error.code === 'P2002') {
        throw new Error('Nome da entidade já existe neste tenant');
      }
      throw error;
    }
  }

  /**
   * Atualiza entidade (apenas label, name não pode ser alterado)
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param entityId - ID da entidade
   * @param data - Dados para atualização (apenas label)
   * @returns Entidade atualizada
   * @throws Error se entidade não encontrada, é do sistema, ou não pertence ao tenant
   */
  static async updateEntity(
    tenantId: string,
    entityId: string,
    data: UpdateEntityData
  ): Promise<EntityResponse> {
    // Buscar entidade primeiro para validar
    const existing = await prisma.entity.findFirst({
      where: {
        id: entityId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!existing) {
      throw new Error('Entidade não encontrada');
    }

    // Validar que entidade não é do sistema
    if (existing.isSystem) {
      throw new Error('Entidades do sistema não podem ser alteradas');
    }

    // Atualizar apenas label
    const entity = await prisma.entity.update({
      where: {
        id: entityId,
      },
      data: {
        label: data.label,
      },
    });

    return {
      id: entity.id,
      name: entity.name,
      label: entity.label,
      tenantId: entity.tenantId,
      isSystem: entity.isSystem,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Deleta entidade customizada
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param entityId - ID da entidade
   * @throws Error se entidade não encontrada, é do sistema, tem campos associados, ou não pertence ao tenant
   */
  static async deleteEntity(tenantId: string, entityId: string): Promise<void> {
    // Buscar entidade primeiro para validar
    const existing = await prisma.entity.findFirst({
      where: {
        id: entityId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        _count: {
          select: {
            fields: true, // Contar campos associados
          },
        },
      },
    });

    if (!existing) {
      throw new Error('Entidade não encontrada');
    }

    // Validar que entidade não é do sistema
    if (existing.isSystem) {
      throw new Error('Entidades do sistema não podem ser deletadas');
    }

    // Validar que não há campos associados
    if (existing._count.fields > 0) {
      throw new Error('Não é possível deletar entidade com campos associados. Delete os campos primeiro.');
    }

    // Deletar entidade (cascade deleta campos automaticamente via Prisma)
    await prisma.entity.delete({
      where: {
        id: entityId,
      },
    });
  }

  /**
   * Busca entidade por nome
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param name - Nome da entidade (ex: "Contact", "Company")
   * @returns Entidade encontrada com campos
   * @throws Error se entidade não encontrada ou não pertence ao tenant
   */
  static async getEntityByName(tenantId: string, name: string): Promise<EntityResponse> {
    const entity = await prisma.entity.findFirst({
      where: {
        name,
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        fields: {
          where: {
            isDeleted: false, // Apenas campos não deletados
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!entity) {
      throw new Error(`Entidade '${name}' não encontrada`);
    }

    return {
      id: entity.id,
      name: entity.name,
      label: entity.label,
      tenantId: entity.tenantId,
      isSystem: entity.isSystem,
      fields: entity.fields.map((field) => ({
        id: field.id,
        entityId: field.entityId,
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required,
        unique: field.unique,
        defaultValue: field.defaultValue,
        options: field.options,
        tenantId: field.tenantId,
        order: field.order,
        isDeleted: field.isDeleted,
        createdAt: field.createdAt,
        updatedAt: field.updatedAt,
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

