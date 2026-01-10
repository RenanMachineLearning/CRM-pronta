/**
 * Serviço para interagir com a API de tags
 */

import { apiRequest } from '../utils/api';
import type { Tag } from '../types/tag';

/**
 * Lista tags para multiselect
 * 
 * @param limit - Limite de resultados (opcional, default: 100)
 * @returns Promise com lista de tags
 */
export async function listTags(limit: number = 100): Promise<Tag[]> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('orderBy', 'name');
  params.append('order', 'asc');

  return apiRequest<Tag[]>(`/api/tags?${params.toString()}`);
}

