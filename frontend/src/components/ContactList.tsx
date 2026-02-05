/**
 * Componente ContactList
 * Exibe tabela de contatos com paginação, ordenação e filtros
 */

import { useState, useEffect } from 'react';
import { useContacts } from '../hooks/useContacts';
import { ErrorMessage } from './ErrorMessage';
import { SkeletonTable } from './Skeleton';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from './Button';
import { SortableTableHeader } from './SortableTableHeader/SortableTableHeader';
import { Pagination } from './Pagination/Pagination';
import ExportDialog from './ExportDialog/ExportDialog';
import { useSorting } from '../hooks/useSorting';
import { usePagination } from '../hooks/usePagination';
import { useSortPaginationUrlSync } from '../hooks/useSortPaginationUrlSync';
import { getAvailableFields, exportData } from '../services/exportService';
import { downloadFile, generateExportFilename } from '../utils/downloadUtils';
import { getAuthToken } from '../utils/api';
import type { Contact, ContactFilters } from '../types/contact';
import type { Filter } from '../types/filter';
import type { Field } from './ExportDialog/ExportDialog.types';

export interface ContactListProps {
  onContactClick?: (contactId: string) => void;
  onNewContact?: () => void;
  advancedFilters?: Filter[];
}

export function ContactList({ onContactClick, onNewContact, advancedFilters = [] }: ContactListProps) {
  // Estado para filtros
  const [filters] = useState<ContactFilters>({});

  // Estados para exportação
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [availableFields, setAvailableFields] = useState<Field[]>([]);
  const [, setLoadingFields] = useState(false);
  const token = getAuthToken();

  // Hooks para ordenação e paginação
  const { sorting, updateSorting, setSortingState, toBackendParams: toSortParams } = useSorting('createdAt', 'desc');
  const { pagination: paginationState, updatePage, updateLimit, updateTotal, toBackendParams: toPaginationParams } = usePagination(1, 20, 0);

  // Sincronizar ordenação e paginação com URL
  useSortPaginationUrlSync(
    sorting,
    paginationState,
    (newSort) => {
      // Atualizar ordenação quando vier da URL (apenas se diferente)
      if (newSort.sortBy !== sorting.sortBy || newSort.sortOrder !== sorting.sortOrder) {
        setSortingState(newSort);
      }
    },
    (newPagination) => {
      // Atualizar paginação quando vier da URL
      if (newPagination.page !== undefined && newPagination.page !== paginationState.page) {
        updatePage(newPagination.page);
      }
      if (newPagination.limit !== undefined && newPagination.limit !== paginationState.limit) {
        updateLimit(newPagination.limit as any);
      }
    }
  );

  // Hook para buscar contatos
  const {
    contacts,
    loading,
    error,
    pagination: paginationInfo,
    refetch,
    setFilters: updateFilters,
    setPagination: updatePagination,
    setAdvancedFilters: updateAdvancedFilters,
  } = useContacts(
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

  // Carregar campos disponíveis para exportação
  useEffect(() => {
    if (showExportDialog && token) {
      const fetchFields = async () => {
        setLoadingFields(true);
        try {
          const fields = await getAvailableFields('Contact', token);
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

  // Handler para ordenação
  const handleSort = (field: string) => {
    updateSorting(field);
    updatePage(1); // Resetar para primeira página
  };

  // Handler para exportação
  const handleExport = async (options: any) => {
    if (!token) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Chamar serviço de exportação
      const blob = await exportData('contacts', options, token);

      // Gerar nome de arquivo
      const filename = generateExportFilename('contacts', options.format);

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

  const handleFilterChange = (key: keyof ContactFilters, value: string | undefined) => {
    const newFilters = { ...filters };
    if (value) {
      newFilters[key] = value as any;
    } else {
      delete newFilters[key];
    }
    updateFilters(newFilters);
    updatePage(1); // Resetar para primeira página
  };

  // Formatar nome completo
  const formatName = (contact: Contact): string => {
    if (contact.firstName && contact.lastName) {
      return `${contact.firstName} ${contact.lastName}`;
    }
    return contact.firstName || contact.lastName || 'Sem nome';
  };

  // Obter email principal
  const getPrimaryEmail = (contact: Contact): string => {
    const primaryEmail = contact.emails.find((e) => e.isPrimary);
    return primaryEmail?.email || contact.emails[0]?.email || '-';
  };

  // Obter telefone principal
  const getPrimaryPhone = (contact: Contact): string => {
    const primaryPhone = contact.phones.find((p) => p.isPrimary);
    return primaryPhone?.phone || contact.phones[0]?.phone || '-';
  };


  // Renderizar loading
  if (loading && contacts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
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
  if (error && contacts.length === 0) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-4">
      {/* Barra de ações e filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {/* Filtro de status */}
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
            <option value="ARCHIVED">Arquivado</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {onNewContact && (
            <Button onClick={onNewContact} variant="primary">
              Novo Contato
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
        entityType="Contact"
        currentFilters={advancedFilters.length > 0 ? advancedFilters : undefined}
        availableFields={availableFields}
        onExport={handleExport}
      />

      {/* Tabela de contatos */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md relative">
        {loading && contacts.length > 0 && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <LoadingSpinner size="lg" />
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableTableHeader
                fieldName="firstName"
                displayName="Nome"
                currentSort={sorting}
                onSort={handleSort}
              />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telefone
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Nenhum contato encontrado
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onContactClick?.(contact.id)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatName(contact)}
                    </div>
                    {contact.title && (
                      <div className="text-sm text-gray-500">{contact.title}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getPrimaryEmail(contact)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getPrimaryPhone(contact)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.company?.name || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.length > 0 ? (
                        contact.tags.map((tag) => (
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

