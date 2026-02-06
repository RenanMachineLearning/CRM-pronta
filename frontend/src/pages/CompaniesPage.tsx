/**
 * Página de listagem de empresas
 */

import { useNavigate } from 'react-router-dom';
import { CompanyList } from '../components/CompanyList';
import { AdvancedFilters } from '../components/AdvancedFilters/AdvancedFilters';
import { useFilterUrlSync } from '../hooks/useFilterUrlSync';
import { Breadcrumb } from '../components/Breadcrumb';

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
      <Breadcrumb className="mb-4" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Empresas</h1>
        <p className="mt-2 text-sm text-text-secondary">
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

