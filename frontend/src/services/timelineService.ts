/**
 * Serviço para interagir com a API de timeline/histórico de atividades
 * 
 * A timeline agrega tarefas, notas e logs de auditoria relacionados
 * a uma entidade específica, ordenados por data (mais recente primeiro).
 */

import { apiRequest } from '../utils/api';
import type {
  TimelineResponse,
  TimelinePaginationParams,
  EntityType,
} from '../types/timeline';

// Tipos de entidade válidos para timeline
const VALID_ENTITY_TYPES: EntityType[] = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task'];

// Regex para validação de UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Busca timeline de atividades relacionadas a uma entidade
 * 
 * Endpoint: GET /api/timeline/:entityType/:entityId
 * 
 * Agrega tarefas, notas e logs de auditoria relacionados à entidade,
 * ordenados por data (mais recente primeiro).
 * 
 * @param entityType - Tipo de entidade (Contact, Company, Lead, Opportunity, Task)
 * @param entityId - ID da entidade (UUID)
 * @param pagination - Parâmetros de paginação (opcional)
 * @returns Promise com timeline de atividades
 * @throws Error se requisição falhar (400, 401, 403, 404, 500)
 */
export async function getTimeline(
  entityType: EntityType,
  entityId: string,
  pagination?: TimelinePaginationParams
): Promise<TimelineResponse> {
  // Validar entityType
  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    throw new Error(
      `Tipo de entidade inválido: ${entityType}. Valores válidos: ${VALID_ENTITY_TYPES.join(', ')}`
    );
  }

  // Validar entityId (UUID)
  if (!entityId || typeof entityId !== 'string' || entityId.trim().length === 0) {
    throw new Error('ID da entidade é obrigatório');
  }
  
  if (!UUID_REGEX.test(entityId)) {
    throw new Error('ID da entidade deve ser um UUID válido');
  }

  // Validar parâmetros de paginação se fornecidos
  if (pagination?.limit !== undefined) {
    if (pagination.limit < 1 || pagination.limit > 100) {
      throw new Error('Limite deve ser entre 1 e 100');
    }
  }
  
  if (pagination?.offset !== undefined) {
    if (pagination.offset < 0) {
      throw new Error('Offset não pode ser negativo');
    }
  }

  // Construir query params
  const params = new URLSearchParams();
  
  if (pagination?.limit) {
    params.append('limit', pagination.limit.toString());
  }
  if (pagination?.offset) {
    params.append('offset', pagination.offset.toString());
  }

  // Construir endpoint com query params
  const queryString = params.toString();
  const endpoint = `/api/timeline/${entityType}/${entityId}${queryString ? `?${queryString}` : ''}`;

  try {
    return await apiRequest<TimelineResponse>(endpoint);
  } catch (error) {
    if (error instanceof Error) {
      // Tratar erros específicos da API
      if (error.message.includes('400')) {
        throw new Error('Parâmetros inválidos. Verifique o tipo e ID da entidade.');
      }
      if (error.message.includes('401')) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      if (error.message.includes('403')) {
        throw new Error('Você não tem permissão para visualizar este histórico.');
      }
      if (error.message.includes('404')) {
        throw new Error('Entidade não encontrada ou foi removida.');
      }
      if (error.message.includes('500')) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      }
      throw error;
    }
    throw new Error('Erro desconhecido ao carregar histórico de atividades.');
  }
}
