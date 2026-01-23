/**
 * Tipos para componente Pagination
 */

import type { PaginationState, ItemsPerPageOption } from '../../types/pagination.types';

export interface PaginationProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: ItemsPerPageOption) => void;
  className?: string;
  showItemsPerPage?: boolean;
  showGoToPage?: boolean;
}
