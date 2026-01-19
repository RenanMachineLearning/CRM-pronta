/**
 * Hook customizado para gerenciar timeline/histórico de atividades
 * 
 * Gerencia estado, loading, erro, agrupamento por data e paginação
 * com suporte a "carregar mais" (infinite scroll manual)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getTimeline } from '../services/timelineService';
import type {
  TimelineItem,
  TimelineResponse,
  TimelinePaginationParams,
  TimelineGroup,
  EntityType,
} from '../types/timeline';

interface UseTimelineResult {
  items: TimelineItem[];
  groups: TimelineGroup[];
  loading: boolean;
  loadingMore: boolean; // Loading específico para "carregar mais"
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  entityInfo: {
    type: string;
    id: string;
    name?: string;
  } | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

/**
 * Agrupa itens da timeline por data (Hoje, Ontem, Esta semana, Este mês, Anterior)
 * 
 * @param items - Array de TimelineItem
 * @returns Array de TimelineGroup com itens agrupados
 */
function groupItemsByDate(items: TimelineItem[]): TimelineGroup[] {
  if (!items || items.length === 0) {
    return [];
  }

  // Calcular datas de referência
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  // Arrays para cada grupo
  const todayItems: TimelineItem[] = [];
  const yesterdayItems: TimelineItem[] = [];
  const weekItems: TimelineItem[] = [];
  const monthItems: TimelineItem[] = [];
  const olderItems: TimelineItem[] = [];

  // Classificar cada item
  items.forEach((item) => {
    const itemDate = new Date(item.timestamp);
    const itemDateOnly = new Date(
      itemDate.getFullYear(),
      itemDate.getMonth(),
      itemDate.getDate()
    );

    if (itemDateOnly.getTime() === today.getTime()) {
      todayItems.push(item);
    } else if (itemDateOnly.getTime() === yesterday.getTime()) {
      yesterdayItems.push(item);
    } else if (itemDate >= weekAgo) {
      weekItems.push(item);
    } else if (itemDate >= monthAgo) {
      monthItems.push(item);
    } else {
      olderItems.push(item);
    }
  });

  // Construir array de grupos (apenas grupos não vazios)
  const groups: TimelineGroup[] = [];

  if (todayItems.length > 0) {
    groups.push({ label: 'Hoje', date: today, items: todayItems });
  }
  if (yesterdayItems.length > 0) {
    groups.push({ label: 'Ontem', date: yesterday, items: yesterdayItems });
  }
  if (weekItems.length > 0) {
    groups.push({ label: 'Esta semana', date: weekAgo, items: weekItems });
  }
  if (monthItems.length > 0) {
    groups.push({ label: 'Este mês', date: monthAgo, items: monthItems });
  }
  if (olderItems.length > 0) {
    groups.push({ label: 'Anterior', date: new Date(0), items: olderItems });
  }

  return groups;
}

/**
 * Hook para timeline de atividades
 * 
 * @param entityType - Tipo de entidade (Contact, Company, Lead, Opportunity, Task)
 * @param entityId - ID da entidade (UUID)
 * @param initialPagination - Paginação inicial (opcional)
 * @returns Objeto com items, groups, loading, error, pagination e funções de controle
 */
export function useTimeline(
  entityType: EntityType,
  entityId: string,
  initialPagination?: TimelinePaginationParams
): UseTimelineResult {
  // Estados
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [entityInfo, setEntityInfo] = useState<{
    type: string;
    id: string;
    name?: string;
  } | null>(null);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    limit: initialPagination?.limit || 20,
    offset: initialPagination?.offset || 0,
  });

  // Calcular se há mais itens para carregar
  const hasMore = useMemo(() => {
    return paginationInfo.offset + paginationInfo.limit < paginationInfo.total;
  }, [paginationInfo]);

  // Função para buscar timeline (reset = true para recarregar do início)
  const fetchTimeline = useCallback(async (reset: boolean = false, isLoadMore: boolean = false) => {
    // Definir loading state correto
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Calcular offset para a requisição
      const offset = reset ? 0 : paginationInfo.offset + paginationInfo.limit;
      
      const response: TimelineResponse = await getTimeline(
        entityType,
        entityId,
        { 
          limit: paginationInfo.limit, 
          offset: reset ? 0 : offset 
        }
      );

      if (reset) {
        // Substituir todos os itens
        setItems(response.data);
      } else {
        // Adicionar aos itens existentes (carregar mais)
        setItems((prev) => [...prev, ...response.data]);
      }

      // Atualizar informações de paginação
      setPaginationInfo({
        total: response.pagination.total,
        limit: response.pagination.limit,
        offset: response.pagination.offset,
      });

      // Atualizar informações da entidade
      setEntityInfo(response.entity);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Erro ao carregar histórico de atividades';
      setError(errorMessage);
      
      if (reset) {
        setItems([]);
        setEntityInfo(null);
      }
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [entityType, entityId, paginationInfo.limit, paginationInfo.offset]);

  // Buscar timeline quando entityType ou entityId mudarem
  useEffect(() => {
    // Resetar estado e buscar novamente
    setItems([]);
    setPaginationInfo({
      total: 0,
      limit: initialPagination?.limit || 20,
      offset: 0,
    });
    fetchTimeline(true, false);
  }, [entityType, entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calcular grupos (memoizado para evitar recálculos desnecessários)
  const groups = useMemo(() => groupItemsByDate(items), [items]);

  // Função para recarregar do início
  const refetch = useCallback(async () => {
    await fetchTimeline(true, false);
  }, [fetchTimeline]);

  // Função para carregar mais itens
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    await fetchTimeline(false, true);
  }, [loading, loadingMore, hasMore, fetchTimeline]);

  return {
    items,
    groups,
    loading,
    loadingMore,
    error,
    pagination: paginationInfo,
    entityInfo,
    hasMore,
    refetch,
    loadMore,
  };
}
