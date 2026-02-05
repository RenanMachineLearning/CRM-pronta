/**
 * DataTable
 * Componente principal que combina TableView e MobileCardView
 */

import { useIsMobile } from '../../hooks/useMediaQuery';
import { DataTableProps } from './types';
import { TableView } from './TableView';
import { MobileCardView } from './MobileCardView';

export function DataTable<T>({
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
  viewMode = 'auto',
  stickyFirstColumn = true,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();

  // Determina modo de visualização
  const showCards = viewMode === 'cards' || (viewMode === 'auto' && isMobile);

  // Filtra colunas visíveis baseado na prioridade
  const visibleColumns = showCards
    ? columns.filter(col => col.priority === 'high' || !col.hiddenOn?.includes('mobile'))
    : columns;

  if (showCards) {
    return (
      <MobileCardView
        data={data}
        columns={visibleColumns}
        keyExtractor={keyExtractor}
        actions={actions}
        onRowClick={onRowClick}
        emptyState={emptyState}
      />
    );
  }

  return (
    <TableView
      data={data}
      columns={visibleColumns}
      keyExtractor={keyExtractor}
      loading={loading}
      pagination={pagination}
      sorting={sorting}
      actions={actions}
      onRowClick={onRowClick}
      emptyState={emptyState}
      striped={striped}
      hoverable={hoverable}
      stickyFirstColumn={stickyFirstColumn}
    />
  );
}

export default DataTable;
