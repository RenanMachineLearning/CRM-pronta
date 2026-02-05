/**
 * Hook useColumnVisibility
 * Gerencia visibilidade de colunas com persistência no localStorage
 */

import { useState, useEffect, useCallback } from 'react';

export type ColumnPriority = 'high' | 'medium' | 'low';

export interface ColumnConfig {
  key: string;
  title: string;
  priority: ColumnPriority;
  hiddenOn?: ('mobile' | 'tablet')[];
}

interface UseColumnVisibilityOptions {
  storageKey?: string;
  defaultVisible?: string[];
}

export function useColumnVisibility(
  columns: ColumnConfig[],
  options: UseColumnVisibilityOptions = {}
) {
  const { storageKey, defaultVisible } = options;

  // Estado inicial
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    // Tenta recuperar do localStorage
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Valida se as colunas armazenadas ainda existem
          const validColumns = parsed.filter((col: string) => 
            columns.some(c => c.key === col)
          );
          if (validColumns.length > 0) {
            return validColumns;
          }
        }
      } catch {
        // Ignora erros de parse
      }
    }
    
    // Usa defaultVisible ou todas as colunas de alta prioridade
    if (defaultVisible) {
      return defaultVisible;
    }
    
    return columns
      .filter(col => col.priority === 'high')
      .map(col => col.key);
  });

  // Persiste no localStorage quando mudar
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
      } catch {
        // Ignora erros de storage
      }
    }
  }, [visibleColumns, storageKey]);

  // Toggle visibilidade de uma coluna
  const toggleColumn = useCallback((columnKey: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnKey)) {
        // Não permite esconder a última coluna visível
        if (prev.length <= 1) {
          return prev;
        }
        return prev.filter(key => key !== columnKey);
      }
      return [...prev, columnKey];
    });
  }, []);

  // Mostra uma coluna específica
  const showColumn = useCallback((columnKey: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnKey)) return prev;
      return [...prev, columnKey];
    });
  }, []);

  // Esconde uma coluna específica
  const hideColumn = useCallback((columnKey: string) => {
    setVisibleColumns(prev => {
      // Não permite esconder a última coluna visível
      if (prev.length <= 1) return prev;
      return prev.filter(key => key !== columnKey);
    });
  }, []);

  // Reseta para configuração padrão
  const resetToDefault = useCallback(() => {
    if (defaultVisible) {
      setVisibleColumns(defaultVisible);
    } else {
      setVisibleColumns(
        columns
          .filter(col => col.priority === 'high')
          .map(col => col.key)
      );
    }
  }, [columns, defaultVisible]);

  // Mostra todas as colunas
  const showAll = useCallback(() => {
    setVisibleColumns(columns.map(col => col.key));
  }, [columns]);

  // Retorna colunas filtradas
  const getVisibleColumns = useCallback(() => {
    return columns.filter(col => visibleColumns.includes(col.key));
  }, [columns, visibleColumns]);

  // Verifica se uma coluna está visível
  const isColumnVisible = useCallback((columnKey: string) => {
    return visibleColumns.includes(columnKey);
  }, [visibleColumns]);

  return {
    visibleColumns,
    toggleColumn,
    showColumn,
    hideColumn,
    resetToDefault,
    showAll,
    getVisibleColumns,
    isColumnVisible,
  };
}

export default useColumnVisibility;
