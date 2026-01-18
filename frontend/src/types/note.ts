/**
 * Tipos relacionados a Notas
 * Baseados na API backend
 */

// Enum para tipo de nota
export type NoteType = 'NOTE' | 'COMMENT' | 'ANNOTATION';

// Tipos de entidades relacionadas
export type RelatedEntityType = 'Contact' | 'Company' | 'Lead' | 'Opportunity' | 'Task';

// Usuário criador (relacionamento)
export interface NoteCreatedBy {
  id: string;
  name: string;
  email: string;
}

// Entidade relacionada (polimórfica - informações básicas)
export interface NoteRelatedEntity {
  id: string;
  // Campos variam conforme tipo:
  // Contact: firstName, lastName
  // Company: name
  // Lead: firstName, lastName
  // Opportunity: name
  // Task: title
  [key: string]: any;
}

// Nota completa
export interface Note {
  id: string;
  tenantId: string;
  content: string; // Markdown armazenado como texto
  type: NoteType;
  relatedEntityType: RelatedEntityType;
  relatedEntityId: string;
  createdById: string;
  createdBy?: NoteCreatedBy | null;
  relatedEntity?: NoteRelatedEntity | null;
  createdAt: string; // ISO string da API
  updatedAt: string; // ISO string da API
  deletedAt?: string | null; // ISO string (soft delete)
}

// Filtros para listagem
export interface NoteFilters {
  type?: NoteType;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string;
}

// Parâmetros de paginação
export interface NotePaginationParams {
  limit?: number; // Default: 20, Max: 100
  offset?: number; // Default: 0
  orderBy?: 'createdAt'; // Apenas createdAt suportado
  order?: 'asc' | 'desc'; // Default: desc
}

// Resposta da API de listagem
export interface NoteListResponse {
  data: Note[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Dados do formulário de nota (para criação)
export interface NoteFormData {
  content: string; // Obrigatório, max 10.000 caracteres após trim
  type?: NoteType; // Opcional, default: 'NOTE'
  relatedEntityType: RelatedEntityType; // Obrigatório
  relatedEntityId: string; // Obrigatório, UUID válido
}

// Dados para atualização (parcial)
export interface NoteUpdateData {
  content?: string; // Max 10.000 caracteres após trim
  type?: NoteType;
}

// Erros de validação do formulário
export interface NoteFormErrors {
  content?: string;
  type?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}
