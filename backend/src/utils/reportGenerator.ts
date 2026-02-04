/**
 * Utilitário para formatação de relatórios de importação
 *
 * Converte ProcessImportResult para o formato da API de relatório (spec itens 154-171):
 * - totalRows, successCount, errorCount
 * - errors no formato { row, errors: [] } (agrupado por linha)
 * - warnings
 *
 * Inclui agregações opcionais: ErrorSummary (por código, severidade, campo),
 * PerformanceMetrics e formatação completa (formatImportReport).
 */

import type {
  ImportError,
  ErrorSummary,
  ErrorSummaryByCode,
  ErrorSummaryBySeverity,
  ErrorSummaryByField,
  PerformanceMetrics,
  ImportReport,
  ProcessImportResult,
} from '../types/importProcessing.types';

/** Item de erro no formato da API: uma linha com seus erros */
export interface ErrorByRow {
  row: number;
  errors: Array<{
    code?: string;
    message: string;
    field?: string;
    severity?: string;
  }>;
}

/** Opções para formatação do relatório */
export interface FormatReportOptions {
  includeErrorSummary?: boolean;
  includePerformanceMetrics?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Agrupa ImportError[] por row e retorna no formato { row, errors: [] }[].
 * Cada entrada em errors contém code, message, field, severity conforme o spec.
 */
export function errorsGroupedByRow(errors: ImportError[]): ErrorByRow[] {
  if (!Array.isArray(errors) || errors.length === 0) {
    return [];
  }

  const byRow = new Map<number, ErrorByRow['errors']>();

  for (const e of errors) {
    const row = typeof e.row === 'number' ? e.row : Number(e.row);
    if (!byRow.has(row)) {
      byRow.set(row, []);
    }
    byRow.get(row)!.push({
      code: e.code,
      message: e.message,
      field: e.field,
      severity: e.severity,
    });
  }

  return Array.from(byRow.entries())
    .sort(([a], [b]) => a - b)
    .map(([row, errs]) => ({ row, errors: errs }));
}

/**
 * Agrupa erros por código, severidade e campo para resumo agregado.
 */
export function generateErrorSummary(errors: ImportError[]): ErrorSummary {
  if (!Array.isArray(errors) || errors.length === 0) {
    return { byCode: [], bySeverity: [], byField: [], total: 0 };
  }

  const codeMap = new Map<string, { count: number; severity: ImportError['severity'] }>();
  const severityMap = new Map<string, number>();
  const fieldMap = new Map<string, number>();

  for (const e of errors) {
    const code = e.code ?? 'UNKNOWN';
    const prev = codeMap.get(code);
    codeMap.set(code, { count: (prev?.count ?? 0) + 1, severity: e.severity });

    const sev = e.severity ?? 'error';
    severityMap.set(sev, (severityMap.get(sev) ?? 0) + 1);

    const field = e.field ?? '(sem campo)';
    fieldMap.set(field, (fieldMap.get(field) ?? 0) + 1);
  }

  const byCode: ErrorSummaryByCode[] = Array.from(codeMap.entries())
    .map(([code, v]) => ({ code, count: v.count, severity: v.severity }))
    .sort((a, b) => b.count - a.count);

  const bySeverity: ErrorSummaryBySeverity[] = Array.from(severityMap.entries())
    .map(([severity, count]) => ({ severity: severity as 'error' | 'warning' | 'info', count }))
    .sort((a, b) => b.count - a.count);

  const byField: ErrorSummaryByField[] = Array.from(fieldMap.entries())
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count);

  return { byCode, bySeverity, byField, total: errors.length };
}

/**
 * Calcula métricas de performance a partir do resultado de importação.
 */
export function calculatePerformanceMetrics(result: ProcessImportResult | Record<string, unknown>): PerformanceMetrics {
  const totalRows = typeof (result as ProcessImportResult).totalRows === 'number' ? (result as ProcessImportResult).totalRows : 0;
  const successCount = typeof (result as ProcessImportResult).successCount === 'number' ? (result as ProcessImportResult).successCount : 0;
  const errorCount = typeof (result as ProcessImportResult).errorCount === 'number' ? (result as ProcessImportResult).errorCount : 0;
  const processingTime = typeof (result as ProcessImportResult).processingTime === 'number' ? (result as ProcessImportResult).processingTime : 0;

  const totalProcessed = totalRows;
  const processingTimeMs = processingTime; // já em ms no ProcessImportResult
  const recordsPerSecond = processingTimeMs > 0 ? (totalProcessed / (processingTimeMs / 1000)) : 0;
  const successRate = totalProcessed > 0 ? successCount / totalProcessed : 0;
  const errorRate = totalProcessed > 0 ? errorCount / totalProcessed : 0;

  return {
    processingTimeMs,
    recordsPerSecond: Math.round(recordsPerSecond * 100) / 100,
    successRate: Math.round(successRate * 10000) / 10000,
    errorRate: Math.round(errorRate * 10000) / 10000,
    totalProcessed,
  };
}

/**
 * Formata ProcessImportResult em ImportReport, com erros agrupados por linha
 * e opcionalmente errorSummary, performanceMetrics e paginação de erros.
 */
export function formatImportReport(
  result: ProcessImportResult | Record<string, unknown>,
  importId: string,
  options: FormatReportOptions = {}
): ImportReport {
  const r = result as ProcessImportResult;
  const errors = Array.isArray(r.errors) ? r.errors : [];
  const warnings = Array.isArray(r.warnings) ? r.warnings : [];
  const grouped = errorsGroupedByRow(errors);

  const page = options.page ?? 1;
  const limit = options.limit ?? 0;
  const totalErrors = grouped.length;

  let errorsSlice = grouped;
  let pagination: ImportReport['pagination'] | undefined;
  if (limit > 0) {
    const start = (page - 1) * limit;
    errorsSlice = grouped.slice(start, start + limit);
    pagination = { page, limit, total: totalErrors };
  }

  const report: ImportReport = {
    importId: r.importId ?? importId,
    totalRows: typeof r.totalRows === 'number' ? r.totalRows : 0,
    successCount: typeof r.successCount === 'number' ? r.successCount : 0,
    errorCount: typeof r.errorCount === 'number' ? r.errorCount : 0,
    errors: errorsSlice,
    warnings,
    skippedCount: r.skippedCount,
    duplicateCount: r.duplicateCount,
    processedCount: r.processedCount,
    processingTime: r.processingTime,
    status: r.status,
    pagination,
  };

  if (options.includeErrorSummary) {
    report.errorSummary = generateErrorSummary(errors);
  }
  if (options.includePerformanceMetrics) {
    report.performanceMetrics = calculatePerformanceMetrics(result);
  }

  return report;
}
