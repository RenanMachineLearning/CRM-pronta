/**
 * Componente dropdown para exibir resultados de busca global
 * Gerencia estados de loading, error e empty, e exibe grupos de resultados
 */

import React from 'react';
import { SearchResultGroup } from './SearchResultGroup';
import { Loading } from '../Loading';
import { ErrorMessage } from '../ErrorMessage';
import { Button } from '../Button';
import type { GlobalSearchDropdownProps } from './types';

export function GlobalSearchDropdown({
  results,
  loading,
  error,
  query,
  onSelectResult,
  onViewAll,
  onClose,
}: GlobalSearchDropdownProps) {
  // Verificar se há resultados
  const hasResults = results && (
    results.contacts.length > 0 ||
    results.companies.length > 0 ||
    results.leads.length > 0 ||
    results.opportunities.length > 0
  );

  // Calcular total de resultados
  const totalResults = results ? (
    results.contacts.length +
    results.companies.length +
    results.leads.length +
    results.opportunities.length
  ) : 0;

  return (
    <div 
      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto"
      role="listbox"
      aria-label="Resultados de busca"
    >
      {/* Estado de loading */}
      {loading && (
        <div className="p-4">
          <Loading message="Buscando..." />
        </div>
      )}

      {/* Estado de erro */}
      {error && !loading && (
        <div className="p-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Estado vazio (sem resultados) */}
      {!loading && !error && !hasResults && query.length >= 2 && (
        <div className="p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-500">
            Nenhum resultado encontrado para &quot;{query}&quot;
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Tente usar termos diferentes ou verifique a ortografia
          </p>
        </div>
      )}

      {/* Resultados */}
      {!loading && !error && hasResults && (
        <>
          {/* Grupos de resultados */}
          <div className="divide-y divide-gray-200">
            {results.contacts.length > 0 && (
              <SearchResultGroup
                entityType="contact"
                results={results.contacts}
                onSelectResult={onSelectResult}
                maxResults={5}
                query={query}
              />
            )}

            {results.companies.length > 0 && (
              <SearchResultGroup
                entityType="company"
                results={results.companies}
                onSelectResult={onSelectResult}
                maxResults={5}
                query={query}
              />
            )}

            {results.leads.length > 0 && (
              <SearchResultGroup
                entityType="lead"
                results={results.leads}
                onSelectResult={onSelectResult}
                maxResults={5}
                query={query}
              />
            )}

            {results.opportunities.length > 0 && (
              <SearchResultGroup
                entityType="opportunity"
                results={results.opportunities}
                onSelectResult={onSelectResult}
                maxResults={5}
                query={query}
              />
            )}
          </div>

          {/* Botão "Ver todos os resultados" */}
          {query.length >= 2 && (
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <Button
                variant="primary"
                size="sm"
                onClick={onViewAll}
                className="w-full"
              >
                Ver todos os resultados para &quot;{query}&quot; ({totalResults})
              </Button>
            </div>
          )}
        </>
      )}

      {/* Mensagem quando query é muito curta */}
      {!loading && !error && query.length > 0 && query.length < 2 && (
        <div className="p-4 text-center text-sm text-gray-500">
          Digite pelo menos 2 caracteres para buscar
        </div>
      )}
    </div>
  );
}
