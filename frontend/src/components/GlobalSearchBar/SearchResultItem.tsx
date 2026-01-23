/**
 * Componente para exibir um resultado individual de busca
 * Exibe informações relevantes por tipo de entidade e destaca o termo pesquisado
 */

import React from 'react';
import type { SearchResultItemProps } from './types';
import type { ContactSearchData, CompanySearchData, LeadSearchData, OpportunitySearchData } from '../../types/search';

/**
 * Destaca o termo pesquisado no texto
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 font-semibold">{part}</mark>
    ) : (
      part
    )
  );
}

/**
 * Renderiza informações de contato
 */
function renderContact(data: ContactSearchData, query: string) {
  const fullName = `${data.firstName} ${data.lastName || ''}`.trim();
  const primaryEmail = data.emails.find(e => e.type === 'WORK') || data.emails[0];
  const primaryPhone = data.phones.find(p => p.type === 'MOBILE' || p.type === 'WORK') || data.phones[0];
  
  return (
    <div className="flex flex-col">
      <div className="font-medium text-gray-900">
        {highlightText(fullName, query)}
        {data.title && (
          <span className="text-gray-500 text-sm ml-2">• {data.title}</span>
        )}
      </div>
      {data.company && (
        <div className="text-sm text-gray-600 mt-1">
          {data.company.name}
        </div>
      )}
      <div className="flex gap-3 mt-1 text-xs text-gray-500">
        {primaryEmail && <span>{primaryEmail.email}</span>}
        {primaryPhone && <span>{primaryPhone.phone}</span>}
      </div>
    </div>
  );
}

/**
 * Renderiza informações de empresa
 */
function renderCompany(data: CompanySearchData, query: string) {
  return (
    <div className="flex flex-col">
      <div className="font-medium text-gray-900">
        {highlightText(data.name, query)}
      </div>
      <div className="flex gap-3 mt-1 text-sm text-gray-600">
        {data.industry && <span>{data.industry}</span>}
        {data.website && (
          <a 
            href={data.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {data.website}
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Renderiza informações de lead
 */
function renderLead(data: LeadSearchData, query: string) {
  const fullName = `${data.firstName} ${data.lastName || ''}`.trim();
  
  return (
    <div className="flex flex-col">
      <div className="font-medium text-gray-900">
        {highlightText(fullName, query)}
      </div>
      <div className="flex gap-3 mt-1 text-sm text-gray-600">
        {data.email && <span>{data.email}</span>}
        {data.phone && <span>{data.phone}</span>}
        {data.company && <span>• {data.company}</span>}
      </div>
      {data.source && (
        <div className="text-xs text-gray-500 mt-1">
          Origem: {data.source}
        </div>
      )}
    </div>
  );
}

/**
 * Renderiza informações de oportunidade
 */
function renderOpportunity(data: OpportunitySearchData, query: string) {
  const valueFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: data.currency || 'BRL',
  }).format(data.value);
  
  return (
    <div className="flex flex-col">
      <div className="font-medium text-gray-900">
        {highlightText(data.name, query)}
      </div>
      <div className="flex gap-3 mt-1 text-sm text-gray-600">
        <span className="font-semibold">{valueFormatted}</span>
        {data.stage && <span>• {data.stage.name}</span>}
      </div>
    </div>
  );
}

export function SearchResultItem({ result, onClick, query }: SearchResultItemProps) {
  const renderContent = () => {
    switch (result.type) {
      case 'contact':
        return renderContact(result.data as ContactSearchData, query);
      case 'company':
        return renderCompany(result.data as CompanySearchData, query);
      case 'lead':
        return renderLead(result.data as LeadSearchData, query);
      case 'opportunity':
        return renderOpportunity(result.data as OpportunitySearchData, query);
      default:
        return null;
    }
  };

  // Ícones por tipo de entidade
  const getIcon = () => {
    switch (result.type) {
      case 'contact':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'company':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'lead':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'opportunity':
        return (
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
      role="option"
      aria-label={`${result.type}: ${result.data.name || result.data.firstName || 'Resultado'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {renderContent()}
          {result.snippet && (
            <div className="text-xs text-gray-500 mt-1 italic">
              {highlightText(result.snippet.text, query)}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
