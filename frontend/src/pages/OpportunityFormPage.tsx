/**
 * Página de formulário de oportunidade
 * Suporta modo criação e edição
 */

import { useNavigate, useParams } from 'react-router-dom';
import { OpportunityForm } from '../components/OpportunityForm';
import { useToast } from '../components/Toast';
import { createOpportunity, updateOpportunity } from '../services/opportunityService';
import type { OpportunityFormData } from '../types/opportunity';

export function OpportunityFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { success } = useToast();

  const handleSubmit = async (data: OpportunityFormData) => {
    try {
      if (id) {
        await updateOpportunity(id, data);
        success('Oportunidade atualizada com sucesso!');
      } else {
        await createOpportunity(data);
        success('Oportunidade criada com sucesso!');
      }
      navigate('/opportunities');
    } catch (error) {
      throw error; // Erro tratado no OpportunityForm
    }
  };

  const handleCancel = () => {
    navigate('/opportunities');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Editar Oportunidade' : 'Nova Oportunidade'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {id ? 'Atualize as informações da oportunidade' : 'Preencha os dados da nova oportunidade'}
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <OpportunityForm
          opportunityId={id}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
