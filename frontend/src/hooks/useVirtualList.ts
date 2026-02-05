/**
 * useVirtualList Hook
 * Virtualização de listas longas para melhor performance
 * Renderiza apenas os itens visíveis na viewport
 */

import { useState, useRef, useMemo, useCallback } from 'react';

interface UseVirtualListOptions<T> {
  /** Dados da lista */
  items: T[];
  /** Altura de cada item em pixels */
  itemHeight: number;
  /** Altura do container em pixels */
  containerHeight: number;
  /** Buffer de itens acima e abaixo da viewport */
  overscan?: number;
}

interface VirtualItem<T> {
  /** Item original */
  item: T;
  /** Índice do item */
  index: number;
  /** Posição em pixels do topo do item */
  style: React.CSSProperties;
}

interface UseVirtualListResult<T> {
  /** Itens virtuais a serem renderizados */
  virtualItems: VirtualItem<T>[];
  /** Altura total da lista */
  totalHeight: number;
  /** Ref para o container */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Handler de scroll */
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  /** Scroll para um item específico */
  scrollToIndex: (index: number) => void;
  /** Índice do item no topo da viewport */
  startIndex: number;
  /** Índice do item no final da viewport */
  endIndex: number;
}

export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: UseVirtualListOptions<T>): UseVirtualListResult<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Altura total da lista
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  // Índices dos itens visíveis
  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);
    return { startIndex: start, endIndex: end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Itens virtuais a serem renderizados
  const virtualItems = useMemo(() => {
    const virtualItems: VirtualItem<T>[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (i >= 0 && i < items.length) {
        virtualItems.push({
          item: items[i],
          index: i,
          style: {
            position: 'absolute',
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          },
        });
      }
    }
    return virtualItems;
  }, [items, startIndex, endIndex, itemHeight]);

  // Handler de scroll
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Scroll para um item específico
  const scrollToIndex = useCallback((index: number) => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);

  return {
    virtualItems,
    totalHeight,
    containerRef,
    onScroll,
    scrollToIndex,
    startIndex,
    endIndex,
  };
}

export default useVirtualList;