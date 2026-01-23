/**
 * Serviço para busca global em múltiplas entidades
 * Consome a API /api/search do backend
 */

import { apiRequest } from '../utils/api';
import type { GlobalSearchResponse, GlobalSearchParams } from '../types/search';

/**
 * Busca global em múltiplas entidades
 * 
 * @param params - Parâmetros de busca (query, entities, limit)
 * @param signal - AbortSignal para cancelar requisição
 * @returns Promise com resultados agregados
 */
export async function searchGlobal(
  params: GlobalSearchParams,
  signal?: AbortSignal
): Promise<GlobalSearchResponse> {
  // Construir query params
  const queryParams = new URLSearchParams();
  queryParams.append('q', params.query);
  
  if (params.entities && params.entities.length > 0) {
    params.entities.forEach(entity => {
      queryParams.append('entities[]', entity);
    });
  }
  
  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  
  const endpoint = `/api/search?${queryParams.toString()}`;
  
  // Usar apiRequest com AbortSignal
  return apiRequest<GlobalSearchResponse>(endpoint, {
    signal, // Passar signal para cancelamento
  });
}
