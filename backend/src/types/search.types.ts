/**
 * Tipos TypeScript para busca global
 * 
 * Define interfaces e tipos usados no sistema de busca global
 * em múltiplas entidades (Contacts, Companies, Leads, Opportunities).
 */

// Tipos de entidades pesquisáveis
export type SearchableEntity = 'contact' | 'company' | 'lead' | 'opportunity';

// Configuração de busca por entidade
export interface SearchEntityConfig {
  entity: SearchableEntity;
  fields: string[];           // Campos para busca (firstName, lastName, email, etc.)
  relations?: SearchRelation[]; // Campos em relacionamentos para buscar
}

// Configuração de relacionamento para busca
export interface SearchRelation {
  model: string;              // Nome do modelo Prisma (emails, phones)
  fields: string[];           // Campos no relacionamento (email, phone)
}

// Parâmetros de busca
export interface GlobalSearchParams {
  query: string;              // Termo de busca
  entities?: SearchableEntity[]; // Filtro de entidades (opcional)
  limit?: number;             // Limite por entidade (default: 10)
}

// Resultado de busca por entidade
export interface SearchResult<T = any> {
  id: string;
  tenantId: string;
  type: SearchableEntity;
  score: number;              // Relevância (ranking)
  snippet?: {                // Snippet com highlight
    field: string;           // Nome do campo encontrado
    text: string;            // Texto com termo destacado
    position: number;        // Posição do termo no texto
  };
  data: T;                   // Dados completos do registro
}

// Resultado agregado da busca global
export interface GlobalSearchResult {
  query: string;             // Query usada
  timestamp: string;         // Timestamp da busca
  results: {
    contacts: SearchResult<ContactData>[];
    companies: SearchResult<CompanyData>[];
    leads: SearchResult<LeadData>[];
    opportunities: SearchResult<OpportunityData>[];
  };
  totals: {                  // Total por entidade (não limitado)
    contacts: number;
    companies: number;
    leads: number;
    opportunities: number;
  };
}

// Tipos de dados para cada entidade
export interface ContactData {
  id: string;
  tenantId: string;
  firstName: string;
  lastName?: string | null;
  title?: string | null;
  companyId?: string | null;
  company?: {
    id: string;
    name: string;
  } | null;
  emails: Array<{
    id: string;
    email: string;
    type: string;
  }>;
  phones: Array<{
    id: string;
    phone: string;
    type: string;
  }>;
  createdAt: Date;
}

export interface CompanyData {
  id: string;
  tenantId: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  createdAt: Date;
}

export interface LeadData {
  id: string;
  tenantId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status: string;
  source?: string | null;
  createdAt: Date;
}

export interface OpportunityData {
  id: string;
  tenantId: string;
  name: string;
  value: number;
  currency: string;
  status: string;
  stageId: string;
  stage?: {
    id: string;
    name: string;
  } | null;
  contactId?: string | null;
  companyId?: string | null;
  createdAt: Date;
}

// Erro de busca
export class SearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SearchError';
  }
}
