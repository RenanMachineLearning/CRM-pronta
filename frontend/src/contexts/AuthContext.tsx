/**
 * Contexto de Autenticação
 * Gerencia estado global do usuário autenticado
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, LoginCredentials } from '../types/auth';
import * as authService from '../services/authService';

/**
 * Decodifica token JWT e extrai payload
 */
function parseJwt(token: string): { tenantId?: string; sub?: string } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticação ao iniciar
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          // Garantir que tenantSlug está definido
          if (!localStorage.getItem('tenantSlug')) {
            localStorage.setItem('tenantSlug', 'demo');
          }
          const userData = await authService.getCurrentUser();
          // Adicionar tenantId aos dados do usuário
          const tokenPayload = parseJwt(token);
          const userWithTenantId = {
            ...userData,
            tenantId: tokenPayload?.tenantId || '',
            role: userData.roles?.[0]?.name || '',
          };
          setUser(userWithTenantId);
        } catch (error) {
          // Token inválido ou expirado
          localStorage.removeItem('authToken');
          localStorage.removeItem('tenantSlug');
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      localStorage.setItem('authToken', response.token);
      
      // Usar slug fixo 'demo' (o token contém tenantId, não o slug)
      localStorage.setItem('tenantSlug', 'demo');
      
      // Buscar dados do usuário após login
      const userData = await authService.getCurrentUser();
      // Extrair tenantId do token e adicionar aos dados do usuário
      const tokenPayload = parseJwt(response.token);
      const userWithTenantId = {
        ...userData,
        tenantId: tokenPayload?.tenantId || '',
        role: userData.roles?.[0]?.name || '',
      };
      setUser(userWithTenantId);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout().catch(console.error); // Logout no backend (não bloqueante)
    localStorage.removeItem('authToken');
    localStorage.removeItem('tenantSlug');
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      // Se falhar, faz logout
      logout();
    }
  }, [logout]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

export default AuthContext;
