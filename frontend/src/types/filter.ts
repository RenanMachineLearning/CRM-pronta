/**
 * Tipos de filtros avançados
 * Alinhados com backend/src/types/filter.types.ts
 */

// Enum de operadores (13 operadores)
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

// Interface de filtro individual
export interface Filter {
  field: string;              // Campo a filtrar (ex: "firstName", "tags.name")
  operator: FilterOperator;   // Operador
  value?: any;                // Valor (opcional para isNull/isNotNull)
}

// Metadados de campo filtrável
export interface FieldMetadata {
  name: string;
  label: string;             // Label para exibição
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'decimal';
  enumValues?: string[];      // Valores para enum
  enumLabels?: Record<string, string>; // Labels para valores enum
  isRelation?: boolean;
  relation?: {
    model: string;
    field: string;
  };
}

// Configuração de filtros por entidade
export interface EntityFilterConfig {
  entity: string;
  fields: Record<string, FieldMetadata>;
  operatorsByFieldType: Record<string, FilterOperator[]>;
}

// Labels de operadores em português
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  [FilterOperator.EQUALS]: 'é igual a',
  [FilterOperator.NOT_EQUALS]: 'é diferente de',
  [FilterOperator.CONTAINS]: 'contém',
  [FilterOperator.NOT_CONTAINS]: 'não contém',
  [FilterOperator.GREATER_THAN]: 'maior que',
  [FilterOperator.LESS_THAN]: 'menor que',
  [FilterOperator.GREATER_THAN_OR_EQUAL]: 'maior ou igual a',
  [FilterOperator.LESS_THAN_OR_EQUAL]: 'menor ou igual a',
  [FilterOperator.BETWEEN]: 'entre',
  [FilterOperator.IN]: 'está em',
  [FilterOperator.NOT_IN]: 'não está em',
  [FilterOperator.IS_NULL]: 'é nulo',
  [FilterOperator.IS_NOT_NULL]: 'não é nulo',
};
