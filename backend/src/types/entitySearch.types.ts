/**
 * Tipos TypeScript para busca por entidade
 *
 * Define configuração de campos pesquisáveis para cada entidade.
 * Usado para construir condições de busca dinamicamente.
 */

/**
 * Configuração de campo pesquisável
 */
export interface SearchableFieldConfig {
  field: string;              // Nome do campo na entidade
  type: 'string' | 'number' | 'date';
  relation?: {               // Se campo está em relacionamento
    model: string;            // Nome do modelo Prisma (ex: "emails")
    field: string;            // Campo no relacionamento (ex: "email")
  };
}

/**
 * Configuração de busca por entidade
 */
export interface EntitySearchConfig {
  entity: string;            // Nome da entidade (ex: "contact")
  fields: SearchableFieldConfig[]; // Campos pesquisáveis
}

/**
 * Mapeamento de configuração de busca por entidade
 */
export const ENTITY_SEARCH_CONFIGS: Record<string, EntitySearchConfig> = {
  contact: {
    entity: 'contact',
    fields: [
      { field: 'firstName', type: 'string' },
      { field: 'lastName', type: 'string' },
      { field: 'title', type: 'string' },
      { field: 'notes', type: 'string' },
      {
        field: 'email',
        type: 'string',
        relation: { model: 'emails', field: 'email' },
      },
      {
        field: 'phone',
        type: 'string',
        relation: { model: 'phones', field: 'phone' },
      },
    ],
  },
  company: {
    entity: 'company',
    fields: [
      { field: 'name', type: 'string' },
      { field: 'website', type: 'string' },
      { field: 'industry', type: 'string' },
    ],
  },
  lead: {
    entity: 'lead',
    fields: [
      { field: 'firstName', type: 'string' },
      { field: 'lastName', type: 'string' },
      { field: 'email', type: 'string' },
      { field: 'phone', type: 'string' },
      { field: 'company', type: 'string' },
      { field: 'source', type: 'string' },
    ],
  },
  opportunity: {
    entity: 'opportunity',
    fields: [
      { field: 'name', type: 'string' },
    ],
  },
};
