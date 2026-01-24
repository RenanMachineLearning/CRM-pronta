/**
 * Serviço para gerenciamento de regras de validação
 * 
 * Responsável por:
 * - Recuperar regras de validação por entidade e campo
 * - Gerenciar regras customizadas por tenant
 * - Fornecer regras padrão para campos comuns
 * - Implementar cache de regras para melhor performance
 */

import { prisma } from '../utils/prisma';
import { FieldValidationRules } from '../types/validation.types';
import { cacheManager } from '../cache/cacheManager';
import { generateCacheKey } from '../cache/cacheKeys';

// Regras de validação padrão para campos comuns
const DEFAULT_FIELD_RULES: Record<string, Record<string, FieldValidationRules>> = {
  Contact: {
    firstName: {
      required: true,
      type: 'text',
      maxLength: 100,
      minLength: 1
    },
    lastName: {
      required: false,
      type: 'text',
      maxLength: 100
    },
    email: {
      required: false,
      type: 'email',
      unique: true,
      maxLength: 255
    },
    phone: {
      required: false,
      type: 'phone',
      maxLength: 20
    },
    title: {
      required: false,
      type: 'text',
      maxLength: 100
    },
    company: {
      required: false,
      type: 'text',
      maxLength: 255
    },
    notes: {
      required: false,
      type: 'textarea',
      maxLength: 10000
    }
  },
  Company: {
    name: {
      required: true,
      type: 'text',
      maxLength: 255,
      minLength: 1
    },
    email: {
      required: false,
      type: 'email',
      maxLength: 255
    },
    phone: {
      required: false,
      type: 'phone',
      maxLength: 20
    },
    website: {
      required: false,
      type: 'url',
      maxLength: 255
    },
    industry: {
      required: false,
      type: 'text',
      maxLength: 100
    },
    size: {
      required: false,
      type: 'select',
      options: ['STARTUP', 'SMALL', 'MEDIUM', 'ENTERPRISE']
    },
    notes: {
      required: false,
      type: 'textarea',
      maxLength: 10000
    }
  },
  Lead: {
    firstName: {
      required: true,
      type: 'text',
      maxLength: 100,
      minLength: 1
    },
    lastName: {
      required: false,
      type: 'text',
      maxLength: 100
    },
    email: {
      required: false,
      type: 'email',
      unique: true,
      maxLength: 255
    },
    phone: {
      required: false,
      type: 'phone',
      maxLength: 20
    },
    company: {
      required: false,
      type: 'text',
      maxLength: 255
    },
    status: {
      required: false,
      type: 'select',
      options: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'APPOINTMENT_SET', 'DEMO_SCHEDULED', 'CLOSURE_SCHEDULED', 'CONVERTED', 'LOST']
    },
    source: {
      required: false,
      type: 'select',
      options: ['WEBSITE', 'REFERRAL', 'AD_CAMPAIGN', 'SOCIAL_MEDIA', 'EVENT', 'OTHER']
    },
    notes: {
      required: false,
      type: 'textarea',
      maxLength: 10000
    }
  },
  Opportunity: {
    name: {
      required: true,
      type: 'text',
      maxLength: 255,
      minLength: 1
    },
    value: {
      required: false,
      type: 'currency',
      minValue: 0
    },
    probability: {
      required: false,
      type: 'percentage',
      minValue: 0,
      maxValue: 100
    },
    closeDate: {
      required: false,
      type: 'date'
    },
    stageId: {
      required: true,
      type: 'relationship',
      relatedEntity: 'PipelineStage',
      relatedField: 'id'
    },
    status: {
      required: false,
      type: 'select',
      options: ['OPEN', 'CLOSED_WON', 'CLOSED_LOST']
    },
    notes: {
      required: false,
      type: 'textarea',
      maxLength: 10000
    }
  },
  Task: {
    title: {
      required: true,
      type: 'text',
      maxLength: 255,
      minLength: 1
    },
    description: {
      required: false,
      type: 'textarea',
      maxLength: 10000
    },
    dueDate: {
      required: false,
      type: 'datetime'
    },
    priority: {
      required: false,
      type: 'select',
      options: ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    },
    status: {
      required: false,
      type: 'select',
      options: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
    },
    relatedEntityType: {
      required: false,
      type: 'select',
      options: ['Contact', 'Company', 'Lead', 'Opportunity']
    },
    relatedEntityId: {
      required: false,
      type: 'text'
    }
  },
  Note: {
    content: {
      required: true,
      type: 'textarea',
      maxLength: 10000,
      minLength: 1
    },
    type: {
      required: false,
      type: 'select',
      options: ['COMMENT', 'CALL', 'MEETING', 'EMAIL', 'TASK']
    },
    relatedEntityType: {
      required: false,
      type: 'select',
      options: ['Contact', 'Company', 'Lead', 'Opportunity', 'Task']
    },
    relatedEntityId: {
      required: false,
      type: 'text'
    }
  }
};

