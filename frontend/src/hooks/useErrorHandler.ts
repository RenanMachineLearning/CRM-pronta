/**
 * Hook para tratamento padronizado de erros
 * Integra com Toast notifications e fornece mensagens amigáveis
 */

import { useCallback } from 'react';
import { useToast } from '../components/Toast';
import { 
  getErrorMessage, 
  getErrorSeverity,
  isAuthError,
  isRetryableError 
} from '../services/errorService';

interface ErrorHandlerOptions {
  /** Se deve mostrar toast (padrão: true) */
  showToast?: boolean;
  /** Se deve redirecionar para login em erro de auth (padrão: true) */
  redirectOnAuth?: boolean;
  /** Callback customizado para tratamento de erro */
  onError?: (error: unknown) => void;
  /** Mensagem customizada para sobrescrever a mensagem do erro */
  customMessage?: string;
  /** Duração do toast em ms (padrão: 5000) */
  toastDuration?: number;
}

interface ErrorHandlerResult {
  /** Função para tratar erro */
  handleError: (error: unknown, options?: ErrorHandlerOptions) => void;
  /** Função para tratar erro silenciosamente (sem toast) */
  handleErrorSilent: (error: unknown) => string;
  /** Verifica se erro é de autenticação */
  isAuthError: (error: unknown) => boolean;
  /** Verifica se erro permite retry */
  isRetryable: (error: unknown) => boolean;
}

/**
 * Hook para tratamento padronizado de erros
 * 
 * @example
 * const { handleError } = useErrorHandler();
 * 
 * try {
 *   await apiRequest('/api/contacts');
 * } catch (error) {
 *   handleError(error);
 * }
 */
export function useErrorHandler(): ErrorHandlerResult {
  const toast = useToast();

  const handleError = useCallback((
    error: unknown, 
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      redirectOnAuth = true,
      onError,
      customMessage,
      toastDuration = 5000,
    } = options;

    // Executa callback customizado se fornecido
    if (onError) {
      onError(error);
    }

    // Obtém mensagem amigável
    const message = customMessage || getErrorMessage(error);

    // Trata erro de autenticação
    if (isAuthError(error)) {
      if (showToast) {
        toast.error(message, toastDuration);
      }
      
      if (redirectOnAuth) {
        // Redireciona para login após um pequeno delay para o usuário ver a mensagem
        setTimeout(() => {
          // Limpa token
          localStorage.removeItem('authToken');
          // Redireciona para login
          window.location.href = '/auth/login';
        }, 2000);
      }
      return;
    }

    // Mostra toast baseado na severidade
    if (showToast) {
      const severity = getErrorSeverity(error);
      
      switch (severity) {
        case 'error':
          toast.error(message, toastDuration);
          break;
        case 'warning':
          toast.warning(message, toastDuration);
          break;
        case 'info':
          toast.info(message, toastDuration);
          break;
      }
    }

    // Log do erro no console em desenvolvimento
    if (import.meta.env.DEV) {
      console.error('Erro tratado:', error);
    }
  }, [toast]);

  const handleErrorSilent = useCallback((error: unknown): string => {
    return getErrorMessage(error);
  }, []);

  const checkIsAuthError = useCallback((error: unknown): boolean => {
    return isAuthError(error);
  }, []);

  const checkIsRetryable = useCallback((error: unknown): boolean => {
    return isRetryableError(error);
  }, []);

  return {
    handleError,
    handleErrorSilent,
    isAuthError: checkIsAuthError,
    isRetryable: checkIsRetryable,
  };
}

/**
 * Hook específico para tratamento de erros em formulários
 * Mostra erros de validação de forma diferente
 */
export function useFormErrorHandler() {
  const { handleError } = useErrorHandler();
  const toast = useToast();

  const handleFormError = useCallback((
    error: unknown,
    setFieldError?: (field: string, message: string) => void
  ) => {
    // Se tiver um erro de validação com field errors e função setFieldError
    if (
      error instanceof Error &&
      'fieldErrors' in error &&
      typeof setFieldError === 'function'
    ) {
      const fieldErrors = (error as any).fieldErrors as Record<string, string>;
      
      // Seta erros nos campos
      Object.entries(fieldErrors).forEach(([field, message]) => {
        setFieldError(field, message);
      });

      // Mostra toast com mensagem geral
      toast.error('Verifique os campos com erro e tente novamente.');
      return;
    }

    // Para outros erros, usa handler padrão
    handleError(error);
  }, [handleError, toast]);

  return {
    handleFormError,
    handleError,
  };
}

export default useErrorHandler;
