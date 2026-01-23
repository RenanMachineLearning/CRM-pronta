/**
 * Página de listagem de empresas
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyList } from '../components/CompanyList';
import { AdvancedFilters } from '../components/AdvancedFilters/AdvancedFilters';
import { useFilterUrlSync } from '../hooks/useFilterUrlSync';
import type { Filter } from '../types/filter';

export function CompaniesPage() {
  const navigate = useNavigate();
  const [advancedFilters, setAdvancedFilters] = useFilterUrlSync([]);

  const handleCompanyClick = (companyId: string) => {
    navigate(`/companies/${companyId}/edit`);
  };

  const handleNewCompany = () => {
    navigate('/companies/new');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Empresas</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gerencie suas empresas e organizações
        </p>
      </div>

      {/* Filtros avançados */}
      <div className="mb-6">
        <AdvancedFilters
          entity="company"
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
        />
      </div>

      <CompanyList
        onCompanyClick={handleCompanyClick}
        onNewCompany={handleNewCompany}
        advancedFilters={advancedFilters}
      />
    </div>
  );
}

