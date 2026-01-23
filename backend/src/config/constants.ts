/**
 * Constantes de configuração para performance e otimização
 */

export const QUERY_LIMITS = {
  MAX_RESULTS_PER_ENTITY: 100, // Máximo de resultados por entidade em buscas globais
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const QUERY_TIMEOUTS = {
  DEFAULT: 5000, // 5 segundos em milissegundos
  SEARCH: 5000, // Timeout para buscas
  LIST: 5000, // Timeout para listagens
} as const;

export const CACHE_TTL = {
  DEFAULT: 300, // 5 minutos em segundos
  SEARCH: 300, // TTL para resultados de busca
  LIST: 300, // TTL para resultados de listagem
} as const;
