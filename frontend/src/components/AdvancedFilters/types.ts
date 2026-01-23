/**
 * Tipos para componentes de filtros avançados
 */

import type { Filter, FieldMetadata, FilterOperator } from '../../types/filter';

export interface AdvancedFiltersProps {
  entity: 'contact' | 'company' | 'lead' | 'opportunity';
  filters: Filter[];
  onFiltersChange: (filters: Filter[]) => void;
  className?: string;
}

export interface FilterChipProps {
  filter: Filter;
  fieldLabel: string;
  operatorLabel: string;
  valueLabel: string;
  onRemove: () => void;
}

export interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (filter: Filter) => void;
  entity: string;
  existingFilters: Filter[]; // Para evitar duplicatas
}

export interface FilterFormProps {
  entity: string;
  onSave: (filter: Filter) => void;
  onCancel: () => void;
  existingFilters: Filter[];
}

export interface FilterValueInputProps {
  field: FieldMetadata;
  operator: FilterOperator;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}
