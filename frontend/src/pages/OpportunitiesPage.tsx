/**
 * Página de oportunidades
 * Exibe visualização Kanban ou Lista de oportunidades
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PipelineView } from '../components/PipelineView';
import { OpportunityList } from '../components/OpportunityList';
import { Button } from '../components/Button';

type ViewMode = 'kanban' | 'list';

export function OpportunitiesPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  const handleOpportunityClick = (opportunityId: string) => {
    navigate(`/opportunities/${opportunityId}`);
  };

  const handleNewOpportunity = () => {
    navigate('/opportunities/new');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Oportunidades</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gerencie suas oportunidades de vendas
            </p>
          </div>

          {/* Botões de alternância de visualização e Nova Oportunidade */}
          <div className="flex gap-2">
            {/* Toggle de visualização */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
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

      {/* Conteúdo: Kanban ou Lista */}
      <div className="bg-white shadow rounded-lg p-6">
        {viewMode === 'kanban' ? (
          <PipelineView onOpportunityClick={handleOpportunityClick} />
        ) : (
          <OpportunityList
            onOpportunityClick={handleOpportunityClick}
            onNewOpportunity={handleNewOpportunity}
          />
        )}
      </div>
    </div>
  );
}
