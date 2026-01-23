/**
 * Hook para gerenciar filtros avançados
 * Gerencia estado, validação e serialização de filtros
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Filter, FilterOperator, FieldMetadata } from '../types/filter';
import { getEntityFilterConfig, getFieldMetadata, getAvailableOperators } from '../services/filterConfigService';
import { validateFilter } from '../utils/filterValidation';
import { OPERATOR_LABELS, FilterOperator as Op } from '../types/filter';

export function useAdvancedFilters(
  entity: string,
  initialFilters: Filter[] = []
) {
  const [filters, setFilters] = useState<Filter[]>(initialFilters);
  
  // Sincronizar com initialFilters quando mudarem (ex: vêm da URL)
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);
  
  const config = useMemo(() => getEntityFilterConfig(entity), [entity]);
  
  const availableFields = useMemo(() => {
    return Object.values(config.fields);
  }, [config]);
  
  const addFilter = useCallback((filter: Filter) => {
    // Validar filtro antes de adicionar
    const error = validateFilter(filter, entity);
    if (error) {
      throw new Error(error.message);
    }
    
    setFilters(prev => [...prev, filter]);
  }, [entity]);
  
  const removeFilter = useCallback((index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);
  
  const updateFilter = useCallback((index: number, filter: Filter) => {
    // Validar antes de atualizar
    const error = validateFilter(filter, entity);
    if (error) {
      throw new Error(error.message);
    }
    
    setFilters(prev => prev.map((f, i) => i === index ? filter : f));
  }, [entity]);
  
  // Serializar para URL/API
  const serializeFilters = useCallback((): string => {
    return JSON.stringify(filters);
  }, [filters]);
  
  // Desserializar de URL/API
  const deserializeFilters = useCallback((json: string): Filter[] => {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        // Validar todos os filtros
        const validFilters: Filter[] = [];
        for (const filter of parsed) {
          const error = validateFilter(filter, entity);
          if (!error) {
            validFilters.push(filter);
          }
        }
        return validFilters;
      }
      return [];
    } catch {
      return [];
    }
  }, [entity]);
  
  // Formatar valor para exibição
  const formatFilterValue = useCallback((filter: Filter): string => {
    const fieldMeta = getFieldMetadata(entity, filter.field);
    if (!fieldMeta) return String(filter.value || '');
    
    // Operadores sem valor
    if (filter.operator === Op.IS_NULL || 
        filter.operator === Op.IS_NOT_NULL) {
      return '';
    }
    
    // BETWEEN: dois valores
    if (filter.operator === Op.BETWEEN && Array.isArray(filter.value)) {
      return `${filter.value[0]} - ${filter.value[1]}`;
    }
    
    // IN/NOT_IN: lista de valores
    if ((filter.operator === Op.IN || filter.operator === Op.NOT_IN) && 
        Array.isArray(filter.value)) {
      if (fieldMeta.type === 'enum' && fieldMeta.enumLabels) {
        return filter.value.map((v: string) => fieldMeta.enumLabels![v] || v).join(', ');
      }
      return filter.value.join(', ');
    }
    
    // Enum com labels
    if (fieldMeta.type === 'enum' && fieldMeta.enumLabels) {
      return fieldMeta.enumLabels[filter.value] || filter.value;
    }
    
    // Boolean
    if (fieldMeta.type === 'boolean') {
      return filter.value ? 'Sim' : 'Não';
    }
    
    // Data
    if (fieldMeta.type === 'date') {
      return new Date(filter.value).toLocaleDateString('pt-BR');
    }
    
    // Decimal/Number
    if (fieldMeta.type === 'decimal' || fieldMeta.type === 'number') {
      return new Intl.NumberFormat('pt-BR').format(Number(filter.value));
    }
    
    return String(filter.value || '');
  }, [entity]);
  
  // Obter label do operador
  const getOperatorLabel = useCallback((operator: FilterOperator): string => {
    return OPERATOR_LABELS[operator] || operator;
  }, []);
  
  return {
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    updateFilter,
    availableFields,
    serializeFilters,
    deserializeFilters,
    formatFilterValue,
    getOperatorLabel,
  };
}
