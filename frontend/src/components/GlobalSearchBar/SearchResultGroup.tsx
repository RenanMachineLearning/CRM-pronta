/**
 * Componente para agrupar resultados de busca por entidade
 * Exibe cabeçalho com ícone, nome da entidade e contador de resultados
 */

import { SearchResultItem } from './SearchResultItem';
import type { SearchResultGroupProps } from './types';

const ENTITY_LABELS = {
  contact: 'Contatos',
  company: 'Empresas',
  lead: 'Leads',
  opportunity: 'Oportunidades',
};

const ENTITY_ICONS = {
  contact: (
    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  company: (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  lead: (
    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  opportunity: (
    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function SearchResultGroup({ 
  entityType, 
  results, 
  onSelectResult, 
  maxResults = 5,
  query 
}: SearchResultGroupProps) {
  if (!results || results.length === 0) {
    return null;
  }

  const limitedResults = results.slice(0, maxResults);
  const hasMore = results.length > maxResults;

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {/* Cabeçalho do grupo */}
      <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {ENTITY_ICONS[entityType]}
          <span className="font-medium text-sm text-gray-700">
            {ENTITY_LABELS[entityType]}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
        </span>
      </div>

      {/* Lista de resultados */}
      <div className="divide-y divide-gray-100">
        {limitedResults.map((result) => (
          <SearchResultItem
            key={result.id}
            result={result}
            onClick={() => onSelectResult(result)}
            query={query}
          />
        ))}
      </div>

      {/* Indicador de mais resultados */}
      {hasMore && (
        <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">
          +{results.length - maxResults} {results.length - maxResults === 1 ? 'resultado' : 'resultados'} restantes
        </div>
      )}
    </div>
  );
}
