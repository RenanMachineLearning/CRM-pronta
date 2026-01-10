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

