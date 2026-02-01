/**
 * Componente OpportunityList
 * Exibe tabela de oportunidades com paginação, ordenação e filtros
 */

import { useState, useEffect } from 'react';
import { useOpportunities } from '../hooks/useOpportunities';
import { Loading } from './Loading';
import { ErrorMessage } from './ErrorMessage';
import { Button } from './Button';
import { Select } from './Select';
import { SortableTableHeader } from './SortableTableHeader/SortableTableHeader';
import { Pagination } from './Pagination/Pagination';
import { useSorting } from '../hooks/useSorting';
import { usePagination } from '../hooks/usePagination';
import { useSortPaginationUrlSync } from '../hooks/useSortPaginationUrlSync';
import type { OpportunityFilters, OpportunityStatus, OpportunityPaginationParams } from '../types/opportunity';
import type { Filter } from '../types/filter';

export interface OpportunityListProps {
  onOpportunityClick?: (opportunityId: string) => void;
  onNewOpportunity?: () => void;
  advancedFilters?: Filter[];
}

/**
 * Formata valor monetário em BRL
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata data em formato brasileiro
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Traduz status para português
 */
function translateStatus(status: OpportunityStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Aberta';
    case 'WON':
      return 'Ganha';
    case 'LOST':
      return 'Perdida';
    case 'ARCHIVED':
      return 'Arquivada';
    default:
      return status;
  }
}

/**
 * Obtém cor do badge de status
 */
function getStatusColor(status: OpportunityStatus): string {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800';
    case 'WON':
      return 'bg-green-100 text-green-800';
    case 'LOST':
      return 'bg-red-100 text-red-800';
    case 'ARCHIVED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function OpportunityList({ onOpportunityClick, onNewOpportunity, advancedFilters = [] }: OpportunityListProps) {
  // Estado para filtros
  const [filters] = useState<OpportunityFilters>({});
  
  // Hooks para ordenação e paginação
  const { sorting, updateSorting, setSortingState, toBackendParams: toSortParams } = useSorting('createdAt', 'desc');
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

  // Hook para buscar oportunidades
  const sortParams = toSortParams();
  const paginationParams = toPaginationParams();

  // Função para converter parâmetros com tipagem correta
  const buildOpportunityParams = (): OpportunityPaginationParams => {
    const baseParams = {
      limit: paginationParams.limit,
      offset: paginationParams.offset,
    };

    if (sortParams.orderBy) {
      // Verificar se o campo de ordenação é um dos campos válidos para oportunidades
      if (['value', 'closeDate', 'createdAt', 'name'].includes(sortParams.orderBy)) {
        return {
          ...baseParams,
          orderBy: sortParams.orderBy as 'value' | 'closeDate' | 'createdAt' | 'name',
          order: sortParams.order,
        };
      }
    }

    return {
      ...baseParams,
      orderBy: undefined,
      order: sortParams.order,
    };
  };

  const {
    opportunities,
    loading,
    error,
    pagination: paginationInfo,
    refetch,
    setFilters: updateFilters,
    setPagination: updatePagination,
    setAdvancedFilters: updateAdvancedFilters,
  } = useOpportunities(
    filters,
    buildOpportunityParams(),
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
    const sortParams = toSortParams();
    updatePagination({
      ...toPaginationParams(),
      orderBy: sortParams.orderBy as 'name' | 'value' | 'createdAt' | 'closeDate' | undefined,
      order: sortParams.order,
    });
  }, [paginationState.page, paginationState.limit, sorting.sortBy, sorting.sortOrder, updatePagination, toPaginationParams, toSortParams]);

  // Handler para ordenação
  const handleSort = (field: string) => {
    updateSorting(field);
    updatePage(1); // Resetar para primeira página
  };

  const handleFilterChange = (key: keyof OpportunityFilters, value: string | undefined) => {
    const newFilters = { ...filters };
    if (value && value !== '') {
      newFilters[key] = value as any;
    } else {
      delete newFilters[key];
    }
    updateFilters(newFilters);
    updatePage(1); // Resetar para primeira página
  };

  if (loading) {
    return <Loading message="Carregando oportunidades..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-4">
      {/* Barra de ações e filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {/* Filtro de status */}
          <Select
            value={filters.status || ''}
            options={[
              { value: '', label: 'Todos os status' },
              { value: 'OPEN', label: 'Aberta' },
              { value: 'WON', label: 'Ganha' },
              { value: 'LOST', label: 'Perdida' },
              { value: 'ARCHIVED', label: 'Arquivada' },
            ]}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            className="w-48 mb-0"
          />
        </div>

        {onNewOpportunity && (
          <Button onClick={onNewOpportunity} variant="primary">
            Nova Oportunidade
          </Button>
        )}
      </div>

      {/* Tabela de oportunidades */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  fieldName="name"
                  displayName="Nome"
                  currentSort={sorting}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  fieldName="value"
                  displayName="Valor"
                  currentSort={sorting}
                  onSort={handleSort}
                  align="right"
                />
                <SortableTableHeader
                  fieldName="closeDate"
                  displayName="Data de Fechamento"
                  currentSort={sorting}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Probabilidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato/Empresa
                </th>
                <SortableTableHeader
                  fieldName="createdAt"
                  displayName="Criado em"
                  currentSort={sorting}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {opportunities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma oportunidade encontrada
                  </td>
                </tr>
              ) : (
                opportunities.map((opp) => {
                  const contactOrCompanyName = opp.contact
                    ? `${opp.contact.firstName} ${opp.contact.lastName || ''}`.trim()
                    : opp.company?.name || '-';

                  return (
                    <tr
                      key={opp.id}
                      className={`hover:bg-gray-50 ${
                        onOpportunityClick ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => onOpportunityClick?.(opp.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{opp.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(opp.value)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(opp.closeDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {opp.probability !== null && opp.probability !== undefined
                            ? `${opp.probability}%`
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            opp.status
                          )}`}
                        >
                          {translateStatus(opp.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{contactOrCompanyName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(opp.createdAt)}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
