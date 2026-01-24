/**
 * Builder de queries Prisma para filtros avançados
 *
 * Constrói objetos `where` do Prisma a partir de arrays de filtros.
 * Suporta todos os operadores, campos em relacionamentos e tipos especiais (Decimal, Date).
 */

import { Prisma } from '@prisma/client';
import { Filter, FilterOperator, ENTITY_FILTER_CONFIGS } from '../types/filter.types';
import { convertFilterValue, parseRelationField } from './filterHelpers';

/**
 * Constrói objeto `where` do Prisma a partir de array de filtros
 *
 * @param filters - Array de filtros [{field, operator, value}, ...]
 * @param entityType - Nome da entidade (lowercase: 'contact', 'company', etc.)
 * @returns Objeto where para Prisma
 *
 * @example
 * buildFilterQuery([
 *   { field: 'status', operator: 'equals', value: 'ACTIVE' },
 *   { field: 'createdAt', operator: 'greaterThan', value: '2024-01-01' }
 * ], 'contact')
 *
 * → {
 *     status: { equals: 'ACTIVE' },
 *     createdAt: { gt: new Date('2024-01-01') }
 *   }
 */
export function buildFilterQuery(filters: Filter[], entityType: string): any {
  const config = ENTITY_FILTER_CONFIGS[entityType];
  if (!config) {
    throw new Error(`Entidade "${entityType}" não suporta filtros avançados`);
  }

  const where: any = {};

  for (const filter of filters) {
    const fieldMetadata = config.fields[filter.field];
    if (!fieldMetadata) {
      continue; // Campo não encontrado (já validado antes)
    }

    // Converter valor para tipo correto
    let convertedValue: any;
    try {
      convertedValue = convertFilterValue(
        filter.value,
        fieldMetadata.type,
        filter.operator
      );
    } catch (error) {
      // Erro de conversão (já validado antes, mas garantir)
      continue;
    }

    // Construir condição Prisma
    const condition = buildCondition(filter.operator, convertedValue, fieldMetadata.type);

    // Verificar se campo está em relacionamento
    const relationInfo = parseRelationField(filter.field);
    if (relationInfo && fieldMetadata.isRelation && fieldMetadata.relation) {
      // Campo em relacionamento (ex: tags.name)
      const relationType = fieldMetadata.relation.relationType || 'some';
      where[relationInfo.relation] = {
        [relationType]: {
          [relationInfo.field]: condition,
        },
      };
    } else {
      // Campo direto na entidade
      where[filter.field] = condition;
    }
  }

  return where;
}

/**
 * Constrói condição Prisma para um operador
 *
 * @param operator - Operador do filtro
 * @param value - Valor convertido
 * @param fieldType - Tipo do campo
 * @returns Condição Prisma
 */
function buildCondition(
  operator: FilterOperator,
  value: any,
  fieldType: string
): any {
  switch (operator) {
    case FilterOperator.EQUALS:
      return { equals: value };

    case FilterOperator.NOT_EQUALS:
      return { not: value };

    case FilterOperator.CONTAINS:
      return {
        contains: value,
        mode: 'insensitive', // Case-insensitive
      };

    case FilterOperator.NOT_CONTAINS:
      return {
        not: {
          contains: value,
          mode: 'insensitive',
        },
      };

    case FilterOperator.GREATER_THAN:
      return { gt: value };

    case FilterOperator.LESS_THAN:
      return { lt: value };

    case FilterOperator.GREATER_THAN_OR_EQUAL:
      return { gte: value };

    case FilterOperator.LESS_THAN_OR_EQUAL:
      return { lte: value };

    case FilterOperator.BETWEEN:
      // value é array [min, max]
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error('Operador "between" requer array [min, max]');
      }
      return {
        gte: value[0],
        lte: value[1],
      };

    case FilterOperator.IN:
      // value é array
      if (!Array.isArray(value)) {
        throw new Error('Operador "in" requer array de valores');
      }
      return { in: value };

    case FilterOperator.NOT_IN:
      // value é array
      if (!Array.isArray(value)) {
        throw new Error('Operador "notIn" requer array de valores');
      }
      return { notIn: value };

    case FilterOperator.IS_NULL:
      return { is: null };

    case FilterOperator.IS_NOT_NULL:
      return { isNot: null };

    default:
      throw new Error(`Operador "${operator}" não suportado`);
  }
}
