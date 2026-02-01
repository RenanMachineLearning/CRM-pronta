/**
 * Página de detalhes do contato
 * 
 * Exibe informações do contato e integra o componente Timeline
 * para mostrar o histórico de atividades.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getContactById } from '../services/contactService';
import { Timeline } from '../components/Timeline';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { Button } from '../components/Button';
import type { Contact } from '../types/contact';

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar dados do contato
  useEffect(() => {
    async function fetchContact() {
      if (!id) {
        setError('ID do contato não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getContactById(id);
        setContact(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar contato');
      } finally {
        setLoading(false);
      }
    }

    fetchContact();
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
    return <Loading message="Carregando contato..." />;
  }

  // Estado de erro
  if (error || !contact) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorMessage 
          message={error || 'Contato não encontrado'} 
          onRetry={() => window.location.reload()} 
        />
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate('/contacts')}>
            Voltar para Contatos
          </Button>
        </div>
      </div>
    );
  }

  // Montar nome completo
  const fullName = `${contact.firstName} ${contact.lastName || ''}`.trim();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link to="/contacts" className="hover:text-blue-600">Contatos</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{fullName}</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
          {contact.title && (
            <p className="text-gray-600">{contact.title}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => navigate(`/tasks/new?relatedEntityType=Contact&relatedEntityId=${id}`)}
          >
            Nova Tarefa
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => navigate(`/notes/new?relatedEntityType=Contact&relatedEntityId=${id}`)}
          >
            Nova Nota
          </Button>
          <Button 
            variant="primary" 
            onClick={() => navigate(`/contacts/${id}/edit`)}
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
            
            {/* Email principal */}
            {contact.emails && contact.emails.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">
                  <a 
                    href={`mailto:${contact.emails[0].email}`} 
                    className="text-blue-600 hover:underline"
                  >
                    {contact.emails[0].email}
                  </a>
                  {contact.emails[0].isPrimary && (
                    <span className="ml-2 text-xs text-green-600">(principal)</span>
                  )}
                </dd>
              </div>
            )}
            
            {/* Telefone principal */}
            {contact.phones && contact.phones.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                <dd className="text-sm text-gray-900">
                  <a 
                    href={`tel:${contact.phones[0].phone}`} 
                    className="text-blue-600 hover:underline"
                  >
                    {contact.phones[0].phone}
                  </a>
                </dd>
              </div>
            )}
            
            {/* Empresa */}
            {contact.company && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Empresa</dt>
                <dd className="text-sm text-gray-900">
                  <Link 
                    to={`/companies/${contact.company.id}`} 
                    className="text-blue-600 hover:underline"
                  >
                    {contact.company.name}
                  </Link>
                </dd>
              </div>
            )}
            
            {/* Status */}
            {contact.status && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm text-gray-900">{contact.status}</dd>
              </div>
            )}
            
            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {contact.tags.map((tag) => (
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
                Criado em: {new Date(contact.createdAt).toLocaleDateString('pt-BR')}
              </div>
              <div className="text-xs text-gray-500">
                Atualizado em: {new Date(contact.updatedAt).toLocaleDateString('pt-BR')}
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
              entityType="Contact"
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
