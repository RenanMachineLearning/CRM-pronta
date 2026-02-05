import { Button } from './Button';
import {
  MagnifyingGlassIcon,
  InboxIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline';

export type EmptyStateIcon =
  | 'search'
  | 'inbox'
  | 'users'
  | 'building'
  | 'task'
  | 'note'
  | 'opportunity'
  | 'folder';

export type EmptyStateVariant = 'table' | 'card' | 'page';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: EmptyStateIcon;
  actionLabel?: string;
  onAction?: () => void;
  variant?: EmptyStateVariant;
  filtersApplied?: boolean;
  className?: string;
}

const iconComponents: Record<EmptyStateIcon, React.ComponentType<{ className?: string }>> = {
  search: MagnifyingGlassIcon,
  inbox: InboxIcon,
  users: UsersIcon,
  building: BuildingOfficeIcon,
  task: ClipboardDocumentListIcon,
  note: DocumentTextIcon,
  opportunity: CurrencyDollarIcon,
  folder: FolderOpenIcon,
};

const variantStyles: Record<EmptyStateVariant, { container: string; icon: string; title: string; description: string }> =
  {
    table: {
      container: 'text-center py-8',
      icon: 'w-12 h-12 mx-auto text-gray-400',
      title: 'text-lg font-medium text-gray-900 mb-1',
      description: 'text-sm text-gray-500 max-w-md mx-auto',
    },
    card: {
      container: 'text-center py-12',
      icon: 'w-16 h-16 mx-auto text-gray-400',
      title: 'text-xl font-medium text-gray-900 mb-2',
      description: 'text-base text-gray-500 max-w-md mx-auto',
    },
    page: {
      container: 'text-center py-16',
      icon: 'w-20 h-20 mx-auto text-gray-400',
      title: 'text-2xl font-medium text-gray-900 mb-3',
      description: 'text-lg text-gray-500 max-w-lg mx-auto',
    },
  };

export function EmptyState({
  title,
  description,
  icon = 'inbox',
  actionLabel,
  onAction,
  variant = 'table',
  filtersApplied = false,
  className = '',
}: EmptyStateProps) {
  const IconComponent = iconComponents[icon];
  const styles = variantStyles[variant];

  // Ajusta mensagens se houver filtros aplicados
  const displayTitle = filtersApplied ? 'Nenhum resultado encontrado' : title;
  const displayDescription =
    filtersApplied && description
      ? 'Tente ajustar os filtros aplicados para ver mais resultados.'
      : description;

  return (
    <div className={`${styles.container} ${className}`} role="status" aria-label={displayTitle}>
      <div className="mb-4">
        <IconComponent className={styles.icon} aria-hidden="true" />
      </div>

      <h3 className={styles.title}>{displayTitle}</h3>

      {displayDescription && <p className={styles.description}>{displayDescription}</p>}

      {actionLabel && onAction && !filtersApplied && (
        <div className="mt-6">
          <Button onClick={onAction} variant="primary">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
