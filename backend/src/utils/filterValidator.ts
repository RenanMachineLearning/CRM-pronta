/**
 * Validador de filtros avançados
 *
 * Fornece funções para validar filtros antes de construir queries Prisma.
 * Valida campos, operadores, tipos de valores e enum values.
 */

import { Filter, FilterOperator, FilterError, ENTITY_FILTER_CONFIGS } from '../types/filter.types';
import { convertFilterValue } from './filterHelpers';

/**
 * Limite máximo de filtros por requisição
 */
const MAX_FILTERS = 10;

/**
 * Valida um filtro individual
 *
 * @param filter - Filtro a ser validado
 * @param entityType - Nome da entidade (lowercase)
 * @throws FilterError se filtro for inválido
 */
export function validateFilter(filter: Filter, entityType: string): void {
  // Validar estrutura básica
  if (!filter || typeof filter !== 'object') {
    throw new FilterError(
      'Filtro deve ser um objeto',
      'INVALID_FILTER_STRUCTURE',
      400
    );
  }

  if (!filter.field || typeof filter.field !== 'string') {
    throw new FilterError(
      'Campo "field" é obrigatório e deve ser uma string',
      'INVALID_FILTER_FIELD',
      400
    );
  }

  if (!filter.operator || typeof filter.operator !== 'string') {
    throw new FilterError(
      'Campo "operator" é obrigatório e deve ser uma string',
      'INVALID_FILTER_OPERATOR',
      400
    );
  }

  // Validar operador existe
  if (!Object.values(FilterOperator).includes(filter.operator as FilterOperator)) {
    throw new FilterError(
      `Operador "${filter.operator}" não é válido`,
      'INVALID_OPERATOR',
      400,
      { validOperators: Object.values(FilterOperator) }
    );
  }

  // Validar entidade existe
  const config = ENTITY_FILTER_CONFIGS[entityType];
  if (!config) {
    throw new FilterError(
      `Entidade "${entityType}" não suporta filtros avançados`,
      'ENTITY_NOT_FILTERABLE',
      400
    );
  }

  // Validar campo existe na entidade
  const fieldMetadata = config.fields[filter.field];
  if (!fieldMetadata) {
    throw new FilterError(
      `Campo "${filter.field}" não existe na entidade "${entityType}"`,
      'FIELD_NOT_FOUND',
      400,
      { availableFields: Object.keys(config.fields) }
    );
  }

  // Validar operador é válido para tipo do campo
  const validOperators = config.operatorsByFieldType[fieldMetadata.type];
  if (!validOperators || !validOperators.includes(filter.operator as FilterOperator)) {
    throw new FilterError(
      `Operador "${filter.operator}" não é válido para campo do tipo "${fieldMetadata.type}"`,
      'INVALID_OPERATOR_FOR_FIELD_TYPE',
      400,
      {
        field: filter.field,
        fieldType: fieldMetadata.type,
        validOperators,
      }
    );
  }

  // Validar valor (exceto para isNull/isNotNull)
  if (
    filter.operator !== FilterOperator.IS_NULL &&
    filter.operator !== FilterOperator.IS_NOT_NULL
  ) {
    if (filter.value === undefined || filter.value === null) {
      throw new FilterError(
        `Operador "${filter.operator}" requer um valor`,
        'MISSING_FILTER_VALUE',
        400
      );
    }

    // Validar valor específico por operador
    validateFilterValue(filter.value, fieldMetadata.type, filter.operator as FilterOperator);

    // Converter valor para tipo correto (validação de tipo)
    try {
      // Para operadores que usam arrays (BETWEEN, IN, NOT_IN), validar cada elemento
      if (
        filter.operator === FilterOperator.BETWEEN ||
        filter.operator === FilterOperator.IN ||
        filter.operator === FilterOperator.NOT_IN
      ) {
        if (Array.isArray(filter.value)) {
          for (const item of filter.value) {
            convertFilterValue(item, fieldMetadata.type, FilterOperator.EQUALS);
          }
        } else {
          // Se não for array, converter normalmente (irá falhar na validação)
          convertFilterValue(filter.value, fieldMetadata.type, filter.operator as FilterOperator);
        }
      } else {
        // Para outros operadores, converter normalmente
        convertFilterValue(filter.value, fieldMetadata.type, filter.operator as FilterOperator);
      }
    } catch (error: any) {
      if (error instanceof FilterError) {
        throw error;
      }
      throw new FilterError(
        `Erro ao converter valor: ${error.message}`,
        'VALUE_CONVERSION_ERROR',
        400,
        { originalError: error.message }
      );
    }

    // Validar enum values
    if (fieldMetadata.type === 'enum' && fieldMetadata.enumValues) {
      const value = filter.value;
      if (filter.operator === FilterOperator.IN || filter.operator === FilterOperator.NOT_IN) {
        // Para operadores IN/NOT_IN, validar cada valor do array
        if (!Array.isArray(value)) {
          throw new FilterError(
            `Operador "${filter.operator}" requer um array de valores`,
            'INVALID_ARRAY_VALUE',
            400
          );
        }
        for (const val of value) {
          if (!fieldMetadata.enumValues.includes(val)) {
            throw new FilterError(
              `Valor "${val}" não é um valor válido para enum. Valores válidos: ${fieldMetadata.enumValues.join(', ')}`,
              'INVALID_ENUM_VALUE',
              400,
              { value: val, validValues: fieldMetadata.enumValues }
            );
          }
        }
      } else {
        // Para outros operadores, validar valor único
        if (!fieldMetadata.enumValues.includes(value)) {
          throw new FilterError(
            `Valor "${value}" não é um valor válido para enum. Valores válidos: ${fieldMetadata.enumValues.join(', ')}`,
            'INVALID_ENUM_VALUE',
            400,
            { value, validValues: fieldMetadata.enumValues }
          );
        }
      }
    }
  } else {
    // Para isNull/isNotNull, valor deve ser undefined
    if (filter.value !== undefined) {
      throw new FilterError(
        `Operador "${filter.operator}" não deve ter valor`,
        'UNEXPECTED_FILTER_VALUE',
        400
      );
    }
  }
}

