/**
 * Tipos relacionados a busca global
 * Alinhados com backend/src/types/search.types.ts
 */

// Tipos de entidades pesquisáveis
export type SearchableEntity = 'contact' | 'company' | 'lead' | 'opportunity';

// Parâmetros de busca
export interface GlobalSearchParams {
  query: string;
  entities?: SearchableEntity[];
  limit?: number; // Default: 10, max: 100
}

// Snippet com highlight
export interface SearchSnippet {
  field: string;
  text: string;
  position: number;
}

// Resultado de busca (genérico)
export interface SearchResult<T = any> {
  id: string;
  tenantId: string;
  type: SearchableEntity;
  score: number;
  snippet?: SearchSnippet;
  data: T;
}

// Dados específicos por entidade (alinhados com backend)
export interface ContactSearchData {
  id: string;
  tenantId: string;
  firstName: string;
  lastName?: string | null;
  title?: string | null;
  companyId?: string | null;
  company?: { id: string; name: string } | null;
  emails: Array<{ id: string; email: string; type: string }>;
  phones: Array<{ id: string; phone: string; type: string }>;
  createdAt: string; // ISO string
}

export interface CompanySearchData {
  id: string;
  tenantId: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  createdAt: string; // ISO string
}

export interface LeadSearchData {
  id: string;
  tenantId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status: string;
  source?: string | null;
  createdAt: string; // ISO string
}

export interface OpportunitySearchData {
  id: string;
  tenantId: string;
  name: string;
  value: number;
  currency: string;
  status: string;
  stageId: string;
  stage?: { id: string; name: string } | null;
  contactId?: string | null;
  companyId?: string | null;
  createdAt: string; // ISO string
}

// Resposta da API de busca global
export interface GlobalSearchResponse {
  query: string;
  timestamp: string;
  results: {
    contacts: SearchResult<ContactSearchData>[];
    companies: SearchResult<CompanySearchData>[];
    leads: SearchResult<LeadSearchData>[];
    opportunities: SearchResult<OpportunitySearchData>[];
  };
  totals: {
    contacts: number;
    companies: number;
    leads: number;
    opportunities: number;
  };
}
