/**
 * Página de formulário de lead
 * Suporta modo criação e edição
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LeadForm } from '../components/LeadForm';
import { createLead, updateLead } from '../services/leadService';
import type { LeadFormData } from '../types/lead';

export function LeadFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const handleSubmit = async (data: LeadFormData) => {
    try {
      if (id) {
        // Modo edição
        await updateLead(id, data);
      } else {
        // Modo criação
        await createLead(data);
      }
      // Redirecionar apenas após sucesso
      navigate('/leads');
    } catch (error) {
      // Erro já é tratado no LeadForm, apenas re-lançar para não redirecionar
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/leads');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Editar Lead' : 'Novo Lead'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {id ? 'Atualize as informações do lead' : 'Preencha os dados do novo lead'}
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <LeadForm
          leadId={id}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
