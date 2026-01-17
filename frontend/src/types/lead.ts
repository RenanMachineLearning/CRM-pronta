/**
 * Tipos relacionados a Leads
 * Baseados na API backend
 */

// Enum para status de lead (alinhado com Prisma schema)
export enum LeadStatus {
  NEW = 'NEW',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

// Contato convertido (informação opcional na listagem)
export interface LeadConvertedContact {
  id: string;
  firstName: string;
  lastName?: string | null;
}

// Oportunidade convertida (informação opcional na listagem)
export interface LeadConvertedOpportunity {
  id: string;
  name: string;
}

// Tag de lead
export interface LeadTag {
  id: string;
  name: string;
  color: string;
}

// Lead completo (alinhado com LeadResponse do backend)
export interface Lead {
  id: string;
  tenantId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  status: LeadStatus;
  converted: boolean;
  convertedAt?: string | null; // ISO string da API
  convertedToContactId?: string | null;
  convertedToOpportunityId?: string | null;
  createdAt: string; // ISO string da API
  updatedAt: string; // ISO string da API
  // Informações de conversão (opcional, para listagem)
  convertedToContact?: LeadConvertedContact | null;
  convertedToOpportunity?: LeadConvertedOpportunity | null;
  // Tags associadas
  tags?: LeadTag[];
}

// Filtros para listagem (alinhado com LeadFilters do backend)
export interface LeadFilters {
  status?: LeadStatus;
  source?: string; // Busca parcial (case-insensitive)
  converted?: boolean;
}

// Parâmetros de paginação (alinhado com PaginationParams do backend)
export interface LeadPaginationParams {
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'firstName' | 'lastName';
  order?: 'asc' | 'desc';
}

// Resposta da API de listagem (alinhado com resposta do backend)
export interface LeadListResponse {
  data: Lead[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Dados para conversão de lead (alinhado com ConvertLeadData do backend)
export interface ConvertLeadData {
  createContact: boolean;
  createOpportunity: boolean;
  opportunityData?: {
    name: string;
    value: number;
    currency?: string;
    stageId?: string;
    closeDate?: string; // ISO string
    probability?: number;
    companyId?: string;
  };
}

// Resposta da conversão de lead (alinhado com ConvertLeadResponse do backend)
export interface ConvertLeadResponse {
  lead: Lead;
  contact?: {
    id: string;
    firstName: string;
    lastName?: string | null;
  } | null;
  opportunity?: {
    id: string;
    name: string;
    value: number;
  } | null;
}
