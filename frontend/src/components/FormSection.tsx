/**
 * Componente FormSection
 * Layout responsivo em grid para agrupar campos de formulário
 */

import { ReactNode } from 'react';

export interface FormSectionProps {
  /** Título da seção (opcional) */
  title?: string;
  /** Descrição da seção (opcional) */
  description?: string;
  /** Conteúdo (campos do formulário) */
  children: ReactNode;
  /** Número de colunas em desktop */
  columns?: 1 | 2 | 3;
  /** Espaçamento entre campos */
  gap?: 'small' | 'medium' | 'large';
  /** Classes adicionais */
  className?: string;
}

const gapClasses = {
  small: 'gap-4',
  medium: 'gap-6',
  large: 'gap-8',
};

export function FormSection({
  title,
  description,
  children,
  columns = 2,
  gap = 'medium',
  className = '',
}: FormSectionProps) {
  // Grid responsivo
  // Mobile: sempre 1 coluna
  // Tablet (md): 1 ou 2 colunas
  // Desktop (lg): respeita o prop columns
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className={`${className}`}>
      {/* Cabeçalho da seção */}
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Grid de campos */}
      <div className={`grid ${gridCols[columns]} ${gapClasses[gap]}`}>
        {children}
      </div>
    </div>
  );
}

export default FormSection;
