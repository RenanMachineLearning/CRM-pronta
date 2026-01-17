/**
 * Componente LeadList
 * Exibe tabela de leads com paginação, ordenação e filtros
 */

import React, { useState, useEffect } from 'react';
import { useLeads } from '../hooks/useLeads';
import { Loading } from './Loading';
import { ErrorMessage } from './ErrorMessage';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import type { Lead, LeadFilters, LeadStatus } from '../types/lead';

export interface LeadListProps {
  leads?: Lead[]; // Opcional: se fornecido, usar em vez de buscar
  onLeadClick?: (leadId: string) => void;
  onNewLead?: () => void;
  onConvertLead?: (leadId: string) => void;
}

export function LeadList({ leads: leadsProp, onLeadClick, onNewLead, onConvertLead }: LeadListProps) {
  // Estado para filtros, ordenação e paginação (sempre necessário)
  const [filters, setFilters] = useState<LeadFilters>({});
  
  // Estado para ordenação
  const [orderBy, setOrderBy] = useState<'firstName' | 'createdAt'>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  
  // Estado para paginação
  const [page, setPage] = useState(1);
  const limit = 20;

  // Se leads fornecido como prop, usar; senão, buscar com hook
  const {
    leads: leadsFromHook,
    loading,
    error,
    pagination,
    refetch,
    setFilters: updateFilters,
    setPagination: updatePagination,
  } = useLeads(filters, {
    limit,
    offset: (page - 1) * limit,
    orderBy,
    order,
  });
  
  // Usar leads da prop se fornecido, senão usar do hook
  const leads = leadsProp || leadsFromHook;
  
  // Se leads vem da prop, não mostrar loading/error do hook
  const showLoading = leadsProp ? false : loading;
  const showError = leadsProp ? null : error;

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
  const handleSort = (column: 'firstName' | 'createdAt') => {
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

  const handleFilterChange = (key: keyof LeadFilters, value: string | boolean | undefined) => {
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
    setPage(1); // Resetar para primeira página
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updatePagination({ offset: (newPage - 1) * limit });
  };

  // Calcular número de páginas
  const totalPages = Math.ceil(pagination.total / limit);

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

  // Renderizar cabeçalho da tabela com ordenação
  const renderTableHeader = (column: 'firstName' | 'createdAt', label: string) => {
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
  if (showLoading && leads.length === 0) {
    return <Loading message="Carregando leads..." />;
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

        {onNewLead && (
          <Button onClick={onNewLead} variant="primary">
            Novo Lead
          </Button>
        )}
      </div>

      {/* Tabela de leads */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
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
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Nenhum lead encontrado
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
                de <span className="font-medium">{pagination.total}</span> leads
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
