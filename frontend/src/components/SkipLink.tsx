/**
 * SkipLink Component
 * Permite usuários de teclado pular direto para o conteúdo principal
 * Melhora acessibilidade para leitores de tela
 */

import { useState } from 'react';

interface SkipLinkProps {
  /** ID do elemento principal para onde pular */
  targetId?: string;
  /** Texto do link */
  text?: string;
}

export function SkipLink({ 
  targetId = 'main-content', 
  text = 'Pular para conteúdo principal' 
}: SkipLinkProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      className={`
        fixed top-4 left-4 z-[100]
        px-4 py-2 bg-blue-600 text-white font-medium rounded-md
        shadow-lg
        transition-transform duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isVisible ? 'translate-y-0' : '-translate-y-[200%]'}
      `}
    >
      {text}
    </a>
  );
}

export default SkipLink;