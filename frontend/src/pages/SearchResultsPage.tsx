/**
 * Página de resultados completos de busca global
 * Exibe resultados agrupados por entidade com filtros e paginação
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { Button } from '../components/Button';
import type { SearchableEntity, SearchResult } from '../types/search';
import type { ContactSearchData, CompanySearchData, LeadSearchData, OpportunitySearchData } from '../types/search';

const ENTITY_LABELS: Record<SearchableEntity, string> = {
  contact: 'Contatos',
  company: 'Empresas',
  lead: 'Leads',
  opportunity: 'Oportunidades',
};

/**
 * Componente para exibir um resultado na página de resultados
 */
function ResultCard({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const getTitle = () => {
    switch (result.type) {
      case 'contact': {
        const data = result.data as ContactSearchData;
        return `${data.firstName} ${data.lastName || ''}`.trim();
      }
      case 'company': {
        const data = result.data as CompanySearchData;
        return data.name;
      }
      case 'lead': {
        const data = result.data as LeadSearchData;
        return `${data.firstName} ${data.lastName || ''}`.trim();
      }
      case 'opportunity': {
        const data = result.data as OpportunitySearchData;
        return data.name;
      }
    }
  };

  const getSubtitle = () => {
    switch (result.type) {
      case 'contact': {
        const data = result.data as ContactSearchData;
        return data.title || data.company?.name || '';
      }
      case 'company': {
        const data = result.data as CompanySearchData;
        return data.industry || data.website || '';
      }
      case 'lead': {
        const data = result.data as LeadSearchData;
        return data.email || data.phone || data.company || '';
      }
      case 'opportunity': {
        const data = result.data as OpportunitySearchData;
        const valueFormatted = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: data.currency || 'BRL',
        }).format(data.value);
        return `${valueFormatted} • ${data.stage?.name || ''}`;
      }
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{getTitle()}</h3>
          {getSubtitle() && (
            <p className="mt-1 text-sm text-gray-600">{getSubtitle()}</p>
          )}
          {result.snippet && (
            <p className="mt-2 text-xs text-gray-500 italic">
              {result.snippet.text}
            </p>
          )}
        </div>
        <span className="ml-4 text-xs text-gray-400 capitalize">
          {result.type}
        </span>
      </div>
    </button>
  );
}

/**
 * Seção de resultados por entidade
 */
function ResultsSection({
  entityType,
  results,
  total,
  onResultClick,
}: {
  entityType: SearchableEntity;
  results: SearchResult[];
  total: number;
  onResultClick: (result: SearchResult) => void;
}) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {ENTITY_LABELS[entityType]}
        </h2>
        <span className="text-sm text-gray-500">
          {results.length} de {total} {total === 1 ? 'resultado' : 'resultados'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((result) => (
          <ResultCard
            key={result.id}
            result={result}
            onClick={() => onResultClick(result)}
          />
        ))}
      </div>
    </div>
  );
}

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const [selectedEntities, setSelectedEntities] = useState<SearchableEntity[]>(['contact', 'company', 'lead', 'opportunity']);
  
  const { results, loading, error, search } = useGlobalSearch();

  // Buscar quando query mudar
  useEffect(() => {
    if (query.length >= 2) {
      search({ 
        query, 
        entities: selectedEntities.length < 4 ? selectedEntities : undefined,
        limit: 20 // Limite maior para página de resultados
      });
    }
  }, [query, selectedEntities, search]);

  const handleResultClick = (result: SearchResult) => {
    const routes = {
      contact: `/contacts/${result.id}`,
      company: `/companies/${result.id}`,
      lead: `/leads/${result.id}`,
      opportunity: `/opportunities/${result.id}`,
    };
    navigate(routes[result.type]);
  };

  const toggleEntity = (entity: SearchableEntity) => {
    setSelectedEntities(prev => 
      prev.includes(entity)
        ? prev.filter(e => e !== entity)
        : [...prev, entity]
    );
  };

  const totalResults = results ? (
    results.totals.contacts +
    results.totals.companies +
    results.totals.leads +
    results.totals.opportunities
  ) : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Resultados da Busca</h1>
        {query && (
          <p className="mt-2 text-sm text-gray-600">
            Buscando por: &quot;{query}&quot;
            {totalResults > 0 && (
              <span className="ml-2">• {totalResults} {totalResults === 1 ? 'resultado encontrado' : 'resultados encontrados'}</span>
            )}
          </p>
        )}
      </div>

      {/* Filtros por entidade */}
      {query.length >= 2 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filtrar por tipo:</h3>
          <div className="flex flex-wrap gap-3">
            {(['contact', 'company', 'lead', 'opportunity'] as SearchableEntity[]).map((entity) => (
              <label key={entity} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedEntities.includes(entity)}
                  onChange={() => toggleEntity(entity)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{ENTITY_LABELS[entity]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-12">
          <Loading message="Buscando resultados..." />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="py-12">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Sem query */}
      {!query && !loading && (
        <div className="py-12 text-center">
          <p className="text-gray-500">Digite um termo de busca para começar</p>
        </div>
      )}

      {/* Query muito curta */}
      {query.length > 0 && query.length < 2 && !loading && (
        <div className="py-12 text-center">
          <p className="text-gray-500">Digite pelo menos 2 caracteres para buscar</p>
        </div>
      )}

      {/* Sem resultados */}
      {!loading && !error && query.length >= 2 && results && totalResults === 0 && (
        <div className="py-12 text-center">
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
          <p className="mt-4 text-gray-500">
            Nenhum resultado encontrado para &quot;{query}&quot;
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Tente usar termos diferentes ou verifique a ortografia
          </p>
        </div>
      )}

      {/* Resultados */}
      {!loading && !error && results && totalResults > 0 && (
        <div>
          {results.results.contacts.length > 0 && (
            <ResultsSection
              entityType="contact"
              results={results.results.contacts}
              total={results.totals.contacts}
              onResultClick={handleResultClick}
            />
          )}

          {results.results.companies.length > 0 && (
            <ResultsSection
              entityType="company"
              results={results.results.companies}
              total={results.totals.companies}
              onResultClick={handleResultClick}
            />
          )}

          {results.results.leads.length > 0 && (
            <ResultsSection
              entityType="lead"
              results={results.results.leads}
              total={results.totals.leads}
              onResultClick={handleResultClick}
            />
          )}

          {results.results.opportunities.length > 0 && (
            <ResultsSection
              entityType="opportunity"
              results={results.results.opportunities}
              total={results.totals.opportunities}
              onResultClick={handleResultClick}
            />
          )}
        </div>
      )}
    </div>
  );
}
