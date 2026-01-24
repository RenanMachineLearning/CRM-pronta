/**
 * Componente CompanyList
 * Exibe tabela de empresas com paginação, ordenação e filtros
 */

import React, { useState, useEffect } from 'react';
import { useCompanies } from '../hooks/useCompanies';
import { Loading } from './Loading';
import { ErrorMessage } from './ErrorMessage';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { SortableTableHeader } from './SortableTableHeader/SortableTableHeader';
import { Pagination } from './Pagination/Pagination';
import { useSorting } from '../hooks/useSorting';
import { usePagination } from '../hooks/usePagination';
import { useSortPaginationUrlSync } from '../hooks/useSortPaginationUrlSync';
import type { Company, CompanyFilters, CompanySize } from '../types/company';
import type { Filter } from '../types/filter';

export interface CompanyListProps {
  onCompanyClick?: (companyId: string) => void;
  onNewCompany?: () => void;
  advancedFilters?: Filter[];
}

export function CompanyList({ onCompanyClick, onNewCompany, advancedFilters = [] }: CompanyListProps) {
  // Estado para filtros
  const [filters, setFilters] = useState<CompanyFilters>({});
  
  // Hooks para ordenação e paginação
  const { sorting, updateSorting, setSortingState, toBackendParams: toSortParams } = useSorting('name', 'asc');
  const { pagination: paginationState, updatePage, updateLimit, updateTotal, toBackendParams: toPaginationParams } = usePagination(1, 20, 0);

  // Sincronizar ordenação e paginação com URL
  useSortPaginationUrlSync(
    sorting,
    paginationState,
    (newSort) => {
      if (newSort.sortBy !== sorting.sortBy || newSort.sortOrder !== sorting.sortOrder) {
        setSortingState(newSort);
      }
    },
    (newPagination) => {
      if (newPagination.page !== undefined && newPagination.page !== paginationState.page) {
        updatePage(newPagination.page);
      }
      if (newPagination.limit !== undefined && newPagination.limit !== paginationState.limit) {
        updateLimit(newPagination.limit as any);
      }
    }
  );

  // Hook para buscar empresas
  const {
    companies,
    loading,
    error,
    pagination: paginationInfo,
    refetch,
    setFilters: updateFilters,
    setPagination: updatePagination,
    setAdvancedFilters: updateAdvancedFilters,
  } = useCompanies(
    filters,
    {
      ...toPaginationParams(),
      ...toSortParams(),
    },
    advancedFilters
  );

  // Atualizar total quando receber resposta da API
  useEffect(() => {
    updateTotal(paginationInfo.total);
  }, [paginationInfo.total, updateTotal]);

  // Atualizar filtros avançados quando mudarem externamente
  useEffect(() => {
    updateAdvancedFilters(advancedFilters);
    updatePage(1); // Resetar para primeira página
  }, [advancedFilters, updateAdvancedFilters, updatePage]);

  // Atualizar paginação e ordenação na API quando mudarem
  useEffect(() => {
    updatePagination({
      ...toPaginationParams(),
      ...toSortParams(),
    });
  }, [paginationState.page, paginationState.limit, sorting.sortBy, sorting.sortOrder, updatePagination, toPaginationParams, toSortParams]);

  // Handler para ordenação
  const handleSort = (field: string) => {
    updateSorting(field);
    updatePage(1); // Resetar para primeira página
  };

  const handleFilterChange = (key: keyof CompanyFilters, value: string | undefined) => {
    const newFilters = { ...filters };
    if (value) {
      newFilters[key] = value as any;
    } else {
      delete newFilters[key];
    }
    updateFilters(newFilters);
    updatePage(1); // Resetar para primeira página
  };

  // Traduzir tamanho
  const translateSize = (size: CompanySize | null | undefined): string => {
    if (!size) return '-';
    const translations: Record<CompanySize, string> = {
      SMALL: 'Pequena',
      MEDIUM: 'Média',
      LARGE: 'Grande',
      ENTERPRISE: 'Empresarial',
    };
    return translations[size];
  };

  // Traduzir status
  const translateStatus = (status: string): string => {
    const translations: Record<string, string> = {
      ACTIVE: 'Ativo',
      INACTIVE: 'Inativo',
      ARCHIVED: 'Arquivado',
    };
    return translations[status] || status;
  };

  // Obter cor do badge de status
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-yellow-100 text-yellow-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };


  // Renderizar loading
  if (loading && companies.length === 0) {
    return <Loading message="Carregando empresas..." />;
  }

  // Renderizar erro
  if (error && companies.length === 0) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-4">
      {/* Barra de ações e filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {/* Filtro de indústria */}
          <Input
            placeholder="Indústria..."
            value={filters.industry || ''}
            onChange={(e) => handleFilterChange('industry', e.target.value || undefined)}
            className="w-48 mb-0"
          />
          {/* Filtro de tamanho */}
          <Select
            value={filters.size || ''}
            options={[
              { value: '', label: 'Todos os tamanhos' },
              { value: 'SMALL', label: 'Pequena' },
              { value: 'MEDIUM', label: 'Média' },
              { value: 'LARGE', label: 'Grande' },
              { value: 'ENTERPRISE', label: 'Empresarial' },
            ]}
            onChange={(e) => handleFilterChange('size', e.target.value || undefined)}
            className="w-48 mb-0"
          />
        </div>

        {onNewCompany && (
          <Button onClick={onNewCompany} variant="primary">
            Nova Empresa
          </Button>
        )}
      </div>

      {/* Tabela de empresas */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableTableHeader
                fieldName="name"
                displayName="Nome"
                currentSort={sorting}
                onSort={handleSort}
              />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Website
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Indústria
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tamanho
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contatos
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma empresa encontrada
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr
                  key={company.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onCompanyClick?.(company.id)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {company.name}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {company.website}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.industry || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {translateSize(company.size)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(company.status)}`}
                    >
                      {translateStatus(company.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.contactsCount !== undefined
                      ? `${company.contactsCount} ${company.contactsCount === 1 ? 'contato' : 'contatos'}`
                      : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {company.tags && company.tags.length > 0 ? (
                        company.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <Pagination
        pagination={paginationState}
        onPageChange={updatePage}
        onLimitChange={updateLimit}
      />
    </div>
  );
}

