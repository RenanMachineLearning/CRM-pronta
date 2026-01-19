/**
 * Serviço para interagir com a API de usuários
 * 
 * Endpoints:
 * - GET /api/users - Lista usuários
 */

import { apiRequest } from '../utils/api';

/**
 * Status de usuário
 */
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

/**
 * Role de usuário
 */
export interface UserRole {
  id: string;
  name: string;
  description?: string | null;
}

/**
 * Usuário completo
 */
export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  status: UserStatus;
  roles: UserRole[];
  createdAt: string; // ISO string da API
  updatedAt: string; // ISO string da API
}

/**
 * Resposta de listagem de usuários
 */
export interface UserListResponse {
  data: User[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Interface para lookup de usuários
 */
export interface UserLookup {
  id: string;
  name: string;
  email: string;
}

/**
 * Lista usuários para lookup (busca por nome ou email)
 * 
 * @param query - Termo de busca (opcional)
 * @returns Promise com lista de usuários ativos filtrados por nome/email
 */
export async function listUsersForLookup(query?: string): Promise<UserLookup[]> {
  const params = new URLSearchParams();
  params.append('limit', '100');
  params.append('status', 'ACTIVE'); // Filtrar apenas usuários ativos
  
  const response = await apiRequest<UserListResponse>(
    `/api/users?${params.toString()}`
  );
  
  let users = response.data.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
  }));

  // Filtrar por query no frontend se fornecido
  if (query && query.trim().length >= 2) {
    const queryLower = query.toLowerCase();
    users = users.filter((user) =>
      user.name.toLowerCase().includes(queryLower) ||
      user.email.toLowerCase().includes(queryLower)
    );
  }
  
  // Limitar a 20 resultados após filtro
  return users.slice(0, 20);
}
