/**
 * Componente FormField
 * Wrapper para campos de formulário com label, erro e help text
 */

import { ReactNode } from 'react';

export interface FormFieldProps {
  /** Nome do campo (para acessibilidade) */
  name: string;
  /** Label do campo */
  label?: string;
  /** Se o campo é obrigatório */
  required?: boolean;
  /** Mensagem de erro */
  error?: string;
  /** Texto de ajuda opcional */
  helpText?: string;
  /** Conteúdo do campo (Input, Select, Textarea) */
  children: ReactNode;
  /** Classes CSS adicionais */
  className?: string;
}

export function FormField({
  name,
  label,
  required = false,
  error,
  helpText,
  children,
  className = '',
}: FormFieldProps) {
  const fieldId = `field-${name}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;

  // Clona o children para injetar props de acessibilidade
  const childrenWithProps = (
    <div className="relative">
      {children}
    </div>
  );

  return (
    <div className={`${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Campo */}
      {childrenWithProps}

      {/* Erro */}
      {error && (
        <p
          id={errorId}
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Help text */}
      {!error && helpText && (
        <p id={helpId} className="mt-1 text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
}

export default FormField;
