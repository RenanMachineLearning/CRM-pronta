/**
 * Helpers para busca por entidade
 *
 * Fornece funções utilitárias genéricas para:
 * - Construir condições de busca Prisma com ILIKE
 * - Validar parâmetros de busca
 * - Reutiliza helpers da Parte 1 (Busca Global) para consistência
 */

import { ENTITY_SEARCH_CONFIGS } from '../types/entitySearch.types';
import { sanitizeQuery, normalizeText } from './searchHelpers';
import { SearchError } from '../types/search.types';

/**
 * Constrói condições de busca Prisma para uma entidade
 *
 * Aplica normalização de texto (remoção de acentos) na query para permitir
 * busca tolerante a diacríticos. Por exemplo, busca "jose" encontrará "José".
 *
 * @param entity - Nome da entidade (ex: "contact", "company")
 * @param query - Termo de busca (já sanitizado)
 * @returns Array de condições Prisma (cláusulas OR)
 * @throws SearchError se entidade não suporta busca ou query inválida
 *
 * @example
 * buildSearchConditions('contact', 'josé')
 * → [
 *     { firstName: { contains: 'jose', mode: 'insensitive' } },
 *     { lastName: { contains: 'jose', mode: 'insensitive' } },
 *     { emails: { some: { email: { contains: 'jose', mode: 'insensitive' } } } }
 *   ]
 */
export function buildSearchConditions(entity: string, query: string): any[] {
  const config = ENTITY_SEARCH_CONFIGS[entity];
  if (!config) {
    throw new SearchError(
      `Entidade "${entity}" não suporta busca`,
      'ENTITY_NOT_SEARCHABLE',
      400
    );
  }

  if (!query || query.trim().length === 0) {
    return [];
  }

  const trimmedQuery = query.trim();
  // Normalizar query para remover acentos e permitir busca tolerante a diacríticos
  // Exemplo: "José" → "jose", "São Paulo" → "sao paulo"
  const normalizedQuery = normalizeText(trimmedQuery);
  const conditions: any[] = [];

  // Construir condição para cada campo pesquisável
  for (const fieldConfig of config.fields) {
    if (fieldConfig.relation) {
      // Campo em relacionamento (ex: ContactEmail.email)
      conditions.push({
        [fieldConfig.relation.model]: {
          some: {
            [fieldConfig.relation.field]: {
              contains: normalizedQuery, // Usar query normalizada
              mode: 'insensitive',
            },
          },
        },
      });
    } else {
      // Campo direto na entidade
      conditions.push({
        [fieldConfig.field]: {
          contains: normalizedQuery, // Usar query normalizada
          mode: 'insensitive',
        },
      });
    }
  }

  return conditions;
}

/**
 * Valida e sanitiza parâmetro de busca `q`
 *
 * @param query - Parâmetro de busca
 * @returns Query validada e sanitizada, ou undefined se vazia
 * @throws SearchError se query for inválida
 *
 * @example
 * validateSearchQuery('joão silva') → 'joão silva'
 * validateSearchQuery('') → undefined
 * validateSearchQuery(null) → undefined
 */
export function validateSearchQuery(query?: string | null): string | undefined {
  // Se não fornecido, retorna undefined (listagem completa)
  if (!query) {
    return undefined;
  }

  // Validar tipo
  if (typeof query !== 'string') {
    throw new SearchError(
      'Query deve ser uma string',
      'INVALID_QUERY_TYPE',
      400
    );
  }

  // Sanitizar usando helper da Parte 1
  const sanitized = sanitizeQuery(query);

  if (sanitized.length === 0) {
    return undefined; // Query vazia após sanitização = sem busca
  }

  if (sanitized.length > 500) {
    throw new SearchError(
      'Query não pode exceder 500 caracteres',
      'QUERY_TOO_LONG',
      400
    );
  }

  return sanitized;
}

/**
 * Verifica se uma entidade suporta busca
 *
 * @param entity - Nome da entidade
 * @returns true se a entidade tem configuração de busca
 */
export function isSearchableEntity(entity: string): boolean {
  return entity in ENTITY_SEARCH_CONFIGS;
}

/**
 * Obtém campos pesquisáveis de uma entidade (sem relacionamentos)
 *
 * @param entity - Nome da entidade
 * @returns Array de campos pesquisáveis (sem relacionamentos)
 */
export function getSearchableFields(entity: string): string[] {
  const config = ENTITY_SEARCH_CONFIGS[entity];
  if (!config) {
    return [];
  }

  return config.fields
    .filter(field => !field.relation)
    .map(field => field.field);
}

/**
 * Obtém relacionamentos pesquisáveis de uma entidade
 *
 * @param entity - Nome da entidade
 * @returns Array de relacionamentos pesquisáveis
 */
export function getSearchableRelations(entity: string): Array<{ model: string; field: string }> {
  const config = ENTITY_SEARCH_CONFIGS[entity];
  if (!config) {
    return [];
  }

  return config.fields
    .filter(field => field.relation)
    .map(field => ({
      model: field.relation!.model,
      field: field.relation!.field,
    }));
}
