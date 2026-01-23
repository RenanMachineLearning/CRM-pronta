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
  
  // Estado para ordenação
  const [orderBy, setOrderBy] = useState<'name' | 'createdAt'>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  
  // Estado para paginação
  const [page, setPage] = useState(1);
  const limit = 20;

  // Hook para buscar empresas
  const {
    companies,
    loading,
    error,
    pagination,
    refetch,
    setFilters: updateFilters,
    setPagination: updatePagination,
    setAdvancedFilters: updateAdvancedFilters,
  } = useCompanies(
    filters,
    {
      limit,
      offset: (page - 1) * limit,
      orderBy,
      order,
    },
    advancedFilters
  );

  // Atualizar filtros avançados quando mudarem externamente
  useEffect(() => {
    updateAdvancedFilters(advancedFilters);
    setPage(1); // Resetar para primeira página
  }, [advancedFilters, updateAdvancedFilters]);

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
  const handleSort = (column: 'name' | 'createdAt') => {
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

  const handleFilterChange = (key: keyof CompanyFilters, value: string | undefined) => {
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

  // Renderizar cabeçalho da tabela com ordenação
  const renderTableHeader = (column: 'name' | 'createdAt', label: string) => {
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
              {renderTableHeader('name', 'Nome')}
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
                de <span className="font-medium">{pagination.total}</span> empresas
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

