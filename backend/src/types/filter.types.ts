/**
 * Tipos TypeScript para filtros avançados
 *
 * Define operadores, interfaces e configurações de campos filtráveis
 * para todas as entidades do CRM.
 */

// Enum de operadores suportados (13 operadores)
export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'notEquals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  GREATER_THAN = 'greaterThan',
  LESS_THAN = 'lessThan',
  GREATER_THAN_OR_EQUAL = 'greaterThanOrEqual',
  LESS_THAN_OR_EQUAL = 'lessThanOrEqual',
  BETWEEN = 'between',
  IN = 'in',
  NOT_IN = 'notIn',
  IS_NULL = 'isNull',
  IS_NOT_NULL = 'isNotNull',
}

/**
 * Interface de um filtro individual
 */
export interface Filter {
  field: string;              // Campo a filtrar (ex: "firstName", "status", "tags.name")
  operator: FilterOperator;   // Operador a aplicar
  value?: any;                // Valor (opcional para isNull/isNotNull)
}

/**
 * Metadados de um campo filtrável
 */
export interface FieldMetadata {
  name: string;               // Nome do campo
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'decimal';
  enumValues?: string[];      // Valores válidos para campos enum
  isRelation?: boolean;       // Se está em relacionamento
  relation?: {
    model: string;            // Nome do modelo Prisma (ex: "tags", "emails")
    field: string;            // Campo no relacionamento (ex: "name", "email")
    relationType?: 'some' | 'every' | 'none'; // Tipo de relação (default: 'some')
  };
  isCustomField?: boolean;    // Se é campo customizado (EntityData) - futuro
}

/**
 * Configuração de filtros para uma entidade
 */
export interface EntityFilterConfig {
  entity: string;             // Nome da entidade (lowercase)
  fields: Record<string, FieldMetadata>;
  operatorsByFieldType: Record<string, FilterOperator[]>;
}

/**
 * Erro customizado para validação de filtros
 */
export class FilterError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, code: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = 'FilterError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, FilterError.prototype);
  }
}

/**
 * Configuração de campos filtráveis por entidade
 */
