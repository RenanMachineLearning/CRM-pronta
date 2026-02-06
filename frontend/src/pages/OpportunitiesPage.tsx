/**
 * Página de oportunidades
 * Exibe visualização Kanban ou Lista de oportunidades
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PipelineView } from '../components/PipelineView';
import { OpportunityList } from '../components/OpportunityList';
import { AdvancedFilters } from '../components/AdvancedFilters/AdvancedFilters';
import { Button } from '../components/Button';
import { useFilterUrlSync } from '../hooks/useFilterUrlSync';
import { Breadcrumb } from '../components/Breadcrumb';

type ViewMode = 'kanban' | 'list';

export function OpportunitiesPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [advancedFilters, setAdvancedFilters] = useFilterUrlSync([]);

  const handleOpportunityClick = (opportunityId: string) => {
    navigate(`/opportunities/${opportunityId}`);
  };

  const handleNewOpportunity = () => {
    navigate('/opportunities/new');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <Breadcrumb className="mb-4" />
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Oportunidades</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Gerencie suas oportunidades de vendas
            </p>
          </div>

          {/* Botões de alternância de visualização e Nova Oportunidade */}
          <div className="flex gap-2">
            {/* Toggle de visualização */}
            <div className="flex rounded-lg border border-border-default overflow-hidden">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-blue-600 text-white'
                    : 'bg-bg-surface text-gray-700 hover:bg-gray-50'
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-border-default ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-bg-surface text-gray-700 hover:bg-gray-50'
                }`}
              >
                Lista
              </button>
            </div>

            {/* Botão Nova Oportunidade */}
            <Button onClick={handleNewOpportunity} variant="primary">
              Nova Oportunidade
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros avançados */}
      <div className="mb-6">
        <AdvancedFilters
          entity="opportunity"
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
        />
      </div>

      {/* Conteúdo: Kanban ou Lista */}
      <div className="bg-bg-surface shadow rounded-lg p-6">
        {viewMode === 'kanban' ? (
          <PipelineView onOpportunityClick={handleOpportunityClick} />
        ) : (
          <OpportunityList
            onOpportunityClick={handleOpportunityClick}
            onNewOpportunity={handleNewOpportunity}
            advancedFilters={advancedFilters}
          />
        )}
      </div>
    </div>
  );
}
