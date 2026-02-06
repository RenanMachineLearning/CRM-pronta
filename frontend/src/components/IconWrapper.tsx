/**
 * Componente wrapper para ícones com suporte a acessibilidade
 * 
 * Use este componente para garantir que todos os ícones tenham
 * os atributos ARIA corretos, melhorando a acessibilidade do app.
 * 
 * @example
 * // Ícone decorativo (dentro de botão com aria-label)
 * <IconWrapper decorative>
 *   <PencilIcon className="w-4 h-4" />
 * </IconWrapper>
 * 
 * @example
 * // Ícone com label (interativo)
 * <IconWrapper label="Editar contato">
 *   <PencilIcon className="w-4 h-4" />
 * </IconWrapper>
 */

import type { ReactNode } from 'react';

export interface IconWrapperProps {
  /** O ícone a ser renderizado */
  icon: ReactNode;
  /** Label para ícones interativos (será usado como aria-label) */
  label?: string;
  /** Se true, o ícone é decorativo e terá aria-hidden="true" */
  decorative?: boolean;
  /** Classes CSS adicionais */
  className?: string;
}

export function IconWrapper({
  icon,
  label,
  decorative = false,
  className = ''
}: IconWrapperProps) {
  // Ícone decorativo - escondido de tecnologias assistivas
  if (decorative || !label) {
    return (
      <span className={className} aria-hidden="true">
        {icon}
      </span>
    );
  }

  // Ícone com label - acessível via aria-label
  return (
    <span
      className={className}
      aria-label={label}
      role="img"
    >
      {icon}
    </span>
  );
}

/**
 * Hook para criar ícones decorativos facilmente
 * 
 * @example
 * const DecorativeIcon = useDecorativeIcon(PencilIcon);
 * <DecorativeIcon className="w-4 h-4" />
 */
export function createDecorativeIcon(
  IconComponent: React.ComponentType<{ className?: string }>
) {
  return function DecorativeIcon({ className }: { className?: string }) {
    return (
      <IconWrapper
        decorative
        icon={<IconComponent className={className} />}
      />
    );
  };
}
