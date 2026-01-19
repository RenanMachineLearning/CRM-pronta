/**
 * Componente NoteForm
 * Formulário completo para criar/editar nota
 */

import React, { useState, useEffect } from 'react';
import { NoteEditor } from './NoteEditor';
import { Select } from './Select';
import { Input } from './Input';
import { Button } from './Button';
import { Loading } from './Loading';
import { ErrorMessage } from './ErrorMessage';
import { getNoteById, createNote, updateNote } from '../services/noteService';
import type {
  Note,
  NoteFormData,
  NoteFormErrors,
  NoteType,
  RelatedEntityType,
} from '../types/note';

export interface NoteFormProps {
  noteId?: string; // Se fornecido, modo edição
  relatedEntityType?: RelatedEntityType; // Pré-preenchido se fornecido
  relatedEntityId?: string; // Pré-preenchido se fornecido
  onSubmit: (data: NoteFormData) => Promise<void>;
  onCancel?: () => void;
}

export function NoteForm({ noteId, relatedEntityType, relatedEntityId, onSubmit, onCancel }: NoteFormProps) {
  const [loading, setLoading] = useState(!!noteId);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);

  const [formData, setFormData] = useState<NoteFormData>({
    content: '',
    type: 'NOTE',
    relatedEntityType: relatedEntityType || 'Contact',
    relatedEntityId: relatedEntityId || '',
  });

  const [errors, setErrors] = useState<NoteFormErrors>({});

  // Carregar dados da nota se modo edição
  useEffect(() => {
    if (noteId) {
      loadNote();
    }
  }, [noteId]);

  // Atualizar formData quando relatedEntityType ou relatedEntityId mudarem
  useEffect(() => {
    if (relatedEntityType) {
      setFormData((prev) => ({ ...prev, relatedEntityType }));
    }
    if (relatedEntityId) {
      setFormData((prev) => ({ ...prev, relatedEntityId }));
    }
  }, [relatedEntityType, relatedEntityId]);

  const loadNote = async () => {
    try {
      setLoading(true);
      const loadedNote = await getNoteById(noteId!);
      setNote(loadedNote);
      setFormData({
        content: loadedNote.content,
        type: loadedNote.type,
        relatedEntityType: loadedNote.relatedEntityType,
        relatedEntityId: loadedNote.relatedEntityId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar nota');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: NoteFormErrors = {};

    // Validar content (obrigatório, não vazio após trim, max 10.000 caracteres)
    const trimmedContent = formData.content.trim();
    if (!trimmedContent) {
      newErrors.content = 'Conteúdo é obrigatório e não pode ser vazio';
    } else if (formData.content.length > 10000) {
      newErrors.content = 'Conteúdo não pode exceder 10.000 caracteres';
    }

    // Validar type (se fornecido, deve ser um dos valores válidos)
    if (formData.type && !['NOTE', 'COMMENT', 'ANNOTATION'].includes(formData.type)) {
      newErrors.type = 'Tipo inválido';
    }

    // Validar relatedEntityType (obrigatório, deve ser um dos valores válidos)
    if (!formData.relatedEntityType) {
      newErrors.relatedEntityType = 'Tipo de entidade relacionada é obrigatório';
    } else if (!['Contact', 'Company', 'Lead', 'Opportunity', 'Task'].includes(formData.relatedEntityType)) {
      newErrors.relatedEntityType = 'Tipo de entidade relacionada inválido';
    }

    // Validar relatedEntityId (obrigatório, deve ser UUID válido)
    if (!formData.relatedEntityId) {
      newErrors.relatedEntityId = 'ID da entidade relacionada é obrigatório';
    } else {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formData.relatedEntityId)) {
        newErrors.relatedEntityId = 'ID deve ser um UUID válido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar nota');
    } finally {
      setLoading(false);
    }
  };

  if (loading && noteId) {
    return <Loading message="Carregando nota..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorMessage message={error} />}

      <Select
        label="Tipo"
        value={formData.type || 'NOTE'}
        onChange={(e) => setFormData({ ...formData, type: e.target.value as NoteType })}
        options={[
          { value: 'NOTE', label: 'Nota' },
          { value: 'COMMENT', label: 'Comentário' },
          { value: 'ANNOTATION', label: 'Anotação' },
        ]}
        error={errors.type}
      />

      <Select
        label="Entidade Relacionada *"
        value={formData.relatedEntityType}
        onChange={(e) => setFormData({ ...formData, relatedEntityType: e.target.value as RelatedEntityType })}
        options={[
          { value: 'Contact', label: 'Contato' },
          { value: 'Company', label: 'Empresa' },
          { value: 'Lead', label: 'Lead' },
          { value: 'Opportunity', label: 'Oportunidade' },
          { value: 'Task', label: 'Tarefa' },
        ]}
        error={errors.relatedEntityType}
        disabled={!!relatedEntityType} // Desabilitar se pré-preenchido
      />

      <Input
        label="ID da Entidade Relacionada *"
        type="text"
        value={formData.relatedEntityId}
        onChange={(e) => setFormData({ ...formData, relatedEntityId: e.target.value })}
        placeholder="UUID da entidade relacionada"
        error={errors.relatedEntityId}
        disabled={!!relatedEntityId} // Desabilitar se pré-preenchido
      />

      <NoteEditor
        value={formData.content}
        onChange={(content) => setFormData({ ...formData, content })}
        label="Conteúdo *"
        placeholder="Digite sua nota aqui..."
        required
        error={errors.content}
      />

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : noteId ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
}
