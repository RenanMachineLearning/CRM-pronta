/**
 * Wrapper para aplicar timeout em queries do Prisma
 * Garante que queries não executem por mais de 5 segundos
 */

export class QueryTimeoutError extends Error {
  constructor(public query: string, public timeoutMs: number) {
    super(`Query timed out after ${timeoutMs}ms: ${query}`);
    this.name = 'QueryTimeoutError';
  }
}

const DEFAULT_QUERY_TIMEOUT = 5000; // 5 segundos

/**
 * Aplica timeout a uma Promise
 * 
 * @param promise - Promise a ser executada
 * @param timeoutMs - Timeout em milissegundos (padrão: 5000ms)
 * @param queryDescription - Descrição da query para logs
 * @returns Resultado da Promise ou lança QueryTimeoutError
 */
export async function withQueryTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT,
  queryDescription?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(new QueryTimeoutError(queryDescription || 'Unknown query', timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    // Log timeout para análise de performance
    if (error instanceof QueryTimeoutError) {
      console.error(`[QueryTimeout] ${error.query} timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}
