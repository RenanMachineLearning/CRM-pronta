/**
 * Tipos para o componente DataTable
 */

import { ReactNode } from 'react';

export type ColumnPriority = 'high' | 'medium' | 'low';

export interface DataTableColumn<T = any> {
  key: string;
  title: string;
  render?: (item: T) => ReactNode;
  className?: string;
  priority?: ColumnPriority;
  hiddenOn?: ('mobile' | 'tablet')[];
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyState?: ReactNode;
  
  // Paginação
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
  
  // Ordenação
  sorting?: {
    sortBy: string | null;
    sortOrder: 'asc' | 'desc' | null;
    onSort: (field: string) => void;
  };
  
  // Ações
  onRowClick?: (item: T) => void;
  actions?: (item: T) => ReactNode;
  
  // Configurações
  striped?: boolean;
  hoverable?: boolean;
  viewMode?: 'auto' | 'table' | 'cards';
  stickyFirstColumn?: boolean;
  
  // Configuração de colunas
  columnStorageKey?: string;
  defaultVisibleColumns?: string[];
}

export interface MobileCardViewProps<T = any> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (item: T) => string;
  actions?: (item: T) => ReactNode;
  onRowClick?: (item: T) => void;
  emptyState?: ReactNode;
}

export interface TableViewProps<T = any> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  pagination?: DataTableProps<T>['pagination'];
  sorting?: DataTableProps<T>['sorting'];
  actions?: (item: T) => ReactNode;
  onRowClick?: (item: T) => void;
  emptyState?: ReactNode;
  striped?: boolean;
  hoverable?: boolean;
  stickyFirstColumn?: boolean;
}
