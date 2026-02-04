/**
 * Parser simples para preview de CSV no wizard (primeiras linhas).
 * Não suporta campos entre aspas com vírgula; para produção considere papaparse.
 */

const MAX_PREVIEW_ROWS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface FilePreview {
  headers: string[];
  rows: Record<string, string>[];
  error?: string;
}

/**
 * Lê arquivo como texto e extrai cabeçalhos + primeiras linhas (CSV simples).
 */
export function parseCsvPreview(file: File): Promise<FilePreview> {
  return new Promise((resolve) => {
    if (file.size > MAX_FILE_SIZE) {
      resolve({
        headers: [],
        rows: [],
        error: 'Arquivo muito grande. Máximo 10MB.',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length === 0) {
        resolve({ headers: [], rows: [], error: 'Arquivo vazio.' });
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < Math.min(lines.length, MAX_PREVIEW_ROWS + 1); i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, j) => {
          row[h] = values[j] ?? '';
        });
        rows.push(row);
      }
      resolve({ headers, rows });
    };
    reader.onerror = () => resolve({ headers: [], rows: [], error: 'Erro ao ler arquivo.' });
    reader.readAsText(file, 'UTF-8');
  });
}

export function isAllowedFileType(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls');
}

export function getFileType(file: File): 'csv' | 'xlsx' | 'xls' {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.xlsx')) return 'xlsx';
  return 'xls';
}
