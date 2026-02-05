/**
 * Componente ContactList
 * Exibe tabela de contatos com paginação, ordenação e filtros
 * Versão com DataTable responsivo
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useContacts } from '../hooks/useContacts';

import { DataTable, DataTableColumn } from './DataTable';
import { MobileFilterDrawer } from './MobileFilterDrawer';
import { ErrorMessage } from './ErrorMessage';
import { SkeletonTable } from './Skeleton';
import { EmptyState } from './EmptyState';
import { Badge } from './Badge';
import { Tooltip } from './Tooltip';
import { Button } from './Button';
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
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export interface ContactListProps {
  onContactClick?: (contactId: string) => void;
  onNewContact?: () => void;
  onEditContact?: (contactId: string) => void;
  onDeleteContact?: (contactId: string) => void;
  advancedFilters?: Filter[];
}

export function ContactList({ 
  onContactClick, 
  onNewContact,
  onEditContact,
  onDeleteContact,
  advancedFilters = [] 
}: ContactListProps) {
  // Estado para filtros
  const [filters, setFilters] = useState<ContactFilters>({});

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
    } as any,
    advancedFilters
  );

  // Atualizar total quando receber resposta da API
  useEffect(() => {
    updateTotal(paginationInfo.total);
  }, [paginationInfo.total, updateTotal]);

  // Atualizar filtros avançados quando mudarem externamente
  useEffect(() => {
    updateAdvancedFilters(advancedFilters);
    updatePage(1);
  }, [advancedFilters, updateAdvancedFilters, updatePage]);

  // Atualizar paginação e ordenação na API quando mudarem
  useEffect(() => {
    updatePagination({
      ...toPaginationParams(),
      ...toSortParams(),
    } as any);
  }, [paginationState.page, paginationState.limit, sorting.sortBy, sorting.sortOrder, updatePagination, toPaginationParams, toSortParams]);

  // Handler para ordenação
  const handleSort = useCallback((field: string) => {
    updateSorting(field);
    updatePage(1);
  }, [updateSorting, updatePage]);

  // Handler para exportação
  const handleExport = async (options: any) => {
    if (!token) {
      throw new Error('Usuário não autenticado');
    }
    try {
      const blob = await exportData('contacts', options, token);
      const filename = generateExportFilename('contacts', options.format);
      downloadFile(blob, filename);
    } catch (error) {
      console.error('Erro na exportação:', error);
      throw error;
    }
  };

  // Carregar campos disponíveis para exportação
  useEffect(() => {
    if (showExportDialog && token) {
      const fetchFields = async () => {
        setLoadingFields(true);
        try {
          const fields = await getAvailableFields('Contact', token);
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

  const handleFilterChange = (key: keyof ContactFilters, value: string | undefined) => {
    const newFilters = { ...filters };
    if (value) {
      newFilters[key] = value as any;
    } else {
      delete newFilters[key];
    }
    setFilters(newFilters);
    updateFilters(newFilters);
    updatePage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    updateFilters({});
    updatePage(1);
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

  // Definição das colunas
  const columns: DataTableColumn<Contact>[] = useMemo(() => [
    {
      key: 'name',
      title: 'Nome',
      priority: 'high',
      sortable: true,
      render: (contact) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {formatName(contact)}
          </div>
          {contact.title && (
            <div className="text-sm text-gray-500">{contact.title}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      priority: 'high',
      sortable: true,
      render: (contact) => {
        const statusConfig = {
          ACTIVE: { label: 'Ativo', variant: 'success' as const },
          INACTIVE: { label: 'Inativo', variant: 'default' as const },
          ARCHIVED: { label: 'Arquivado', variant: 'secondary' as const },
        };
        const config = statusConfig[contact.status] || { label: contact.status, variant: 'default' as const };
        return (
          <Badge variant={config.variant} size="sm">
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'email',
      title: 'Email',
      priority: 'high',
      hiddenOn: ['mobile'],
      render: (contact) => (
        <span className="text-sm text-gray-500">
          {getPrimaryEmail(contact)}
        </span>
      ),
    },
    {
      key: 'phone',
      title: 'Telefone',
      priority: 'medium',
      hiddenOn: ['mobile', 'tablet'],
      render: (contact) => (
        <span className="text-sm text-gray-500">
          {getPrimaryPhone(contact)}
        </span>
      ),
    },
    {
      key: 'company',
      title: 'Empresa',
      priority: 'medium',
      hiddenOn: ['mobile'],
      render: (contact) => (
        <span className="text-sm text-gray-500">
          {contact.company?.name || '-'}
        </span>
      ),
    },
    {
      key: 'tags',
      title: 'Tags',
      priority: 'low',
      hiddenOn: ['mobile', 'tablet'],
      render: (contact) => (
        <div className="flex flex-wrap gap-1">
          {contact.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {contact.tags.length > 2 && (
            <span className="text-xs text-gray-400">+{contact.tags.length - 2}</span>
          )}
        </div>
      ),
    },
  ], []);

  // Contar filtros ativos
  const activeFiltersCount = Object.keys(filters).length + advancedFilters.length;

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
        <SkeletonTable rows={5} columns={5} />
      </div>
    );
  }

  // Renderizar erro
  if (error && contacts.length === 0) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-4">
      {/* Barra de ações e filtros - Desktop */}
      <div className="hidden sm:flex flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-2">
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
          <Button onClick={() => setShowExportDialog(true)} variant="secondary">
            Exportar
          </Button>
        </div>
      </div>

      {/* Barra de ações - Mobile */}
      <div className="flex sm:hidden justify-between items-center gap-2">
        {onNewContact && (
          <Button onClick={onNewContact} variant="primary" size="sm">
            Novo
          </Button>
        )}
        <Button onClick={() => setShowExportDialog(true)} variant="secondary" size="sm">
          Exportar
        </Button>
      </div>

      {/* Diálogo de exportação */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        entityType="Contact"
        currentFilters={advancedFilters.length > 0 ? advancedFilters : undefined}
        availableFields={availableFields}
        onExport={handleExport}
      />

      {/* Drawer de filtros - Mobile */}
      <MobileFilterDrawer
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: filters.status || '',
            onChange: (value) => handleFilterChange('status', value as string),
            type: 'select',
            options: [
              { value: 'ACTIVE', label: 'Ativo' },
              { value: 'INACTIVE', label: 'Inativo' },
              { value: 'ARCHIVED', label: 'Arquivado' },
            ],
          },
        ]}
        onClear={handleClearFilters}
        activeFiltersCount={activeFiltersCount}
      />

      {/* DataTable responsivo */}
      <DataTable
        data={contacts}
        columns={columns}
        keyExtractor={(contact) => contact.id}
        loading={loading && contacts.length > 0}
        pagination={{
          page: paginationState.page,
          limit: paginationState.limit,
          total: paginationInfo.total,
          onPageChange: updatePage,
          onLimitChange: (limit) => updateLimit(limit as any),
        }}
        sorting={{
          sortBy: sorting.sortBy,
          sortOrder: sorting.sortOrder === 'default' ? null : sorting.sortOrder as 'asc' | 'desc',
          onSort: handleSort,
        }}
        onRowClick={(contact) => onContactClick?.(contact.id)}
        actions={(contact) => (
          <div className="flex items-center gap-2">
            {onEditContact && (
              <Tooltip content="Editar contato">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditContact(contact.id);
                  }}
                  className="p-1 text-blue-600 hover:text-blue-800"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
            {onDeleteContact && (
              <Tooltip content="Excluir contato">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteContact(contact.id);
                  }}
                  className="p-1 text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        )}
        emptyState={
          <EmptyState
            title="Nenhum contato encontrado"
            description="Comece criando um novo contato para gerenciar seus relacionamentos."
            icon="users"
            actionLabel="Novo Contato"
            onAction={onNewContact}
            variant="card"
            filtersApplied={activeFiltersCount > 0}
          />
        }
        columnStorageKey="contact-list-columns"
      />
    </div>
  );
}

export default ContactList;
