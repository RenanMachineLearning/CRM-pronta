/**
 * Helpers para busca e manipulação de texto
 *
 * Fornece funções utilitárias para:
 * - Normalização de texto (remoção de acentos, lowercase)
 * - Extração de snippet com highlight
 * - Cálculo de relevância
 * - Validação de parâmetros de busca
 */

import { SearchError } from '../types/search.types';

// Re-exportar SearchError para uso em testes
export { SearchError };

/**
 * Normaliza texto para busca (remove acentos, lowercase, caracteres especiais)
 *
 * @param text - Texto a ser normalizado
 * @returns Texto normalizado
 *
 * @example
 * normalizeText('São Paulo') → 'sao paulo'
 * normalizeText('José Silva') → 'jose silva'
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFD')                    // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '')    // Remove diacríticos
    .toLowerCase()                       // Converte para minúsculas
    .replace(/[^\w\s-]/g, '')           // Remove caracteres especiais (exceto espaço e hífen)
    .replace(/\s+/g, ' ')               // Normaliza espaços múltiplos
    .trim();                             // Remove espaços nas extremidades
}

/**
 * Extrai snippet do texto onde o termo foi encontrado, com highlight
 *
 * @param text - Texto completo
 * @param query - Termo de busca
 * @param maxLength - Tamanho máximo do snippet (default: 100)
 * @returns Snippet com termo destacado em <mark>...</mark>
 *
 * @example
 * extractSnippet('João Silva é gerente de vendas', 'gerente')
 * → '...João Silva é <mark>gerente</mark> de vendas'
 */
export function extractSnippet(text: string, query: string, maxLength: number = 100): string {
  if (!text || !query) return text ? text.substring(0, maxLength) + (text.length > maxLength ? '...' : '') : '';

  // Normalizar texto e query para comparação
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);

  // Buscar posição do termo
  const position = normalizedText.indexOf(normalizedQuery);
  if (position === -1) {
    // Termo não encontrado, retornar início do texto
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // Calcular início e fim do snippet (centralizar no termo)
  const halfLength = Math.floor((maxLength - normalizedQuery.length) / 2);
  const start = Math.max(0, position - halfLength);
  const end = Math.min(text.length, position + normalizedQuery.length + halfLength);

  let snippet = text.substring(start, end);

  // Adicionar ellipsis se necessário
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  // Highlight do termo no snippet (buscar no texto original preservando case)
  const snippetLower = snippet.toLowerCase();
  const termLower = query.toLowerCase();
  const termPosition = snippetLower.indexOf(termLower);

  if (termPosition !== -1) {
    const before = snippet.substring(0, termPosition);
    const term = snippet.substring(termPosition, termPosition + query.length);
    const after = snippet.substring(termPosition + query.length);
    snippet = before + `<mark>${term}</mark>` + after;
  }

  return snippet;
}

/**
 * Calcula relevância de um resultado baseado na posição e frequência do termo
 *
 * @param text - Texto onde termo foi encontrado
 * @param query - Termo de busca
 * @returns Score de relevância (0.0 a 1.0)
 */
export function calculateRelevance(text: string, query: string): number {
  if (!text || !query) return 0;

  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);
  const terms = normalizedQuery.split(/\s+/).filter(term => term.length > 0);

  if (terms.length === 0) return 0;

  let score = 0;
  let termMatches = 0;

  for (const term of terms) {
    if (!term) continue;

    // Busca exata do termo
    const exactMatches = (normalizedText.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;

    if (exactMatches > 0) {
      termMatches++;
      // Mais pontos por mais ocorrências
      score += Math.min(exactMatches * 0.2, 0.4); // Reduzido para permitir mais espaço para outros fatores

      // Bônus por termo no início do texto
      const firstPosition = normalizedText.indexOf(term);
      if (firstPosition >= 0 && firstPosition < 10) {
        score += 0.3; // Aumentado o bônus para início do texto
      } else if (firstPosition >= 10 && firstPosition < 30) {
        score += 0.15; // Bônus menor para posições intermediárias
      }
    }
  }

  // Penalidade por não encontrar todos os termos
  const matchRatio = termMatches / terms.length;
  score *= matchRatio;

  return Math.min(score, 1.0);
}

/**
 * Sanitiza query removendo caracteres perigosos e limitando tamanho
 *
 * @param query - Query a ser sanitizada
 * @returns Query sanitizada
 */
export function sanitizeQuery(query: string): string {
  if (!query) return '';

  return query
    .trim()
    .substring(0, 500) // Limitar tamanho
    .replace(/[<>]/g, ''); // Remover caracteres HTML perigosos
}

/**
 * Valida parâmetros de busca
 *
 * @param params - Parâmetros de busca
 * @throws SearchError se parâmetros forem inválidos
 */
export function validateSearchParams(params: {
  query?: string;
  entities?: string[];
  limit?: number;
}): void {
  // Validar query
  if (!params.query || typeof params.query !== 'string') {
    throw new SearchError(
      'Query é obrigatória',
      'QUERY_REQUIRED',
      400
    );
  }

  if (params.query.trim().length === 0) {
    throw new SearchError(
      'Query não pode estar vazia',
      'QUERY_EMPTY',
      400
    );
  }

  if (params.query.length > 500) {
    throw new SearchError(
      'Query não pode exceder 500 caracteres',
      'QUERY_TOO_LONG',
      400
    );
  }

  // Validar entities (se fornecido)
  const validEntities = ['contact', 'company', 'lead', 'opportunity'];
  if (params.entities && Array.isArray(params.entities)) {
    const invalidEntities = params.entities.filter(
      entity => !validEntities.includes(entity)
    );

    if (invalidEntities.length > 0) {
      throw new SearchError(
        `Entidades inválidas: ${invalidEntities.join(', ')}`,
        'INVALID_ENTITIES',
        400
      );
    }
  }

  // Validar limit (se fornecido)
  if (params.limit !== undefined) {
    const limitNum = Number(params.limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new SearchError(
        'Limit deve estar entre 1 e 100',
        'INVALID_LIMIT',
        400
      );
    }
  }
}
