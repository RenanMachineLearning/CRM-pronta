/**
 * Utilitário para fazer requisições HTTP à API
 * Inclui headers de autenticação e tenant automaticamente
 */

import type { ApiRequestConfig, ApiError } from '../types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || 'demo';

/**
 * Obtém token de autenticação do localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * Obtém tenant slug do localStorage ou env
 */
function getTenantSlug(): string {
  return localStorage.getItem('tenantSlug') || TENANT_SLUG;
}

/**
 * Faz requisição HTTP à API
 * 
 * @param endpoint - Endpoint da API (ex: '/api/contacts')
 * @param config - Configuração da requisição
 * @returns Promise com resposta JSON
 * @throws Error se requisição falhar
 */
export async function apiRequest<T>(
  endpoint: string,
  config: ApiRequestConfig = {}
): Promise<T> {
  const token = getAuthToken();
  const tenantSlug = getTenantSlug();

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

  // Fazer requisição
  const response = await fetch(url, {
    method: config.method || 'GET',
    headers,
    body: config.body ? JSON.stringify(config.body) : undefined,
  });

  // Verificar se resposta é JSON
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  // Se não for JSON, lançar erro
  if (!isJson && !response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Parsear JSON
  const data = await response.json();

  // Se resposta não foi OK, lançar erro
  if (!response.ok) {
    const error: ApiError = data;
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return data as T;
}

