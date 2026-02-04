/**
 * Helpers para geração de arquivos de exportação (CSV e Excel).
 *
 * Converte array de objetos em buffers prontos para download,
 * com headers definidos pelo parâmetro fields.
 */

import { unparse as papaUnparse } from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Gera buffer CSV a partir de array de objetos e lista de campos.
 * Primeira linha = headers (fields); demais linhas = valores na mesma ordem.
 *
 * @param data - Array de objetos (ex.: resultados de listContacts)
 * @param fields - Nomes dos campos a exportar (ordem das colunas)
 * @returns Buffer UTF-8 do CSV
 */
export function generateCSV(
  data: Record<string, unknown>[],
  fields: string[]
): Buffer {
  if (!Array.isArray(fields) || fields.length === 0) {
    return Buffer.from('', 'utf8');
  }
  if (!Array.isArray(data)) {
    return Buffer.from('', 'utf8');
  }

  if (data.length === 0) {
    const headerLine = fields.join(',');
    return Buffer.from(headerLine + '\n', 'utf8');
  }

  const out = data.map((row) => {
    const o: Record<string, string> = {};
    for (const f of fields) {
      const val = row[f];
      o[f] = val === undefined || val === null ? '' : String(val);
    }
    return o;
  });

  const csv = papaUnparse(out);
  return Buffer.from(csv, 'utf8');
}

/**
 * Gera buffer Excel (XLSX) a partir de array de objetos e lista de campos.
 * Primeira linha = headers (fields); demais linhas = valores na mesma ordem.
 *
 * @param data - Array de objetos
 * @param fields - Nomes dos campos a exportar (ordem das colunas)
 * @returns Buffer do arquivo XLSX
 */
export function generateExcel(
  data: Record<string, unknown>[],
  fields: string[]
): Buffer {
  if (!Array.isArray(data) || !Array.isArray(fields) || fields.length === 0) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([fields]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  const rows = data.map((row) => {
    return fields.map((field) => {
      const val = row[field];
      if (val === undefined || val === null) return '';
      if (val instanceof Date) return val.toISOString();
      return val;
    });
  });

  const worksheet = XLSX.utils.aoa_to_sheet([fields, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}
