/**
 * Componente ContactList
 * Exibe tabela de contatos com paginação, ordenação e filtros
 */

import React, { useState, useEffect } from 'react';
import { useContacts } from '../hooks/useContacts';
import { Loading } from './Loading';
import { ErrorMessage } from './ErrorMessage';
import { Button } from './Button';
import { SortableTableHeader } from './SortableTableHeader/SortableTableHeader';
import { Pagination } from './Pagination/Pagination';
import { useSorting } from '../hooks/useSorting';
import { usePagination } from '../hooks/usePagination';
import { useSortPaginationUrlSync } from '../hooks/useSortPaginationUrlSync';
import type { Contact, ContactFilters, ContactStatus } from '../types/contact';
import type { Filter } from '../types/filter';

export interface ContactListProps {
  onContactClick?: (contactId: string) => void;
  onNewContact?: () => void;
  advancedFilters?: Filter[];
}

export function ContactList({ onContactClick, onNewContact, advancedFilters = [] }: ContactListProps) {
  // Estado para filtros
  const [filters, setFilters] = useState<ContactFilters>({});
  
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
    return <Loading message="Carregando contatos..." />;
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

        {onNewContact && (
          <Button onClick={onNewContact} variant="primary">
            Novo Contato
          </Button>
        )}
      </div>

      {/* Tabela de contatos */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
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

