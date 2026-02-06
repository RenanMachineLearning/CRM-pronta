/**
 * Página de notas
 * Exibe listagem de notas com filtros
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { NoteList } from '../components/NoteList';
import { Breadcrumb } from '../components/Breadcrumb';
import type { RelatedEntityType } from '../types/note';

export function NotesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // Extrair filtros de query params (opcional)
  const relatedEntityType = searchParams.get('relatedEntityType') as RelatedEntityType | null;
  const relatedEntityId = searchParams.get('relatedEntityId');
  
  const initialFilters = relatedEntityType && relatedEntityId
    ? {
        relatedEntityType,
        relatedEntityId,
      }
    : undefined;

  const handleNewNote = () => {
    navigate('/notes/new');
  };

  const handleNoteClick = (noteId: string) => {
    navigate(`/notes/${noteId}/edit`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <Breadcrumb className="mb-4" />
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Notas</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Gerencie todas as suas notas e anotações
            </p>
          </div>
        </div>
      </div>

      {/* Lista de notas */}
      <div className="bg-bg-surface shadow rounded-lg p-6">
        <NoteList
          onNoteClick={handleNoteClick}
          onNewNote={handleNewNote}
          initialFilters={initialFilters}
        />
      </div>
    </div>
  );
}
