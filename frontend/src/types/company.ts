/**
 * Tipos relacionados a Empresas
 * Baseados na API backend
 */

// Tipos de status e tamanho
export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type CompanySize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
export type AddressType = 'BILLING' | 'SHIPPING' | 'OTHER';

// Estrutura de endereço (alinhada com backend)
export interface CompanyAddress {
  id?: string; // Apenas em modo edição (vem do backend)
  street: string; // Obrigatório
  city: string; // Obrigatório
  state: string; // Obrigatório
  zipCode: string; // Obrigatório
  country?: string | null; // Opcional, default: "Brasil"
  type: AddressType; // Obrigatório
}

// Tag associada (reutilizar tipo Tag de tag.ts)
export interface CompanyTag {
  id: string;
  name: string;
  color: string;
}

// Contato associado (para exibição na listagem)
export interface CompanyContact {
  id: string;
  firstName: string;
  lastName?: string | null;
}

// Filtros para listagem (alinhados com query params do backend)
export interface CompanyFilters {
  industry?: string; // Busca parcial case-insensitive
  size?: CompanySize;
}

// Parâmetros de paginação
export interface CompanyPaginationParams {
  limit?: number; // Default: 20, max: 100
  offset?: number; // Default: 0
  orderBy?: 'name' | 'createdAt'; // Default: name
  order?: 'asc' | 'desc'; // Default: asc para name, desc para createdAt
}

// Dados do formulário (alinhados com POST /api/companies e PUT /api/companies/:id)
export interface CompanyFormData {
  name: string; // Obrigatório
  website?: string | null; // Opcional, formato URL válido
  industry?: string | null; // Opcional
  size?: CompanySize | null; // Opcional
  status: CompanyStatus; // Default: ACTIVE
  addresses: CompanyAddress[]; // Array de endereços
  tagIds: string[]; // Array de UUIDs válidos
}

// Erros de validação do formulário
export interface CompanyFormErrors {
  name?: string;
  website?: string;
  addresses?: string[]; // Array de erros por índice de endereço
  tagIds?: string;
}

// Estender Company (interface existente) com campos de relacionamento
export interface Company {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  size?: CompanySize | null;
  status: CompanyStatus;
  addresses?: CompanyAddress[]; // Incluído em GET /api/companies/:id
  tags?: CompanyTag[]; // Incluído em GET /api/companies/:id
  contacts?: CompanyContact[]; // Opcional, para exibição
  contactsCount?: number; // Contagem de contatos (em listagem)
  createdAt: string;
  updatedAt: string;
}

export interface CompanyListResponse {
  data: Company[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Para lookup (apenas id e name)
export interface CompanyLookup {
  id: string;
  name: string;
}

