/**
 * Página de detalhes da empresa
 * 
 * Exibe informações da empresa e integra o componente Timeline
 * para mostrar o histórico de atividades.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCompanyById } from '../services/companyService';
import { Timeline } from '../components/Timeline';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { Button } from '../components/Button';
import type { Company } from '../types/company';

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar dados da empresa
  useEffect(() => {
    async function fetchCompany() {
      if (!id) {
        setError('ID da empresa não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getCompanyById(id);
        setCompany(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar empresa');
      } finally {
        setLoading(false);
      }
    }

    fetchCompany();
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
    return <Loading message="Carregando empresa..." />;
  }

  // Estado de erro
  if (error || !company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorMessage 
          message={error || 'Empresa não encontrada'} 
          onRetry={() => window.location.reload()} 
        />
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate('/companies')}>
            Voltar para Empresas
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
            <Link to="/companies" className="hover:text-blue-600">Empresas</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{company.name}</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          {company.industry && (
            <p className="text-gray-600">{company.industry}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => navigate(`/tasks/new?relatedEntityType=Company&relatedEntityId=${id}`)}
          >
            Nova Tarefa
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => navigate(`/notes/new?relatedEntityType=Company&relatedEntityId=${id}`)}
          >
            Nova Nota
          </Button>
          <Button 
            variant="primary" 
            onClick={() => navigate(`/companies/${id}/edit`)}
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
            
            {/* Setor */}
            {company.industry && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Setor</dt>
                <dd className="text-sm text-gray-900">{company.industry}</dd>
              </div>
            )}
            
            {/* Porte */}
            {company.size && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Porte</dt>
                <dd className="text-sm text-gray-900">{company.size}</dd>
              </div>
            )}
            
            {/* Website */}
            {company.website && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="text-sm text-gray-900">
                  <a 
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {company.website}
                  </a>
                </dd>
              </div>
            )}
            
            {/* Endereço */}
            {company.addresses && company.addresses.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Endereço</dt>
                <dd className="text-sm text-gray-900">
                  {company.addresses[0].street && <div>{company.addresses[0].street}</div>}
                  {company.addresses[0].city && (
                    <div>
                      {company.addresses[0].city}
                      {company.addresses[0].state && `, ${company.addresses[0].state}`}
                    </div>
                  )}
                  {company.addresses[0].country && <div>{company.addresses[0].country}</div>}
                </dd>
              </div>
            )}
            
            {/* Tags */}
            {company.tags && company.tags.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {company.tags.map((tag) => (
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
                Criado em: {new Date(company.createdAt).toLocaleDateString('pt-BR')}
              </div>
              <div className="text-xs text-gray-500">
                Atualizado em: {new Date(company.updatedAt).toLocaleDateString('pt-BR')}
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
              entityType="Company"
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
