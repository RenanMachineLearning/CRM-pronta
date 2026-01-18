/**
 * Serviço para interagir com a API de notas
 */

import { apiRequest } from '../utils/api';
import type {
  Note,
  NoteListResponse,
  NoteFilters,
  NotePaginationParams,
  NoteFormData,
  NoteUpdateData,
} from '../types/note';

/**
 * Lista notas com filtros e paginação
 * 
 * @param filters - Filtros opcionais (type, relatedEntityType, relatedEntityId)
 * @param pagination - Parâmetros de paginação (limit, offset, orderBy, order)
 * @returns Promise com lista de notas e informações de paginação
 * @throws Error se requisição falhar (400, 401, 403, 500)
 */
export async function listNotes(
  filters?: NoteFilters,
  pagination?: NotePaginationParams
): Promise<NoteListResponse> {
  // Construir query params
  const params = new URLSearchParams();

  // Adicionar filtros
  if (filters?.type) {
    params.append('type', filters.type);
  }
  if (filters?.relatedEntityType) {
    params.append('relatedEntityType', filters.relatedEntityType);
  }
  if (filters?.relatedEntityId) {
    params.append('relatedEntityId', filters.relatedEntityId);
  }

  // Adicionar paginação
  if (pagination?.limit) {
    params.append('limit', pagination.limit.toString());
  }
  if (pagination?.offset) {
    params.append('offset', pagination.offset.toString());
  }
  if (pagination?.orderBy) {
    params.append('orderBy', pagination.orderBy);
  }
  if (pagination?.order) {
    params.append('order', pagination.order);
  }

  // Construir URL com query params
  const queryString = params.toString();
  const endpoint = `/api/notes${queryString ? `?${queryString}` : ''}`;

  return apiRequest<NoteListResponse>(endpoint);
}

/**
 * Obtém nota por ID
 * 
 * @param id - ID da nota (UUID)
 * @returns Promise com nota completa (incluindo createdBy e relatedEntity)
 * @throws Error se nota não encontrada (404) ou sem permissão (403)
 */
export async function getNoteById(id: string): Promise<Note> {
  return apiRequest<Note>(`/api/notes/${id}`);
}

/**
 * Cria nova nota
 * 
 * Endpoint: POST /api/notes
 * Permissão: Note.create
 * 
 * @param data - Dados da nota (NoteFormData)
 * @returns Promise com nota criada
 * @throws Error se validações falharem (400) ou sem permissão (403)
 */
export async function createNote(data: NoteFormData): Promise<Note> {
  return apiRequest<Note>('/api/notes', {
    method: 'POST',
    body: data,
  });
}

/**
 * Atualiza nota existente
 * 
 * Endpoint: PUT /api/notes/:id
 * Permissão: Note.update
 * 
 * Nota: Apenas o criador da nota ou um usuário com role Admin pode editar.
 * 
 * @param id - ID da nota (UUID)
 * @param data - Dados da nota (parcial - NoteUpdateData)
 * @returns Promise com nota atualizada
 * @throws Error se validações falharem (400), não encontrada (404) ou sem permissão (403)
 */
export async function updateNote(id: string, data: NoteUpdateData): Promise<Note> {
  return apiRequest<Note>(`/api/notes/${id}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Deleta nota (soft delete)
 * 
 * Endpoint: DELETE /api/notes/:id
 * Permissão: Note.delete
 * 
 * Nota: Apenas o criador da nota ou um usuário com role Admin pode deletar.
 * 
 * @param id - ID da nota (UUID)
 * @returns Promise com mensagem de sucesso
 * @throws Error se nota não encontrada (404) ou sem permissão (403)
 */
export async function deleteNote(id: string): Promise<{ message: string; id: string }> {
  return apiRequest<{ message: string; id: string }>(`/api/notes/${id}`, {
    method: 'DELETE',
  });
}
