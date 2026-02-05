/**
 * TableView
 * Visualização em tabela para desktop
 */

import { TableViewProps } from './types';
import { Pagination } from '../Pagination/Pagination';
import { SortableTableHeader } from '../SortableTableHeader/SortableTableHeader';
import { SkeletonTable } from '../Skeleton';

export function TableView<T>({
  data,
  columns,
  keyExtractor,
  loading,
  pagination,
  sorting,
  actions,
  onRowClick,
  emptyState,
  striped = true,
  hoverable = true,
  stickyFirstColumn = true,
}: TableViewProps<T>) {
  if (loading) {
    return <SkeletonTable rows={5} columns={columns.length} />;
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 text-center text-gray-500">
          {emptyState || 'Nenhum item encontrado'}
        </div>
      </div>
    );
  }

  const tableCaption = `Tabela com ${data.length} itens`;

  return (
    <div className="space-y-4">
      {/* Container com scroll horizontal */}
      <div className="relative bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table 
            className="min-w-full divide-y divide-gray-200"
            role="table"
            aria-label={tableCaption}
          >
            <caption className="sr-only">{tableCaption}</caption>
            <thead className="bg-gray-50">
              <tr role="row">
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    scope="col"
                    role="columnheader"
                    className={`
                      px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                      ${column.className || ''}
                      ${stickyFirstColumn && index === 0 ? 'sticky left-0 z-10 bg-gray-50' : ''}
                    `}
                    style={{ width: column.width, minWidth: column.width }}
                  >
                    {sorting && column.sortable !== false ? (
                      <SortableTableHeader
                        fieldName={column.key}
                        displayName={column.title}
                        currentSort={{
                          sortBy: sorting.sortBy || '',
                          sortOrder: sorting.sortOrder || 'asc',
                        }}
                        onSort={sorting.onSort}
                      />
                    ) : (
                      column.title
                    )}
                  </th>
                ))}
                {actions && (
                  <th 
                    scope="col"
                    role="columnheader"
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200" role="rowgroup">
              {data.map((item, rowIndex) => (
                <tr
                  key={keyExtractor(item)}
                  role="row"
                  tabIndex={onRowClick ? 0 : undefined}
                  className={`
                    ${striped && rowIndex % 2 === 1 ? 'bg-gray-50' : ''}
                    ${hoverable ? 'hover:bg-gray-100' : ''}
                    ${onRowClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset' : ''}
                  `}
                  onClick={() => onRowClick?.(item)}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onRowClick(item);
                    }
                  }}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={column.key}
                      role="cell"
                      className={`
                        px-4 py-4 whitespace-nowrap text-sm text-gray-900
                        ${column.className || ''}
                        ${stickyFirstColumn && colIndex === 0 ? 'sticky left-0 z-10 bg-white' : ''}
                      `}
                    >
                      {column.render 
                        ? column.render(item)
                        : (item as any)[column.key]
                      }
                    </td>
                  ))}
                  {actions && (
                    <td 
                      role="cell"
                      className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(item)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {pagination && (
        <Pagination
          pagination={{
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: Math.ceil(pagination.total / pagination.limit) || 1,
          }}
          onPageChange={pagination.onPageChange}
          onLimitChange={(newLimit) => pagination.onLimitChange(newLimit as number)}
        />
      )}
    </div>
  );
}

export default TableView;
