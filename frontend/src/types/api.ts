/**
 * Tipos relacionados a chamadas de API
 */

// Resposta de erro padrão da API
export interface ApiError {
  error: string;
  message: string;
}

// Configuração de requisição
export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}

