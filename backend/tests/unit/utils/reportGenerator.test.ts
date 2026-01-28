/**
 * Testes unitários para reportGenerator (spec itens 154-171).
 * Garante que erros são agrupados por linha no formato { row, errors: [] }
 * e cobre generateErrorSummary, calculatePerformanceMetrics e formatImportReport.
 */

import {
  errorsGroupedByRow,
  generateErrorSummary,
  calculatePerformanceMetrics,
  formatImportReport,
} from '../../../src/utils/reportGenerator';
import type { ImportError, ProcessImportResult } from '../../../src/types/importProcessing.types';

describe('reportGenerator.errorsGroupedByRow', () => {
  it('retorna array vazio quando errors é vazio', () => {
    expect(errorsGroupedByRow([])).toEqual([]);
  });

  it('retorna array vazio quando errors não é array', () => {
    expect(errorsGroupedByRow(null as any)).toEqual([]);
    expect(errorsGroupedByRow(undefined as any)).toEqual([]);
  });

  it('agrupa erros por row e ordena por row', () => {
    const errors: ImportError[] = [
      { row: 5, code: 'X', message: 'Erro 5', severity: 'error' },
      { row: 2, code: 'A', message: 'Erro 2a', severity: 'error' },
      { row: 2, code: 'B', message: 'Erro 2b', field: 'email', severity: 'error' },
      { row: 5, code: 'Y', message: 'Outro erro 5', severity: 'error' },
    ];
    const result = errorsGroupedByRow(errors);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      row: 2,
      errors: [
        { code: 'A', message: 'Erro 2a', field: undefined, severity: 'error' },
        { code: 'B', message: 'Erro 2b', field: 'email', severity: 'error' },
      ],
    });
    expect(result[1]).toEqual({
      row: 5,
      errors: [
        { code: 'X', message: 'Erro 5', field: undefined, severity: 'error' },
        { code: 'Y', message: 'Outro erro 5', field: undefined, severity: 'error' },
      ],
    });
  });

  it('preserva code, message, field, severity em cada item de errors', () => {
    const errors: ImportError[] = [
      {
        row: 1,
        code: 'VALIDATION_ERROR',
        message: 'Email inválido',
        field: 'email',
        severity: 'error',
      },
    ];
    const result = errorsGroupedByRow(errors);
    expect(result[0].errors[0]).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Email inválido',
      field: 'email',
      severity: 'error',
    });
  });
});

describe('reportGenerator.generateErrorSummary', () => {
  it('retorna resumo vazio quando errors é vazio', () => {
    expect(generateErrorSummary([])).toEqual({ byCode: [], bySeverity: [], byField: [], total: 0 });
  });

  it('agrupa por código, severidade e campo', () => {
    const errors: ImportError[] = [
      { row: 1, code: 'VALIDATION_ERROR', message: 'A', field: 'email', severity: 'error' },
      { row: 2, code: 'VALIDATION_ERROR', message: 'B', field: 'email', severity: 'error' },
      { row: 3, code: 'DUPLICATE', message: 'C', severity: 'error' },
    ];
    const summary = generateErrorSummary(errors);
    expect(summary.total).toBe(3);
    expect(summary.byCode).toEqual(
      expect.arrayContaining([
        { code: 'VALIDATION_ERROR', count: 2, severity: 'error' },
        { code: 'DUPLICATE', count: 1, severity: 'error' },
      ])
    );
    expect(summary.bySeverity.some((s) => s.severity === 'error' && s.count === 3)).toBe(true);
    expect(summary.byField).toEqual(
      expect.arrayContaining([
        { field: 'email', count: 2 },
        { field: '(sem campo)', count: 1 },
      ])
    );
  });
});

describe('reportGenerator.calculatePerformanceMetrics', () => {
  it('calcula successRate, errorRate e recordsPerSecond', () => {
    const result: ProcessImportResult = {
      importId: 'x',
      totalRows: 100,
      successCount: 90,
      errorCount: 10,
      skippedCount: 0,
      duplicateCount: 0,
      processedCount: 100,
      errors: [],
      warnings: [],
      processingTime: 2000,
      status: 'partial',
    };
    const metrics = calculatePerformanceMetrics(result);
    expect(metrics.totalProcessed).toBe(100);
    expect(metrics.processingTimeMs).toBe(2000);
    expect(metrics.recordsPerSecond).toBe(50);
    expect(metrics.successRate).toBe(0.9);
    expect(metrics.errorRate).toBe(0.1);
  });
});

describe('reportGenerator.formatImportReport', () => {
  const baseResult: ProcessImportResult = {
    importId: 'imp-1',
    totalRows: 5,
    successCount: 3,
    errorCount: 2,
    skippedCount: 0,
    duplicateCount: 0,
    processedCount: 5,
    errors: [
      { row: 1, code: 'ERR', message: 'E1', severity: 'error' },
      { row: 2, code: 'ERR', message: 'E2', severity: 'error' },
    ],
    warnings: [{ row: 1, code: 'W', message: 'W1' }],
    processingTime: 100,
    status: 'partial',
  };

  it('retorna relatório básico sem opções', () => {
    const report = formatImportReport(baseResult, 'imp-1', {});
    expect(report.importId).toBe('imp-1');
    expect(report.totalRows).toBe(5);
    expect(report.successCount).toBe(3);
    expect(report.errorCount).toBe(2);
    expect(report.errors).toHaveLength(2);
    expect(report.warnings).toHaveLength(1);
    expect(report.errorSummary).toBeUndefined();
    expect(report.performanceMetrics).toBeUndefined();
    expect(report.pagination).toBeUndefined();
  });

  it('inclui errorSummary e performanceMetrics quando solicitado', () => {
    const report = formatImportReport(baseResult, 'imp-1', {
      includeErrorSummary: true,
      includePerformanceMetrics: true,
    });
    expect(report.errorSummary).toBeDefined();
    expect(report.errorSummary!.total).toBe(2);
    expect(report.performanceMetrics).toBeDefined();
    expect(report.performanceMetrics!.totalProcessed).toBe(5);
  });

  it('aplica paginação de erros quando page e limit são passados', () => {
    const resultWithManyErrors: ProcessImportResult = {
      ...baseResult,
      errors: [
        { row: 1, code: 'E', message: '1', severity: 'error' },
        { row: 2, code: 'E', message: '2', severity: 'error' },
        { row: 3, code: 'E', message: '3', severity: 'error' },
      ],
    };
    const report = formatImportReport(resultWithManyErrors, 'imp-1', { page: 1, limit: 2 });
    expect(report.errors).toHaveLength(2);
    expect(report.pagination).toEqual({ page: 1, limit: 2, total: 3 });
  });
});
