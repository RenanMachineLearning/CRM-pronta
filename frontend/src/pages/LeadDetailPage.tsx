/**
 * Página de detalhes do lead
 * 
 * Exibe informações do lead e integra o componente Timeline
 * para mostrar o histórico de atividades.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getLeadById } from '../services/leadService';
import { Timeline } from '../components/Timeline';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { Button } from '../components/Button';
import type { Lead, LeadStatus } from '../types/lead';

// Tradução de status
function translateStatus(status: LeadStatus): string {
  const translations: Record<LeadStatus, string> = {
    NEW: 'Novo',
    QUALIFIED: 'Qualificado',
    LOST: 'Perdido',
    CONVERTED: 'Convertido',
  };
  return translations[status] || status;
}

// Cor do status
function getStatusColor(status: LeadStatus): string {
  const colors: Record<LeadStatus, string> = {
    NEW: 'bg-blue-100 text-blue-800',
    QUALIFIED: 'bg-green-100 text-green-800',
    LOST: 'bg-red-100 text-red-800',
    CONVERTED: 'bg-purple-100 text-purple-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar dados do lead
  useEffect(() => {
    async function fetchLead() {
      if (!id) {
        setError('ID do lead não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getLeadById(id);
        setLead(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar lead');
      } finally {
        setLoading(false);
      }
    }

    fetchLead();
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
    return <Loading message="Carregando lead..." />;
  }

  // Estado de erro
  if (error || !lead) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorMessage 
          message={error || 'Lead não encontrado'} 
          onRetry={() => window.location.reload()} 
        />
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate('/leads')}>
            Voltar para Leads
          </Button>
        </div>
      </div>
    );
  }

  // Montar nome completo
  const fullName = `${lead.firstName} ${lead.lastName || ''}`.trim();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link to="/leads" className="hover:text-blue-600">Leads</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{fullName}</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
              {translateStatus(lead.status)}
            </span>
          </div>
          {lead.company && (
            <p className="text-gray-600">{lead.company}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => navigate(`/tasks/new?relatedEntityType=Lead&relatedEntityId=${id}`)}
          >
            Nova Tarefa
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => navigate(`/notes/new?relatedEntityType=Lead&relatedEntityId=${id}`)}
          >
            Nova Nota
          </Button>
          {!lead.convertedAt && (
            <Button 
              variant="secondary" 
              onClick={() => navigate(`/leads/${id}/convert`)}
            >
              Converter
            </Button>
          )}
          <Button 
            variant="primary" 
            onClick={() => navigate(`/leads/${id}/edit`)}
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
            
            {/* Email */}
            {lead.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">
                  <a 
                    href={`mailto:${lead.email}`} 
                    className="text-blue-600 hover:underline"
                  >
                    {lead.email}
                  </a>
                </dd>
              </div>
            )}
            
            {/* Telefone */}
            {lead.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                <dd className="text-sm text-gray-900">
                  <a 
                    href={`tel:${lead.phone}`} 
                    className="text-blue-600 hover:underline"
                  >
                    {lead.phone}
                  </a>
                </dd>
              </div>
            )}
            
            {/* Empresa */}
            {lead.company && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Empresa</dt>
                <dd className="text-sm text-gray-900">{lead.company}</dd>
              </div>
            )}
            
            {/* Fonte */}
            {lead.source && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Fonte</dt>
                <dd className="text-sm text-gray-900">{lead.source}</dd>
              </div>
            )}
            
            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {lead.tags.map((tag) => (
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
            
            {/* Informações de conversão */}
            {lead.convertedAt && (
              <div className="pt-4 border-t">
                <div className="text-sm text-purple-600 font-medium mb-2">
                  Lead Convertido
                </div>
                {lead.convertedToContactId && (
                  <div className="text-xs text-gray-500">
                    Contato: <Link to={`/contacts/${lead.convertedToContactId}`} className="text-blue-600 hover:underline">Ver contato</Link>
                  </div>
                )}
                {lead.convertedToOpportunityId && (
                  <div className="text-xs text-gray-500">
                    Oportunidade: <Link to={`/opportunities/${lead.convertedToOpportunityId}`} className="text-blue-600 hover:underline">Ver oportunidade</Link>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Convertido em: {new Date(lead.convertedAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            )}
            
            {/* Datas */}
            <div className="pt-4 border-t">
              <div className="text-xs text-gray-500">
                Criado em: {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
              </div>
              <div className="text-xs text-gray-500">
                Atualizado em: {new Date(lead.updatedAt).toLocaleDateString('pt-BR')}
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
              entityType="Lead"
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
