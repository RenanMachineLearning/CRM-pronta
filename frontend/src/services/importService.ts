/**
 * Serviço de importação (Etapa 9 - Parte 10).
 * Chamadas à API de import com auth e X-Tenant-Slug (paridade com api.ts).
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || 'demo';

function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

function getTenantSlug(): string {
  return localStorage.getItem('tenantSlug') || TENANT_SLUG;
}

/** Headers comuns para requisições de import (auth + tenant). */
function getImportHeaders(omitContentType = false): Record<string, string> {
  const token = getAuthToken();
  const tenantSlug = getTenantSlug();
  const headers: Record<string, string> = {
    'X-Tenant-Slug': tenantSlug,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!omitContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

/** Upload de arquivo. POST /api/import/upload — retorna fileId. */
export interface UploadResponse {
  message: string;
  fileId: string;
  originalName: string;
  size: number;
  mimeType: string;
  expiresAt: string;
}

export async function uploadImportFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const headers = getImportHeaders(true);
  delete headers['Content-Type']; // multipart/form-data com boundary
  const url = `${API_URL}/api/import/upload`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data as UploadResponse;
}

/** Download de template. GET /api/import/templates/:entityType?format=csv|excel. */
export function getTemplateDownloadUrl(
  entityType: string,
  format: 'csv' | 'excel'
): string {
  const token = getAuthToken();
  const params = new URLSearchParams({ format });
  const url = `${API_URL}/api/import/templates/${entityType}?${params}`;
  const withAuth = token
    ? `${url}&_token=${encodeURIComponent(token)}`
    : url;
  return withAuth;
}

/** Abre o download do template em nova aba (usa fetch + blob para enviar Authorization). */
export async function downloadImportTemplate(
  entityType: string,
  format: 'csv' | 'excel'
): Promise<void> {
  const headers = getImportHeaders(false);
  const url = `${API_URL}/api/import/templates/${entityType}?format=${format}`;
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const ext = format === 'excel' ? 'xlsx' : 'csv';
  const name = `template-import-${entityType}-${Date.now()}.${ext}`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Resultado do processamento (backend CsvImportService.importFromFile). */
export interface ProcessImportResult {
  success: boolean;
  importedCount: number;
  errorCount?: number;
  errors?: Array<{ rowIndex: number; message: string; originalData?: unknown }>;
  summary?: {
    totalRows: number;
    processedRows: number;
    importedRows: number;
    failedRows: number;
    startTime: string;
  };
}

/** Mapeamento: array esperado pelo backend POST /api/import/:fileId/map */
export interface ImportMappingItem {
  columnIndex: number;
  fieldName: string;
  required: boolean;
}

/** Resposta do endpoint de mapeamento (preview). */
export interface MapImportResponse {
  success: boolean;
  fileId: string;
  entityType: string;
  mappings: ImportMappingItem[];
  preview: unknown[];
  validation: { isValid: boolean; errors: unknown[]; warnings: unknown[] };
}

/** Envia mapeamento e obtém preview. POST /api/import/:fileId/map — entityType em PascalCase (Contact, Company, etc.). */
export async function mapImport(
  fileId: string,
  entityType: string,
  mappings: ImportMappingItem[],
  previewRowCount = 5
): Promise<MapImportResponse> {
  const url = `${API_URL}/api/import/${fileId}/map`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getImportHeaders(false),
    body: JSON.stringify({ entityType, mappings, previewRowCount }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data as MapImportResponse;
}

/** Processamento. POST /api/import/process — multipart com arquivo + body. entityType em minúsculas (contact, company, etc.). */
export async function processImport(
  file: File,
  options: {
    entityType: string;
    fieldMapping: Record<string, string>;
    continueOnError: boolean;
    validateBeforeImport: boolean;
  }
): Promise<ProcessImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  // Backend espera entityType em minúsculas: contact, company, lead, opportunity
  formData.append('entityType', options.entityType.toLowerCase());
  formData.append('fieldMapping', JSON.stringify(options.fieldMapping));
  formData.append('continueOnError', String(options.continueOnError));
  formData.append('validateBeforeImport', String(options.validateBeforeImport));
  const headers = getImportHeaders(true);
  delete headers['Content-Type'];
  const url = `${API_URL}/api/import/process`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data as ProcessImportResult;
}
