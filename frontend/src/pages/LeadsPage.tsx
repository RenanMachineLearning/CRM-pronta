/**
 * Página de listagem de leads
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LeadList } from '../components/LeadList';

export function LeadsPage() {
  const navigate = useNavigate();

  const handleLeadClick = (leadId: string) => {
    navigate(`/leads/${leadId}`);
  };

  const handleNewLead = () => {
    navigate('/leads/new');
  };

  const handleConvertLead = (leadId: string) => {
    // Navegar para página de conversão (será implementada na parte 10)
    navigate(`/leads/${leadId}/convert`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gerencie seus leads e converta-os em contatos e oportunidades
        </p>
      </div>

      <LeadList
        onLeadClick={handleLeadClick}
        onNewLead={handleNewLead}
        onConvertLead={handleConvertLead}
      />
    </div>
  );
}
