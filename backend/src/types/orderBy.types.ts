/**
 * Tipos TypeScript para ordenação
 *
 * Define interfaces e configurações de campos ordenáveis
 * para todas as entidades do CRM.
 */

/**
 * Configuração de um campo ordenável
 */
export interface OrderableFieldConfig {
  field: string;
  type: 'string' | 'number' | 'date' | 'enum' | 'boolean';
  relation?: {
    model: string;
    field: string;
  };
}

/**
 * Configuração de ordenação para uma entidade
 */
export interface EntityOrderConfig {
  entity: string;
  fields: OrderableFieldConfig[];
  defaultField: string;
  defaultOrder: 'asc' | 'desc';
}

/**
 * Configuração de campos ordenáveis por entidade
 */
export const ENTITY_ORDER_CONFIGS: Record<string, EntityOrderConfig> = {
  contact: {
    entity: 'contact',
    defaultField: 'createdAt',
    defaultOrder: 'desc',
    fields: [
      { field: 'firstName', type: 'string' },
      { field: 'lastName', type: 'string' },
      { field: 'title', type: 'string' },
      { field: 'status', type: 'enum' },
      { field: 'companyId', type: 'string' },
      { field: 'createdAt', type: 'date' },
      { field: 'updatedAt', type: 'date' },
    ],
  },
  company: {
    entity: 'company',
    defaultField: 'createdAt',
    defaultOrder: 'desc',
    fields: [
      { field: 'name', type: 'string' },
      { field: 'website', type: 'string' },
      { field: 'industry', type: 'string' },
      { field: 'size', type: 'enum' },
      { field: 'status', type: 'enum' },
      { field: 'createdAt', type: 'date' },
      { field: 'updatedAt', type: 'date' },
    ],
  },
  lead: {
    entity: 'lead',
    defaultField: 'createdAt',
    defaultOrder: 'desc',
    fields: [
      { field: 'firstName', type: 'string' },
      { field: 'lastName', type: 'string' },
      { field: 'email', type: 'string' },
      { field: 'status', type: 'enum' },
      { field: 'source', type: 'string' },
      { field: 'converted', type: 'boolean' },
      { field: 'createdAt', type: 'date' },
      { field: 'updatedAt', type: 'date' },
    ],
  },
  opportunity: {
    entity: 'opportunity',
    defaultField: 'createdAt',
    defaultOrder: 'desc',
    fields: [
      { field: 'name', type: 'string' },
      { field: 'value', type: 'number' },
      { field: 'status', type: 'enum' },
      { field: 'closeDate', type: 'date' },
      { field: 'createdAt', type: 'date' },
      { field: 'updatedAt', type: 'date' },
    ],
  },
  task: {
    entity: 'task',
    defaultField: 'createdAt',
    defaultOrder: 'desc',
    fields: [
      { field: 'title', type: 'string' },
      { field: 'status', type: 'enum' },
      { field: 'dueDate', type: 'date' },
      { field: 'priority', type: 'enum' },
      { field: 'createdAt', type: 'date' },
      { field: 'updatedAt', type: 'date' },
    ],
  },
  note: {
    entity: 'note',
    defaultField: 'createdAt',
    defaultOrder: 'desc',
    fields: [
      { field: 'createdAt', type: 'date' },
      { field: 'updatedAt', type: 'date' },
    ],
  },
};
