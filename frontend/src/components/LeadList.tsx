/**
 * Componente LeadList
 * Exibe tabela de leads com paginação, ordenação e filtros
 */

import React, { useState, useEffect } from 'react';
import { useLeads } from '../hooks/useLeads';
import { SkeletonTable } from './Skeleton';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { EmptyState } from './EmptyState';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { SortableTableHeader } from './SortableTableHeader/SortableTableHeader';
import ExportDialog from './ExportDialog/ExportDialog';
import { useSorting } from '../hooks/useSorting';
import { usePagination } from '../hooks/usePagination';
import { useSortPaginationUrlSync } from '../hooks/useSortPaginationUrlSync';
import { getAvailableFields, exportData } from '../services/exportService';
import { downloadFile, generateExportFilename } from '../utils/downloadUtils';
import { getAuthToken } from '../utils/api';
import type { Lead, LeadFilters, LeadPaginationParams, LeadStatus } from '../types/lead';
import type { Filter } from '../types/filter';
import type { Field } from './ExportDialog/ExportDialog.types';

export interface LeadListProps {
  leads?: Lead[]; // Opcional: se fornecido, usar em vez de buscar
  onLeadClick?: (leadId: string) => void;
  onNewLead?: () => void;
  onConvertLead?: (leadId: string) => void;
  advancedFilters?: Filter[]; // Filtros avançados (usado quando leads não é fornecido)
}

