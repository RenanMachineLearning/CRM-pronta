import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - Captura erros de renderização em componentes React
 * 
 * Não captura erros em:
 * - Manipuladores de eventos (use try/catch)
 * - Código assíncrono (use .catch())
 * - Erros no próprio ErrorBoundary
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Atualiza o estado para exibir fallback na próxima renderização
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log do erro para serviço de monitoramento
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Aqui você pode enviar o erro para um serviço como Sentry, LogRocket, etc.
    // logErrorToService(error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Fallback customizado se fornecido
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            {/* Ícone de erro */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Algo deu errado
            </h2>

            {/* Mensagem */}
            <p className="text-gray-600 mb-6">
              Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver.
            </p>

            {/* Detalhes do erro (apenas em desenvolvimento) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 text-left">
                <details className="bg-red-50 rounded-lg p-4">
                  <summary className="text-red-800 font-medium cursor-pointer">
                    Detalhes do erro (desenvolvimento)
                  </summary>
                  <div className="mt-2 text-sm text-red-700 overflow-auto">
                    <p className="font-mono">{this.state.error.toString()}</p>
                    {this.state.errorInfo && (
                      <pre className="mt-2 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReload} variant="primary">
                Recarregar página
              </Button>
              <Button onClick={this.handleGoHome} variant="secondary">
                Voltar para Dashboard
              </Button>
            </div>

            {/* ID do erro para suporte */}
            <p className="mt-6 text-xs text-gray-400">
              Se o problema persistir, entre em contato com o suporte.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