/**
 * Valida valor de filtro baseado no tipo e operador
 *
 * @param value - Valor a ser validado
 * @param fieldType - Tipo do campo
 * @param operator - Operador do filtro
 * @throws FilterError se valor for inválido
 */
export function validateFilterValue(value: any, fieldType: string, operator: FilterOperator): void {
  // Validar between requer array [min, max]
  if (operator === FilterOperator.BETWEEN) {
    if (!Array.isArray(value)) {
      throw new FilterError(
        'Operador "between" requer um array [min, max]',
        'INVALID_BETWEEN_VALUE',
        400
      );
    }
    if (value.length !== 2) {
      throw new FilterError(
        'Operador "between" requer um array com exatamente 2 elementos [min, max]',
        'INVALID_BETWEEN_ARRAY_LENGTH',
        400,
        { arrayLength: value.length }
      );
    }
    // Validar min <= max
    if (fieldType === 'number' || fieldType === 'decimal') {
      const min = Number(value[0]);
      const max = Number(value[1]);
      if (isNaN(min) || isNaN(max) || min > max) {
        throw new FilterError(
          'Operador "between" requer min <= max',
          'INVALID_BETWEEN_RANGE',
          400,
          { min: value[0], max: value[1] }
        );
      }
    } else if (fieldType === 'date') {
      const min = new Date(value[0]);
      const max = new Date(value[1]);
      if (isNaN(min.getTime()) || isNaN(max.getTime()) || min > max) {
        throw new FilterError(
          'Operador "between" requer min <= max para datas',
          'INVALID_BETWEEN_RANGE',
          400,
          { min: value[0], max: value[1] }
        );
      }
    }
  }

  // Validar in/notIn requer array
  if (operator === FilterOperator.IN || operator === FilterOperator.NOT_IN) {
    if (!Array.isArray(value)) {
      throw new FilterError(
        `Operador "${operator}" requer um array de valores`,
        'INVALID_ARRAY_VALUE',
        400
      );
    }
    if (value.length === 0) {
      throw new FilterError(
        `Operador "${operator}" requer um array não vazio`,
        'EMPTY_ARRAY_VALUE',
        400
      );
    }
  }

  // Validar contains/notContains requer string não vazia
  if (
    operator === FilterOperator.CONTAINS ||
    operator === FilterOperator.NOT_CONTAINS
  ) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new FilterError(
        `Operador "${operator}" requer uma string não vazia`,
        'INVALID_STRING_VALUE',
        400
      );
    }
  }
}

/**
 * Valida um array de filtros
 *
 * @param filters - Array de filtros a serem validados
 * @param entityType - Nome da entidade (lowercase)
 * @throws FilterError se algum filtro for inválido
 */
export function validateFilters(filters: Filter[], entityType: string): void {
  // Validar que é array
  if (!Array.isArray(filters)) {
    throw new FilterError(
      'Filtros devem ser um array',
      'INVALID_FILTERS_ARRAY',
      400
    );
  }

  // Validar limite de filtros
  if (filters.length === 0) {
    throw new FilterError(
      'Array de filtros não pode estar vazio',
      'EMPTY_FILTERS_ARRAY',
      400
    );
  }

  if (filters.length > MAX_FILTERS) {
    throw new FilterError(
      `Máximo de ${MAX_FILTERS} filtros permitidos por requisição`,
      'TOO_MANY_FILTERS',
      400,
      { maxFilters: MAX_FILTERS, providedFilters: filters.length }
    );
  }

  // Validar cada filtro individualmente
  const duplicateFields = new Set<string>();
  for (let i = 0; i < filters.length; i++) {
    const filter = filters[i];
    try {
      validateFilter(filter, entityType);
    } catch (error: any) {
      if (error instanceof FilterError) {
        // Adicionar índice do filtro ao erro
        throw new FilterError(
          `Erro no filtro ${i + 1}: ${error.message}`,
          error.code,
          error.statusCode,
          { ...error.details, filterIndex: i }
        );
      }
      throw error;
    }

    // Detectar campos duplicados (aviso, não erro)
    if (duplicateFields.has(filter.field)) {
      console.warn(
        `Aviso: Campo "${filter.field}" aparece múltiplas vezes nos filtros. Apenas o último será usado.`
      );
    }
    duplicateFields.add(filter.field);
  }
}
