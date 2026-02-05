import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

/**
 * Página 404 - Recurso não encontrado
 */
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Ilustração 404 */}
        <div className="mb-8">
          <svg
            className="mx-auto h-48 w-48 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Código de erro */}
        <h1 className="text-9xl font-bold text-gray-200 mb-4">404</h1>

        {/* Título */}
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Página não encontrada
        </h2>

        {/* Mensagem */}
        <p className="text-lg text-gray-600 mb-8">
          A página que você está procurando não existe ou foi movida.
          <br />
          Verifique o endereço digitado ou volte para o Dashboard.
        </p>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate('/')} variant="primary">
            Voltar para Dashboard
          </Button>
          <Button onClick={() => navigate(-1)} variant="secondary">
            Página anterior
          </Button>
        </div>

        {/* Links úteis */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Ou navegue para:</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <button
              onClick={() => navigate('/contacts')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Contatos
            </button>
            <button
              onClick={() => navigate('/companies')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Empresas
            </button>
            <button
              onClick={() => navigate('/leads')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Leads
            </button>
            <button
              onClick={() => navigate('/opportunities')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Oportunidades
            </button>
            <button
              onClick={() => navigate('/tasks')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Tarefas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
