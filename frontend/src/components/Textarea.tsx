/**
 * Componente Textarea
 * Campo de texto multilinha consistente com Input
 */

import { TextareaHTMLAttributes, forwardRef } from 'react';

export type TextareaVariant = 'default' | 'success' | 'error';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
  variant?: TextareaVariant;
  fullWidth?: boolean;
  rows?: number;
  autoResize?: boolean;
}

const variantClasses: Record<TextareaVariant, string> = {
  default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
  success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
  error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helpText,
      variant = 'default',
      fullWidth = true,
      rows = 4,
      autoResize = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    // Gera um ID único se não fornecido
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    // Handler para auto-resize
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        const target = e.currentTarget;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
      }
    };

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`
            block rounded-md shadow-sm
            transition-colors duration-200
            placeholder-gray-400
            disabled:bg-gray-100 disabled:text-gray-500
            ${variantClasses[error ? 'error' : variant]}
            ${fullWidth ? 'w-full' : ''}
            ${className}
          `}
          onInput={autoResize ? handleInput : undefined}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${textareaId}-error` : helpText ? `${textareaId}-help` : undefined}
          {...props}
        />

        {/* Mensagem de erro */}
        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-1 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Texto de ajuda */}
        {!error && helpText && (
          <p id={`${textareaId}-help`} className="mt-1 text-sm text-gray-500">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
