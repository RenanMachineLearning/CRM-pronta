/**
 * Helpers para paginação de entidades
 *
 * Fornece funções utilitárias para:
 * - Validação de parâmetros de paginação (page, limit, offset)
 * - Cálculo de skip e take para Prisma
 * - Processamento de parâmetros de query string
 * - Suporte a paginação com page/limit e offset (legado)
 */

/**
 * Erro customizado para validação de paginação
 */
export class PaginationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'PAGINATION_ERROR'
  ) {
    super(message);
    this.name = 'PaginationError';
    Object.setPrototypeOf(this, PaginationError.prototype);
  }
}

/**
 * Resultado do processamento de parâmetros de paginação
 */
export interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

/**
 * Processa parâmetros de paginação do query string
 * Suporta tanto page/limit (novo) quanto offset (legado)
 * Prioriza page/limit sobre offset quando ambos fornecidos
 *
 * @param query - Query string do request
 * @param defaultLimit - Limite padrão (default: 20)
 * @returns Objeto com skip, take, page e limit calculados
 *
 * @example
 * // Paginação com page/limit
 * processPaginationParams({ page: '2', limit: '10' })
 * → { skip: 10, take: 10, page: 2, limit: 10 }
 *
 * // Paginação com offset (legado)
 * processPaginationParams({ offset: '20', limit: '10' })
 * → { skip: 20, take: 10, page: 3, limit: 10 }
 */
export function processPaginationParams(
  query: any,
  defaultLimit: number = 20
): PaginationResult {
  // Extrair parâmetros
  const pageParam = query.page;
  const limitParam = query.limit;
  const offsetParam = query.offset;

  // Processar limit
  let limit: number;
  if (limitParam !== undefined) {
    const limitNum = parseInt(String(limitParam), 10);
    if (isNaN(limitNum) || limitNum < 1) {
      throw new PaginationError(
        'limit deve ser um número inteiro maior ou igual a 1',
        400,
        'INVALID_LIMIT'
      );
    }
    // Limite máximo de 100
    limit = Math.min(limitNum, 100);
  } else {
    limit = defaultLimit;
  }

  // Processar page/offset
  let skip: number;
  let page: number;

  if (pageParam !== undefined) {
    // Priorizar page sobre offset
    const pageNum = parseInt(String(pageParam), 10);
    if (isNaN(pageNum) || pageNum < 1) {
      throw new PaginationError(
        'page deve ser um número inteiro maior ou igual a 1',
        400,
        'INVALID_PAGE'
      );
    }
    page = pageNum;
    skip = (page - 1) * limit;
  } else if (offsetParam !== undefined) {
    // Usar offset (legado) quando page não fornecido
    const offsetNum = parseInt(String(offsetParam), 10);
    if (isNaN(offsetNum) || offsetNum < 0) {
      throw new PaginationError(
        'offset deve ser um número inteiro maior ou igual a 0',
        400,
        'INVALID_OFFSET'
      );
    }
    skip = offsetNum;
    // Calcular page a partir do offset
    page = Math.floor(skip / limit) + 1;
  } else {
    // Valores padrão
    page = 1;
    skip = 0;
  }

  return {
    skip,
    take: limit,
    page,
    limit,
  };
}
