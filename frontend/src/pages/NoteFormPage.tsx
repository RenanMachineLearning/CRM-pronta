/**
 * Página de formulário de nota
 * Permite criar ou editar uma nota
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { NoteForm } from '../components/NoteForm';
import { createNote, updateNote, getNoteById } from '../services/noteService';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import type { NoteFormData, RelatedEntityType } from '../types/note';

export function NoteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  // Extrair filtros de query params para pré-preenchimento
  const relatedEntityType = searchParams.get('relatedEntityType') as RelatedEntityType | null;
  const relatedEntityId = searchParams.get('relatedEntityId');

  // Verificar se está em modo edição
  const isEditMode = !!id;

  // Carregar nota se modo edição
  useEffect(() => {
    if (id) {
      loadNote();
    }
  }, [id]);

  const loadNote = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      await getNoteById(id);
      // NoteForm já carrega a nota internamente
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar nota');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: NoteFormData) => {
    try {
      setLoading(true);
      setError(null);

      if (isEditMode && id) {
        await updateNote(id, data);
      } else {
        await createNote(data);
      }

      // Redirecionar para lista de notas
      navigate('/notes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar nota');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/notes');
  };

  if (loading && isEditMode) {
    return <Loading message="Carregando nota..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditMode ? 'Editar Nota' : 'Nova Nota'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {isEditMode ? 'Edite os detalhes da nota' : 'Crie uma nova nota ou anotação'}
        </p>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="bg-white shadow rounded-lg p-6">
        <NoteForm
          noteId={id}
          relatedEntityType={relatedEntityType || undefined}
          relatedEntityId={relatedEntityId || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
