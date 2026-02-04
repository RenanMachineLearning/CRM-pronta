/**
 * Componente FileImport
 *
 * Interface para upload e importação de arquivos (CSV e Excel)
 */

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '../components/Button';

interface FileImportProps {
  entityType: 'contact' | 'company' | 'lead' | 'opportunity';
  onImportSuccess?: (result: any) => void;
  onImportError?: (error: any) => void;
}

interface ImportProgress {
  status: 'idle' | 'validating' | 'mapping' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  result?: any;
  error?: string;
}

export function CSVImport({ entityType, onImportSuccess, onImportError }: FileImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ImportProgress>({ 
    status: 'idle', 
    progress: 0, 
    message: 'Aguardando arquivo...' 
  });
  const [fieldMapping, setFieldMapping] = useState<{ [csvField: string]: string }>({});
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para lidar com seleção de arquivo
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      const isCsv = fileName.endsWith('.csv');
      const isXlsx = fileName.endsWith('.xlsx');
      const isXls = fileName.endsWith('.xls');

      if (!isCsv && !isXlsx && !isXls) {
        setProgress({
          status: 'error',
          progress: 0,
          message: 'Por favor, selecione um arquivo CSV ou Excel válido.',
          error: 'Formato de arquivo inválido'
        });
        return;
      }

      setFile(selectedFile);
      setProgress({
        status: 'validating',
        progress: 10,
        message: 'Fazendo upload do arquivo...'
      });

      // Fazer upload do arquivo
      uploadFile(selectedFile);
    }
  };

  // Função para fazer upload do arquivo
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
        headers: {
          // O token de autenticação deve ser adicionado via interceptador ou manualmente
          // 'Authorization': `Bearer ${getToken()}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        setProgress({
          status: 'mapping',
          progress: 30,
          message: result.message || 'Arquivo enviado. Mapeando campos...'
        });

        // Armazenar o fileId para uso posterior
        // Em um cenário real, faríamos a validação e mapeamento usando o fileId
        // Por enquanto, vamos continuar com o fluxo antigo para manter a funcionalidade
        // mas idealmente, o novo fluxo usaria o fileId para as próximas etapas

        // Para manter a compatibilidade, vamos validar o arquivo localmente também
        validateFileLocally(file);
      } else {
        setProgress({
          status: 'error',
          progress: 0,
          message: result.message || 'Erro ao fazer upload do arquivo',
          error: result.error
        });
      }
    } catch (error) {
      setProgress({
        status: 'error',
        progress: 0,
        message: 'Erro de rede ao fazer upload do arquivo',
        error: (error as Error).message
      });
    }
  };

  // Função para validar o arquivo localmente (mantido para compatibilidade)
  const validateFileLocally = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import/validate', {
        method: 'POST',
        body: formData,
        headers: {
          // O token de autenticação deve ser adicionado via interceptador ou manualmente
          // 'Authorization': `Bearer ${getToken()}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        setProgress({
          status: 'mapping',
          progress: 30,
          message: result.message || 'Arquivo válido. Mapeando campos...'
        });

        // Obter sugestões de mapeamento
        setTimeout(() => {
          if (result.fileType === 'csv') {
            suggestFieldMapping(result.headers);
          } else {
            // Para Excel, usar os headers da primeira planilha
            suggestFieldMapping(result.sheets && result.sheets.length > 0 ?
              Object.keys(result.sheets[0]).filter(key => key !== 'name' && key !== 'rowCount' && key !== 'colCount' && key !== 'range')
              : []);
          }
        }, 500);
      } else {
        setProgress({
          status: 'error',
          progress: 0,
          message: result.message || 'Erro ao validar arquivo',
          error: result.error
        });
      }
    } catch (error) {
      setProgress({
        status: 'error',
        progress: 0,
        message: 'Erro de rede ao validar arquivo',
        error: (error as Error).message
      });
    }
  };

  // Função para sugerir mapeamento de campos
  const suggestFieldMapping = (headers: string[]) => {
    setAvailableFields(headers);
    
    // Mapeamento sugerido com base nos cabeçalhos
    const suggestedMapping: { [csvField: string]: string } = {};
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (normalizedHeader.includes('nome') || normalizedHeader.includes('firstname') || normalizedHeader.includes('first')) {
        suggestedMapping[header] = 'firstName';
      } else if (normalizedHeader.includes('sobrenome') || normalizedHeader.includes('lastname') || normalizedHeader.includes('last')) {
        suggestedMapping[header] = 'lastName';
      } else if (normalizedHeader.includes('email') || normalizedHeader.includes('e-mail')) {
        suggestedMapping[header] = 'email';
      } else if (normalizedHeader.includes('telefone') || normalizedHeader.includes('phone') || normalizedHeader.includes('tel')) {
        suggestedMapping[header] = 'phone';
      } else if (normalizedHeader.includes('empresa') || normalizedHeader.includes('company') || normalizedHeader.includes('organization')) {
        suggestedMapping[header] = 'company';
      } else {
        suggestedMapping[header] = ''; // Campo não reconhecido
      }
    });
    
    setFieldMapping(suggestedMapping);
    setProgress({
      status: 'mapping',
      progress: 50,
      message: 'Mapeamento de campos sugerido. Revise e continue.'
    });
  };

  // Função para lidar com mudança no mapeamento de campos
  const handleFieldMappingChange = (csvField: string, modelField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvField]: modelField
    }));
  };

  // Função para iniciar o processo de importação
  const startImport = async () => {
    if (!file) {
      setProgress({
        status: 'error',
        progress: 0,
        message: 'Nenhum arquivo selecionado',
        error: 'Selecione um arquivo CSV ou Excel primeiro'
      });
      return;
    }

    setProgress({
      status: 'processing',
      progress: 60,
      message: 'Iniciando importação...'
    });

    // Para o novo fluxo, usar o fileId armazenado anteriormente
    // Por enquanto, vamos manter o fluxo antigo para compatibilidade
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('fieldMapping', JSON.stringify(fieldMapping));

    // Se for um arquivo Excel, adicionar informações da planilha
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Aqui poderíamos adicionar informações da planilha específica se necessário
      // formData.append('sheetName', selectedSheetName);
      // formData.append('sheetIndex', selectedSheetIndex.toString());
    }

    try {
      const response = await fetch('/api/import/process', {
        method: 'POST',
        body: formData,
        headers: {
          // O token de autenticação deve ser adicionado via interceptador ou manualmente
          // 'Authorization': `Bearer ${getToken()}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        setProgress({
          status: 'completed',
          progress: 100,
          message: `Importação concluída! ${result.importedCount} registros importados.`,
          result
        });

        if (onImportSuccess) {
          onImportSuccess(result);
        }
      } else {
        setProgress({
          status: 'error',
          progress: 0,
          message: result.message || 'Erro durante a importação',
          error: result.error
        });

        if (onImportError) {
          onImportError(result);
        }
      }
    } catch (error) {
      setProgress({
        status: 'error',
        progress: 0,
        message: 'Erro de rede durante a importação',
        error: (error as Error).message
      });

      if (onImportError) {
        onImportError(error);
      }
    }
  };

  // Função para reiniciar o processo
  const resetImport = () => {
    setFile(null);
    setProgress({ 
      status: 'idle', 
      progress: 0, 
      message: 'Aguardando arquivo...' 
    });
    setFieldMapping({});
    setAvailableFields([]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Importação de Dados via CSV</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecione o arquivo CSV para importar
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {file && (
            <span className="text-sm text-gray-600">
              {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </span>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{progress.message}</span>
          <span>{progress.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${
              progress.status === 'error' ? 'bg-red-600' :
              progress.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'
            }`} 
            style={{ width: `${progress.progress}%` }}
          ></div>
        </div>
      </div>

      {/* Mapeamento de campos */}
      {progress.status === 'mapping' && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Mapeamento de Campos</h3>
          <p className="text-sm text-gray-600 mb-4">
            Mapeie os campos do seu arquivo CSV para os campos do sistema:
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campo CSV
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campo do Sistema
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {availableFields.map((csvField) => (
                  <tr key={csvField}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {csvField}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <select
                        value={fieldMapping[csvField] || ''}
                        onChange={(e) => handleFieldMappingChange(csvField, e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="">Selecione um campo...</option>
                        <option value="firstName">Nome</option>
                        <option value="lastName">Sobrenome</option>
                        <option value="email">Email</option>
                        <option value="phone">Telefone</option>
                        <option value="title">Cargo</option>
                        <option value="company">Empresa</option>
                        <option value="notes">Notas</option>
                        <option value="status">Status</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resultados */}
      {progress.result && progress.status === 'completed' && (
        <div className="mb-6 p-4 bg-green-50 rounded-md">
          <h3 className="text-lg font-medium text-green-800">Importação Concluída!</h3>
          <p className="text-green-700">
            {progress.result.importedCount} registros importados com sucesso.
          </p>
          {progress.result.errorCount > 0 && (
            <p className="text-yellow-700 mt-2">
              {progress.result.errorCount} registros apresentaram erros.
            </p>
          )}
        </div>
      )}

      {/* Erros */}
      {progress.error && progress.status === 'error' && (
        <div className="mb-6 p-4 bg-red-50 rounded-md">
          <h3 className="text-lg font-medium text-red-800">Erro na Importação</h3>
          <p className="text-red-700">{progress.error}</p>
          {progress.message && (
            <p className="text-red-600 mt-2">{progress.message}</p>
          )}
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex space-x-3">
        {(progress.status === 'idle' || progress.status === 'error') && (
          <Button
            variant="secondary"
            onClick={resetImport}
          >
            Limpar
          </Button>
        )}

        {progress.status === 'mapping' && (
          <Button
            variant="primary"
            onClick={startImport}
            disabled={Object.values(fieldMapping).every(val => val === '')}
          >
            Iniciar Importação
          </Button>
        )}

        {progress.status === 'completed' && (
          <Button
            variant="primary"
            onClick={resetImport}
          >
            Nova Importação
          </Button>
        )}
      </div>
    </div>
  );
}