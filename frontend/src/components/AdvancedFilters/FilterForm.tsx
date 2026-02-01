/**
 * Formulário para criar/editar um filtro
 * Permite selecionar campo, operador e valor
 */

import { useState, useEffect } from 'react';
import { Select } from '../Select';
import { Button } from '../Button';
import { ErrorMessage } from '../ErrorMessage';
import { FilterValueInput } from './FilterValueInput';
import type { FilterFormProps } from './types';
import type { Filter, FilterOperator } from '../../types/filter';
import { FilterOperator as Op } from '../../types/filter';
import { getEntityFilterConfig, getFieldMetadata, getAvailableOperators } from '../../services/filterConfigService';
import { validateFilter } from '../../utils/filterValidation';
import { OPERATOR_LABELS } from '../../types/filter';

export function FilterForm({ entity, onSave, onCancel, existingFilters }: FilterFormProps) {
  const [fieldName, setFieldName] = useState<string>('');
  const [operator, setOperator] = useState<FilterOperator | ''>('');
  const [value, setValue] = useState<any>(undefined);
  const [error, setError] = useState<string | null>(null);
  
  const config = getEntityFilterConfig(entity);
  const availableFields = Object.values(config.fields);
  
  const selectedField = fieldName ? getFieldMetadata(entity, fieldName) : undefined;
  const availableOperatorsForField = fieldName ? getAvailableOperators(entity, fieldName) : [];
  
  // Resetar operador e valor quando campo mudar
  useEffect(() => {
    setOperator('');
    setValue(undefined);
    setError(null);
  }, [fieldName]);
  
  // Resetar valor quando operador mudar
  useEffect(() => {
    setValue(undefined);
    setError(null);
  }, [operator]);
  
  const handleSave = () => {
    if (!fieldName || !operator) {
      setError('Selecione campo e operador');
      return;
    }
    
    const filter: Filter = {
      field: fieldName,
      operator: operator as FilterOperator,
      value: value,
    };
    
    // Validar filtro
    const validationError = validateFilter(filter, entity);
    if (validationError) {
      setError(validationError.message);
      return;
    }
    
    // Verificar se já existe filtro idêntico
    const isDuplicate = existingFilters.some(
      f => f.field === filter.field && 
           f.operator === filter.operator && 
           JSON.stringify(f.value) === JSON.stringify(filter.value)
    );
    
    if (isDuplicate) {
      setError('Este filtro já está aplicado');
      return;
    }
    
    onSave(filter);
  };
  
  return (
    <div className="space-y-4">
      {error && <ErrorMessage message={error} />}
      
      {/* Seleção de campo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Campo *
        </label>
        <Select
          value={fieldName}
          onChange={(e) => setFieldName(e.target.value)}
          options={availableFields.map(field => ({
            value: field.name,
            label: field.label,
          }))}
          error={!fieldName && error ? 'Campo é obrigatório' : undefined}
        />
      </div>
      
      {/* Seleção de operador */}
      {fieldName && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operador *
          </label>
          <Select
            value={operator}
            onChange={(e) => setOperator(e.target.value as FilterOperator)}
            options={availableOperatorsForField.map(op => ({
              value: op,
              label: OPERATOR_LABELS[op],
            }))}
            error={!operator && error ? 'Operador é obrigatório' : undefined}
          />
        </div>
      )}
      
      {/* Input de valor */}
      {fieldName && operator && selectedField && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor
            {(operator !== Op.IS_NULL && operator !== Op.IS_NOT_NULL) && ' *'}
          </label>
          <FilterValueInput
            field={selectedField}
            operator={operator as FilterOperator}
            value={value}
            onChange={setValue}
            error={error && error.includes('Valor') ? error : undefined}
          />
        </div>
      )}
      
      {/* Botões */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="secondary"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!fieldName || !operator}
        >
          Adicionar Filtro
        </Button>
      </div>
    </div>
  );
}
