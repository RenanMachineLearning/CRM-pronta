/**
 * Componente NoteList
 * Exibe tabela de notas com paginação, ordenação, filtros e ações
 */

import { useState, useEffect } from 'react';
import { useNotes } from '../hooks/useNotes';
import { deleteNote } from '../services/noteService';
import { SkeletonTable } from './Skeleton';
import { ErrorMessage } from './ErrorMessage';
import { EmptyState } from './EmptyState';
import { ConfirmDialog } from './ConfirmDialog';
import { Button } from './Button';
import { useToast } from './Toast';
import { Select } from './Select';
import { ContactLookup } from './ContactLookup';
import { CompanyLookup } from './CompanyLookup';
import { LeadLookup } from './LeadLookup';
import { OpportunityLookup } from './OpportunityLookup';
import { SortableTableHeader } from './SortableTableHeader/SortableTableHeader';
import { Pagination } from './Pagination/Pagination';
import { useSorting } from '../hooks/useSorting';
import { usePagination } from '../hooks/usePagination';
import { useSortPaginationUrlSync } from '../hooks/useSortPaginationUrlSync';
import type {
  Note,
  NoteFilters,
  NoteType,
  NotePaginationParams,
} from '../types/note';

export interface NoteListProps {
  onNoteClick?: (noteId: string) => void;
  onNewNote?: () => void;
  notes?: Note[];
  initialFilters?: NoteFilters;
  initialPagination?: { limit?: number; offset?: number; orderBy?: string; order?: string };
  showFilters?: boolean;
  showPagination?: boolean;
  compact?: boolean;
}

