/**
 * Tipos relacionados a Contatos
 * Baseados na API backend
 */

// Enum para status de contato
export enum ContactStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

// Tipo de email
export type EmailType = 'WORK' | 'HOME' | 'OTHER';

// Tipo de telefone
export type PhoneType = 'WORK' | 'HOME' | 'MOBILE' | 'OTHER';

// Email de contato
export interface ContactEmail {
  id: string;
  email: string;
  type: EmailType;
  isPrimary: boolean;
  createdAt: string; // ISO string da API
  updatedAt: string; // ISO string da API
}

// Telefone de contato
export interface ContactPhone {
  id: string;
  phone: string;
  type: PhoneType;
  isPrimary: boolean;
  createdAt: string; // ISO string da API
  updatedAt: string; // ISO string da API
}

// Tag de contato
export interface ContactTag {
  id: string;
  name: string;
  color: string;
}

// Empresa associada
export interface ContactCompany {
  id: string;
  name: string;
}

// Contato completo
export interface Contact {
  id: string;
  tenantId: string;
  firstName: string;
  lastName?: string | null;
  title?: string | null;
  gender?: string | null;
  birthDate?: string | null; // ISO string da API
  notes?: string | null;
  status: ContactStatus;
  companyId?: string | null;
  company?: ContactCompany | null;
  emails: ContactEmail[];
  phones: ContactPhone[];
  tags: ContactTag[];
  createdAt: string; // ISO string da API
  updatedAt: string; // ISO string da API
}

// Filtros para listagem
export interface ContactFilters {
  companyId?: string;
  status?: ContactStatus;
  tagId?: string;
}

// Parâmetros de paginação
export interface PaginationParams {
  limit?: number;
  offset?: number;
  orderBy?: 'firstName' | 'lastName' | 'createdAt';
  order?: 'asc' | 'desc';
}

// Resposta da API de listagem
export interface ContactListResponse {
  data: Contact[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Dados do formulário de contato (para criação/atualização)
// Alinhado com POST /api/contacts e PUT /api/contacts/:id
export interface ContactFormData {
  firstName: string; // Obrigatório (pelo menos firstName ou lastName)
  lastName?: string;
  title?: string;
  status: ContactStatus; // Default: ACTIVE
  companyId?: string | null; // UUID ou null para remover associação
  emails: Array<{
    email: string; // Formato válido (regex)
    type: EmailType; // WORK | HOME | OTHER
    isPrimary: boolean;
  }>;
  phones: Array<{
    phone: string; // Formato válido (10-15 dígitos)
    type: PhoneType; // WORK | HOME | MOBILE | OTHER
    isPrimary: boolean;
  }>;
  tagIds: string[]; // Array de UUIDs válidos
  // Nota: Campos gender, birthDate, notes, addresses não estão na especificação V1
}

// Erros de validação do formulário
export interface ContactFormErrors {
  firstName?: string;
  lastName?: string;
  emails?: string[]; // Array de erros por índice de email
  phones?: string[]; // Array de erros por índice de telefone
  companyId?: string;
  tagIds?: string;
}

// Contato para lookup (busca e seleção)
export interface ContactLookup {
  id: string;
  firstName: string;
  lastName?: string | null;
}
