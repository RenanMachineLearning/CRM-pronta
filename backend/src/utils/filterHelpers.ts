/**
 * Helpers auxiliares para filtros avançados
 *
 * Fornece funções utilitárias para:
 * - Conversão de valores (string → number, string → Date, etc.)
 * - Parse de campos em relacionamentos
 * - Obtenção de campos filtráveis
 */

import { Prisma } from '@prisma/client';
import { FilterOperator, FilterError, ENTITY_FILTER_CONFIGS } from '../types/filter.types';

/**
 * Converte valor de filtro para o tipo correto
 *
 * @param value - Valor a ser convertido
 * @param fieldType - Tipo do campo (string, number, date, boolean, enum, decimal)
 * @param operator - Operador do filtro
 * @returns Valor convertido
 * @throws FilterError se conversão falhar
 *
 * @example
 * convertFilterValue('123', 'number', FilterOperator.EQUALS) → 123
 * convertFilterValue('2024-01-01', 'date', FilterOperator.EQUALS) → Date('2024-01-01')
 * convertFilterValue('100.50', 'decimal', FilterOperator.EQUALS) → Prisma.Decimal('100.50')
 */
export function convertFilterValue(
  value: any,
  fieldType: string,
  operator: FilterOperator
): any {
  // Operadores isNull/isNotNull não precisam de valor
  if (operator === FilterOperator.IS_NULL || operator === FilterOperator.IS_NOT_NULL) {
    return undefined;
  }

  // Se valor já é do tipo correto, retornar
  if (fieldType === 'string' && typeof value === 'string') {
    return value;
  }
  if (fieldType === 'number' && typeof value === 'number') {
    return value;
  }
  if (fieldType === 'date' && value instanceof Date) {
    return value;
  }
  if (fieldType === 'boolean' && typeof value === 'boolean') {
    return value;
  }
  if (fieldType === 'decimal' && value instanceof Prisma.Decimal) {
    return value;
  }

  // Conversão de string para number
  if (fieldType === 'number' && typeof value === 'string') {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      throw new FilterError(
        `Valor "${value}" não é um número válido`,
        'INVALID_NUMBER_VALUE',
        400,
        { value, fieldType }
      );
    }
    return num;
  }

  // Conversão de array para number (para BETWEEN, IN, NOT_IN)
  if (fieldType === 'number' && Array.isArray(value) &&
      (operator === FilterOperator.BETWEEN || operator === FilterOperator.IN || operator === FilterOperator.NOT_IN)) {
    return value.map(item => {
      const num = Number(item);
      if (isNaN(num) || !isFinite(num)) {
        throw new FilterError(
          `Valor "${item}" não é um número válido`,
          'INVALID_NUMBER_VALUE',
          400,
          { value: item, fieldType }
        );
      }
      return num;
    });
  }

  // Conversão de string para Date
  if (fieldType === 'date' && typeof value === 'string') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new FilterError(
        `Valor "${value}" não é uma data válida (formato ISO 8601 esperado)`,
        'INVALID_DATE_VALUE',
        400,
        { value, fieldType }
      );
    }
    return date;
  }

  // Conversão de array para Date (para BETWEEN, IN, NOT_IN)
  if (fieldType === 'date' && Array.isArray(value) &&
      (operator === FilterOperator.BETWEEN || operator === FilterOperator.IN || operator === FilterOperator.NOT_IN)) {
    return value.map(item => {
      const date = new Date(item);
      if (isNaN(date.getTime())) {
        throw new FilterError(
          `Valor "${item}" não é uma data válida (formato ISO 8601 esperado)`,
          'INVALID_DATE_VALUE',
          400,
          { value: item, fieldType }
        );
      }
      return date;
    });
  }

  // Conversão de string para boolean
  if (fieldType === 'boolean' && typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    throw new FilterError(
      `Valor "${value}" não é um boolean válido (true/false)`,
      'INVALID_BOOLEAN_VALUE',
      400,
      { value, fieldType }
    );
  }

  // Conversão de string/number para Prisma.Decimal
  if (fieldType === 'decimal') {
    try {
      if (Array.isArray(value) && (operator === FilterOperator.BETWEEN || operator === FilterOperator.IN || operator === FilterOperator.NOT_IN)) {
        // Para operadores que usam arrays, converter cada elemento
        return value.map(item => new Prisma.Decimal(item));
      }
      if (typeof value === 'string' || typeof value === 'number') {
        return new Prisma.Decimal(value);
      }
      throw new FilterError(
        `Valor "${value}" não pode ser convertido para decimal`,
        'INVALID_DECIMAL_VALUE',
        400,
        { value, fieldType }
      );
    } catch (error: any) {
      throw new FilterError(
        `Erro ao converter valor para decimal: ${error.message}`,
        'INVALID_DECIMAL_VALUE',
        400,
        { value, fieldType }
      );
    }
  }

  // Para operadores que requerem array (between, in, notIn)
  if (
    (operator === FilterOperator.BETWEEN ||
      operator === FilterOperator.IN ||
      operator === FilterOperator.NOT_IN) &&
    Array.isArray(value)
  ) {
    // Converter cada elemento do array
    return value.map((item) => {
      if (fieldType === 'number') {
        return convertFilterValue(item, 'number', FilterOperator.EQUALS);
      }
      if (fieldType === 'date') {
        return convertFilterValue(item, 'date', FilterOperator.EQUALS);
      }
      if (fieldType === 'decimal') {
        return convertFilterValue(item, 'decimal', FilterOperator.EQUALS);
      }
      return item;
    });
  }

  // Se não foi possível converter, retornar valor original
  return value;
}

/**
 * Parseia campo em relacionamento
 *
 * @param field - Campo no formato "relation.field" (ex: "tags.name")
 * @returns Objeto com relation e field, ou null se não for relacionamento
 *
 * @example
 * parseRelationField('tags.name') → { relation: 'tags', field: 'name' }
 * parseRelationField('firstName') → null
 */
export function parseRelationField(field: string): { relation: string; field: string } | null {
  if (!field || typeof field !== 'string') {
    return null;
  }

  const parts = field.split('.');
  if (parts.length === 2) {
    return {
      relation: parts[0],
      field: parts[1],
    };
  }

  return null;
}

/**
 * Obtém lista de campos filtráveis para uma entidade
 *
 * @param entityType - Nome da entidade (lowercase)
 * @returns Array de nomes de campos filtráveis
 *
 * @example
 * getFilterableFields('contact') → ['firstName', 'lastName', 'status', 'tags.name', ...]
 */
export function getFilterableFields(entityType: string): string[] {
  const config = ENTITY_FILTER_CONFIGS[entityType];
  if (!config) {
    return [];
  }

  return Object.keys(config.fields);
}

/**
 * Verifica se uma entidade suporta filtros avançados
 *
 * @param entityType - Nome da entidade (lowercase)
 * @returns true se entidade tem configuração de filtros
 */
export function isFilterableEntity(entityType: string): boolean {
  return entityType in ENTITY_FILTER_CONFIGS;
}
