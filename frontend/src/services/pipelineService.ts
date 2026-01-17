/**
 * Serviço para interagir com a API de pipelines
 * 
 * Endpoints:
 * - GET /api/pipelines - Lista pipelines
 * - GET /api/pipelines/:id - Obtém pipeline por ID
 */

import { apiRequest } from '../utils/api';
import type {
  Pipeline,
  PipelineListResponse,
} from '../types/opportunity';

/**
 * Lista todos os pipelines do tenant
 * 
 * Endpoint: GET /api/pipelines
 * Permissão: Apenas autenticação (não requer permissão específica)
 * 
 * @returns Promise com lista de pipelines
 */
export async function listPipelines(): Promise<PipelineListResponse> {
  return apiRequest<PipelineListResponse>('/api/pipelines');
}

/**
 * Obtém pipeline por ID
 * 
 * Endpoint: GET /api/pipelines/:id
 * Permissão: Apenas autenticação (não requer permissão específica)
 * 
 * @param id - ID do pipeline (UUID)
 * @returns Promise com pipeline completo
 */
export async function getPipelineById(id: string): Promise<Pipeline> {
  return apiRequest<Pipeline>(`/api/pipelines/${id}`);
}

/**
 * Obtém pipeline padrão do tenant
 * 
 * Busca todos os pipelines e retorna o primeiro com isDefault === true
 * Se nenhum pipeline padrão for encontrado, retorna o primeiro pipeline da lista
 * Se nenhum pipeline existir, retorna null
 * 
 * @returns Promise com pipeline padrão ou null
 */
export async function getDefaultPipeline(): Promise<Pipeline | null> {
  try {
    const response = await listPipelines();
    const pipelines = response.data;
    
    if (pipelines.length === 0) {
      return null;
    }
    
    // Buscar pipeline padrão
    const defaultPipeline = pipelines.find((p) => p.isDefault === true);
    
    if (defaultPipeline) {
      return defaultPipeline;
    }
    
    // Se não encontrou padrão, retornar o primeiro
    return pipelines[0];
  } catch (error) {
    console.error('Erro ao buscar pipeline padrão:', error);
    return null;
  }
}
