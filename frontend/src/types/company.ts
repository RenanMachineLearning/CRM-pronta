/**
 * Tipos relacionados a Empresas
 * Baseados na API backend
 */

export interface Company {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  size?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE' | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
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

