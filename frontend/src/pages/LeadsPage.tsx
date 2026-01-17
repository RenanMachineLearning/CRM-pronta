/**
 * Página de listagem de leads
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeadList } from '../components/LeadList';
import { ConvertLeadModal } from '../components/ConvertLeadModal';
import { useLeads } from '../hooks/useLeads';
import { getLeadById } from '../services/leadService';
import type { Lead, ConvertLeadResponse } from '../types/lead';

export function LeadsPage() {
  const navigate = useNavigate();

  // Usar hook useLeads diretamente
  const {
    leads,
    loading,
    error,
    refetch,
    setFilters: updateFilters,
    setPagination: updatePagination,
  } = useLeads(undefined, {
    limit: 20,
    offset: 0,
    orderBy: 'createdAt',
    order: 'desc',
  });

  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadName, setSelectedLeadName] = useState<string>('');

  const handleLeadClick = (leadId: string) => {
    navigate(`/leads/${leadId}`);
  };

  const handleNewLead = () => {
    navigate('/leads/new');
  };

  const handleConvertLead = async (leadId: string) => {
    // Buscar lead na lista ou buscar por ID
    let lead = leads.find((l) => l.id === leadId);

    // Se não encontrado na lista, buscar por ID
    if (!lead) {
      try {
        lead = await getLeadById(leadId);
      } catch (err) {
        // Lead não encontrado - exibir erro e não abrir modal
        console.error('Erro ao buscar lead:', err);
        // Opcional: mostrar notificação de erro
        return;
      }
    }

    // Verificar se lead já está convertido
    if (lead.converted) {
      // Lead já convertido - exibir mensagem e não abrir modal
      // Opcional: mostrar notificação ou alerta
      alert('Este lead já foi convertido.');
      return;
    }

    // Formatar nome do lead
    const formatName = (lead: Lead): string => {
      if (lead.firstName && lead.lastName) {
        return `${lead.firstName} ${lead.lastName}`;
      }
      return lead.firstName || lead.lastName || 'Lead';
    };

    setSelectedLeadId(leadId);
    setSelectedLeadName(formatName(lead));
    setConvertModalOpen(true);
  };

  const handleConversionSuccess = (result: ConvertLeadResponse) => {
    // Recarregar lista de leads para atualizar status
    refetch();

    // Fechar modal e limpar estado
    setConvertModalOpen(false);
    setSelectedLeadId(null);
    setSelectedLeadName('');

    // Mostrar feedback de sucesso
    const messages: string[] = [];
    if (result.contact) {
      messages.push('Contato criado com sucesso');
    }
    if (result.opportunity) {
      messages.push('Oportunidade criada com sucesso');
    }

    // Opcional: usar componente de notificação se existir
    // Por enquanto, pode usar console.log ou alert
    if (messages.length > 0) {
      console.log(messages.join(' e '));
      // TODO: Integrar com componente de notificação quando disponível
    }
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
        leads={leads} // Passar leads como prop
        onLeadClick={handleLeadClick}
        onNewLead={handleNewLead}
        onConvertLead={handleConvertLead}
      />

      {/* Modal de conversão */}
      {selectedLeadId && (
        <ConvertLeadModal
          isOpen={convertModalOpen}
          onClose={() => {
            setConvertModalOpen(false);
            setSelectedLeadId(null);
            setSelectedLeadName('');
          }}
          leadId={selectedLeadId}
          leadName={selectedLeadName}
          onSuccess={handleConversionSuccess}
        />
      )}
    </div>
  );
}
