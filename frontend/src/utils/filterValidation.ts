/**
 * Validação de filtros avançados
 * Baseada nas regras do backend
 */

import type { Filter } from '../types/filter';
import { FilterOperator } from '../types/filter';
import { getFieldMetadata, getAvailableOperators } from '../services/filterConfigService';

export interface FilterValidationError {
  field: string;
  message: string;
}

/**
 * Valida um filtro individual
 * 
 * @param filter - Filtro a ser validado
 * @param entity - Nome da entidade
 * @returns Erro de validação ou null se válido
 */
export function validateFilter(filter: Filter, entity: string): FilterValidationError | null {
  // Validar estrutura básica
  if (!filter || typeof filter !== 'object') {
    return { field: 'filter', message: 'Filtro deve ser um objeto' };
  }

  if (!filter.field || typeof filter.field !== 'string') {
    return { field: 'field', message: 'Campo é obrigatório e deve ser uma string' };
  }

  if (!filter.operator || typeof filter.operator !== 'string') {
    return { field: 'operator', message: 'Operador é obrigatório e deve ser uma string' };
  }

  // Validar campo existe
  const fieldMeta = getFieldMetadata(entity, filter.field);
  if (!fieldMeta) {
    return { field: 'field', message: `Campo "${filter.field}" não encontrado` };
  }

  // Validar operador existe no enum
  if (!Object.values(FilterOperator).includes(filter.operator as FilterOperator)) {
    return { field: 'operator', message: `Operador "${filter.operator}" não é válido` };
  }

  // Validar operador disponível para este campo
  const availableOps = getAvailableOperators(entity, filter.field);
  if (!availableOps.includes(filter.operator as FilterOperator)) {
    return { 
      field: 'operator', 
      message: `Operador "${filter.operator}" não disponível para campo "${fieldMeta.label}"` 
    };
  }

  // Validar valor (exceto isNull/isNotNull)
  if (filter.operator !== FilterOperator.IS_NULL && 
      filter.operator !== FilterOperator.IS_NOT_NULL) {
    if (filter.value === undefined || filter.value === null || filter.value === '') {
      return { field: 'value', message: 'Valor é obrigatório para este operador' };
    }

    // Validações específicas por tipo
    if (fieldMeta.type === 'enum' && fieldMeta.enumValues) {
      if (filter.operator === FilterOperator.IN || filter.operator === FilterOperator.NOT_IN) {
        if (!Array.isArray(filter.value)) {
          return { field: 'value', message: 'Deve ser uma lista de valores' };
        }
        const invalid = filter.value.filter((v: any) => !fieldMeta.enumValues!.includes(v));
        if (invalid.length > 0) {
          return { field: 'value', message: `Valores inválidos: ${invalid.join(', ')}` };
        }
      } else {
        if (!fieldMeta.enumValues.includes(filter.value)) {
          return { field: 'value', message: 'Valor inválido para este campo' };
        }
      }
    }

    // Validar BETWEEN
    if (filter.operator === FilterOperator.BETWEEN) {
      if (!Array.isArray(filter.value) || filter.value.length !== 2) {
        return { field: 'value', message: 'Deve ter dois valores (mínimo e máximo)' };
      }
      if (filter.value[0] === '' || filter.value[1] === '') {
        return { field: 'value', message: 'Ambos os valores são obrigatórios' };
      }
      // Comparar valores (após conversão se necessário)
      const min = fieldMeta.type === 'date' ? new Date(filter.value[0]) : Number(filter.value[0]);
      const max = fieldMeta.type === 'date' ? new Date(filter.value[1]) : Number(filter.value[1]);
      if (min > max) {
        return { field: 'value', message: 'Valor mínimo deve ser menor ou igual ao máximo' };
      }
    }

    // Validar IN/NOT_IN
    if (filter.operator === FilterOperator.IN || filter.operator === FilterOperator.NOT_IN) {
      if (!Array.isArray(filter.value) || filter.value.length === 0) {
        return { field: 'value', message: 'Deve ser uma lista com pelo menos um valor' };
      }
    }

    // Validar tipos numéricos
    if (fieldMeta.type === 'number' || fieldMeta.type === 'decimal') {
      if (filter.operator !== FilterOperator.BETWEEN && 
          filter.operator !== FilterOperator.IN && 
          filter.operator !== FilterOperator.NOT_IN) {
        if (isNaN(Number(filter.value))) {
          return { field: 'value', message: 'Valor deve ser um número' };
        }
      }
    }

    // Validar tipos de data
    if (fieldMeta.type === 'date') {
      if (filter.operator !== FilterOperator.BETWEEN) {
        const date = new Date(filter.value);
        if (isNaN(date.getTime())) {
          return { field: 'value', message: 'Valor deve ser uma data válida' };
        }
      }
    }

    // Validar boolean
    if (fieldMeta.type === 'boolean') {
      if (typeof filter.value !== 'boolean' && filter.value !== 'true' && filter.value !== 'false') {
        return { field: 'value', message: 'Valor deve ser verdadeiro ou falso' };
      }
    }
  }

  return null;
}

/**
 * Valida múltiplos filtros
 * 
 * @param filters - Array de filtros
 * @param entity - Nome da entidade
 * @returns Array de erros (vazio se todos válidos)
 */
export function validateFilters(filters: Filter[], entity: string): FilterValidationError[] {
  const errors: FilterValidationError[] = [];
  
  for (let i = 0; i < filters.length; i++) {
    const error = validateFilter(filters[i], entity);
    if (error) {
      errors.push({ ...error, field: `${error.field}[${i}]` });
    }
  }
  
  return errors;
}
