/**
 * Passo 1: Upload de arquivo (Etapa 9 - Parte 10).
 * Drag-and-drop ou seleção, validação tipo/tamanho, preview das primeiras linhas.
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Button } from '../../Button';
import { MAX_FILE_SIZE } from '../types';

const ACCEPT = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
};

export interface UploadStepProps {
  file: File | null;
  previewRows: unknown[];
  error: string | null;
  loading: boolean;
  onFileAccepted: (file: File, headers: string[], previewRows: unknown[]) => void;
  onClear: () => void;
  onParseError: (message: string) => void;
}

/** Lê CSV e retorna headers + primeiras linhas (máx. 5). */
function parseCSVPreview(file: File): Promise<{ headers: string[]; rows: unknown[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      const headers = result.meta?.fields || [];
      const rows = (result.data || []).slice(0, 5);
      resolve({ headers, rows });
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
    reader.readAsText(file, 'utf-8');
  });
}

/** Lê Excel e retorna headers + primeiras linhas (máx. 5). */
function parseExcelPreview(file: File): Promise<{ headers: string[]; rows: unknown[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];
        const headers = (rows[0] as string[]) || [];
        const rowObjects = rows.slice(1, 6).map((row: unknown[]) => {
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => {
            obj[h] = row[i];
          });
          return obj;
        });
        resolve({ headers, rows: rowObjects });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

function parseFilePreview(file: File): Promise<{ headers: string[]; rows: unknown[] }> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCSVPreview(file);
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseExcelPreview(file);
  return Promise.reject(new Error('Formato não suportado. Use CSV, XLSX ou XLS.'));
}

export function UploadStep({
  file,
  previewRows,
  error,
  loading,
  onFileAccepted,
  onClear,
  onParseError,
}: UploadStepProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const f = acceptedFiles[0];
      if (!f) return;
      onParseError('');
      parseFilePreview(f)
        .then(({ headers, rows }) => onFileAccepted(f, headers, rows))
        .catch((e) => onParseError(e instanceof Error ? e.message : 'Erro ao ler o arquivo'));
    },
    [onFileAccepted, onParseError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    accept: ACCEPT,
    disabled: loading,
    onDropRejected: (rejections) => {
      const r = rejections[0];
      if (r?.errors?.[0]?.code === 'file-too-large') {
        onParseError('Arquivo muito grande. Máximo 10MB.');
      } else if (r?.errors?.[0]?.code === 'file-invalid-type') {
        onParseError('Tipo inválido. Use CSV, XLSX ou XLS.');
      }
    },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Arraste um arquivo ou clique para selecionar. Formatos: CSV, XLSX, XLS. Tamanho máximo: 10MB.
      </p>

      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} data-testid="import-file-input" />
          {isDragActive ? (
            <p className="text-gray-600">Solte o arquivo aqui...</p>
          ) : (
            <p className="text-gray-600">Arraste o arquivo aqui ou clique para selecionar</p>
          )}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-gray-900">{file.name}</span>
            <span className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</span>
          </div>
          {previewRows.length > 0 && (
            <div className="mt-2 overflow-x-auto">
              <p className="text-xs text-gray-500 mb-1">Preview (primeiras linhas):</p>
              <table className="min-w-full text-sm border border-gray-200 rounded">
                <thead className="bg-gray-100">
                  <tr>
                    {(Object.keys(previewRows[0] as Record<string, unknown>) || []).map((h) => (
                      <th key={h} className="px-2 py-1 text-left border-b border-gray-200">
                        {String(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 3).map((row, i) => (
                    <tr key={i}>
                      {(Object.values(row as Record<string, unknown>) || []).map((v, j) => (
                        <td key={j} className="px-2 py-1 border-b border-gray-100">
                          {String(v ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button type="button" variant="secondary" className="mt-3" onClick={onClear} disabled={loading}>
            Trocar arquivo
          </Button>
        </div>
      )}

      {(error || loading) && (
        <div className={`text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || (loading ? 'Processando...' : '')}
        </div>
      )}
    </div>
  );
}
