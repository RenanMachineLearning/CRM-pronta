/**
 * Serviço para interagir com a API de empresas
 */

import { apiRequest } from '../utils/api';
import type {
  Company,
  CompanyListResponse,
  CompanyLookup,
  CompanyFilters,
  CompanyPaginationParams,
  CompanyFormData,
} from '../types/company';
import type { Filter } from '../types/filter';

/**
 * Lista empresas com filtros e paginação
 * 
 * Endpoint: GET /api/companies
 * Permissão: Company.list
 * 
 * @param filters - Filtros (industry, size)
 * @param pagination - Parâmetros de paginação (limit, offset, orderBy, order)
 * @param advancedFilters - Filtros avançados opcionais
 * @returns Promise com lista de empresas e paginação
 */
export async function listCompanies(
  filters?: CompanyFilters,
  pagination?: CompanyPaginationParams,
  advancedFilters?: Filter[]
): Promise<CompanyListResponse> {
  const params = new URLSearchParams();
  
  if (filters?.industry) {
    params.append('industry', filters.industry);
  }
  if (filters?.size) {
    params.append('size', filters.size);
  }
  
  // Adicionar filtros avançados
  if (advancedFilters && advancedFilters.length > 0) {
    params.append('filters', JSON.stringify(advancedFilters));
  }
  
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
  
  return apiRequest<CompanyListResponse>(`/api/companies?${params.toString()}`);
}

/**
 * Obtém empresa por ID
 * 
 * Endpoint: GET /api/companies/:id
 * Permissão: Company.read
 * 
 * @param id - ID da empresa (UUID)
 * @returns Promise com empresa completa (inclui addresses, tags)
 */
export async function getCompanyById(id: string): Promise<Company> {
  return apiRequest<Company>(`/api/companies/${id}`);
}

/**
 * Cria nova empresa
 * 
 * Endpoint: POST /api/companies
 * Permissão: Company.create
 * 
 * @param data - Dados da empresa (CompanyFormData)
 * @returns Promise com empresa criada
 * @throws Error se validações falharem (400) ou sem permissão (403)
 */
export async function createCompany(data: CompanyFormData): Promise<Company> {
  return apiRequest<Company>('/api/companies', {
    method: 'POST',
    body: data,
  });
}

/**
 * Atualiza empresa existente
 * 
 * Endpoint: PUT /api/companies/:id
 * Permissão: Company.update
 * 
 * Nota: Arrays de relacionamentos (addresses, tagIds) substituem completamente os existentes.
 * 
 * @param id - ID da empresa (UUID)
 * @param data - Dados da empresa (parcial, mas name obrigatório se fornecido)
 * @returns Promise com empresa atualizada
 * @throws Error se validações falharem (400), não encontrado (404) ou sem permissão (403)
 */
export async function updateCompany(id: string, data: Partial<CompanyFormData>): Promise<Company> {
  return apiRequest<Company>(`/api/companies/${id}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Lista empresas para lookup
 * 
 * @param query - Termo de busca (opcional)
 * @param limit - Limite de resultados (opcional, default: 20)
 * @returns Promise com lista de empresas
 */
export async function listCompaniesForLookup(
  query?: string,
  limit: number = 20
): Promise<CompanyLookup[]> {
  const params = new URLSearchParams();
  // Nota: Backend pode não ter busca por query ainda
  // Se não tiver, buscar todas e filtrar no frontend
  // Por enquanto, buscar todas e filtrar se query fornecido
  params.append('limit', limit.toString());
  params.append('orderBy', 'name');
  params.append('order', 'asc');

  const response = await apiRequest<CompanyListResponse>(
    `/api/companies?${params.toString()}`
  );
  
  let companies = response.data.map((company) => ({
    id: company.id,
    name: company.name,
  }));

  // Filtrar por query no frontend se fornecido
  if (query && query.trim().length > 0) {
    const queryLower = query.toLowerCase();
    companies = companies.filter((company) =>
      company.name.toLowerCase().includes(queryLower)
    );
  }
  
  return companies;
}

