/**
 * Componente de input de valor para filtros
 * Renderiza input apropriado baseado no tipo de campo e operador
 */

import { Input } from '../Input';
import { Select } from '../Select';
import type { FilterValueInputProps } from './types';
import { FilterOperator } from '../../types/filter';

export function FilterValueInput({ field, operator, value, onChange, error }: FilterValueInputProps) {
  // Operadores que não precisam de valor
  if (operator === FilterOperator.IS_NULL || operator === FilterOperator.IS_NOT_NULL) {
    return null;
  }
  
  // Operador BETWEEN: dois inputs
  if (operator === FilterOperator.BETWEEN) {
    const [min, max] = Array.isArray(value) ? value : ['', ''];
    return (
      <div className="grid grid-cols-2 gap-2">
        <Input
          type={field.type === 'date' ? 'date' : field.type === 'number' || field.type === 'decimal' ? 'number' : 'text'}
          value={min}
          onChange={(e) => onChange([e.target.value, max])}
          placeholder="Mínimo"
          error={error}
        />
        <Input
          type={field.type === 'date' ? 'date' : field.type === 'number' || field.type === 'decimal' ? 'number' : 'text'}
          value={max}
          onChange={(e) => onChange([min, e.target.value])}
          placeholder="Máximo"
        />
      </div>
    );
  }
  
  // Operadores IN/NOT_IN: múltiplos valores
  if (operator === FilterOperator.IN || operator === FilterOperator.NOT_IN) {
    // Para enum, usar select múltiplo seria melhor, mas por simplicidade usamos input de texto
    if (field.type === 'enum' && field.enumValues) {
      // Input de texto com valores separados por vírgula
      return (
        <Input
          value={Array.isArray(value) ? value.join(', ') : value || ''}
          onChange={(e) => {
            const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
            onChange(values);
          }}
          placeholder="Valores separados por vírgula"
          error={error}
        />
      );
    }
    
    // Para outros tipos, input de texto separado por vírgula
    return (
      <Input
        value={Array.isArray(value) ? value.join(', ') : value || ''}
        onChange={(e) => {
          const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
          onChange(values);
        }}
        placeholder="Valores separados por vírgula"
        error={error}
      />
    );
  }
  
  // Campo enum: Select
  if (field.type === 'enum' && field.enumValues) {
    return (
      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        options={field.enumValues.map(val => ({
          value: val,
          label: field.enumLabels?.[val] || val,
        }))}
        error={error}
      />
    );
  }
  
  // Campo boolean: Select sim/não
  if (field.type === 'boolean') {
    return (
      <Select
        value={value !== undefined ? String(value) : ''}
        onChange={(e) => onChange(e.target.value === 'true')}
        options={[
          { value: 'true', label: 'Sim' },
          { value: 'false', label: 'Não' },
        ]}
        error={error}
      />
    );
  }
  
  // Campo data: input date
  if (field.type === 'date') {
    return (
      <Input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        error={error}
      />
    );
  }
  
  // Campo numérico: input number
  if (field.type === 'number' || field.type === 'decimal') {
    return (
      <Input
        type="number"
        step={field.type === 'decimal' ? '0.01' : '1'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
        error={error}
      />
    );
  }
  
  // Campo texto: input text
  return (
    <Input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Digite o valor"
      error={error}
    />
  );
}
