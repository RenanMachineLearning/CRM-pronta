/**
 * Tipos para componentes de busca global
 */

import type { GlobalSearchResponse, SearchResult } from '../../types/search';

export interface GlobalSearchProps {
  placeholder?: string;
  autoFocus?: boolean;
  onSelectResult?: (result: SearchResult) => void;
  className?: string;
}

export interface GlobalSearchDropdownProps {
  results: GlobalSearchResponse['results'] | null;
  loading: boolean;
  error: string | null;
  query: string;
  onSelectResult: (result: SearchResult) => void;
  onViewAll: () => void;
  onClose: () => void;
}

export interface SearchResultItemProps {
  result: SearchResult;
  onClick: () => void;
  query: string; // Para highlight do termo
}

export interface SearchResultGroupProps {
  entityType: 'contact' | 'company' | 'lead' | 'opportunity';
  results: SearchResult[];
  onSelectResult: (result: SearchResult) => void;
  maxResults?: number; // Default: 5
  query: string; // Para highlight do termo
}
