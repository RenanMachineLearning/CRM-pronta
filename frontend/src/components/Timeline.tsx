/**
 * Componente Timeline
 * 
 * Exibe histórico unificado de atividades (tarefas, notas e logs de auditoria)
 * relacionadas a uma entidade específica, agrupadas por data.
 */

import React from 'react';
import { useTimeline } from '../hooks/useTimeline';
import { Loading } from './Loading';
import { ErrorMessage } from './ErrorMessage';
import { Button } from './Button';
import type {
  TimelineItem,
  TimelineGroup,
  TaskTimelineData,
  NoteTimelineData,
  AuditTimelineData,
  EntityType,
  TaskStatus,
  TaskPriority,
  NoteType,
  AuditAction,
} from '../types/timeline';

// Props do componente Timeline
export interface TimelineProps {
  entityType: EntityType;
  entityId: string;
  onTaskClick?: (taskId: string) => void;
  onNoteClick?: (noteId: string) => void;
  compact?: boolean;
  showLoadMore?: boolean;
  maxItems?: number;
}

// ============================================================================
// Funções auxiliares de formatação
// ============================================================================

/**
 * Formata data absoluta (DD/MM/AAAA HH:mm)
 */
function formatAbsoluteDate(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

/**
 * Formata data relativa ("há 2 horas", "há 3 dias", etc.)
 */
function formatRelativeDate(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '-';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    
    // Se for mais antigo, usar formatação absoluta
    return formatAbsoluteDate(timestamp);
  } catch {
    return '-';
  }
}

/**
 * Trunca conteúdo mantendo texto legível
 */
function truncateContent(content: string, maxLength: number = 150): string {
  if (!content) return '';
  
  // Remove markdown básico para exibição mais limpa
  let text = content
    .replace(/#{1,6}\s/g, '') // Headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
    .replace(/\*(.+?)\*/g, '$1') // Italic
    .replace(/`(.+?)`/g, '$1') // Code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
    .replace(/\n+/g, ' ') // Line breaks
    .trim();
  
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// ============================================================================
// Funções de tradução e cores
// ============================================================================

/** Traduz status da tarefa */
function translateStatus(status: TaskStatus): string {
  const translations: Record<TaskStatus, string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada',
  };
  return translations[status] || status;
}

/** Traduz prioridade da tarefa */
function translatePriority(priority: TaskPriority): string {
  const translations: Record<TaskPriority, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
  };
  return translations[priority] || priority;
}

/** Traduz tipo de nota */
function translateNoteType(type: NoteType): string {
  const translations: Record<NoteType, string> = {
    NOTE: 'Nota',
    COMMENT: 'Comentário',
    ANNOTATION: 'Anotação',
  };
  return translations[type] || type;
}

/** Traduz ação de auditoria */
function translateAuditAction(action: AuditAction): string {
  const translations: Record<AuditAction, string> = {
    create: 'Criação',
    update: 'Atualização',
    delete: 'Exclusão',
  };
  return translations[action] || action;
}

/** Cor do status */
function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/** Cor da prioridade */
function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    LOW: 'text-gray-500',
    MEDIUM: 'text-yellow-600',
    HIGH: 'text-red-600',
  };
  return colors[priority] || 'text-gray-500';
}

/** Cor da ação de auditoria */
function getAuditActionColor(action: AuditAction): string {
  const colors: Record<AuditAction, string> = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
  };
  return colors[action] || 'bg-gray-100 text-gray-800';
}

// ============================================================================
// Componentes de ícones
// ============================================================================

/** Ícone de tarefa */
function TaskIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

/** Ícone de nota */
function NoteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

/** Ícone de auditoria */
function AuditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ============================================================================
// Componentes de renderização de itens
// ============================================================================

interface TimelineItemProps {
  item: TimelineItem;
  onTaskClick?: (taskId: string) => void;
  onNoteClick?: (noteId: string) => void;
  compact?: boolean;
}

