/**
 * Página de Importação de Dados
 *
 * Usa o ImportWizard (6 passos: Upload, Entidade, Mapeamento, Opções, Processamento, Relatório)
 * conforme Etapa 9 - Parte 10.
 */

import { ImportWizard } from '../components/ImportWizard';
import { Breadcrumb } from '../components/Breadcrumb';
import type { ProcessImportResult } from '../services/importService';

export function ImportPage() {
  const handleImportSuccess = (result: ProcessImportResult) => {
    console.log('Importação concluída com sucesso:', result);
  };

  const handleImportError = (error: Error) => {
    console.error('Erro na importação:', error);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb className="mb-4" />
      <h1 className="text-3xl font-bold text-text-primary mb-6">Importação de Dados</h1>

      <ImportWizard onSuccess={handleImportSuccess} onError={handleImportError} />

      <div className="mt-8 bg-bg-surface rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Formato do Arquivo</h2>
        <p className="text-text-secondary text-sm">
          Formatos aceitos: CSV, XLSX, XLS. Tamanho máximo: 10MB. Use o assistente para mapear
          as colunas do seu arquivo aos campos da entidade e baixe um template na etapa de seleção de entidade.
        </p>
      </div>
    </div>
  );
}