export function NoteList({
  onNoteClick,
  onNewNote,
  notes: notesProp,
  initialFilters,
  showFilters = true,
  showPagination = true,
}: NoteListProps) {
  // Estado para filtros
  const [filters] = useState<NoteFilters>(initialFilters || {});
  
  // Hooks para ordenação e paginação (sempre inicializar, mas só usar se não usar notes da prop)
  const { sorting, updateSorting, setSortingState, toBackendParams: toSortParams } = useSorting('createdAt', 'desc');
  const { pagination: paginationState, updatePage, updateLimit, updateTotal, toBackendParams: toPaginationParams } = usePagination(1, 20, 0);

  // Estado para deletar nota
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Estado para modal de confirmação
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    noteId: string | null;
    noteContent: string;
  }>({
    isOpen: false,
    noteId: null,
    noteContent: '',
  });
  
  const toast = useToast();

  // Sincronizar ordenação e paginação com URL (sempre chamar, mas callbacks só fazem algo se não usar notes da prop)
  useSortPaginationUrlSync(
    sorting,
    paginationState,
    (newSort) => {
      if (!notesProp && (newSort.sortBy !== sorting.sortBy || newSort.sortOrder !== sorting.sortOrder)) {
        setSortingState(newSort);
      }
    },
    (newPagination) => {
      if (!notesProp) {
        if (newPagination.page !== undefined && newPagination.page !== paginationState.page) {
          updatePage(newPagination.page);
        }
        if (newPagination.limit !== undefined && newPagination.limit !== paginationState.limit) {
          updateLimit(newPagination.limit as any);
        }
      }
    }
  );

  // Se notes fornecido como prop, usar; senão, buscar com hook
  const {
    notes: notesFromHook,
    loading,
    error,
    pagination: paginationInfo,
    refetch,
    setFilters: updateFilters,
    setPagination: updatePagination,
  } = useNotes(
    initialFilters || filters,
    (() => {
      const paginationParams = toPaginationParams();
      const sortParams = toSortParams();
      return {
        ...paginationParams,
        orderBy: sortParams.orderBy === 'createdAt' ? 'createdAt' : undefined,
        order: sortParams.order,
      } as NotePaginationParams;
    })()
  );
  
  // Usar notes da prop se fornecido, senão usar do hook
  const notes = notesProp || notesFromHook;
  
  // Se notes vem da prop, não mostrar loading/error do hook
  const showLoading = notesProp ? false : loading;
  const showError = notesProp ? null : error;

  // Atualizar total quando receber resposta da API (apenas se não usar notes da prop)
  useEffect(() => {
    if (!notesProp) {
      updateTotal(paginationInfo.total);
    }
  }, [paginationInfo.total, updateTotal, notesProp]);

  // Atualizar paginação e ordenação na API quando mudarem (apenas se não usar notes da prop)
  useEffect(() => {
    if (!notesProp) {
      const sortParams = toSortParams();
      updatePagination({
        ...toPaginationParams(),
        orderBy: (sortParams.orderBy === 'createdAt' ? 'createdAt' : undefined) as 'createdAt' | undefined,
        order: sortParams.order,
      } as NotePaginationParams);
    }
  }, [paginationState.page, paginationState.limit, sorting.sortBy, sorting.sortOrder, updatePagination, toPaginationParams, toSortParams, notesProp]);

  // Handler para ordenação
  const handleSort = (field: string) => {
    if (!notesProp) {
      updateSorting(field);
      updatePage(1);
    }
  };

  const handleFilterChange = (key: keyof NoteFilters, value: string | undefined) => {
    if (!notesProp) {
      const newFilters = { ...filters };
      if (value !== undefined && value !== '') {
        newFilters[key] = value as any;
      } else {
        delete newFilters[key];
      }
      updateFilters(newFilters);
      updatePage(1);
    }
  };

  const handleClearFilters = () => {
    if (!notesProp) {
      updateFilters({});
      updatePage(1);
    }
  };

  const handleDeleteClick = (noteId: string, noteContent?: string) => {
    const contentPreview = noteContent 
      ? truncateContent(noteContent, 50) 
      : 'esta nota';
    
    setDeleteModal({
      isOpen: true,
      noteId,
      noteContent: contentPreview,
    });
  };
  
  const handleConfirmDelete = async () => {
    if (!deleteModal.noteId) return;
    
    try {
      setDeletingNoteId(deleteModal.noteId);
      setErrorMessage(null);
      await deleteNote(deleteModal.noteId);
      
      // Feedback de sucesso
      toast.success('Nota deletada com sucesso!');
      
      // Refetch lista
      if (!notesProp) {
        await refetch();
      }
      
      // Fecha o modal
      setDeleteModal({ isOpen: false, noteId: null, noteContent: '' });
    } catch (err) {
      let errorMessage = 'Erro ao deletar nota';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Mapear erros específicos
        if (errorMessage.includes('não encontrado') || errorMessage.includes('404')) {
          errorMessage = 'Nota não encontrada. Ela pode ter sido deletada por outro usuário.';
        } else if (errorMessage.includes('não tem permissão') || errorMessage.includes('403')) {
          errorMessage = 'Você não tem permissão para deletar esta nota. Apenas o criador ou um administrador pode deletá-la.';
        } else if (errorMessage.includes('500')) {
          errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
        }
      }
      
      setErrorMessage(errorMessage);
      setDeleteModal({ isOpen: false, noteId: null, noteContent: '' });
      
      // Scroll para mensagem de erro
      setTimeout(() => {
        const errorElement = document.querySelector('[role="alert"]');
        errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } finally {
      setDeletingNoteId(null);
    }
  };
  
  const handleCancelDelete = () => {
    setDeleteModal({ isOpen: false, noteId: null, noteContent: '' });
  };


  // Funções auxiliares
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      
      // Validar se data é válida
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      // Usar métodos locais para formatação (considera timezone do usuário)
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (err) {
      console.error('Erro ao formatar data:', err);
      return '-';
    }
  };

  const truncateContent = (content: string, maxLength: number = 150): string => {
    if (!content) return '';
    
    // Remover Markdown básico para contagem de caracteres mais precisa
    let plainText = content
      .replace(/#{1,6}\s+/g, '') // Headers (# ## ###)
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold (**text**)
      .replace(/\*(.*?)\*/g, '$1') // Italic (*text*)
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links [text](url)
      .replace(/`([^`]+)`/g, '$1') // Inline code (`code`)
      .replace(/```[\s\S]*?```/g, '') // Code blocks (```code```)
      .replace(/^\s*[-*+]\s+/gm, '') // List items (- item)
      .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists (1. item)
      .replace(/\n+/g, ' ') // Newlines to spaces
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .trim();
    
    if (plainText.length <= maxLength) {
      return plainText;
    }
    
    // Truncar em palavra completa se possível
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    const finalText = lastSpace > maxLength * 0.8 
      ? truncated.substring(0, lastSpace) 
      : truncated;
    
    return finalText + '...';
  };

  const getEntityName = (note: Note): string => {
    if (!note.relatedEntity) {
      return '-';
    }
    
    try {
      switch (note.relatedEntityType) {
        case 'Contact':
        case 'Lead':
          const firstName = note.relatedEntity.firstName || '';
          const lastName = note.relatedEntity.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          return fullName || '-';
        case 'Company':
        case 'Opportunity':
          return note.relatedEntity.name || '-';
        case 'Task':
          return note.relatedEntity.title || '-';
        default:
          return '-';
      }
    } catch (err) {
      // Em caso de erro ao acessar propriedades, retornar fallback
      console.error('Erro ao obter nome da entidade relacionada:', err);
      return '-';
    }
  };

  const getTypeLabel = (type: NoteType): string => {
    const labels: Record<NoteType, string> = {
      NOTE: 'Nota',
      COMMENT: 'Comentário',
      ANNOTATION: 'Anotação',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: NoteType): string => {
    const colors: Record<NoteType, string> = {
      NOTE: 'bg-blue-100 text-blue-800',
      COMMENT: 'bg-green-100 text-green-800',
      ANNOTATION: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const hasFilters = (): boolean => {
    return Object.keys(filters).length > 0;
  };


  // Renderizar lookup dinâmico baseado no tipo de entidade
  const renderEntityLookup = () => {
    const entityType = filters.relatedEntityType;
    const entityId = filters.relatedEntityId;

    if (!entityType) {
      return null;
    }

    const commonProps = {
      value: entityId || null,
      onChange: (id: string | null) => {
        handleFilterChange('relatedEntityId', id || undefined);
      },
    };

    switch (entityType) {
      case 'Contact':
        return <ContactLookup {...commonProps} />;
      case 'Company':
        return <CompanyLookup {...commonProps} />;
      case 'Lead':
        return <LeadLookup {...commonProps} />;
      case 'Opportunity':
        return <OpportunityLookup {...commonProps} />;
      default:
        return null;
    }
  };

  // Renderizar loading
  if (showLoading && notes.length === 0) {
    return <SkeletonTable rows={5} columns={4} />;
  }

  // Renderizar erro
  if (showError && notes.length === 0) {
    return <ErrorMessage message={showError} onRetry={refetch} />;
  }

  return (
    <div className="space-y-4">
      {/* Mensagem de erro ao deletar */}
      {errorMessage && (
        <div role="alert">
          <ErrorMessage message={errorMessage} onRetry={() => setErrorMessage(null)} />
        </div>
      )}

      {/* Barra de ações e filtros */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* Filtro de tipo */}
            <Select
              value={filters.type || ''}
              options={[
                { value: '', label: 'Todos os tipos' },
                { value: 'NOTE', label: 'Nota' },
                { value: 'COMMENT', label: 'Comentário' },
                { value: 'ANNOTATION', label: 'Anotação' },
              ]}
              onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
              className="w-full sm:w-48 mb-0"
            />

            {/* Filtro de tipo de entidade relacionada */}
            <Select
              value={filters.relatedEntityType || ''}
              options={[
                { value: '', label: 'Todas as entidades' },
                { value: 'Contact', label: 'Contato' },
                { value: 'Company', label: 'Empresa' },
                { value: 'Lead', label: 'Lead' },
                { value: 'Opportunity', label: 'Oportunidade' },
                { value: 'Task', label: 'Tarefa' },
              ]}
              onChange={(e) => {
                const newType = e.target.value || undefined;
                handleFilterChange('relatedEntityType', newType);
                // Resetar ID quando tipo mudar
                if (newType) {
                  handleFilterChange('relatedEntityId', undefined);
                }
              }}
              className="w-full sm:w-48 mb-0"
            />

            {/* Lookup dinâmico de entidade */}
            {filters.relatedEntityType && filters.relatedEntityType !== 'Task' && (
              <div className="w-full sm:w-48">
                {renderEntityLookup()}
              </div>
            )}

            {/* Input para Task ID (se Task for selecionado) */}
            {filters.relatedEntityType === 'Task' && (
              <input
                type="text"
                placeholder="ID da Tarefa"
                value={filters.relatedEntityId || ''}
                onChange={(e) => handleFilterChange('relatedEntityId', e.target.value || undefined)}
                className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            )}

            {/* Botão limpar filtros */}
            {hasFilters() && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearFilters}
                className="mb-0"
              >
                Limpar filtros
              </Button>
            )}
          </div>

          {onNewNote && (
            <Button onClick={onNewNote} variant="primary">
              Nova Nota
            </Button>
          )}
        </div>
      )}

      {/* Tabela de notas */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conteúdo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entidade Relacionada
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criado por
              </th>
              {notesProp ? (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
              ) : (
                <SortableTableHeader
                  fieldName="createdAt"
                  displayName="Data"
                  currentSort={sorting}
                  onSort={handleSort}
                />
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {notes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8">
                  <EmptyState
                    title="Nenhuma nota encontrada"
                    description={hasFilters()
                      ? 'Tente ajustar os filtros aplicados para ver mais resultados.'
                      : 'Comece criando uma nova nota para registrar informações importantes.'}
                    icon="note"
                    actionLabel={hasFilters() ? undefined : "Nova Nota"}
                    onAction={hasFilters() ? undefined : onNewNote}
                    variant="table"
                    filtersApplied={hasFilters()}
                  />
                </td>
              </tr>
            ) : (
              notes.map((note) => (
                <tr
                  key={note.id}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 max-w-md">
                      {note.content ? truncateContent(note.content) : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(note.type)}`}
                    >
                      {getTypeLabel(note.type)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getEntityName(note)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {note.createdBy?.name || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(note.createdAt)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      {onNoteClick && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onNoteClick(note.id)}
                          aria-label={`Editar nota ${note.id}`}
                        >
                          Editar
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeleteClick(note.id, note.content)}
                        disabled={deletingNoteId === note.id}
                        aria-label={`Deletar nota ${note.id}`}
                        aria-busy={deletingNoteId === note.id}
                      >
                        {deletingNoteId === note.id ? 'Deletando...' : 'Deletar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação - apenas se não usar notes da prop */}
      {showPagination && !notesProp && (
        <Pagination
          pagination={paginationState}
          onPageChange={updatePage}
          onLimitChange={updateLimit}
        />
      )}
      
      {/* Modal de confirmação de deleção */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Deletar Nota"
        message={`Tem certeza que deseja deletar "${deleteModal.noteContent}"?\n\nEsta ação não pode ser desfeita.`}
        confirmText="Deletar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={!!deletingNoteId}
      />
    </div>
  );
}
