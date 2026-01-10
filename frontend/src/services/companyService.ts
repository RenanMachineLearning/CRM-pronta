/**
 * Serviço para interagir com a API de empresas
 */

import { apiRequest } from '../utils/api';
import type { CompanyListResponse, CompanyLookup } from '../types/company';

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

