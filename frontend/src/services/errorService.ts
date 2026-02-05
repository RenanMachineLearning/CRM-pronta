/**
 * Serviço para tratamento de erros
 * Fornece mensagens amigáveis e funções utilitárias
 */

import {
  AppError,
  ApiError,
  NetworkError,
  TimeoutError,
  OfflineError,
  ValidationError,
  AuthError,
  NotFoundError,
  ErrorSeverity,
  isAppError,
  isApiError,
  isNetworkError,
  isOfflineError,
  isTimeoutError,
  isValidationError,
  isAuthError,
  isNotFoundError,
} from '../types/error';

// Mensagens amigáveis por código HTTP
const httpErrorMessages: Record<number, string> = {
  400: 'Dados inválidos. Verifique as informações e tente novamente.',
  401: 'Sua sessão expirou. Faça login novamente.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'O recurso solicitado não foi encontrado.',
  409: 'Conflito de dados. O registro pode já existir.',
  422: 'Não foi possível processar sua solicitação. Verifique os dados.',
  429: 'Muitas requisições. Aguarde um momento antes de tentar novamente.',
  500: 'Erro no servidor. Tente novamente mais tarde.',
  502: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.',
  503: 'Serviço em manutenção. Tente novamente mais tarde.',
  504: 'Tempo limite do servidor. Tente novamente.',
};

// Mensagens padrão por tipo de erro
const defaultErrorMessages: Record<string, string> = {
  API_ERROR: 'Ocorreu um erro ao processar sua solicitação.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
  TIMEOUT_ERROR: 'A conexão demorou muito. Tente novamente.',
  OFFLINE_ERROR: 'Você está offline. Verifique sua conexão com a internet.',
  VALIDATION_ERROR: 'Dados inválidos. Verifique as informações.',
  AUTH_ERROR: 'Sua sessão expirou. Faça login novamente.',
  NOT_FOUND_ERROR: 'O recurso solicitado não foi encontrado.',
  UNKNOWN_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
};

/**
 * Obtém mensagem amigável para o usuário baseado no erro
 */
export function getErrorMessage(error: unknown): string {
  // Se já for um AppError, usa a mensagem do usuário
  if (isAppError(error)) {
    return error.userMessage;
  }

  // Se for um Error padrão
  if (error instanceof Error) {
    // Tenta extrair código HTTP da mensagem (ex: "HTTP 404: Not Found")
    const httpMatch = error.message.match(/HTTP\s+(\d+)/);
    if (httpMatch) {
      const statusCode = parseInt(httpMatch[1], 10);
      return httpErrorMessages[statusCode] || error.message;
    }

    // Mensagens específicas por padrão na mensagem
    if (error.message.includes('não encontrado') || error.message.includes('404')) {
      return httpErrorMessages[404];
    }
    if (error.message.includes('não tem permissão') || error.message.includes('403')) {
      return httpErrorMessages[403];
    }
    if (error.message.includes('inválido') || error.message.includes('400')) {
      return httpErrorMessages[400];
    }
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return defaultErrorMessages.TIMEOUT_ERROR;
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return defaultErrorMessages.NETWORK_ERROR;
    }

    return error.message;
  }

  // Fallback para string ou unknown
  if (typeof error === 'string') {
    return error;
  }

  return defaultErrorMessages.UNKNOWN_ERROR;
}

/**
 * Obtém severidade do erro para UI
 */
export function getErrorSeverity(error: unknown): ErrorSeverity {
  if (isAppError(error)) {
    return error.severity;
  }

  if (error instanceof Error) {
    if (error.message.includes('404')) return 'error';
    if (error.message.includes('401') || error.message.includes('403')) return 'error';
    if (error.message.includes('timeout') || error.message.includes('offline')) return 'warning';
  }

  return 'error';
}

/**
 * Verifica se o erro permite retry
 */
export function isRetryableError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.retryable;
  }

  if (error instanceof Error) {
    const httpMatch = error.message.match(/HTTP\s+(\d+)/);
    if (httpMatch) {
      const statusCode = parseInt(httpMatch[1], 10);
      return statusCode >= 500 || statusCode === 429;
    }

    // Erros de rede geralmente permitem retry
    if (error.message.includes('network') || 
        error.message.includes('timeout') ||
        error.message.includes('fetch')) {
      return true;
    }
  }

  return false;
}

/**
 * Cria instância específica de erro a partir de uma resposta HTTP
 */
export function createApiError(
  message: string, 
  statusCode: number, 
  response?: any
): AppError {
  switch (statusCode) {
    case 401:
      return new AuthError(message);
    case 403:
      return new AuthError(message);
    case 404:
      return new NotFoundError(message);
    case 422:
      return new ValidationError(message, response?.errors || {});
    default:
      return new ApiError(message, statusCode, response);
  }
}

/**
 * Extrai erros de campo de uma resposta de validação
 */
export function extractFieldErrors(response: any): Record<string, string> {
  if (!response) return {};

  // Formato padrão da API: { errors: { field: "message" } }
  if (response.errors && typeof response.errors === 'object') {
    return response.errors;
  }

  // Formato alternativo: { fieldErrors: { field: "message" } }
  if (response.fieldErrors && typeof response.fieldErrors === 'object') {
    return response.fieldErrors;
  }

  // Array de erros: [{ field: "name", message: "erro" }]
  if (Array.isArray(response.errors)) {
    const fieldErrors: Record<string, string> = {};
    response.errors.forEach((err: any) => {
      if (err.field && err.message) {
        fieldErrors[err.field] = err.message;
      }
    });
    return fieldErrors;
  }

  return {};
}

/**
 * Função para retry com exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Não tenta novamente se não for retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Se for a última tentativa, lança o erro
      if (attempt === maxRetries) {
        throw error;
      }

      // Calcula delay com exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Verifica se o navegador está online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Monitora mudanças no estado de conexão
 */
export function watchOnlineStatus(
  onOffline: () => void,
  onOnline: () => void
): () => void {
  const handleOffline = () => onOffline();
  const handleOnline = () => onOnline();

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  // Retorna função para remover listeners
  return () => {
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
  };
}

// Re-exporta os type guards e classes
export {
  isAppError,
  isApiError,
  isNetworkError,
  isOfflineError,
  isTimeoutError,
  isValidationError,
  isAuthError,
  isNotFoundError,
  ApiError,
  NetworkError,
  TimeoutError,
  OfflineError,
  ValidationError,
  AuthError,
  NotFoundError,
};
