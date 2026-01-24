/**
 * Tipos para ordenação e paginação
 */

// Estado de ordenação
export type SortOrder = 'asc' | 'desc' | 'default';

export interface SortingState {
  sortBy: string | null;      // Campo de ordenação (null = ordenação padrão)
  sortOrder: SortOrder;       // Direção da ordenação
}

export interface SortingParams {
  orderBy?: string;           // Campo para ordenação (backend)
  order?: 'asc' | 'desc';     // Direção (backend - sem 'default')
}

// Estado de paginação
export interface PaginationState {
  page: number;               // Página atual (1-indexed)
  limit: number;              // Itens por página
  total: number;             // Total de registros
  totalPages: number;        // Total de páginas calculado
}

export interface PaginationParams {
  limit: number;              // Itens por página
  offset: number;            // Offset (backend)
}

// Opções de itens por página
export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
export type ItemsPerPageOption = typeof ITEMS_PER_PAGE_OPTIONS[number];
