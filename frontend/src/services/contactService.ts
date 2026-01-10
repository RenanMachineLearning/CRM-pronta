/**
 * Serviço para interagir com a API de contatos
 */

import { apiRequest } from '../utils/api';
import type {
  Contact,
  ContactListResponse,
  ContactFilters,
  PaginationParams,
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

