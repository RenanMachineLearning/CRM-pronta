/**
 * Componente Form
 * Wrapper para formulários com funcionalidades avançadas
 */

import { FormHTMLAttributes, ReactNode } from 'react';
import { ErrorMessage } from './ErrorMessage';

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  /** Conteúdo do formulário */
  children: ReactNode;
  /** Função chamada no submit */
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  /** Erro global do formulário */
  error?: string | null;
  /** Se está carregando */
  loading?: boolean;
  /** Classes adicionais */
  className?: string;
}

export function Form({
  children,
  onSubmit,
  error,
  loading = false,
  className = '',
  ...props
}: FormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loading) {
      onSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-6 ${className}`}
      noValidate
      {...props}
    >
      {/* Erro global */}
      {error && (
        <ErrorMessage
          message={error}
          dismissible
          onRetry={() => window.location.reload()}
        />
      )}

      {/* Conteúdo */}
      {children}
    </form>
  );
}

export default Form;
