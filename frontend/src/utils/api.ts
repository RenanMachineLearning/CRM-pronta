/**
 * Utilitário para fazer requisições HTTP à API
 * Inclui headers de autenticação e tenant automaticamente
 * Tratamento de erros robusto com classes específicas
 */

import { 
  createApiError, 
  NetworkError, 
  TimeoutError, 
  OfflineError,
  isOnline,
  retryWithBackoff 
} from '../services/errorService';
import type { ApiRequestConfig } from '../types/api';
import type { AppError } from '../types/error';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || 'demo';
const DEFAULT_TIMEOUT = 30000; // 30 segundos

/**
 * Obtém token de autenticação do localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * Obtém tenant slug do localStorage ou env
 */
function getTenantSlug(): string {
  return localStorage.getItem('tenantSlug') || TENANT_SLUG;
}

/**
 * Cria um AbortController com timeout
 */
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  
  setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  return controller;
}

/**
 * Faz requisição HTTP à API com tratamento de erros completo
 * 
 * @param endpoint - Endpoint da API (ex: '/api/contacts')
 * @param config - Configuração da requisição
 * @returns Promise com resposta JSON
 * @throws AppError se requisição falhar
 */
export async function apiRequest<T>(
  endpoint: string,
  config: ApiRequestConfig = {}
): Promise<T> {
  // Verifica se está online
  if (!isOnline()) {
    throw new OfflineError();
  }

  const token = getAuthToken();
  const tenantSlug = getTenantSlug();
  const timeout = config.timeout || DEFAULT_TIMEOUT;

  // Construir headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers,
  };

  // Adicionar header de autenticação se token existir
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Adicionar header de tenant
  headers['X-Tenant-Slug'] = tenantSlug;

  // Construir URL completa
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  // Criar controller para timeout
  const timeoutController = createTimeoutController(timeout);
  
  try {
    // Fazer requisição
    const response = await fetch(url, {
      method: config.method || 'GET',
      headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
      signal: timeoutController.signal,
    });

    // Verificar se resposta é JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    // Parsear resposta
    let data: any;
    if (isJson) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    // Se resposta não foi OK, lançar erro específico
    if (!response.ok) {
      const message = data.message || data.error || `Erro HTTP ${response.status}`;
      throw createApiError(message, response.status, data);
    }

    return data as T;
  } catch (error) {
    // Limpar timeout
    timeoutController.abort();

    // Se já for um AppError, apenas relança
    if (error instanceof Error && 'type' in error) {
      throw error;
    }

    // Tratar erro de abort (timeout)
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TimeoutError();
    }

    // Tratar erro de rede (fetch falhou)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError('Erro de conexão com o servidor');
    }

    // Relançar outros erros
    throw error;
  }
}

/**
 * Faz requisição com retry automático em erros de rede
 * 
 * @param endpoint - Endpoint da API
 * @param config - Configuração da requisição
 * @param maxRetries - Número máximo de tentativas (padrão: 3)
 * @returns Promise com resposta JSON
 */
export async function apiRequestWithRetry<T>(
  endpoint: string,
  config: ApiRequestConfig = {},
  maxRetries: number = 3
): Promise<T> {
  return retryWithBackoff(
    () => apiRequest<T>(endpoint, config),
    maxRetries
  );
}

/**
 * Hook para verificar status da API
 * @returns true se API está respondendo
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    await apiRequest('/health', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtém URL completa da API
 */
export function getApiUrl(): string {
  return API_URL;
}

// Re-exporta tipos úteis
export type { AppError };
