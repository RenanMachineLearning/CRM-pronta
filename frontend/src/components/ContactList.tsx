/**
 * Componente ContactList
 * Exibe tabela de contatos com paginação, ordenação e filtros
 */

import React, { useState, useEffect } from 'react';
import { useContacts } from '../hooks/useContacts';
import { Loading } from './Loading';
import { ErrorMessage } from './ErrorMessage';
import { Button } from './Button';
import type { Contact, ContactFilters, ContactStatus } from '../types/contact';

export interface ContactListProps {
  onContactClick?: (contactId: string) => void;
  onNewContact?: () => void;
}

export function ContactList({ onContactClick, onNewContact }: ContactListProps) {
  // Estado para filtros
  const [filters, setFilters] = useState<ContactFilters>({});
  
  // Estado para ordenação
  const [orderBy, setOrderBy] = useState<'firstName' | 'lastName' | 'createdAt'>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  
  // Estado para paginação
  const [page, setPage] = useState(1);
  const limit = 20;

  // Hook para buscar contatos
  const {
    contacts,
    loading,
    error,
    pagination,
    refetch,
    setFilters: updateFilters,
    setPagination: updatePagination,
  } = useContacts(
    filters,
    {
      limit,
      offset: (page - 1) * limit,
      orderBy,
      order,
    }
  );

  // Atualizar paginação quando page, orderBy ou order mudarem
  useEffect(() => {
    updatePagination({
      limit,
      offset: (page - 1) * limit,
      orderBy,
      order,
    });
  }, [page, orderBy, order, limit, updatePagination]);

  // Handlers
  const handleSort = (column: 'firstName' | 'lastName' | 'createdAt') => {
    if (orderBy === column) {
      // Se já está ordenando por esta coluna, inverter ordem
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      // Se é nova coluna, ordenar ascendente
      setOrderBy(column);
      setOrder('asc');
    }
    setPage(1); // Resetar para primeira página
  };

  const handleFilterChange = (key: keyof ContactFilters, value: string | undefined) => {
    const newFilters = { ...filters };
    if (value) {
      newFilters[key] = value as any;
    } else {
      delete newFilters[key];
    }
    updateFilters(newFilters);
    setPage(1); // Resetar para primeira página
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updatePagination({ offset: (newPage - 1) * limit });
  };

  // Calcular número de páginas
  const totalPages = Math.ceil(pagination.total / limit);

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

  // Renderizar cabeçalho da tabela com ordenação
  const renderTableHeader = (column: 'firstName' | 'lastName' | 'createdAt', label: string) => {
    const isActive = orderBy === column;
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center space-x-1">
          <span>{label}</span>
          {isActive && (
            <span>{order === 'asc' ? '↑' : '↓'}</span>
          )}
        </div>
      </th>
    );
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
              {renderTableHeader('firstName', 'Nome')}
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
      {pagination.total > 0 && (
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
                Mostrando <span className="font-medium">{pagination.offset + 1}</span> a{' '}
                <span className="font-medium">
                  {Math.min(pagination.offset + limit, pagination.total)}
                </span>{' '}
                de <span className="font-medium">{pagination.total}</span> contatos
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

