/**
 * Página de formulário de empresa
 * Suporta modo criação e edição
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CompanyForm } from '../components/CompanyForm';
import { createCompany, updateCompany } from '../services/companyService';
import type { CompanyFormData } from '../types/company';

export function CompanyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const handleSubmit = async (data: CompanyFormData) => {
    try {
      if (id) {
        // Modo edição
        await updateCompany(id, data);
      } else {
        // Modo criação
        await createCompany(data);
      }
      // Redirecionar apenas após sucesso
      navigate('/companies');
    } catch (error) {
      // Erro já é tratado no CompanyForm, apenas re-lançar para não redirecionar
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/companies');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Editar Empresa' : 'Nova Empresa'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {id ? 'Atualize as informações da empresa' : 'Preencha os dados da nova empresa'}
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <CompanyForm
          companyId={id}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

