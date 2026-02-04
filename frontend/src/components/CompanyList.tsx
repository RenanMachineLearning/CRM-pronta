/**
 * Componente CompanyList
 * Exibe tabela de empresas com paginação, ordenação e filtros
 */

import { useState, useEffect } from 'react';
import { useCompanies } from '../hooks/useCompanies';
import { Loading } from './Loading';
import { ErrorMessage } from './ErrorMessage';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { SortableTableHeader } from './SortableTableHeader/SortableTableHeader';
import { Pagination } from './Pagination/Pagination';
import ExportDialog from './ExportDialog/ExportDialog';
import { useSorting } from '../hooks/useSorting';
import { usePagination } from '../hooks/usePagination';
import { useSortPaginationUrlSync } from '../hooks/useSortPaginationUrlSync';
import { getAvailableFields, exportData } from '../services/exportService';
import { downloadFile, generateExportFilename } from '../utils/downloadUtils';
import { getAuthToken } from '../utils/api';
import type { CompanyFilters, CompanySize } from '../types/company';
import type { Filter } from '../types/filter';
import type { Field } from './ExportDialog/ExportDialog.types';

export interface CompanyListProps {
  onCompanyClick?: (companyId: string) => void;
  onNewCompany?: () => void;
  advancedFilters?: Filter[];
}

export function CompanyList({ onCompanyClick, onNewCompany, advancedFilters = [] }: CompanyListProps) {
  // Estado para filtros
  const [filters] = useState<CompanyFilters>({});

  // Estados para exportação
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [availableFields, setAvailableFields] = useState<Field[]>([]);
  const [, setLoadingFields] = useState(false);
  const token = getAuthToken();

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

  // Carregar campos disponíveis para exportação
  useEffect(() => {
    if (showExportDialog && token) {
      const fetchFields = async () => {
        setLoadingFields(true);
        try {
          const fields = await getAvailableFields('Company', token);
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
      const blob = await exportData('companies', options, token);

      // Gerar nome de arquivo
      const filename = generateExportFilename('companies', options.format);

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
    } as any, // Temporary fix until we align the types properly
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
    } as any); // Temporary fix until we align the types properly
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

        <div className="flex flex-wrap gap-2">
          {onNewCompany && (
            <Button onClick={onNewCompany} variant="primary">
              Nova Empresa
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
        entityType="Company"
        currentFilters={advancedFilters.length > 0 ? advancedFilters : undefined}
        availableFields={availableFields}
        onExport={handleExport}
      />

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