export function LeadList({ leads: leadsProp, onLeadClick, onNewLead, onConvertLead, advancedFilters = [] }: LeadListProps) {
  // Estado para filtros
  const [filters, _setFilters] = useState<LeadFilters>({});

  // Estados para exportação
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [availableFields, setAvailableFields] = useState<Field[]>([]);
  const [, setLoadingFields] = useState(false);
  const token = getAuthToken();

  // Hooks para ordenação e paginação (sempre inicializar, mas só usar se não usar leads da prop)
  const { sorting, updateSorting, setSortingState, toBackendParams: toSortParams } = useSorting('createdAt', 'desc');
  const { pagination: paginationState, updatePage, updateLimit, updateTotal, toBackendParams: toPaginationParams } = usePagination(1, 20, 0);

  // Carregar campos disponíveis para exportação
  useEffect(() => {
    if (showExportDialog && token) {
      const fetchFields = async () => {
        setLoadingFields(true);
        try {
          const fields = await getAvailableFields('Lead', token);
          // Mapear campos para o formato esperado pelo ExportDialog
          const mappedFields: Field[] = fields.map((field: any) => ({
            id: field.id,
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required,
            order: field.order
          }));
          setAvailableFields(mappedFields);
        } catch (error) {
          console.error('Erro ao carregar campos para exportação:', error);
        } finally {
          setLoadingFields(false);
        }
      };

      fetchFields();
    }
  }, [showExportDialog, token]);

  // Handler para exportação
  const handleExport = async (options: any) => {
    if (!token) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Chamar serviço de exportação
      const blob = await exportData('leads', options, token);

      // Gerar nome de arquivo
      const filename = generateExportFilename('leads', options.format);

      // Fazer download do arquivo
      downloadFile(blob, filename);
    } catch (error) {
      console.error('Erro na exportação:', error);
      throw error;
    }
  };

  // Handler para abrir diálogo de exportação
  const handleOpenExportDialog = () => {
    setShowExportDialog(true);
  };

  // Handler para fechar diálogo de exportação
  const handleCloseExportDialog = () => {
    setShowExportDialog(false);
  };

  // Sincronizar ordenação e paginação com URL (sempre chamar, mas callbacks só fazem algo se não usar leads da prop)
  useSortPaginationUrlSync(
    sorting,
    paginationState,
    (newSort) => {
      if (!leadsProp && (newSort.sortBy !== sorting.sortBy || newSort.sortOrder !== sorting.sortOrder)) {
        setSortingState(newSort);
      }
    },
    (newPagination) => {
      if (!leadsProp) {
        if (newPagination.page !== undefined && newPagination.page !== paginationState.page) {
          updatePage(newPagination.page);
        }
        if (newPagination.limit !== undefined && newPagination.limit !== paginationState.limit) {
          updateLimit(newPagination.limit as any);
        }
      }
    }
  );

  // Se leads fornecido como prop, usar; senão, buscar com hook
  const {
    leads: leadsFromHook,
    loading,
    error,
    pagination: paginationInfo,
    refetch,
    setFilters: updateFilters,
    setPagination: updatePagination,
    setAdvancedFilters: updateAdvancedFilters,
  } = useLeads(
    filters,
    {
      ...toPaginationParams(),
      ...toSortParams(),
    } as LeadPaginationParams,
    advancedFilters
  );

  // Atualizar total quando receber resposta da API (apenas se não usar leads da prop)
  useEffect(() => {
    if (!leadsProp) {
      updateTotal(paginationInfo.total);
    }
  }, [paginationInfo.total, updateTotal, leadsProp]);

  // Atualizar filtros avançados quando mudarem externamente (apenas se não usar leads da prop)
  useEffect(() => {
    if (!leadsProp) {
      updateAdvancedFilters(advancedFilters);
      updatePage(1); // Resetar para primeira página
    }
  }, [advancedFilters, updateAdvancedFilters, updatePage, leadsProp]);
  
  // Usar leads da prop se fornecido, senão usar do hook
  const leads = leadsProp || leadsFromHook;
  
  // Se leads vem da prop, não mostrar loading/error do hook
  const showLoading = leadsProp ? false : loading;
  const showError = leadsProp ? null : error;

  // Atualizar paginação e ordenação na API quando mudarem (apenas se não usar leads da prop)
  useEffect(() => {
    if (!leadsProp) {
      updatePagination({
        ...toPaginationParams(),
        ...toSortParams(),
      } as LeadPaginationParams);
    }
  }, [paginationState.page, paginationState.limit, sorting.sortBy, sorting.sortOrder, updatePagination, toPaginationParams, toSortParams, leadsProp]);

  // Calcular variáveis de paginação
  const page = paginationState.page;
  const totalPages = Math.ceil(paginationInfo.total / paginationState.limit);

  // Handler para mudança de página
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updatePage(newPage);
    }
  };

  // Handler para ordenação
  const handleSort = (field: string) => {
    if (!leadsProp) {
      updateSorting(field);
      updatePage(1); // Resetar para primeira página
    }
  };

  const handleFilterChange = (key: keyof LeadFilters, value: string | boolean | undefined) => {
    if (!leadsProp) {
      const newFilters = { ...filters };
      if (value !== undefined && value !== '') {
        if (key === 'converted') {
          // Converter string 'true'/'false' para boolean
          newFilters[key] = value === 'true' || value === true;
        } else {
          newFilters[key] = value as any;
        }
      } else {
        delete newFilters[key];
      }
      updateFilters(newFilters);
      updatePage(1); // Resetar para primeira página
    }
  };

  // Funções auxiliares
  const formatName = (lead: Lead): string => {
    if (lead.firstName && lead.lastName) {
      return `${lead.firstName} ${lead.lastName}`;
    }
    return lead.firstName || 'Sem nome';
  };

  const translateStatus = (status: LeadStatus): string => {
    const translations: Record<LeadStatus, string> = {
      NEW: 'Novo',
      QUALIFIED: 'Qualificado',
      CONVERTED: 'Convertido',
      LOST: 'Perdido',
    };
    return translations[status] || status;
  };

  const getStatusColor = (status: LeadStatus): string => {
    const colors: Record<LeadStatus, string> = {
      NEW: 'bg-blue-100 text-blue-800',
      QUALIFIED: 'bg-green-100 text-green-800',
      CONVERTED: 'bg-purple-100 text-purple-800',
      LOST: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Renderizar cabeçalho da tabela com ordenação (apenas se não usar leads da prop)
  const renderTableHeader = (column: 'firstName' | 'createdAt', label: string) => {
    if (leadsProp) {
      // Se leads vem da prop, não permitir ordenação
      return (
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </th>
      );
    }
    return (
      <SortableTableHeader
        fieldName={column}
        displayName={label}
        currentSort={sorting}
        onSort={handleSort}
      />
    );
  };

  // Renderizar loading
  if (showLoading && leads.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <div className="h-10 w-48 bg-gray-200 animate-pulse rounded" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
            <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <SkeletonTable rows={5} columns={5} />
        </div>
      </div>
    );
  }

  // Renderizar erro
  if (showError && leads.length === 0) {
    return <ErrorMessage message={showError} onRetry={refetch} />;
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
              { value: 'NEW', label: 'Novo' },
              { value: 'QUALIFIED', label: 'Qualificado' },
              { value: 'CONVERTED', label: 'Convertido' },
              { value: 'LOST', label: 'Perdido' },
            ]}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            className="w-48 mb-0"
          />

          {/* Filtro de origem */}
          <Input
            placeholder="Origem..."
            value={filters.source || ''}
            onChange={(e) => handleFilterChange('source', e.target.value || undefined)}
            className="w-48 mb-0"
          />

          {/* Filtro de convertido */}
          <Select
            value={filters.converted !== undefined ? filters.converted.toString() : ''}
            options={[
              { value: '', label: 'Todos' },
              { value: 'true', label: 'Convertidos' },
              { value: 'false', label: 'Não convertidos' },
            ]}
            onChange={(e) => handleFilterChange('converted', e.target.value || undefined)}
            className="w-48 mb-0"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {onNewLead && (
            <Button onClick={onNewLead} variant="primary">
              Novo Lead
            </Button>
          )}

          <Button onClick={handleOpenExportDialog} variant="secondary">
            Exportar
          </Button>
        </div>
      </div>

      {/* Diálogo de exportação */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={handleCloseExportDialog}
        entityType="Lead"
        currentFilters={advancedFilters.length > 0 ? advancedFilters : undefined}
        availableFields={availableFields}
        onExport={handleExport}
      />

      {/* Tabela de leads */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md relative">
        {showLoading && leads.length > 0 && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <LoadingSpinner size="lg" />
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {renderTableHeader('firstName', 'Nome')}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Origem
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8">
                  <EmptyState
                    title="Nenhum lead encontrado"
                    description="Comece criando um novo lead para gerenciar seus potenciais clientes."
                    icon="users"
                    actionLabel="Novo Lead"
                    onAction={onNewLead}
                    variant="table"
                    filtersApplied={Object.keys(filters).length > 0 || advancedFilters.length > 0}
                  />
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onLeadClick?.(lead.id)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatName(lead)}
                    </div>
                    {lead.converted && (
                      <div className="text-xs text-purple-600 mt-1">
                        ✓ Convertido
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.email || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.company || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}
                    >
                      {translateStatus(lead.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.source || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {!lead.converted && onConvertLead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevenir trigger do onClick da linha
                          onConvertLead(lead.id);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Converter
                      </button>
                    )}
                    {lead.converted && (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação - apenas se não usar leads da prop */}
      {!leadsProp && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Próxima
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{paginationInfo.offset + 1}</span> a{' '}
                <span className="font-medium">
                  {Math.min(paginationInfo.offset + paginationState.limit, paginationInfo.total)}
                </span>{' '}
                de <span className="font-medium">{paginationInfo.total}</span> leads
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="rounded-l-md"
                >
                  Anterior
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Mostrar primeira, última, atual e adjacentes
                    return (
                      p === 1 ||
                      p === totalPages ||
                      (p >= page - 1 && p <= page + 1)
                    );
                  })
                  .map((p, index, array) => {
                    // Adicionar ellipsis se necessário
                    const prev = array[index - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                        <Button
                          variant={p === page ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handlePageChange(p)}
                          className="rounded-none"
                        >
                          {p}
                        </Button>
                      </React.Fragment>
                    );
                  })}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="rounded-r-md"
                >
                  Próxima
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
