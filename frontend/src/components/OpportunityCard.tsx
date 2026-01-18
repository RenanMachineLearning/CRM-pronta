/**
 * Componente OpportunityCard
 * Card individual de oportunidade para visualização Kanban
 * Exibe nome, valor, data de fechamento, probabilidade, status, contato/empresa e tags
 */

import React from 'react';
import type { Opportunity, OpportunityStatus } from '../types/opportunity';

export interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick?: (opportunityId: string) => void;
}

/**
 * Formata valor monetário em BRL
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata data em formato brasileiro
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Sem data';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Obtém cor do badge de status
 */
function getStatusColor(status: OpportunityStatus): string {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800';
    case 'WON':
      return 'bg-green-100 text-green-800';
    case 'LOST':
      return 'bg-red-100 text-red-800';
    case 'ARCHIVED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Traduz status para português
 */
function translateStatus(status: OpportunityStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Aberta';
    case 'WON':
      return 'Ganha';
    case 'LOST':
      return 'Perdida';
    case 'ARCHIVED':
      return 'Arquivada';
    default:
      return status;
  }
}

export function OpportunityCard({ opportunity, onClick }: OpportunityCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(opportunity.id);
    }
  };

  // Formatar nome do contato ou empresa
  const contactOrCompanyName = opportunity.contact
    ? `${opportunity.contact.firstName} ${opportunity.contact.lastName || ''}`.trim()
    : opportunity.company?.name || null;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow ${
        onClick ? 'hover:border-blue-300' : ''
      }`}
      onClick={handleClick}
    >
      {/* Nome da oportunidade */}
      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
        {opportunity.name}
      </h3>

      {/* Valor (obrigatório) */}
      <div className="mb-2">
        <span className="text-lg font-bold text-gray-900">
          {formatCurrency(opportunity.value)}
        </span>
      </div>

      {/* Data de fechamento (obrigatório) */}
      <div className="mb-2 text-sm text-gray-600">
        <span className="font-medium">Fechamento:</span>{' '}
        {formatDate(opportunity.closeDate)}
      </div>

      {/* Probabilidade (opcional) */}
      {opportunity.probability !== null && opportunity.probability !== undefined && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Probabilidade</span>
            <span className="text-xs font-medium text-gray-700">
              {opportunity.probability}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${opportunity.probability}%` }}
            />
          </div>
        </div>
      )}

      {/* Status (opcional) */}
      <div className="mb-2">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
            opportunity.status
          )}`}
        >
          {translateStatus(opportunity.status)}
        </span>
      </div>

      {/* Contato ou Empresa (opcional) */}
      {contactOrCompanyName && (
        <div className="mb-2 text-sm text-gray-600">
          <span className="font-medium">
            {opportunity.contact ? 'Contato:' : 'Empresa:'}
          </span>{' '}
          {contactOrCompanyName}
        </div>
      )}

      {/* Tags (opcional) - máximo 3 tags visíveis */}
      {opportunity.tags && opportunity.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {opportunity.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                border: `1px solid ${tag.color}40`,
              }}
            >
              {tag.name}
            </span>
          ))}
          {opportunity.tags.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-gray-600 bg-gray-100">
              +{opportunity.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
