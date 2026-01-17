/**
 * Componente PipelineView
 * Visualização Kanban completa do pipeline de vendas
 * Exibe oportunidades organizadas por estágios do pipeline
 */

import React, { useState, useEffect, useMemo } from 'react';
import { getDefaultPipeline, getPipelineById } from '../services/pipelineService';
import { listOpportunities } from '../services/opportunityService';
import { OpportunityCard } from './OpportunityCard';
import { Loading } from './Loading';
import { ErrorMessage } from './ErrorMessage';
import type { Pipeline, Opportunity, PipelineStage } from '../types/opportunity';

export interface PipelineViewProps {
  pipelineId?: string; // Se fornecido, usa pipeline específico; senão, usa padrão
  onOpportunityClick?: (opportunityId: string) => void;
}

/**
 * Formata valor monetário em BRL
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function PipelineView({ pipelineId, onOpportunityClick }: PipelineViewProps) {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar pipeline e oportunidades
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // Carregar pipeline
        let loadedPipeline: Pipeline | null = null;
        if (pipelineId) {
          loadedPipeline = await getPipelineById(pipelineId);
        } else {
          loadedPipeline = await getDefaultPipeline();
        }

        if (!loadedPipeline) {
          setError('Pipeline não encontrado');
          setLoading(false);
          return;
        }

        // Validar que pipeline tem pelo menos um estágio
        if (!loadedPipeline.stages || loadedPipeline.stages.length === 0) {
          setError('Pipeline não possui estágios configurados');
          setLoading(false);
          return;
        }

        setPipeline(loadedPipeline);

        // Buscar todas as oportunidades (limit: 1000 para Kanban)
        const opportunitiesResponse = await listOpportunities(undefined, {
          limit: 1000,
          offset: 0,
        });
        setOpportunities(opportunitiesResponse.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar pipeline';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [pipelineId]);

  // Agrupar oportunidades por stageId usando useMemo
  const opportunitiesByStage = useMemo(() => {
    if (!pipeline) return new Map<string, Opportunity[]>();

    const grouped = new Map<string, Opportunity[]>();

    // Inicializar todos os estágios com arrays vazios
    pipeline.stages.forEach((stage) => {
      grouped.set(stage.id, []);
    });

    // Agrupar oportunidades por stageId
    opportunities.forEach((opp) => {
      if (opp.stageId && grouped.has(opp.stageId)) {
        grouped.get(opp.stageId)!.push(opp);
      }
    });

    return grouped;
  }, [pipeline, opportunities]);

  // Calcular totais monetários e contadores por estágio
  const stageStats = useMemo(() => {
    if (!pipeline) return new Map<string, { total: number; count: number }>();

    const stats = new Map<string, { total: number; count: number }>();

    pipeline.stages.forEach((stage) => {
      const stageOpportunities = opportunitiesByStage.get(stage.id) || [];
      const total = stageOpportunities.reduce((sum, opp) => sum + opp.value, 0);
      stats.set(stage.id, { total, count: stageOpportunities.length });
    });

    return stats;
  }, [pipeline, opportunitiesByStage]);

  // Função para retry
  const handleRetry = () => {
    window.location.reload();
  };

  if (loading) {
    return <Loading message="Carregando pipeline..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={handleRetry} />;
  }

  if (!pipeline) {
    return <ErrorMessage message="Pipeline não encontrado" onRetry={handleRetry} />;
  }

  // Ordenar estágios por order (ascendente)
  const sortedStages = [...pipeline.stages].sort((a, b) => a.order - b.order);

  return (
    <div className="w-full">
      {/* Scroll horizontal para colunas */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {sortedStages.map((stage) => {
            const stageOpportunities = opportunitiesByStage.get(stage.id) || [];
            const stats = stageStats.get(stage.id) || { total: 0, count: 0 };

            return (
              <div
                key={stage.id}
                className="w-80 flex-shrink-0 bg-gray-50 rounded-lg border border-gray-200"
              >
                {/* Cabeçalho da coluna */}
                <div
                  className="p-4 rounded-t-lg border-b border-gray-200"
                  style={{
                    borderTopColor: stage.color || '#6B7280',
                    borderTopWidth: '4px',
                  }}
                >
                  <h3 className="font-semibold text-gray-900 mb-1">{stage.name}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{stats.count} oportunidade{stats.count !== 1 ? 's' : ''}</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(stats.total)}
                    </span>
                  </div>
                </div>

                {/* Cards de oportunidades */}
                <div className="p-4 space-y-3 min-h-[200px]">
                  {stageOpportunities.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8">
                      Nenhuma oportunidade
                    </div>
                  ) : (
                    stageOpportunities.map((opp) => (
                      <OpportunityCard
                        key={opp.id}
                        opportunity={opp}
                        onClick={onOpportunityClick}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
