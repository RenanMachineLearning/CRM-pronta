/**
 * Tipos relacionados a Oportunidades e Pipelines
 * Baseados na API backend
 */

// Enum para status de oportunidade (alinhado com Prisma schema)
export enum OpportunityStatus {
  OPEN = 'OPEN',
  WON = 'WON',
  LOST = 'LOST',
  ARCHIVED = 'ARCHIVED',
}

// Estágio do pipeline (PipelineStage)
export interface PipelineStage {
  id: string;
  pipelineId: string;
  tenantId: string;
  name: string;
  order: number;
  probability: number | null;
  color: string | null;
  createdAt: string; // ISO string da API
  updatedAt: string; // ISO string da API
}

// Pipeline completo
export interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  isDefault: boolean;
  createdAt: string; // ISO string da API
  updatedAt: string; // ISO string da API
  stages: PipelineStage[]; // Estágios ordenados por order
  opportunitiesCount?: number; // Opcional, para listagem
}

// Resposta de listagem de pipelines
export interface PipelineListResponse {
  data: Pipeline[];
}

// Tag de oportunidade
export interface OpportunityTag {
  id: string;
  name: string;
  color: string;
}

// Contato associado (informação opcional na listagem)
export interface OpportunityContact {
  id: string;
  firstName: string;
  lastName?: string | null;
}

// Empresa associada (informação opcional na listagem)
export interface OpportunityCompany {
  id: string;
  name: string;
}

// Lead associado (informação opcional na listagem)
export interface OpportunityLead {
  id: string;
  firstName: string;
  lastName?: string | null;
}

// Estágio associado (informação opcional na listagem)
export interface OpportunityStage {
  id: string;
  name: string;
  order: number;
  probability: number | null;
  color: string | null;
  pipelineId: string;
}

// Oportunidade completa (alinhado com OpportunityResponse do backend)
export interface Opportunity {
  id: string;
  tenantId: string;
  name: string;
  value: number;
  currency: string;
  stageId: string;
  status: OpportunityStatus;
  closeDate?: string | null; // ISO string da API
  actualCloseDate?: string | null; // ISO string da API
  probability?: number | null;
  contactId?: string | null;
  companyId?: string | null;
  leadId?: string | null;
  createdAt: string; // ISO string da API
  updatedAt: string; // ISO string da API
  // Relacionamentos incluídos
  stage?: OpportunityStage | null;
  contact?: OpportunityContact | null;
  company?: OpportunityCompany | null;
  lead?: OpportunityLead | null;
  tags?: OpportunityTag[];
  // Campos customizados mesclados
  [key: string]: any;
}

// Filtros para listagem (alinhado com OpportunityFilters do backend)
export interface OpportunityFilters {
  stageId?: string; // ID do estágio do pipeline
  status?: OpportunityStatus;
  contactId?: string;
  companyId?: string;
}

// Parâmetros de paginação (alinhado com PaginationParams do backend)
export interface OpportunityPaginationParams {
  limit?: number;
  offset?: number;
  orderBy?: 'value' | 'closeDate' | 'createdAt' | 'name';
  order?: 'asc' | 'desc';
}

// Resposta da API de listagem (alinhado com resposta do backend)
export interface OpportunityListResponse {
  data: Opportunity[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Dados do formulário de oportunidade (para criação/atualização)
export interface OpportunityFormData {
  name: string; // Obrigatório
  value: number; // Obrigatório, positivo
  currency?: string; // Default: "BRL"
  stageId: string; // Obrigatório - FK para PipelineStage
  status?: OpportunityStatus; // Default: OPEN
  closeDate?: string; // ISO string, opcional, não pode ser no passado
  probability?: number; // Opcional, 0-100
  contactId?: string; // Opcional - FK para Contact
  companyId?: string; // Opcional - FK para Company
  leadId?: string; // Opcional - FK para Lead
  tagIds?: string[]; // Array de UUIDs válidos
}

// Erros de validação do formulário
export interface OpportunityFormErrors {
  name?: string;
  value?: string;
  currency?: string;
  stageId?: string;
  status?: string;
  closeDate?: string;
  probability?: string;
  contactId?: string;
  companyId?: string;
  leadId?: string;
  tagIds?: string;
}
