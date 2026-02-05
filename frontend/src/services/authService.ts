/**
 * Serviço de Autenticação
 * Comunicação com endpoints de auth do backend
 */

import { apiRequest } from '../utils/api';
import type {
  User,
  LoginCredentials,
  UpdateProfileData,
  ChangePasswordData,
  ForgotPasswordData,
  ResetPasswordData,
  AuthResponse,
} from '../types/auth';

/**
 * Login do usuário
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: credentials,
  });
}

/**
 * Logout do usuário
 */
export async function logout(): Promise<void> {
  return apiRequest<void>('/api/auth/logout', {
    method: 'POST',
  });
}

/**
 * Obtém dados do usuário atual
 */
export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>('/api/auth/me');
}

/**
 * Atualiza perfil do usuário
 */
export async function updateProfile(data: UpdateProfileData): Promise<User> {
  return apiRequest<User>('/api/auth/me', {
    method: 'PUT',
    body: data,
  });
}

/**
 * Altera senha do usuário
 */
export async function changePassword(data: ChangePasswordData): Promise<void> {
  return apiRequest<void>('/api/auth/me/password', {
    method: 'PUT',
    body: data,
  });
}

/**
 * Solicita recuperação de senha
 */
export async function forgotPassword(data: ForgotPasswordData): Promise<void> {
  return apiRequest<void>('/api/auth/forgot-password', {
    method: 'POST',
    body: data,
  });
}

/**
 * Reseta senha com token
 */
export async function resetPassword(data: ResetPasswordData): Promise<void> {
  return apiRequest<void>('/api/auth/reset-password', {
    method: 'POST',
    body: data,
  });
}

/**
 * Upload de avatar do usuário
 */
export async function uploadAvatar(file: File): Promise<{ avatar: string }> {
  const formData = new FormData();
  formData.append('avatar', file);

  return apiRequest<{ avatar: string }>('/api/auth/me/avatar', {
    method: 'POST',
    body: formData,
    headers: {}, // Remove Content-Type para deixar o browser definir com boundary
  });
}
