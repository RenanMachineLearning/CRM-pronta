/**
 * Tipos para componente SortableTableHeader
 */

import type { SortingState } from '../../types/pagination.types';

export interface SortableTableHeaderProps {
  fieldName: string;
  displayName: string;
  currentSort: SortingState;
  onSort: (field: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}
