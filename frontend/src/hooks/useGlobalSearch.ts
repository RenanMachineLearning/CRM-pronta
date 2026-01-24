/**
 * Hook para busca global em múltiplas entidades
 * Gerencia estado de busca, loading, erros e cancelamento de requisições
 */

import { useState, useCallback, useRef } from 'react';
import { searchGlobal } from '../services/searchService';
import type { GlobalSearchResponse, GlobalSearchParams } from '../types/search';

export const useGlobalSearch = () => {
  const [results, setResults] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (params: GlobalSearchParams) => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const data = await searchGlobal(params, abortController.signal);
      
      // Verificar se requisição foi cancelada
      if (!abortController.signal.aborted) {
        setResults(data);
        setLoading(false);
      }
    } catch (err: any) {
      // Ignorar erros de cancelamento
      if (err.name === 'AbortError') {
        return;
      }
      
      if (!abortController.signal.aborted) {
        setError(err.message || 'Erro ao realizar busca');
        setLoading(false);
        setResults(null);
      }
    }
  }, []);

  const cancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setResults(null);
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return { 
    results, 
    loading, 
    error, 
    search, 
    cancelSearch,
    clearResults
  };
};