/** Renderiza item de tarefa */
function TaskTimelineItem({ item, onTaskClick, compact }: TimelineItemProps) {
  const data = item.data as TaskTimelineData;
  
  const handleClick = () => {
    if (onTaskClick) {
      onTaskClick(item.id);
    }
  };

  return (
    <div 
      className={`flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${onTaskClick ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
      role={onTaskClick ? 'button' : undefined}
      tabIndex={onTaskClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onTaskClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Tarefa: ${data.title}`}
    >
      {/* Ícone */}
      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
        <TaskIcon />
      </div>
      
      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 truncate">{data.title}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(data.status)}`}>
            {translateStatus(data.status)}
          </span>
          <span className={`text-xs font-medium ${getPriorityColor(data.priority)}`}>
            {translatePriority(data.priority)}
          </span>
        </div>
        
        <div className="text-sm text-gray-500 mt-1">
          {item.userName || 'Usuário desconhecido'} • {formatRelativeDate(item.timestamp)}
        </div>
        
        {!compact && data.description && (
          <div className="text-sm text-gray-600 mt-1">
            {truncateContent(data.description, 100)}
          </div>
        )}
        
        {!compact && data.dueDate && (
          <div className="text-xs text-gray-500 mt-1">
            Vencimento: {formatAbsoluteDate(data.dueDate)}
          </div>
        )}
      </div>
    </div>
  );
}

/** Renderiza item de nota */
function NoteTimelineItem({ item, onNoteClick, compact }: TimelineItemProps) {
  const data = item.data as NoteTimelineData;
  
  const handleClick = () => {
    if (onNoteClick) {
      onNoteClick(item.id);
    }
  };

  return (
    <div 
      className={`flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${onNoteClick ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
      role={onNoteClick ? 'button' : undefined}
      tabIndex={onNoteClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onNoteClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${translateNoteType(data.noteType)}`}
    >
      {/* Ícone */}
      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
        <NoteIcon />
      </div>
      
      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{translateNoteType(data.noteType)}</span>
        </div>
        
        <div className="text-sm text-gray-500 mt-1">
          {item.userName || 'Usuário desconhecido'} • {formatRelativeDate(item.timestamp)}
        </div>
        
        {!compact && data.content && (
          <div className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded border-l-2 border-purple-300">
            "{truncateContent(data.content, 150)}"
          </div>
        )}
      </div>
    </div>
  );
}

