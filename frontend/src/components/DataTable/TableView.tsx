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

  return (
    <div className="space-y-4">
      {/* Container com scroll horizontal */}
      <div className="relative bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.key}
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, rowIndex) => (
                <tr
                  key={keyExtractor(item)}
                  className={`
                    ${striped && rowIndex % 2 === 1 ? 'bg-gray-50' : ''}
                    ${hoverable ? 'hover:bg-gray-100' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={column.key}
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
