/**
 * Componente principal de filtros avançados
 * Gerencia lista de filtros aplicados e modal para adicionar novos
 */

import React, { useState, useEffect } from 'react';
import { useAdvancedFilters } from '../../hooks/useAdvancedFilters';
import { FilterChip } from './FilterChip';
import { FilterModal } from './FilterModal';
import { Button } from '../Button';
import type { AdvancedFiltersProps } from './types';
import type { Filter } from '../../types/filter';
import { getFieldMetadata } from '../../services/filterConfigService';

export function AdvancedFilters({ 
  entity, 
  filters: externalFilters, 
  onFiltersChange,
  className = '' 
}: AdvancedFiltersProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const {
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    availableFields,
    formatFilterValue,
    getOperatorLabel,
  } = useAdvancedFilters(entity, externalFilters);
  
  // Notificar mudanças para componente pai (evitar loops)
  useEffect(() => {
    // Só notificar se realmente mudou (evitar loops infinitos)
    const filtersStr = JSON.stringify(filters);
    const externalStr = JSON.stringify(externalFilters);
    if (filtersStr !== externalStr) {
      onFiltersChange(filters);
    }
  }, [filters, externalFilters, onFiltersChange]);
  
  const handleAddFilter = (filter: Filter) => {
    try {
      addFilter(filter);
      setIsModalOpen(false);
    } catch (error: any) {
      // Erro já foi mostrado no modal/form
      console.error('Erro ao adicionar filtro:', error);
    }
  };
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Filtros aplicados */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {filters.map((filter, index) => {
            const fieldMeta = getFieldMetadata(entity, filter.field);
            const fieldLabel = fieldMeta?.label || filter.field;
            const operatorLabel = getOperatorLabel(filter.operator);
            const valueLabel = formatFilterValue(filter);
            
            return (
              <FilterChip
                key={index}
                filter={filter}
                fieldLabel={fieldLabel}
                operatorLabel={operatorLabel}
                valueLabel={valueLabel}
                onRemove={() => removeFilter(index)}
              />
            );
          })}
          <Button
            variant="secondary"
            size="sm"
            onClick={clearFilters}
          >
            Limpar Filtros
          </Button>
        </div>
      )}
      
      {/* Botão adicionar filtro */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsModalOpen(true)}
      >
        + Adicionar Filtro
      </Button>
      
      {/* Modal */}
      {isModalOpen && (
        <FilterModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddFilter}
          entity={entity}
          existingFilters={filters}
        />
      )}
    </div>
  );
}
