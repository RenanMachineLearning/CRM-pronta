/**
 * PageLoading Component
 * Componente de loading para Suspense de rotas
 */

import LoadingSpinner from './LoadingSpinner';

export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Carregando...</p>
      </div>
    </div>
  );
}

export default PageLoading;