/**
 * useFocusManager Hook
 * Gerenciamento de foco para acessibilidade
 * Útil para modais, dropdowns e componentes interativos
 */

import { useEffect, useRef } from 'react';

interface UseFocusManagerOptions {
  /** Se o elemento está aberto/visível */
  isOpen: boolean;
  /** Callback quando ESC é pressionado */
  onEscape?: () => void;
  /** Callback quando clicar fora */
  onClickOutside?: () => void;
  /** Elemento para retornar o foco ao fechar */
  returnFocus?: boolean;
}

export function useFocusManager({
  isOpen,
  onEscape,
  onClickOutside,
  returnFocus = true,
}: UseFocusManagerOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);

  // Elementos focáveis
  const FOCUSABLE_SELECTORS = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  // Guarda o foco anterior ao abrir
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Foca no primeiro elemento focável
      setTimeout(() => {
        const container = containerRef.current;
        if (container) {
          const focusableElements = container.querySelectorAll(FOCUSABLE_SELECTORS);
          const firstElement = focusableElements[0] as HTMLElement;
          
          if (firstElement) {
            firstElement.focus();
            firstFocusableRef.current = firstElement;
          }
        }
      }, 50);
    } else if (returnFocus && previousFocusRef.current) {
      // Retorna o foco ao elemento anterior
      setTimeout(() => {
        previousFocusRef.current?.focus();
      }, 50);
    }
  }, [isOpen, returnFocus]);

  // Gerencia eventos de teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC fecha o elemento
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      // Tab trap - mantém o foco dentro do elemento
      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;

        const focusableElements = Array.from(
          container.querySelectorAll(FOCUSABLE_SELECTORS)
        ) as HTMLElement[];

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        // Shift + Tab no primeiro elemento vai para o último
        if (e.shiftKey && activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
        // Tab no último elemento vai para o primeiro
        else if (!e.shiftKey && activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onEscape]);

  // Gerencia click outside
  useEffect(() => {
    if (!isOpen || !onClickOutside) return;

    const handleClickOutside = (e: MouseEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(e.target as Node)) {
        onClickOutside();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClickOutside]);

  return containerRef;
}

export default useFocusManager;