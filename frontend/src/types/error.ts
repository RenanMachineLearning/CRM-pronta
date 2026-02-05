/**
 * Tipos relacionados a tratamento de erros
 */

// Tipos de erro da aplicação
export type ErrorType = 
  | 'API_ERROR' 
  | 'NETWORK_ERROR' 
  | 'TIMEOUT_ERROR' 
  | 'OFFLINE_ERROR' 
  | 'VALIDATION_ERROR' 
  | 'AUTH_ERROR' 
  | 'NOT_FOUND_ERROR'
  | 'UNKNOWN_ERROR';

// Categorias de erro para UI
export type ErrorSeverity = 'error' | 'warning' | 'info';

// Interface base para erros da aplicação
export interface AppError extends Error {
  type: ErrorType;
  statusCode?: number;
  severity: ErrorSeverity;
  userMessage: string;
  retryable: boolean;
}

// Erro da API (respostas HTTP 4xx, 5xx)
export class ApiError extends Error implements AppError {
  type: ErrorType = 'API_ERROR';
  severity: ErrorSeverity = 'error';
  retryable: boolean = false;
  userMessage: string;

  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.userMessage = message;
    
    // Define retryable baseado no status code
    this.retryable = statusCode >= 500 || statusCode === 429;
    
    // Ajusta severidade baseado no status code
    if (statusCode >= 500) {
      this.severity = 'error';
    } else if (statusCode === 429) {
      this.severity = 'warning';
    } else {
      this.severity = 'error';
    }
  }
}

// Erro de rede (fetch falhou)
export class NetworkError extends Error implements AppError {
  type: ErrorType = 'NETWORK_ERROR';
  severity: ErrorSeverity = 'error';
  retryable: boolean = true;
  userMessage: string = 'Erro de conexão. Verifique sua internet e tente novamente.';

  constructor(message: string = 'Erro de conexão') {
    super(message);
    this.name = 'NetworkError';
  }
}

// Erro de timeout
export class TimeoutError extends Error implements AppError {
  type: ErrorType = 'TIMEOUT_ERROR';
  severity: ErrorSeverity = 'warning';
  retryable: boolean = true;
  userMessage: string = 'A conexão demorou muito. Tente novamente.';

  constructor(message: string = 'Tempo limite excedido') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Erro de offline
export class OfflineError extends Error implements AppError {
  type: ErrorType = 'OFFLINE_ERROR';
  severity: ErrorSeverity = 'warning';
  retryable: boolean = true;
  userMessage: string = 'Você está offline. Verifique sua conexão com a internet.';

  constructor(message: string = 'Sem conexão com a internet') {
    super(message);
    this.name = 'OfflineError';
  }
}

// Erro de validação
export class ValidationError extends Error implements AppError {
  type: ErrorType = 'VALIDATION_ERROR';
  severity: ErrorSeverity = 'error';
  retryable: boolean = false;
  userMessage: string;
  public fieldErrors: Record<string, string>;

  constructor(
    message: string,
    fieldErrors: Record<string, string> = {}
  ) {
    super(message);
    this.name = 'ValidationError';
    this.userMessage = message;
    this.fieldErrors = fieldErrors;
  }
}

// Erro de autenticação
export class AuthError extends Error implements AppError {
  type: ErrorType = 'AUTH_ERROR';
  severity: ErrorSeverity = 'error';
  retryable: boolean = false;
  userMessage: string = 'Sua sessão expirou. Faça login novamente.';

  constructor(message: string = 'Erro de autenticação') {
    super(message);
    this.name = 'AuthError';
  }
}

// Erro de recurso não encontrado
export class NotFoundError extends Error implements AppError {
  type: ErrorType = 'NOT_FOUND_ERROR';
  severity: ErrorSeverity = 'error';
  retryable: boolean = false;
  userMessage: string = 'O recurso solicitado não foi encontrado.';

  constructor(message: string = 'Recurso não encontrado') {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Type guard functions
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && 'type' in error && 'severity' in error;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isOfflineError(error: unknown): error is OfflineError {
  return error instanceof OfflineError;
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}
