import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';

export interface BreadcrumbProps {
  className?: string;
  showHomeIcon?: boolean;
  maxItems?: number;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  className = '',
  showHomeIcon = true,
  maxItems = 4,
}) => {
  const location = useLocation();
  const { items, isLoading } = useBreadcrumbs();

  // Não mostra breadcrumb se estiver na home
  if (location.pathname === '/') {
    return null;
  }

  // Trunca se houver muitos itens
  const displayItems = items.length > maxItems
    ? [items[0], { label: '...', path: '' }, ...items.slice(-(maxItems - 2))]
    : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center text-sm ${className}`}
    >
      <ol className="flex items-center flex-wrap gap-1">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isFirst = index === 0;

          return (
            <li
              key={`${item.path}-${index}`}
              className="flex items-center"
            >
              {/* Separador (exceto no primeiro item) */}
              {!isFirst && (
                <ChevronRightIcon
                  className="w-4 h-4 mx-1 text-text-tertiary flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              {/* Item */}
              {isLast || item.path === '' ? (
                // Item atual (não clicável) ou ellipsis
                <span
                  className={`${
                    item.path === ''
                      ? 'text-text-tertiary px-1'
                      : 'text-text-primary font-medium'
                  } ${isLoading && isLast ? 'animate-pulse' : ''}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {isFirst && showHomeIcon && item.path === '/' ? (
                    <span className="flex items-center gap-1">
                      <HomeIcon className="w-4 h-4" aria-hidden="true" />
                      <span className="sr-only">{item.label}</span>
                      <span className="hidden sm:inline">{item.label}</span>
                    </span>
                  ) : (
                    item.label
                  )}
                </span>
              ) : (
                // Link clicável
                <Link
                  to={item.path}
                  className="text-text-secondary hover:text-primary-600 transition-colors duration-150 flex items-center gap-1"
                >
                  {isFirst && showHomeIcon && item.path === '/' ? (
                    <>
                      <HomeIcon className="w-4 h-4" aria-hidden="true" />
                      <span className="sr-only">{item.label}</span>
                      <span className="hidden sm:inline">{item.label}</span>
                    </>
                  ) : (
                    item.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/**
 * Versão simplificada do breadcrumb para uso em cards/paineis
 */
export const BreadcrumbSimple: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const location = useLocation();
  const { items } = useBreadcrumbs();

  if (location.pathname === '/') {
    return null;
  }

  // Pega apenas o último item (página atual)
  const currentPage = items[items.length - 1];
  const parentPage = items.length > 1 ? items[items.length - 2] : null;

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {parentPage && (
        <>
          <Link
            to={parentPage.path}
            className="text-text-tertiary hover:text-primary-600 transition-colors"
          >
            {parentPage.label}
          </Link>
          <ChevronRightIcon className="w-4 h-4 text-text-tertiary" />
        </>
      )}
      <span className="text-text-primary font-medium">
        {currentPage?.label}
      </span>
    </div>
  );
};

export default Breadcrumb;
