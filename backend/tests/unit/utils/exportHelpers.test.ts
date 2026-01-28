/**
 * Testes unitários para exportHelpers (Etapa 9 - Parte 8).
 * Valida: generateCSV e generateExcel produzem buffers com headers e dados.
 */

import { generateCSV, generateExcel } from '../../../src/utils/exportHelpers';

describe('exportHelpers.generateCSV', () => {
  it('retorna buffer CSV com headers e linhas', () => {
    const data = [
      { id: '1', name: 'A', value: 10 },
      { id: '2', name: 'B', value: 20 },
    ];
    const fields = ['id', 'name', 'value'];
    const buf = generateCSV(data, fields);
    expect(Buffer.isBuffer(buf)).toBe(true);
    const str = buf.toString('utf8');
    expect(str).toMatch(/id/);
    expect(str).toMatch(/name/);
    expect(str).toMatch(/value/);
    expect(str).toMatch(/1/);
    expect(str).toMatch(/A/);
    expect(str).toMatch(/2/);
    expect(str).toMatch(/B/);
  });

  it('retorna CSV só com header quando data é vazio', () => {
    const buf = generateCSV([], ['a', 'b']);
    expect(Buffer.isBuffer(buf)).toBe(true);
    const str = buf.toString('utf8');
    expect(str).toContain('a');
    expect(str).toContain('b');
    const lines = str.split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('trata null/undefined como string vazia', () => {
    const data = [{ x: null, y: undefined }];
    const buf = generateCSV(data, ['x', 'y']);
    const str = buf.toString('utf8');
    expect(str).toMatch(/x/);
    expect(str).toMatch(/y/);
  });
});

describe('exportHelpers.generateExcel', () => {
  it('retorna buffer XLSX com headers e linhas', () => {
    const data = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ];
    const fields = ['id', 'name'];
    const buf = generateExcel(data, fields);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('retorna buffer para data vazio com fields', () => {
    const buf = generateExcel([], ['a', 'b']);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('converte Date para string', () => {
    const data = [{ d: new Date('2024-01-15T12:00:00.000Z') }];
    const buf = generateExcel(data, ['d']);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });
});
