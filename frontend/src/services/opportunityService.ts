/**
 * Serviço para interagir com a API de oportunidades
 * 
 * Endpoints:
 * - GET /api/opportunities - Lista oportunidades
 * - GET /api/opportunities/:id - Obtém oportunidade por ID
 * - POST /api/opportunities - Cria nova oportunidade
 * - PUT /api/opportunities/:id - Atualiza oportunidade
 * - DELETE /api/opportunities/:id - Deleta oportunidade (soft delete)
 */

import { apiRequest } from '../utils/api';
import type {
  Opportunity,
  OpportunityListResponse,
  OpportunityFilters,
  OpportunityPaginationParams,
  OpportunityStatus,
} from '../types/opportunity';

/**
 * Lista oportunidades com filtros e paginação
 * 
 * Endpoint: GET /api/opportunities
 * Permissão: Opportunity.list
 * 
 * @param filters - Filtros (stageId, status, contactId, companyId)
 * @param pagination - Parâmetros de paginação (limit, offset, orderBy, order)
 * @returns Promise com lista de oportunidades e informações de paginação
 */
export async function listOpportunities(
  filters?: OpportunityFilters,
  pagination?: OpportunityPaginationParams
): Promise<OpportunityListResponse> {
  const params = new URLSearchParams();
  
  // Adicionar filtros
  if (filters?.stageId) {
    params.append('stageId', filters.stageId);
  }
  if (filters?.status) {
    params.append('status', filters.status);
  }
  if (filters?.contactId) {
    params.append('contactId', filters.contactId);
  }
  if (filters?.companyId) {
    params.append('companyId', filters.companyId);
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
  const endpoint = `/api/opportunities${queryString ? `?${queryString}` : ''}`;
  
  return apiRequest<OpportunityListResponse>(endpoint);
}

/**
 * Obtém oportunidade por ID
 * 
 * Endpoint: GET /api/opportunities/:id
 * Permissão: Opportunity.read
 * 
 * @param id - ID da oportunidade (UUID)
 * @returns Promise com oportunidade completa
 */
export async function getOpportunityById(id: string): Promise<Opportunity> {
  return apiRequest<Opportunity>(`/api/opportunities/${id}`);
}

/**
 * Cria nova oportunidade
 * 
 * Endpoint: POST /api/opportunities
 * Permissão: Opportunity.create
 * 
 * @param data - Dados da oportunidade
 * @returns Promise com oportunidade criada
 */
export async function createOpportunity(data: {
  name: string;
  value: number;
  currency?: string;
  stageId: string;
  status?: OpportunityStatus;
  closeDate?: string; // ISO string
  probability?: number;
  contactId?: string;
  companyId?: string;
  leadId?: string;
  tagIds?: string[];
}): Promise<Opportunity> {
  return apiRequest<Opportunity>('/api/opportunities', {
    method: 'POST',
    body: data,
  });
}

/**
 * Atualiza oportunidade existente
 * 
 * Endpoint: PUT /api/opportunities/:id
 * Permissão: Opportunity.update
 * 
 * @param id - ID da oportunidade (UUID)
 * @param data - Dados parciais para atualização
 * @returns Promise com oportunidade atualizada
 */
export async function updateOpportunity(
  id: string,
  data: Partial<{
    name: string;
    value: number;
    currency?: string;
    stageId: string;
    status?: OpportunityStatus;
    closeDate?: string; // ISO string
    actualCloseDate?: string; // ISO string
    probability?: number;
    contactId?: string;
    companyId?: string;
    leadId?: string;
    tagIds?: string[];
  }>
): Promise<Opportunity> {
  return apiRequest<Opportunity>(`/api/opportunities/${id}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Deleta oportunidade (soft delete)
 * 
 * Endpoint: DELETE /api/opportunities/:id
 * Permissão: Opportunity.delete
 * 
 * @param id - ID da oportunidade (UUID)
 * @returns Promise vazia
 */
export async function deleteOpportunity(id: string): Promise<void> {
  return apiRequest<void>(`/api/opportunities/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Interface para lookup de oportunidades
 */
export interface OpportunityLookup {
  id: string;
  name: string;
}

/**
 * Lista oportunidades para lookup (busca por nome)
 * 
 * @param query - Termo de busca (opcional)
 * @param limit - Limite de resultados (opcional, default: 20)
 * @returns Promise com lista de oportunidades
 */
export async function listOpportunitiesForLookup(
  query?: string,
  limit: number = 20
): Promise<OpportunityLookup[]> {
  const params = new URLSearchParams();
  params.append('limit', '100');
  params.append('orderBy', 'name');
  params.append('order', 'asc');

  const response = await apiRequest<OpportunityListResponse>(
    `/api/opportunities?${params.toString()}`
  );
  
  let opportunities = response.data.map((opportunity) => ({
    id: opportunity.id,
    name: opportunity.name,
  }));

  // Filtrar por query no frontend se fornecido
  if (query && query.trim().length > 0) {
    const queryLower = query.toLowerCase();
    opportunities = opportunities.filter((opportunity) =>
      opportunity.name.toLowerCase().includes(queryLower)
    );
  }
  
  // Limitar a 20 resultados após filtro
  return opportunities.slice(0, limit);
}
