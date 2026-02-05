/**
 * Componente ProtectedRoute
 * Protege rotas que requerem autenticação
 */

import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Mostra loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redireciona para login se não estiver autenticado
  if (!isAuthenticated) {
    // Preserva a URL original para redirecionar após login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Renderiza as rotas filhas
  return <Outlet />;
}

export default ProtectedRoute;
