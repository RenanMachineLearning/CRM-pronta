import React, { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  variant?: 'default' | 'success' | 'error';
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helpText,
  variant = 'default',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all duration-200';
  
  const variantClasses = {
    default: 'border-gray-300 hover:border-gray-400',
    success: 'border-success-500 text-success-600 focus:ring-success-500 focus:border-success-500',
    error: 'border-error-500 text-error-600 focus:ring-error-500 focus:border-error-500'
  };
  
  const widthClass = fullWidth ? 'w-full' : 'w-full sm:max-w-md';
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`.trim();
  
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={classes}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${props.id}-error` : helpText && props.id ? `${props.id}-help` : undefined}
        {...props}
      />
      {error && (
        <p
          id={`${props.id}-error`}
          className="mt-1 text-sm text-error-600"
          role="alert"
        >
          {error}
        </p>
      )}
      {!error && helpText && (
        <p id={`${props.id}-help`} className="mt-1 text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};

export default Input;