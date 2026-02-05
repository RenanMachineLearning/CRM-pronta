/**
 * MobileCardView
 * Visualização em cards para mobile
 */

import { MobileCardViewProps } from './types';

export function MobileCardView<T>({
  data,
  columns,
  keyExtractor,
  actions,
  onRowClick,
  emptyState,
}: MobileCardViewProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-8">
        {emptyState || (
          <div className="text-center text-gray-500">
            Nenhum item encontrado
          </div>
        )}
      </div>
    );
  }

  // Filtra apenas colunas de alta prioridade para mobile
  const mobileColumns = columns.filter(
    col => col.priority === 'high' || !col.hiddenOn?.includes('mobile')
  );

  // Primeira coluna é sempre o título principal
  const titleColumn = mobileColumns[0];
  const detailColumns = mobileColumns.slice(1);

  return (
    <div className="space-y-3" role="list" aria-label="Lista de itens">
      {data.map((item, index) => (
        <div
          key={keyExtractor(item)}
          className={`
            bg-white rounded-lg shadow-sm border border-gray-200 p-4
            transition-all duration-200
            ${onRowClick ? 'cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500' : ''}
            ${index % 2 === 1 ? 'bg-gray-50/50' : ''}
          `}
          onClick={() => onRowClick?.(item)}
          onKeyDown={(e) => {
            if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onRowClick(item);
            }
          }}
          role={onRowClick ? 'button' : 'listitem'}
          tabIndex={onRowClick ? 0 : undefined}
          aria-label={`Item ${index + 1} de ${data.length}`}
        >
          {/* Cabeçalho do card - Título principal */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              {titleColumn.render ? (
                <div className="text-base font-semibold text-gray-900">
                  {titleColumn.render(item)}
                </div>
              ) : (
                <div className="text-base font-semibold text-gray-900 truncate">
                  {(item as any)[titleColumn.key]}
                </div>
              )}
            </div>
            
            {/* Ações */}
            {actions && (
              <div className="ml-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {actions(item)}
              </div>
            )}
          </div>

          {/* Detalhes */}
          <div className="space-y-2">
            {detailColumns.map((column) => (
              <div key={column.key} className="flex items-start">
                <span className="text-xs text-gray-500 w-20 flex-shrink-0">
                  {column.title}:
                </span>
                <span className="text-sm text-gray-700 flex-1">
                  {column.render 
                    ? column.render(item)
                    : (item as any)[column.key] || '-'
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MobileCardView;
