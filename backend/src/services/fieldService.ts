/**
 * Serviço para gestão de campos (metadados)
 * 
 * Lógica de negócio para operações CRUD de campos.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Tipos de campo suportados
export const SUPPORTED_FIELD_TYPES = ['text', 'number', 'date', 'boolean', 'lookup', 'select'] as const;
export type FieldType = typeof SUPPORTED_FIELD_TYPES[number];

// Interface para criação de campo
export interface CreateFieldData {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  defaultValue?: any;
  options?: Array<{ value: string; label: string; color?: string }>; // para select
  order?: number;
}

// Interface para atualização de campo
export interface UpdateFieldData {
  label?: string;
  required?: boolean;
  unique?: boolean;
  defaultValue?: any;
  options?: Array<{ value: string; label: string; color?: string }>;
  order?: number;
  // type não pode ser alterado
}

// Interface para resposta de campo
export interface FieldResponse {
  id: string;
  entityId: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  unique: boolean;
  defaultValue?: any;
  options?: any;
  tenantId: string;
  order: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  entity?: {
    id: string;
    name: string;
    label: string;
    isSystem: boolean;
  };
}

export class FieldService {
  /**
   * Lista campos de uma entidade ordenados por order
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param entityId - ID da entidade
   * @param includeDeleted - Se true, inclui campos deletados (soft delete)
   * @returns Array de campos ordenados por order
   */
  static async listFields(
    tenantId: string,
    entityId: string,
    includeDeleted: boolean = false
  ): Promise<FieldResponse[]> {
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

    // Construir where clause
    const where: any = {
      entityId,
      tenantId, // Isolamento multi-tenant obrigatório
    };

    // Filtrar campos deletados se não incluir
    if (!includeDeleted) {
      where.isDeleted = false;
    }

    const fields = await prisma.field.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }, // Ordenação secundária
      ],
    });

    return fields.map((field) => ({
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
    }));
  }

  /**
   * Obtém campo específico
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param fieldId - ID do campo
   * @returns Campo com informações da entidade
   * @throws Error se campo não encontrado ou não pertence ao tenant
   */
  static async getFieldById(tenantId: string, fieldId: string): Promise<FieldResponse> {
    const field = await prisma.field.findFirst({
      where: {
        id: fieldId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            label: true,
            isSystem: true,
          },
        },
      },
    });

    if (!field) {
      throw new Error('Campo não encontrado');
    }

    return {
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
      entity: {
        id: field.entity.id,
        name: field.entity.name,
        label: field.entity.label,
        isSystem: field.entity.isSystem,
      },
    };
  }

  /**
   * Cria novo campo customizado
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param entityId - ID da entidade
   * @param data - Dados do campo
   * @returns Campo criado
   * @throws Error se nome já existe, tipo inválido, ou entidade não encontrada
   */
  static async createField(
    tenantId: string,
    entityId: string,
    data: CreateFieldData
  ): Promise<FieldResponse> {
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

    // Validar tipo de campo
    if (!SUPPORTED_FIELD_TYPES.includes(data.type)) {
      throw new Error(`Tipo de campo inválido. Tipos suportados: ${SUPPORTED_FIELD_TYPES.join(', ')}`);
    }

    // Validar nome (deve ser alfanumérico e começar com letra)
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(data.name)) {
      throw new Error('Nome do campo deve começar com letra e conter apenas letras e números');
    }

    // Validar opções se tipo for select
    if (data.type === 'select') {
      if (!data.options || !Array.isArray(data.options) || data.options.length === 0) {
        throw new Error('Campos do tipo select devem ter pelo menos uma opção');
      }

      // Validar formato das opções
      const values = new Set<string>();
      for (const option of data.options) {
        if (!option.value || typeof option.value !== 'string') {
          throw new Error('Opções devem ter campo "value" do tipo string');
        }
        if (!option.label || typeof option.label !== 'string') {
          throw new Error('Opções devem ter campo "label" do tipo string');
        }
        if (values.has(option.value)) {
          throw new Error(`Valor duplicado nas opções: ${option.value}`);
        }
        values.add(option.value);
      }
    }

    // Calcular order se não fornecido (último campo + 1)
    let order = data.order;
    if (order === undefined) {
      const lastField = await prisma.field.findFirst({
        where: {
          entityId,
          tenantId,
        },
        orderBy: {
          order: 'desc',
        },
      });
      order = lastField ? lastField.order + 1 : 0;
    }

    try {
      const field = await prisma.field.create({
        data: {
          entityId,
          name: data.name,
          label: data.label,
          type: data.type,
          required: data.required || false,
          unique: data.unique || false,
          defaultValue: data.defaultValue !== undefined ? data.defaultValue : Prisma.JsonNull,
          options: data.options !== undefined ? data.options : Prisma.JsonNull,
          tenantId, // Garantir invariante: Field.tenantId === Entity.tenantId
          order,
          isDeleted: false,
        },
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              label: true,
              isSystem: true,
            },
          },
        },
      });

      // TypeScript não infere corretamente o tipo com include, então fazemos cast
      const fieldWithEntity = field as typeof field & {
        entity: {
          id: string;
          name: string;
          label: string;
          isSystem: boolean;
        };
      };

      return {
        id: fieldWithEntity.id,
        entityId: fieldWithEntity.entityId,
        name: fieldWithEntity.name,
        label: fieldWithEntity.label,
        type: fieldWithEntity.type,
        required: fieldWithEntity.required,
        unique: fieldWithEntity.unique,
        defaultValue: fieldWithEntity.defaultValue,
        options: fieldWithEntity.options,
        tenantId: fieldWithEntity.tenantId,
        order: fieldWithEntity.order,
        isDeleted: fieldWithEntity.isDeleted,
        createdAt: fieldWithEntity.createdAt,
        updatedAt: fieldWithEntity.updatedAt,
        entity: {
          id: fieldWithEntity.entity.id,
          name: fieldWithEntity.entity.name,
          label: fieldWithEntity.entity.label,
          isSystem: fieldWithEntity.entity.isSystem,
        },
      };
    } catch (error: any) {
      // Capturar erro de constraint única (nome duplicado)
      if (error.code === 'P2002') {
        throw new Error('Nome do campo já existe nesta entidade');
      }
      throw error;
    }
  }

  /**
   * Atualiza campo (tipo não pode ser alterado)
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param fieldId - ID do campo
   * @param data - Dados para atualização
   * @returns Campo atualizado
   * @throws Error se campo não encontrado, é do sistema, ou tentar alterar tipo
   */
  static async updateField(
    tenantId: string,
    fieldId: string,
    data: UpdateFieldData
  ): Promise<FieldResponse> {
    // Buscar campo primeiro para validar
    const existing = await prisma.field.findFirst({
      where: {
        id: fieldId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            label: true,
            isSystem: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error('Campo não encontrado');
    }

    // Validar que campo não é do sistema (via entity.isSystem)
    // Campos de entidades do sistema não podem ser alterados
    if (existing.entity.isSystem) {
      throw new Error('Campos de entidades do sistema não podem ser alterados');
    }

    // Validar opções se fornecido e campo for select
    if (data.options !== undefined && existing.type === 'select') {
      if (!Array.isArray(data.options) || data.options.length === 0) {
        throw new Error('Campos do tipo select devem ter pelo menos uma opção');
      }

      // Validar formato das opções
      const values = new Set<string>();
      for (const option of data.options) {
        if (!option.value || typeof option.value !== 'string') {
          throw new Error('Opções devem ter campo "value" do tipo string');
        }
        if (!option.label || typeof option.label !== 'string') {
          throw new Error('Opções devem ter campo "label" do tipo string');
        }
        if (values.has(option.value)) {
          throw new Error(`Valor duplicado nas opções: ${option.value}`);
        }
        values.add(option.value);
      }
    }

    // Preparar dados para atualização (não incluir type)
    const updateData: any = {};
    if (data.label !== undefined) updateData.label = data.label;
    if (data.required !== undefined) updateData.required = data.required;
    if (data.unique !== undefined) updateData.unique = data.unique;
    if (data.defaultValue !== undefined) updateData.defaultValue = data.defaultValue;
    if (data.options !== undefined) updateData.options = data.options;
    if (data.order !== undefined) updateData.order = data.order;

    const field = await prisma.field.update({
      where: {
        id: fieldId,
      },
      data: updateData,
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            label: true,
            isSystem: true,
          },
        },
      },
    });

    // TypeScript não infere corretamente o tipo com include, então fazemos cast
    const fieldWithEntity = field as typeof field & {
      entity: {
        id: string;
        name: string;
        label: string;
        isSystem: boolean;
      };
    };

    return {
      id: fieldWithEntity.id,
      entityId: fieldWithEntity.entityId,
      name: fieldWithEntity.name,
      label: fieldWithEntity.label,
      type: fieldWithEntity.type,
      required: fieldWithEntity.required,
      unique: fieldWithEntity.unique,
      defaultValue: fieldWithEntity.defaultValue,
      options: fieldWithEntity.options,
      tenantId: fieldWithEntity.tenantId,
      order: fieldWithEntity.order,
      isDeleted: fieldWithEntity.isDeleted,
      createdAt: fieldWithEntity.createdAt,
      updatedAt: fieldWithEntity.updatedAt,
      entity: {
        id: fieldWithEntity.entity.id,
        name: fieldWithEntity.entity.name,
        label: fieldWithEntity.entity.label,
        isSystem: fieldWithEntity.entity.isSystem,
      },
    };
  }

  /**
   * Soft delete do campo (marca isDeleted: true)
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param fieldId - ID do campo
   * @throws Error se campo não encontrado, é do sistema, ou não pertence ao tenant
   */
  static async deleteField(tenantId: string, fieldId: string): Promise<void> {
    // Buscar campo primeiro para validar
    const existing = await prisma.field.findFirst({
      where: {
        id: fieldId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            isSystem: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error('Campo não encontrado');
    }

    // Validar que campo não é do sistema (via entity.isSystem)
    if (existing.entity.isSystem) {
      throw new Error('Campos de entidades do sistema não podem ser deletados');
    }

    // Soft delete: marcar isDeleted como true
    await prisma.field.update({
      where: {
        id: fieldId,
      },
      data: {
        isDeleted: true,
      },
    });
  }

  /**
   * Obtém opções de um campo select
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param fieldId - ID do campo
   * @returns Array de opções do campo
   * @throws Error se campo não encontrado, está deletado, ou não é do tipo select
   */
  static async getFieldOptions(
    tenantId: string,
    fieldId: string
  ): Promise<Array<{ value: string; label: string; color?: string }>> {
    // Buscar campo e validar
    const field = await prisma.field.findFirst({
      where: {
        id: fieldId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!field) {
      throw new Error('Campo não encontrado');
    }

    // Validar que campo não está deletado
    if (field.isDeleted) {
      throw new Error('Campo deletado não pode ter opções acessadas');
    }

    // Validar que campo é do tipo select
    if (field.type !== 'select') {
      throw new Error('Campo não é do tipo select');
    }

    // Extrair e retornar opções
    const options = field.options as Array<{ value: string; label: string; color?: string }> | null;
    
    if (!options || !Array.isArray(options)) {
      return [];
    }

    return options;
  }

  /**
   * Atualiza opções de um campo select
   * 
   * IMPLEMENTAÇÃO PREPARATÓRIA:
   * - Valida apenas estrutura (formato, valores únicos)
   * - Validação de valores existentes será implementada quando tabelas existirem
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param fieldId - ID do campo
   * @param options - Array de opções: [{ value, label, color? }]
   * @param userId - ID do usuário (para auditoria)
   * @returns Array de opções atualizadas
   * @throws Error se campo não encontrado, está deletado, não é select, ou opções inválidas
   */
  static async updateFieldOptions(
    tenantId: string,
    fieldId: string,
    options: Array<{ value: string; label: string; color?: string }>,
    userId: string
  ): Promise<Array<{ value: string; label: string; color?: string }>> {
    // Buscar campo e validar
    const field = await prisma.field.findFirst({
      where: {
        id: fieldId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            label: true,
            isSystem: true,
          },
        },
      },
    });

    if (!field) {
      throw new Error('Campo não encontrado');
    }

    // Validar que campo não está deletado
    if (field.isDeleted) {
      throw new Error('Campo deletado não pode ter opções alteradas');
    }

    // Validar que campo é do tipo select
    if (field.type !== 'select') {
      throw new Error('Campo não é do tipo select');
    }

    // Validar formato das opções
    if (!Array.isArray(options) || options.length === 0) {
      throw new Error('Campos do tipo select devem ter pelo menos uma opção');
    }

    // Validar formato de cada opção
    const values = new Set<string>();
    for (const option of options) {
      if (!option.value || typeof option.value !== 'string') {
        throw new Error('Opções devem ter campo "value" do tipo string');
      }
      if (!option.label || typeof option.label !== 'string') {
        throw new Error('Opções devem ter campo "label" do tipo string');
      }
      if (values.has(option.value)) {
        throw new Error(`Valor duplicado nas opções: ${option.value}`);
      }
      values.add(option.value);
    }

    // ============================================================================
    // IMPLEMENTAÇÃO PREPARATÓRIA - Validação de valores existentes
    // ============================================================================
    //
    // Quando as tabelas existirem, validar que valores removidos não estão em uso:
    //
    // Para entidades do sistema (isSystem=true):
    // - Buscar registros na tabela específica onde campo tem valor que não está mais nas opções
    // - Query: SELECT COUNT(*) FROM [tabela] WHERE tenantId = ? AND [campo] NOT IN (?)
    // - Se count > 0, retornar erro listando valores inválidos
    //
    // Para entidades customizadas (isSystem=false):
    // - Buscar registros em EntityData onde campo no JSON tem valor que não está mais nas opções
    // - Query: SELECT COUNT(*) FROM entity_data WHERE tenantId = ? AND entityId = ? AND data->>'[campo]' NOT IN (?)
    // - Se count > 0, retornar erro listando valores inválidos
    //
    // Por enquanto, apenas validar estrutura (opções válidas, valores únicos)
    // ============================================================================

    // TODO: Quando tabelas existirem, implementar validação de valores existentes
    // Exemplo:
    // const oldOptions = (field.options as Array<{ value: string }>) || [];
    // const oldValues = new Set(oldOptions.map(opt => opt.value));
    // const newValues = new Set(options.map(opt => opt.value));
    // const removedValues = Array.from(oldValues).filter(v => !newValues.has(v));
    //
    // if (removedValues.length > 0) {
    //   // Buscar registros usando valores removidos
    //   if (field.entity.isSystem) {
    //     const tableName = field.entity.name.toLowerCase() + 's';
    //     const invalidRecords = await prisma.$queryRawUnsafe(
    //       `SELECT COUNT(*) as count FROM ${tableName} WHERE tenant_id = $1 AND ${field.name} = ANY($2)`,
    //       tenantId,
    //       removedValues
    //     );
    //     if (invalidRecords[0].count > 0) {
    //       throw new Error(`Não é possível remover opções que estão em uso: ${removedValues.join(', ')}`);
    //     }
    //   } else {
    //     const invalidRecords = await prisma.entityData.findMany({
    //       where: {
    //         tenantId,
    //         entityId: field.entityId,
    //         data: {
    //           path: [field.name],
    //           in: removedValues
    //         }
    //       }
    //     });
    //     if (invalidRecords.length > 0) {
    //       throw new Error(`Não é possível remover opções que estão em uso: ${removedValues.join(', ')}`);
    //     }
    //   }
    // }

    // Atualizar opções do campo
    await prisma.field.update({
      where: {
        id: fieldId,
      },
      data: {
        options: options,
      },
    });

    // Registrar auditoria (não bloqueia se falhar)
    try {
      const { logAudit } = await import('../utils/auditLog');
      await logAudit('Field', fieldId, 'update', userId, tenantId, {
        action: 'update_options',
        fieldName: field.name,
        fieldLabel: field.label,
      });
    } catch (error) {
      // Não bloquear se auditoria falhar
      console.error('Erro ao registrar auditoria:', error);
    }

    return options;
  }
}

