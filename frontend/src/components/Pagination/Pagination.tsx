/**
 * Componente completo de paginação
 * Inclui botões de navegação, números de página, input para ir para página e seletor de itens por página
 */

import React, { useState, FormEvent } from 'react';
import { Button } from '../Button';
import type { PaginationProps } from './types';
import type { ItemsPerPageOption } from '../../types/pagination.types';
import { ITEMS_PER_PAGE_OPTIONS } from '../../types/pagination.types';

export function Pagination({
  pagination,
  onPageChange,
  onLimitChange,
  className = '',
  showItemsPerPage = true,
  showGoToPage = true,
}: PaginationProps) {
  const [goToPageValue, setGoToPageValue] = useState('');

  const isFirstPage = pagination.page === 1;
  const isLastPage = pagination.page >= pagination.totalPages;

  // Calcular páginas a exibir
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 2; // Páginas ao redor da atual
    const left = Math.max(1, pagination.page - delta);
    const right = Math.min(pagination.totalPages, pagination.page + delta);

    if (left > 1) {
      pages.push(1);
      if (left > 2) pages.push('ellipsis');
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < pagination.totalPages) {
      if (right < pagination.totalPages - 1) pages.push('ellipsis');
      pages.push(pagination.totalPages);
    }

    return pages;
  };

  const handleGoToPage = (e: FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(goToPageValue, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pagination.totalPages) {
      onPageChange(pageNum);
      setGoToPageValue('');
    }
  };

  if (pagination.totalPages <= 1) {
    return null; // Não mostrar paginação se houver apenas uma página
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 bg-white px-4 py-3 sm:px-6 ${className}`}>
      {/* Informações */}
      <div className="text-sm text-gray-700">
        Mostrando{' '}
        <span className="font-medium">
          {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
        </span>{' '}
        a{' '}
        <span className="font-medium">
          {Math.min(pagination.page * pagination.limit, pagination.total)}
        </span>{' '}
        de <span className="font-medium">{pagination.total}</span> registros
      </div>

      {/* Controles */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Botões de navegação */}
        <nav className="flex items-center gap-1" aria-label="Paginação">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={isFirstPage}
            aria-label="Primeira página"
          >
            ««
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={isFirstPage}
            aria-label="Página anterior"
          >
            «
          </Button>

          {/* Números de página */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((pageNum, index) => {
              if (pageNum === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-2 text-gray-500"
                  >
                    ...
                  </span>
                );
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === pagination.page ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  aria-label={`Página ${pageNum}`}
                  aria-current={pageNum === pagination.page ? 'page' : undefined}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={isLastPage}
            aria-label="Próxima página"
          >
            »
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(pagination.totalPages)}
            disabled={isLastPage}
            aria-label="Última página"
          >
            »»
          </Button>
        </nav>

        {/* Input para ir para página */}
        {showGoToPage && (
          <form onSubmit={handleGoToPage} className="flex items-center gap-1">
            <label htmlFor="goto-page" className="sr-only">
              Ir para página
            </label>
            <input
              id="goto-page"
              type="number"
              min="1"
              max={pagination.totalPages}
              value={goToPageValue}
              onChange={(e) => setGoToPageValue(e.target.value)}
              placeholder="Pág."
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" variant="secondary" size="sm">
              Ir
            </Button>
          </form>
        )}

        {/* Seletor de itens por página */}
        {showItemsPerPage && onLimitChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="items-per-page" className="text-sm text-gray-700 whitespace-nowrap">
              Itens por página:
            </label>
            <select
              id="items-per-page"
              value={pagination.limit.toString()}
              onChange={(e) => onLimitChange(parseInt(e.target.value, 10) as ItemsPerPageOption)}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                <option key={opt} value={opt.toString()}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
