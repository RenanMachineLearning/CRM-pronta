/**
 * Página de detalhes da oportunidade
 * 
 * Exibe informações da oportunidade e integra o componente Timeline
 * para mostrar o histórico de atividades.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getOpportunityById } from '../services/opportunityService';
import { Timeline } from '../components/Timeline';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { Button } from '../components/Button';
import type { Opportunity, OpportunityStatus } from '../types/opportunity';

// Tradução de status
function translateStatus(status: OpportunityStatus): string {
  const translations: Record<OpportunityStatus, string> = {
    OPEN: 'Aberta',
    WON: 'Ganha',
    LOST: 'Perdida',
  };
  return translations[status] || status;
}

// Cor do status
function getStatusColor(status: OpportunityStatus): string {
  const colors: Record<OpportunityStatus, string> = {
    OPEN: 'bg-blue-100 text-blue-800',
    WON: 'bg-green-100 text-green-800',
    LOST: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

// Formatar valor monetário
function formatCurrency(value: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(value);
}

export function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar dados da oportunidade
  useEffect(() => {
    async function fetchOpportunity() {
      if (!id) {
        setError('ID da oportunidade não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getOpportunityById(id);
        setOpportunity(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar oportunidade');
      } finally {
        setLoading(false);
      }
    }

    fetchOpportunity();
  }, [id]);

  // Handlers de navegação
  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}/edit`);
  };

  const handleNoteClick = (noteId: string) => {
    navigate(`/notes/${noteId}/edit`);
  };

  // Estado de loading
  if (loading) {
    return <Loading message="Carregando oportunidade..." />;
  }

  // Estado de erro
  if (error || !opportunity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorMessage 
          message={error || 'Oportunidade não encontrada'} 
          onRetry={() => window.location.reload()} 
        />
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate('/opportunities')}>
            Voltar para Oportunidades
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link to="/opportunities" className="hover:text-blue-600">Oportunidades</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{opportunity.name}</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{opportunity.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(opportunity.status)}`}>
              {translateStatus(opportunity.status)}
            </span>
          </div>
          <p className="text-xl text-green-600 font-semibold mt-1">
            {formatCurrency(opportunity.value, opportunity.currency || 'BRL')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => navigate(`/tasks/new?relatedEntityType=Opportunity&relatedEntityId=${id}`)}
          >
            Nova Tarefa
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => navigate(`/notes/new?relatedEntityType=Opportunity&relatedEntityId=${id}`)}
          >
            Nova Nota
          </Button>
          <Button 
            variant="primary" 
            onClick={() => navigate(`/opportunities/${id}/edit`)}
          >
            Editar
          </Button>
        </div>
      </div>

      {/* Conteúdo em duas colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna de informações */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Informações
            </h2>
            
            {/* Valor */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Valor</dt>
              <dd className="text-sm text-gray-900 font-semibold">
                {formatCurrency(opportunity.value, opportunity.currency || 'BRL')}
              </dd>
            </div>
            
            {/* Probabilidade */}
            {opportunity.probability !== undefined && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Probabilidade</dt>
                <dd className="text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${opportunity.probability}%` }}
                      />
                    </div>
                    <span>{opportunity.probability}%</span>
                  </div>
                </dd>
              </div>
            )}
            
            {/* Estágio */}
            {opportunity.stage && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Estágio</dt>
                <dd className="text-sm text-gray-900">{opportunity.stage.name}</dd>
              </div>
            )}
            
            {/* Data de fechamento prevista */}
            {opportunity.closeDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Fechamento Previsto</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(opportunity.closeDate).toLocaleDateString('pt-BR')}
                </dd>
              </div>
            )}
            
            {/* Data de fechamento real */}
            {opportunity.actualCloseDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Fechamento Real</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(opportunity.actualCloseDate).toLocaleDateString('pt-BR')}
                </dd>
              </div>
            )}
            
            {/* Contato */}
            {opportunity.contact && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Contato</dt>
                <dd className="text-sm text-gray-900">
                  <Link 
                    to={`/contacts/${opportunity.contact.id}`} 
                    className="text-blue-600 hover:underline"
                  >
                    {opportunity.contact.firstName} {opportunity.contact.lastName || ''}
                  </Link>
                </dd>
              </div>
            )}
            
            {/* Empresa */}
            {opportunity.company && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Empresa</dt>
                <dd className="text-sm text-gray-900">
                  <Link 
                    to={`/companies/${opportunity.company.id}`} 
                    className="text-blue-600 hover:underline"
                  >
                    {opportunity.company.name}
                  </Link>
                </dd>
              </div>
            )}
            
            {/* Lead de origem */}
            {opportunity.lead && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Lead de Origem</dt>
                <dd className="text-sm text-gray-900">
                  <Link 
                    to={`/leads/${opportunity.lead.id}`} 
                    className="text-blue-600 hover:underline"
                  >
                    {opportunity.lead.firstName} {opportunity.lead.lastName || ''}
                  </Link>
                </dd>
              </div>
            )}
            
            {/* Tags */}
            {opportunity.tags && opportunity.tags.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {opportunity.tags.map((tag) => (
                    <span 
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag.name}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            
            {/* Datas */}
            <div className="pt-4 border-t">
              <div className="text-xs text-gray-500">
                Criado em: {new Date(opportunity.createdAt).toLocaleDateString('pt-BR')}
              </div>
              <div className="text-xs text-gray-500">
                Atualizado em: {new Date(opportunity.updatedAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
        </div>

        {/* Coluna da Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">
              Histórico de Atividades
            </h2>
            <Timeline
              entityType="Opportunity"
              entityId={id!}
              onTaskClick={handleTaskClick}
              onNoteClick={handleNoteClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
