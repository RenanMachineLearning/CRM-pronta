import React, { SelectHTMLAttributes } from 'react';

export interface Option {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  options: Option[];
  variant?: 'default' | 'success' | 'error';
  fullWidth?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helpText,
  options,
  variant = 'default',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'block w-full pl-3 pr-10 py-2 text-base border focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md';
  
  const variantClasses = {
    default: 'border-gray-300 bg-white text-gray-900',
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
      <select
        className={classes}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {(error || helpText) && (
        <p
          className={`mt-1 text-sm ${
            error ? 'text-error-600' : 'text-gray-500'
          }`}
        >
          {error || helpText}
        </p>
      )}
    </div>
  );
};

export default Select;