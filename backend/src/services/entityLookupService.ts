/**
 * Serviço para lookup de entidades
 * 
 * Permite buscar registros de uma entidade para uso em campos lookup,
 * retornando apenas id e label formatado.
 * 
 * IMPORTANTE - Implementação Preparatória:
 * - As tabelas de dados das entidades do sistema (Contact, Company, etc.) ainda não existem
 *   (serão criadas nas Etapas 5-7)
 * - A tabela EntityData também ainda não existe (será criada na seção 10)
 * - Esta implementação prepara a estrutura e retorna array vazio por enquanto
 * - Quando as tabelas existirem, a lógica já estará pronta para funcionar
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Interface para resposta de lookup
export interface LookupRecord {
  id: string;
  label: string;
}

// Interface para estratégia de label
interface LabelStrategy {
  fields: string[]; // Campos a usar (em ordem de prioridade)
  format?: (values: Record<string, any>) => string; // Função de formatação customizada
}

export class EntityLookupService {
  /**
   * Mapeamento de estratégias de label para entidades do sistema
   * 
   * Define como construir o label para cada entidade core.
   * Quando as tabelas existirem (Etapas 5-7), estas estratégias serão aplicadas.
   */
  private static readonly SYSTEM_ENTITY_LABEL_STRATEGIES: Record<string, LabelStrategy> = {
    Contact: {
      fields: ['firstName', 'lastName'],
      format: (values) => {
        const firstName = values.firstName || '';
        const lastName = values.lastName || '';
        if (firstName && lastName) {
          return `${firstName} ${lastName}`;
        }
        return firstName || lastName || '';
      },
    },
    Company: {
      fields: ['name'],
      format: (values) => values.name || '',
    },
    Lead: {
      fields: ['firstName', 'lastName'],
      format: (values) => {
        const firstName = values.firstName || '';
        const lastName = values.lastName || '';
        if (firstName && lastName) {
          return `${firstName} ${lastName}`;
        }
        return firstName || lastName || '';
      },
    },
    Opportunity: {
      fields: ['name'],
      format: (values) => values.name || '',
    },
    Task: {
      fields: ['title'],
      format: (values) => values.title || '',
    },
    Note: {
      fields: ['content'],
      format: (values) => {
        const content = values.content || '';
        // Primeiras 50 caracteres
        return content.length > 50 ? content.substring(0, 50) + '...' : content;
      },
    },
  };

  /**
   * Determina qual campo usar como label para uma entidade
   * 
   * @param entity - Entidade com campos
   * @returns Nome do campo a usar como label, ou null se não encontrar
   */
  static determineLabelField(entity: {
    name: string;
    isSystem: boolean;
    fields: Array<{ name: string; type: string; isDeleted: boolean }>;
  }): string | null {
    // Para entidades do sistema, usar estratégia mapeada
    if (entity.isSystem && this.SYSTEM_ENTITY_LABEL_STRATEGIES[entity.name]) {
      const strategy = this.SYSTEM_ENTITY_LABEL_STRATEGIES[entity.name];
      // Retornar primeiro campo da estratégia (será usado quando tabelas existirem)
      return strategy.fields[0] || null;
    }

    // Para entidades customizadas, usar primeiro campo do tipo "text" não deletado
    const textField = entity.fields.find(
      (field) => field.type === 'text' && !field.isDeleted
    );

    return textField?.name || null;
  }

  /**
   * Constrói label a partir de um registro
   * 
   * @param entity - Entidade com campos
   * @param record - Registro com dados
   * @param fields - Campos da entidade
   * @returns Label formatado
   */
  static buildLabelFromRecord(
    entity: { name: string; isSystem: boolean },
    record: Record<string, any>,
    fields: Array<{ name: string; type: string }>
  ): string {
    // Para entidades do sistema, usar estratégia mapeada
    if (entity.isSystem && this.SYSTEM_ENTITY_LABEL_STRATEGIES[entity.name]) {
      const strategy = this.SYSTEM_ENTITY_LABEL_STRATEGIES[entity.name];
      if (strategy.format) {
        return strategy.format(record);
      }
      // Se não tem format, usar primeiro campo
      const value = record[strategy.fields[0]] || '';
      return String(value);
    }

    // Para entidades customizadas, usar primeiro campo text
    const textField = fields.find((field) => field.type === 'text');
    if (textField) {
      const value = record[textField.name] || '';
      return String(value);
    }

    // Fallback: usar ID
    return record.id || '';
  }

  /**
   * Busca registros de uma entidade para lookup
   * 
   * IMPLEMENTAÇÃO PREPARATÓRIA:
   * - Retorna array vazio por enquanto, pois tabelas ainda não existem
   * - Estrutura pronta para quando tabelas existirem (Etapas 5-7 para sistema, seção 10 para customizadas)
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param entityId - ID da entidade
   * @param query - Termo de busca (opcional)
   * @param limit - Limite de resultados (opcional, default: 20, max: 100)
   * @returns Array de registros com id e label
   */
  static async lookupEntityRecords(
    tenantId: string,
    entityId: string,
    _query?: string, // Preparatório: será usado quando tabelas existirem
    _limit?: number // Preparatório: será usado quando tabelas existirem
  ): Promise<LookupRecord[]> {
    // Validar limite (preparatório: será usado quando tabelas existirem)
    // const maxLimit = Math.min(limit || 20, 100); // TODO: Usar quando tabelas existirem
    // const actualLimit = Math.max(1, maxLimit); // TODO: Usar quando tabelas existirem

    // Buscar entidade e validar que existe e pertence ao tenant
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
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
      throw new Error('Entidade não encontrada');
    }

    // Determinar estratégia de label (preparatório: será usado quando tabelas existirem)
    // const labelField = this.determineLabelField(entity); // TODO: Usar quando tabelas existirem

    // ============================================================================
    // IMPLEMENTAÇÃO PREPARATÓRIA - Retornar array vazio por enquanto
    // ============================================================================
    // 
    // Quando as tabelas existirem:
    // 
    // Para entidades do sistema (isSystem=true):
    // - Contact, Company, Lead, Opportunity, Task, Note terão tabelas próprias
    // - Query será: SELECT id, [campos da estratégia] FROM [tabela] WHERE tenantId = ? [AND labelField ILIKE ?]
    // - Construir label usando buildLabelFromRecord
    //
    // Para entidades customizadas (isSystem=false):
    // - Usar tabela EntityData (será criada na seção 10)
    // - Query será: SELECT id, data FROM entity_data WHERE tenantId = ? AND entityId = ? [AND data->>labelField ILIKE ?]
    // - Construir label a partir do JSON data
    //
    // Por enquanto, retornar array vazio mas estrutura está pronta
    // ============================================================================

    // TODO: Quando tabelas existirem, implementar busca real aqui
    // Exemplo para entidades do sistema:
    // if (entity.isSystem) {
    //   const tableName = entity.name.toLowerCase() + 's'; // contacts, companies, etc.
    //   const records = await prisma.$queryRawUnsafe(`
    //     SELECT id, ${labelField} FROM ${tableName}
    //     WHERE tenant_id = $1
    //     ${query ? `AND ${labelField} ILIKE $2` : ''}
    //     LIMIT $3
    //   `, tenantId, query ? `%${query}%` : null, actualLimit);
    //   return records.map(record => ({
    //     id: record.id,
    //     label: this.buildLabelFromRecord(entity, record, entity.fields)
    //   }));
    // }
    //
    // Exemplo para entidades customizadas:
    // else {
    //   const records = await prisma.entityData.findMany({
    //     where: {
    //       tenantId,
    //       entityId,
    //       ...(query && labelField ? {
    //         data: {
    //           path: [labelField],
    //           string_contains: query
    //         }
    //       } : {})
    //     },
    //     take: actualLimit
    //   });
    //   return records.map(record => ({
    //     id: record.id,
    //     label: this.buildLabelFromRecord(entity, record.data, entity.fields)
    //   }));
    // }

    // Por enquanto, retornar array vazio (implementação preparatória)
    return [];
  }

  /**
   * Obtém label de um registro específico
   * 
   * IMPLEMENTAÇÃO PREPARATÓRIA:
   * - Retorna estrutura preparatória por enquanto
   * - Funcionará quando tabelas existirem
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param entityId - ID da entidade
   * @param recordId - ID do registro
   * @returns Label do registro
   * @throws Error se entidade ou registro não encontrado
   */
  static async getEntityLabel(
    tenantId: string,
    entityId: string,
    recordId: string
  ): Promise<string> {
    // Buscar entidade e validar que existe e pertence ao tenant
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        fields: {
          where: {
            isDeleted: false, // Apenas campos não deletados
          },
        },
      },
    });

    if (!entity) {
      throw new Error('Entidade não encontrada');
    }

    // ============================================================================
    // IMPLEMENTAÇÃO PREPARATÓRIA - Retornar ID como fallback por enquanto
    // ============================================================================
    //
    // Quando as tabelas existirem:
    //
    // Para entidades do sistema:
    // - Buscar registro na tabela específica
    // - Construir label usando buildLabelFromRecord
    //
    // Para entidades customizadas:
    // - Buscar registro em EntityData
    // - Construir label a partir do JSON data
    //
    // TODO: Implementar busca real quando tabelas existirem
    // ============================================================================

    // Por enquanto, retornar ID como fallback (implementação preparatória)
    // Quando tabelas existirem, buscar registro e construir label
    return recordId;
  }
}

