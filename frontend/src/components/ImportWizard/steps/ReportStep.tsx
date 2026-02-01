/**
 * Passo 6: Relatório (Etapa 9 - Parte 10).
 * Estatísticas finais, lista de erros, botão Baixar relatório e Nova importação.
 */

import { Button } from '../../Button';
import type { ProcessImportResult } from '../../../services/importService';

export interface ReportStepProps {
  result: ProcessImportResult | null;
  error: string | null;
  onDownloadReport: () => void;
  onNewImport: () => void;
}

/** Gera CSV do relatório (erros) no cliente para download. */
function buildReportCsv(result: ProcessImportResult): string {
  const rows: string[] = [
    'Linha;Mensagem;Dados originais',
    ...(result.errors || []).map(
      (e) =>
        `${e.rowIndex};${(e.message || '').replace(/;/g, ',')};${JSON.stringify(e.originalData || '').replace(/;/g, ',')}`
    ),
  ];
  return '\uFEFF' + rows.join('\n'); // BOM para Excel
}

export function ReportStep({
  result,
  error,
  onDownloadReport,
  onNewImport,
}: ReportStepProps) {
  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-medium text-red-800">Erro na importação</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
        <Button variant="primary" onClick={onNewImport}>
          Nova importação
        </Button>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const summary = result.summary;
  const total = summary?.totalRows ?? 0;
  const imported = result.importedCount ?? summary?.importedRows ?? 0;
  const failed = result.errorCount ?? summary?.failedRows ?? 0;
  const hasErrors = (result.errors?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="font-medium text-green-800">Importação finalizada</p>
        <ul className="text-sm text-green-700 mt-2 space-y-1">
          <li>Total de linhas: {total}</li>
          <li>Importados com sucesso: {imported}</li>
          {failed > 0 && <li>Linhas com erro: {failed}</li>}
        </ul>
      </div>

      {hasErrors && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <p className="px-4 py-2 bg-gray-100 font-medium text-gray-800 text-sm">
            Detalhes dos erros
          </p>
          <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100">
            {(result.errors || []).slice(0, 20).map((e, i) => (
              <li key={i} className="px-4 py-2 text-sm text-gray-700">
                Linha {e.rowIndex}: {e.message}
              </li>
            ))}
            {(result.errors?.length ?? 0) > 20 && (
              <li className="px-4 py-2 text-sm text-gray-500">
                … e mais {(result.errors?.length ?? 0) - 20} erros. Baixe o relatório para ver todos.
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {hasErrors && (
          <Button variant="secondary" onClick={onDownloadReport}>
            Baixar relatório (CSV)
          </Button>
        )}
        <Button variant="primary" onClick={onNewImport}>
          Nova importação
        </Button>
      </div>
    </div>
  );
}

export function downloadReportAsCsv(result: ProcessImportResult): void {
  const csv = buildReportCsv(result);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-importacao-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