/**
 * Serviço para gerenciamento de regras de validação
 */
export class ValidationRulesService {
  private static readonly CACHE_TTL = 60 * 10; // 10 minutos
  private static readonly CACHE_PREFIX = 'validation-rules';

  /**
   * Recupera as regras de validação para uma entidade e campos específicos
   */
  static async getValidationRules(
    entityType: string,
    tenantId: string,
    fieldNames?: string[]
  ): Promise<Record<string, FieldValidationRules>> {
    const cacheKey = generateCacheKey(`${this.CACHE_PREFIX}:${entityType}`, { tenantId, fieldNames }, tenantId);

    // Tenta obter do cache primeiro
    const cached = await cacheManager.get<Record<string, FieldValidationRules>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Combina regras padrão com regras customizadas
    const defaultRules = { ...(DEFAULT_FIELD_RULES[entityType] || {}) };
    const customRules = await this.getCustomFieldRules(entityType, tenantId, fieldNames);

    // Combina regras padrão com regras customizadas (as customizadas sobrescrevem as padrão)
    const combinedRules: Record<string, FieldValidationRules> = { ...defaultRules };

    for (const [fieldName, customRule] of Object.entries(customRules)) {
      combinedRules[fieldName] = { ...combinedRules[fieldName], ...customRule };
    }

    // Se foram solicitados campos específicos, filtra apenas esses
    if (fieldNames) {
      const filteredRules: Record<string, FieldValidationRules> = {};
      for (const fieldName of fieldNames) {
        if (combinedRules[fieldName]) {
          filteredRules[fieldName] = combinedRules[fieldName];
        } else {
          // Se o campo não existe nas regras padrão nem customizadas, cria uma regra básica
          filteredRules[fieldName] = { required: false, type: 'text' };
        }
      }
      await cacheManager.set(cacheKey, filteredRules, this.CACHE_TTL);
      return filteredRules;
    }

    await cacheManager.set(cacheKey, combinedRules, this.CACHE_TTL);
    return combinedRules;
  }

  /**
   * Recupera regras de campo customizadas para uma entidade e tenant
   */
  private static async getCustomFieldRules(
    entityType: string,
    tenantId: string,
    fieldNames?: string[]
  ): Promise<Record<string, FieldValidationRules>> {
    try {
      const whereClause: any = {
        entity: {
          name: entityType,
          tenantId: tenantId
        },
        tenantId: tenantId
      };

      if (fieldNames && fieldNames.length > 0) {
        whereClause.name = { in: fieldNames };
      }

      const customFields = await prisma.field.findMany({
        where: whereClause,
        include: {
          options: true
        }
      });

      const customRules: Record<string, FieldValidationRules> = {};

      for (const field of customFields) {
        const rule: FieldValidationRules = {
          required: field.required,
          unique: field.unique,
        };

        // Mapeia o tipo do Prisma para o tipo de validação
        switch (field.type) {
          case 'String':
            rule.type = 'text';
            break;
          case 'Int':
          case 'Float':
          case 'Decimal':
            rule.type = 'number';
            break;
          case 'DateTime':
            rule.type = 'datetime';
            break;
          case 'Boolean':
            rule.type = 'boolean';
            break;
          case 'Json':
            rule.type = 'textarea';
            break;
          default:
            rule.type = 'text';
        }

        // Adiciona opções para campos select
        if (field.options && field.options.length > 0) {
          rule.options = field.options.map(opt => opt.value);
        }

        // Adiciona informações de relacionamento se aplicável
        if (field.relationshipEntity) {
          rule.type = 'relationship';
          rule.relatedEntity = field.relationshipEntity;
          rule.relatedField = field.relationshipField || 'id';
        }

        customRules[field.name] = rule;
      }

      return customRules;
    } catch (error) {
      console.error(`Erro ao recuperar regras de campo customizadas para ${entityType} no tenant ${tenantId}:`, error);
      return {}; // Retorna objeto vazio em caso de erro
    }
  }

