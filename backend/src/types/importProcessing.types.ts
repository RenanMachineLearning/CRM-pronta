/**
 * Tipos para processamento de importação em lote
 * 
 * Define interfaces para processamento síncrono e assíncrono de importação de dados,
 * incluindo validação, mapeamento de campos e relatórios detalhados.
 */

// Tipos para mapeamento de campos
export interface FieldMapping {
  columnIndex: number;
  fieldName: string;
  required: boolean;
  unique?: boolean; // Indica se o campo deve ser único
}

// Opções de processamento
export interface ProcessOptions {
  skipErrors?: boolean;           // Continuar mesmo com erros (padrão: false)
  updateExisting?: boolean;      // Atualizar registros existentes (padrão: false)
  dryRun?: boolean;              // Apenas validar, não criar (padrão: false)
  batchSize?: number;            // Tamanho customizado de batch (10-500)
  validateUniqueness?: boolean;  // Validar unicidade de campos (padrão: true)
  continueOnDuplicate?: boolean; // Continuar se encontrar duplicatas (padrão: false)
  duplicateAction?: 'skip' | 'update' | 'error'; // Ação para duplicatas (padrão: 'error')
  priority?: 'LOW' | 'NORMAL' | 'HIGH'; // Prioridade do job (padrão: 'NORMAL')
}

// Requisição de processamento
export interface ProcessImportRequest {
  entityType: 'Contact' | 'Company' | 'Lead' | 'Opportunity' | 'Task' | 'Note';
  mappings: FieldMapping[];
  options: ProcessOptions;
}

// Erro de importação
export interface ImportError {
  row: number;
  field?: string;
  code: string; // Ex: 'VALIDATION_ERROR', 'DUPLICATE_KEY', 'UNIQUE_CONSTRAINT_VIOLATION'
  message: string;
  severity: 'error' | 'warning' | 'info';
  value?: any;
  originalRow?: any; // Cópia da linha original para debug
}

// Aviso de importação
export interface ImportWarning {
  row: number;
  field?: string;
  code: string;
  message: string;
  value?: any;
}

// Resultado do processamento
export interface ProcessImportResult {
  importId: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  duplicateCount: number;
  processedCount: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  processingTime: number;
  status: 'completed' | 'partial' | 'failed' | 'cancelled';
  progress?: number; // 0-100 para jobs assíncronos
  estimatedCompletion?: Date; // Tempo estimado para jobs assíncronos
}

// Status de job de importação
export type ImportJobStatus = 'pending' | 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';

// Prioridade de job
export type JobPriority = 'low' | 'normal' | 'high';

// Modelo de job de importação
export interface ImportJob {
  id: string;
  fileId: string;
  tenantId: string;
  userId: string;
  entityType: string;
  status: ImportJobStatus;
  progress: number; // 0-100
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  result?: ProcessImportResult;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  retries: number;
  priority: JobPriority;
}

// Resultado de validação de batch
export interface BatchValidationResult {
  validRows: any[];
  invalidRows: Array<{
    rowIndex: number;
    errors: ImportError[];
    originalRow: any;
  }>;
  warnings: ImportWarning[];
}

// Estatísticas de processamento
export interface ProcessingStats {
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  duplicateCount: number;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  recordsPerSecond?: number;
  peakMemoryUsage?: number;
  cpuUsage?: number;
  status?: 'completed' | 'partial' | 'failed' | 'cancelled';
}

// Token para cancelamento de operação
export interface CancellationToken {
  isCancelled: boolean;
  cancel(): void;
  onCancellationRequested(callback: () => void): void;
}

// --- Tipos para relatório de importação (API de report) ---

/** Contagem de erros por código (ex.: VALIDATION_ERROR, DUPLICATE_KEY) */
export interface ErrorSummaryByCode {
  code: string;
  count: number;
  severity: ImportError['severity'];
}

/** Contagem de erros por severidade */
export interface ErrorSummaryBySeverity {
  severity: 'error' | 'warning' | 'info';
  count: number;
}

/** Contagem de erros por campo */
export interface ErrorSummaryByField {
  field: string;
  count: number;
}

/** Resumo agregado de erros (por tipo, severidade, campo) */
export interface ErrorSummary {
  byCode: ErrorSummaryByCode[];
  bySeverity: ErrorSummaryBySeverity[];
  byField: ErrorSummaryByField[];
  total: number;
}

/** Métricas de performance do processamento */
export interface PerformanceMetrics {
  processingTimeMs: number;
  recordsPerSecond: number;
  successRate: number; // 0-1
  errorRate: number;   // 0-1
  totalProcessed: number;
}

/** Relatório completo de importação (formato API, com agregações opcionais) */
export interface ImportReport {
  importId: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; errors: Array<{ code?: string; message: string; field?: string; severity?: string }> }>;
  warnings: ImportWarning[];
  skippedCount?: number;
  duplicateCount?: number;
  processedCount?: number;
  processingTime?: number;
  status?: ProcessImportResult['status'];
  errorSummary?: ErrorSummary;
  performanceMetrics?: PerformanceMetrics;
  pagination?: { page: number; limit: number; total: number };
}