export const ENTITY_FILTER_CONFIGS: Record<string, EntityFilterConfig> = {
  contact: {
    entity: 'contact',
    fields: {
      firstName: { name: 'firstName', type: 'string' },
      lastName: { name: 'lastName', type: 'string' },
      title: { name: 'title', type: 'string' },
      gender: { name: 'gender', type: 'string' },
      notes: { name: 'notes', type: 'string' },
      status: {
        name: 'status',
        type: 'enum',
        enumValues: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
      },
      companyId: { name: 'companyId', type: 'string' },
      birthDate: { name: 'birthDate', type: 'date' },
      createdAt: { name: 'createdAt', type: 'date' },
      updatedAt: { name: 'updatedAt', type: 'date' },
      // Relacionamentos
      'tags.name': {
        name: 'tags.name',
        type: 'string',
        isRelation: true,
        relation: { model: 'tags', field: 'name', relationType: 'some' },
      },
      'emails.email': {
        name: 'emails.email',
        type: 'string',
        isRelation: true,
        relation: { model: 'emails', field: 'email', relationType: 'some' },
      },
      'phones.phone': {
        name: 'phones.phone',
        type: 'string',
        isRelation: true,
        relation: { model: 'phones', field: 'phone', relationType: 'some' },
      },
    },
    operatorsByFieldType: {
      string: [
        FilterOperator.CONTAINS,
        FilterOperator.NOT_CONTAINS,
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      number: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      date: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      enum: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      boolean: [FilterOperator.EQUALS, FilterOperator.NOT_EQUALS],
      decimal: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
    },
  },
  company: {
    entity: 'company',
    fields: {
      name: { name: 'name', type: 'string' },
      website: { name: 'website', type: 'string' },
      industry: { name: 'industry', type: 'string' },
      size: {
        name: 'size',
        type: 'enum',
        enumValues: ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'],
      },
      status: {
        name: 'status',
        type: 'enum',
        enumValues: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
      },
      createdAt: { name: 'createdAt', type: 'date' },
      updatedAt: { name: 'updatedAt', type: 'date' },
      // Relacionamentos
      'tags.name': {
        name: 'tags.name',
        type: 'string',
        isRelation: true,
        relation: { model: 'tags', field: 'name', relationType: 'some' },
      },
    },
    operatorsByFieldType: {
      string: [
        FilterOperator.CONTAINS,
        FilterOperator.NOT_CONTAINS,
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      number: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      date: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      enum: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      boolean: [FilterOperator.EQUALS, FilterOperator.NOT_EQUALS],
      decimal: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
    },
  },
  lead: {
    entity: 'lead',
    fields: {
      firstName: { name: 'firstName', type: 'string' },
      lastName: { name: 'lastName', type: 'string' },
      email: { name: 'email', type: 'string' },
      phone: { name: 'phone', type: 'string' },
      company: { name: 'company', type: 'string' },
      source: { name: 'source', type: 'string' },
      status: {
        name: 'status',
        type: 'enum',
        enumValues: ['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'],
      },
      converted: { name: 'converted', type: 'boolean' },
      convertedAt: { name: 'convertedAt', type: 'date' },
      convertedToContactId: { name: 'convertedToContactId', type: 'string' },
      convertedToOpportunityId: { name: 'convertedToOpportunityId', type: 'string' },
      createdAt: { name: 'createdAt', type: 'date' },
      updatedAt: { name: 'updatedAt', type: 'date' },
      // Relacionamentos
      'tags.name': {
        name: 'tags.name',
        type: 'string',
        isRelation: true,
        relation: { model: 'tags', field: 'name', relationType: 'some' },
      },
    },
    operatorsByFieldType: {
      string: [
        FilterOperator.CONTAINS,
        FilterOperator.NOT_CONTAINS,
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      number: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      date: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      enum: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      boolean: [FilterOperator.EQUALS, FilterOperator.NOT_EQUALS],
      decimal: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
    },
  },
  opportunity: {
    entity: 'opportunity',
    fields: {
      name: { name: 'name', type: 'string' },
      value: { name: 'value', type: 'decimal' }, // Prisma.Decimal
      currency: { name: 'currency', type: 'string' },
      status: {
        name: 'status',
        type: 'enum',
        enumValues: ['OPEN', 'WON', 'LOST', 'ARCHIVED'],
      },
      stageId: { name: 'stageId', type: 'string' },
      closeDate: { name: 'closeDate', type: 'date' },
      actualCloseDate: { name: 'actualCloseDate', type: 'date' },
      probability: { name: 'probability', type: 'number' },
      contactId: { name: 'contactId', type: 'string' },
      companyId: { name: 'companyId', type: 'string' },
      leadId: { name: 'leadId', type: 'string' },
      createdAt: { name: 'createdAt', type: 'date' },
      updatedAt: { name: 'updatedAt', type: 'date' },
      // Relacionamentos
      'tags.name': {
        name: 'tags.name',
        type: 'string',
        isRelation: true,
        relation: { model: 'tags', field: 'name', relationType: 'some' },
      },
    },
    operatorsByFieldType: {
      string: [
        FilterOperator.CONTAINS,
        FilterOperator.NOT_CONTAINS,
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      number: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      date: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      enum: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      boolean: [FilterOperator.EQUALS, FilterOperator.NOT_EQUALS],
      decimal: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
    },
  },
  task: {
    entity: 'task',
    fields: {
      title: { name: 'title', type: 'string' },
      description: { name: 'description', type: 'string' },
      type: {
        name: 'type',
        type: 'enum',
        enumValues: ['CALL', 'EMAIL', 'MEETING', 'OTHER'],
      },
      status: {
        name: 'status',
        type: 'enum',
        enumValues: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      },
      priority: {
        name: 'priority',
        type: 'enum',
        enumValues: ['LOW', 'MEDIUM', 'HIGH'],
      },
      dueDate: { name: 'dueDate', type: 'date' },
      completedAt: { name: 'completedAt', type: 'date' },
      assignedToId: { name: 'assignedToId', type: 'string' },
      createdById: { name: 'createdById', type: 'string' },
      relatedEntityType: { name: 'relatedEntityType', type: 'string' },
      relatedEntityId: { name: 'relatedEntityId', type: 'string' },
      createdAt: { name: 'createdAt', type: 'date' },
      updatedAt: { name: 'updatedAt', type: 'date' },
    },
    operatorsByFieldType: {
      string: [
        FilterOperator.CONTAINS,
        FilterOperator.NOT_CONTAINS,
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      number: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      date: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      enum: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      boolean: [FilterOperator.EQUALS, FilterOperator.NOT_EQUALS],
      decimal: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
    },
  },
  note: {
    entity: 'note',
    fields: {
      content: { name: 'content', type: 'string' },
      type: {
        name: 'type',
        type: 'enum',
        enumValues: ['NOTE', 'COMMENT', 'ANNOTATION'],
      },
      relatedEntityType: { name: 'relatedEntityType', type: 'string' },
      relatedEntityId: { name: 'relatedEntityId', type: 'string' },
      createdById: { name: 'createdById', type: 'string' },
      createdAt: { name: 'createdAt', type: 'date' },
      updatedAt: { name: 'updatedAt', type: 'date' },
    },
    operatorsByFieldType: {
      string: [
        FilterOperator.CONTAINS,
        FilterOperator.NOT_CONTAINS,
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      number: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      date: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      enum: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.IN,
        FilterOperator.NOT_IN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
      boolean: [FilterOperator.EQUALS, FilterOperator.NOT_EQUALS],
      decimal: [
        FilterOperator.EQUALS,
        FilterOperator.NOT_EQUALS,
        FilterOperator.GREATER_THAN,
        FilterOperator.LESS_THAN,
        FilterOperator.GREATER_THAN_OR_EQUAL,
        FilterOperator.LESS_THAN_OR_EQUAL,
        FilterOperator.BETWEEN,
        FilterOperator.IS_NULL,
        FilterOperator.IS_NOT_NULL,
      ],
    },
  },
};