  /**
   * Valida compatibilidade entre regras de validação
   */
  static validateRuleCompatibility(
    rules: Record<string, FieldValidationRules>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [fieldName, rule] of Object.entries(rules)) {
      // Validações de tipo
      if (rule.type) {
        switch (rule.type) {
          case 'number':
            if (rule.minLength !== undefined) {
              errors.push(`Campo '${fieldName}': minLength não é aplicável para campos numéricos`);
            }
            if (rule.maxLength !== undefined) {
              errors.push(`Campo '${fieldName}': maxLength não é aplicável para campos numéricos`);
            }
            break;

          case 'boolean':
            if (rule.minLength !== undefined) {
              errors.push(`Campo '${fieldName}': minLength não é aplicável para campos booleanos`);
            }
            if (rule.maxLength !== undefined) {
              errors.push(`Campo '${fieldName}': maxLength não é aplicável para campos booleanos`);
            }
            if (rule.pattern) {
              errors.push(`Campo '${fieldName}': pattern não é aplicável para campos booleanos`);
            }
            break;

          case 'select':
          case 'multiselect':
            if (!rule.options || rule.options.length === 0) {
              errors.push(`Campo '${fieldName}': campos do tipo select/multiselect devem ter opções definidas`);
            }
            break;

          case 'email':
            if (rule.minLength !== undefined && rule.minLength < 5) {
              errors.push(`Campo '${fieldName}': email deve ter pelo menos 5 caracteres`);
            }
            break;

          case 'phone':
            if (rule.maxLength !== undefined && rule.maxLength < 7) {
              errors.push(`Campo '${fieldName}': phone deve ter pelo menos 7 dígitos`);
            }
            break;
        }
      }

      // Validações de valores
      if (rule.minValue !== undefined && rule.maxValue !== undefined) {
        if (rule.minValue > rule.maxValue) {
          errors.push(`Campo '${fieldName}': minValue (${rule.minValue}) não pode ser maior que maxValue (${rule.maxValue})`);
        }
      }

      if (rule.minLength !== undefined && rule.maxLength !== undefined) {
        if (rule.minLength > rule.maxLength) {
          errors.push(`Campo '${fieldName}': minLength (${rule.minLength}) não pode ser maior que maxLength (${rule.maxLength})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gera regras de validação padrão para um tipo de campo
   */
  static getDefaultRulesForType(
    fieldType: string,
    isRequired: boolean = false
  ): FieldValidationRules {
    const defaultRules: FieldValidationRules = {
      required: isRequired,
      type: fieldType as any
    };

    switch (fieldType) {
      case 'text':
        defaultRules.maxLength = 255;
        break;
      case 'number':
        defaultRules.minValue = 0;
        break;
      case 'email':
        defaultRules.maxLength = 255;
        break;
      case 'phone':
        defaultRules.maxLength = 20;
        break;
      case 'date':
      case 'datetime':
        // Sem regras específicas por padrão
        break;
      case 'boolean':
        // Sem regras específicas por padrão
        break;
      case 'select':
      case 'multiselect':
        // Opções devem ser definidas separadamente
        break;
      case 'textarea':
        defaultRules.maxLength = 10000;
        break;
      default:
        defaultRules.maxLength = 255;
    }

    return defaultRules;
  }

  /**
   * Limpa o cache de regras de validação para um tenant
   */
  static async clearCache(tenantId: string): Promise<void> {
    const tags = [`validation-rules-${tenantId}`];
    await cacheManager.invalidateByTags(tags);
  }

  /**
   * Mescla regras de validação (útil para combinar regras padrão com regras específicas de importação)
   */
  static mergeRules(
    baseRules: Record<string, FieldValidationRules>,
    overrideRules: Record<string, FieldValidationRules>
  ): Record<string, FieldValidationRules> {
    const mergedRules: Record<string, FieldValidationRules> = { ...baseRules };

    for (const [fieldName, overrideRule] of Object.entries(overrideRules)) {
      if (mergedRules[fieldName]) {
        // Mescla as regras, com as de override substituindo as base
        mergedRules[fieldName] = { ...mergedRules[fieldName], ...overrideRule };
      } else {
        // Adiciona nova regra
        mergedRules[fieldName] = overrideRule;
      }
    }

    return mergedRules;
  }
}