/** Renderiza item de auditoria */
function AuditTimelineItem({ item, compact }: TimelineItemProps) {
  const data = item.data as AuditTimelineData;
  
  // Resumir mudanças para exibição
  const getChangeSummary = (): string => {
    if (!data.changes || typeof data.changes !== 'object') {
      return '';
    }
    
    const fields = Object.keys(data.changes);
    if (fields.length === 0) return '';
    
    if (fields.length === 1) {
      return `Campo "${fields[0]}" alterado`;
    }
    
    if (fields.length <= 3) {
      return `Campos alterados: ${fields.join(', ')}`;
    }
    
    return `${fields.slice(0, 2).join(', ')} e mais ${fields.length - 2} campos`;
  };

  const changeSummary = getChangeSummary();

  return (
    <div 
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
      aria-label={`Registro de ${translateAuditAction(data.action)}`}
    >
      {/* Ícone */}
      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
        <AuditIcon />
      </div>
      
      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getAuditActionColor(data.action)}`}>
            {translateAuditAction(data.action)}
          </span>
        </div>
        
        <div className="text-sm text-gray-500 mt-1">
          {item.userName || 'Usuário desconhecido'} • {formatRelativeDate(item.timestamp)}
        </div>
        
        {!compact && changeSummary && (
          <div className="text-sm text-gray-600 mt-1">
            {changeSummary}
          </div>
        )}
      </div>
    </div>
  );
}

/** Renderiza um item da timeline baseado no tipo */
function TimelineItemRenderer({ item, onTaskClick, onNoteClick, compact }: TimelineItemProps) {
  switch (item.type) {
    case 'task':
      return <TaskTimelineItem item={item} onTaskClick={onTaskClick} compact={compact} />;
    case 'note':
      return <NoteTimelineItem item={item} onNoteClick={onNoteClick} compact={compact} />;
    case 'audit':
      return <AuditTimelineItem item={item} compact={compact} />;
    default:
      return null;
  }
}

// ============================================================================
// Componente de grupo
// ============================================================================

interface TimelineGroupComponentProps {
  group: TimelineGroup;
  onTaskClick?: (taskId: string) => void;
  onNoteClick?: (noteId: string) => void;
  compact?: boolean;
  isLast?: boolean;
}

function TimelineGroupComponent({ 
  group, 
  onTaskClick, 
  onNoteClick, 
  compact,
  isLast = false 
}: TimelineGroupComponentProps) {
  return (
    <div className={`${!isLast ? 'mb-6' : ''}`}>
      {/* Header do grupo */}
      <div className="flex items-center mb-3">
        <div className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full" />
        <h3 className="ml-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {group.label}
        </h3>
        <div className="flex-1 ml-4 border-t border-gray-200" />
      </div>
      
      {/* Itens do grupo */}
      <div className="ml-4 border-l-2 border-gray-200 pl-4 space-y-2">
        {group.items.map((item) => (
          <TimelineItemRenderer
            key={`${item.type}-${item.id}`}
            item={item}
            onTaskClick={onTaskClick}
            onNoteClick={onNoteClick}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Componente principal Timeline
// ============================================================================

export function Timeline({
  entityType,
  entityId,
  onTaskClick,
  onNoteClick,
  compact = false,
  showLoadMore = true,
  maxItems,
}: TimelineProps) {
  // Hook para buscar timeline
  const {
    items,
    groups,
    loading,
    loadingMore,
    error,
    pagination,
    hasMore,
    refetch,
    loadMore,
  } = useTimeline(entityType, entityId, { limit: maxItems || 20 });

  // Aplicar limite máximo se especificado
  const displayedGroups = maxItems 
    ? groups.map(group => ({
        ...group,
        items: group.items.slice(0, maxItems - groups.slice(0, groups.indexOf(group))
          .reduce((acc, g) => acc + g.items.length, 0))
      })).filter(group => group.items.length > 0)
    : groups;

  // Estado de loading inicial
  if (loading && items.length === 0) {
    return <Loading message="Carregando histórico..." />;
  }

  // Estado de erro
  if (error && items.length === 0) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  // Estado vazio
  if (!loading && items.length === 0) {
    return (
      <div className="text-center py-8" role="status" aria-label="Nenhuma atividade encontrada">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Nenhuma atividade registrada
        </h3>
        <p className="text-sm text-gray-500">
          Crie uma tarefa ou nota para começar a registrar o histórico.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="feed" aria-label="Histórico de atividades" aria-busy={loading || loadingMore}>
      {/* Lista de grupos */}
      {displayedGroups.map((group, index) => (
        <TimelineGroupComponent
          key={group.label}
          group={group}
          onTaskClick={onTaskClick}
          onNoteClick={onNoteClick}
          compact={compact}
          isLast={index === displayedGroups.length - 1 && !hasMore}
        />
      ))}
      
      {/* Botão carregar mais */}
      {showLoadMore && hasMore && !maxItems && (
        <div className="flex justify-center pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadMore}
            disabled={loadingMore}
            aria-label="Carregar mais atividades"
          >
            {loadingMore ? 'Carregando...' : `Carregar mais (${pagination.total - items.length} restantes)`}
          </Button>
        </div>
      )}
      
      {/* Indicador de loading durante carregar mais */}
      {loadingMore && (
        <div className="flex justify-center py-4" aria-live="polite">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      )}
      
      {/* Mensagem de erro durante carregar mais */}
      {error && items.length > 0 && (
        <div className="mt-4">
          <ErrorMessage message={error} onRetry={loadMore} />
        </div>
      )}
    </div>
  );
}
