/**
 * Serviço para interagir com a API de leads
 * 
 * Endpoints:
 * - GET /api/leads - Lista leads
 * - GET /api/leads/:id - Obtém lead por ID
 * - POST /api/leads - Cria novo lead
 * - PUT /api/leads/:id - Atualiza lead
 * - DELETE /api/leads/:id - Deleta lead (soft delete)
 * - POST /api/leads/:id/convert - Converte lead em contato e/ou oportunidade
 */

import { apiRequest } from '../utils/api';
import type {
  Lead,
  LeadListResponse,
  LeadFilters,
  LeadPaginationParams,
  ConvertLeadData,
  ConvertLeadResponse,
  LeadStatus,
} from '../types/lead';
import type { Filter } from '../types/filter';

/**
 * Lista leads com filtros e paginação
 * 
 * Endpoint: GET /api/leads
 * Permissão: Lead.list
 * 
 * @param filters - Filtros (status, source, converted)
 * @param pagination - Parâmetros de paginação (limit, offset, orderBy, order)
 * @param advancedFilters - Filtros avançados opcionais
 * @returns Promise com lista de leads e informações de paginação
 */
export async function listLeads(
  filters?: LeadFilters,
  pagination?: LeadPaginationParams,
  advancedFilters?: Filter[]
): Promise<LeadListResponse> {
  const params = new URLSearchParams();
  
  // Adicionar filtros
  if (filters?.status) {
    params.append('status', filters.status);
  }
  if (filters?.source) {
    params.append('source', filters.source);
  }
  if (filters?.converted !== undefined) {
    params.append('converted', filters.converted.toString());
  }
  
  // Adicionar filtros avançados
  if (advancedFilters && advancedFilters.length > 0) {
    params.append('filters', JSON.stringify(advancedFilters));
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
  
  const queryString = params.toString();
  const endpoint = `/api/leads${queryString ? `?${queryString}` : ''}`;
  
  return apiRequest<LeadListResponse>(endpoint);
}

/**
 * Obtém lead por ID
 * 
 * Endpoint: GET /api/leads/:id
 * Permissão: Lead.read
 * 
 * @param id - ID do lead (UUID)
 * @returns Promise com lead completo
 */
export async function getLeadById(id: string): Promise<Lead> {
  return apiRequest<Lead>(`/api/leads/${id}`);
}

/**
 * Cria novo lead
 * 
 * Endpoint: POST /api/leads
 * Permissão: Lead.create
 * 
 * @param data - Dados do lead
 * @returns Promise com lead criado
 */
export async function createLead(data: {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status?: LeadStatus;
  tagIds?: string[];
}): Promise<Lead> {
  return apiRequest<Lead>('/api/leads', {
    method: 'POST',
    body: data,
  });
}

/**
 * Atualiza lead existente
 * 
 * Endpoint: PUT /api/leads/:id
 * Permissão: Lead.update
 * 
 * @param id - ID do lead (UUID)
 * @param data - Dados parciais para atualização
 * @returns Promise com lead atualizado
 */
export async function updateLead(
  id: string,
  data: Partial<{
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    source?: string;
    status?: LeadStatus;
    tagIds?: string[];
  }>
): Promise<Lead> {
  return apiRequest<Lead>(`/api/leads/${id}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Deleta lead (soft delete)
 * 
 * Endpoint: DELETE /api/leads/:id
 * Permissão: Lead.delete
 * 
 * @param id - ID do lead (UUID)
 * @returns Promise vazia
 */
export async function deleteLead(id: string): Promise<void> {
  return apiRequest<void>(`/api/leads/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Converte lead em contato e/ou oportunidade
 * 
 * Endpoint: POST /api/leads/:id/convert
 * Permissão: Lead.convert
 * 
 * @param id - ID do lead (UUID)
 * @param data - Dados da conversão (createContact, createOpportunity, opportunityData)
 * @returns Promise com resultado da conversão
 */
export async function convertLead(
  id: string,
  data: ConvertLeadData
): Promise<ConvertLeadResponse> {
  return apiRequest<ConvertLeadResponse>(`/api/leads/${id}/convert`, {
    method: 'POST',
    body: data,
  });
}

/**
 * Interface para lookup de leads
 */
export interface LeadLookup {
  id: string;
  firstName: string;
  lastName: string | null;
}

/**
 * Lista leads para lookup (busca por nome)
 * 
 * Nota: O backend não suporta filtro por nome, então buscamos leads
 * e filtramos no frontend. Limitamos a 100 resultados para performance.
 * 
 * @param query - Query de busca (mínimo 2 caracteres)
 * @returns Promise com lista de leads (id, firstName, lastName) filtrados por nome
 */
export async function listLeadsForLookup(query: string): Promise<LeadLookup[]> {
  if (query.length < 2) {
    return [];
  }
  
  const params = new URLSearchParams();
  params.append('limit', '100');
  params.append('orderBy', 'firstName');
  params.append('order', 'asc');
  
  const response = await apiRequest<LeadListResponse>(`/api/leads?${params.toString()}`);
  
  // Filtrar no frontend por firstName ou lastName (case-insensitive, parcial)
  const queryLower = query.toLowerCase();
  const filtered = response.data.filter((lead) => {
    const firstName = (lead.firstName || '').toLowerCase();
    const lastName = (lead.lastName || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();
    return (
      firstName.includes(queryLower) ||
      lastName.includes(queryLower) ||
      fullName.includes(queryLower)
    );
  });
  
  // Limitar a 20 resultados após filtro
  const limited = filtered.slice(0, 20);
  
  // Converter para LeadLookup format
  return limited.map((lead) => ({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName || null,
  }));
}
