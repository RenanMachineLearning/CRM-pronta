/**
 * Serviço para interagir com a API de contatos
 */

import { apiRequest } from '../utils/api';
import type {
  Contact,
  ContactListResponse,
  ContactFilters,
  PaginationParams,
  ContactFormData,
} from '../types/contact';

/**
 * Lista contatos com filtros e paginação
 * 
 * @param filters - Filtros opcionais (companyId, status, tagId)
 * @param pagination - Parâmetros de paginação (limit, offset, orderBy, order)
 * @returns Promise com lista de contatos e informações de paginação
 */
export async function listContacts(
  filters?: ContactFilters,
  pagination?: PaginationParams
): Promise<ContactListResponse> {
  // Construir query params
  const params = new URLSearchParams();

  // Adicionar filtros
  if (filters?.companyId) {
    params.append('companyId', filters.companyId);
  }
  if (filters?.status) {
    params.append('status', filters.status);
  }
  if (filters?.tagId) {
    params.append('tagId', filters.tagId);
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
  const endpoint = `/api/contacts${queryString ? `?${queryString}` : ''}`;

  return apiRequest<ContactListResponse>(endpoint);
}

/**
 * Obtém contato por ID
 * 
 * @param id - ID do contato
 * @returns Promise com contato
 */
export async function getContactById(id: string): Promise<Contact> {
  return apiRequest<Contact>(`/api/contacts/${id}`);
}

/**
 * Cria novo contato
 * 
 * Endpoint: POST /api/contacts
 * Permissão: Contact.create
 * 
 * @param data - Dados do contato (ContactFormData)
 * @returns Promise com contato criado
 * @throws Error se validações falharem (400) ou sem permissão (403)
 */
export async function createContact(data: ContactFormData): Promise<Contact> {
  return apiRequest<Contact>('/api/contacts', {
    method: 'POST',
    body: data,
  });
}

/**
 * Atualiza contato existente
 * 
 * Endpoint: PUT /api/contacts/:id
 * Permissão: Contact.update
 * 
 * Nota: Arrays de relacionamentos (emails, phones, tagIds) substituem completamente os existentes.
 * 
 * @param id - ID do contato (UUID)
 * @param data - Dados do contato (parcial, mas firstName obrigatório se fornecido)
 * @returns Promise com contato atualizado
 * @throws Error se validações falharem (400), não encontrado (404) ou sem permissão (403)
 */
export async function updateContact(id: string, data: Partial<ContactFormData>): Promise<Contact> {
  return apiRequest<Contact>(`/api/contacts/${id}`, {
    method: 'PUT',
    body: data,
  });
}

