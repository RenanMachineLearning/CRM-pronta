import React, { useState, useEffect } from 'react';
import { ExportDialogProps, ExportOptions } from './ExportDialog.types';

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  entityType,
  currentFilters,
  availableFields,
  onExport
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'excel'>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [applyCurrentFilters, setApplyCurrentFilters] = useState<boolean>(!!currentFilters);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selecionar todos os campos disponíveis por padrão
  useEffect(() => {
    if (availableFields.length > 0) {
      // Selecionar todos os campos exceto os que são exclusivamente para administração
      const defaultSelected = availableFields
        .filter(field => !field.name.startsWith('_')) // Campos que começam com _ são considerados internos
        .map(field => field.id);
      setSelectedFields(defaultSelected);
    }
  }, [availableFields]);

  const handleFieldToggle = (fieldId: string) => {
    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter(id => id !== fieldId));
    } else {
      setSelectedFields([...selectedFields, fieldId]);
    }
  };

  const handleSelectAll = () => {
    const allFieldIds = availableFields.map(field => field.id);
    setSelectedFields(allFieldIds);
  };

  const handleDeselectAll = () => {
    setSelectedFields([]);
  };

  const handleSubmit = async () => {
    if (selectedFields.length === 0) {
      setError('Selecione pelo menos um campo para exportar');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const options: ExportOptions = {
        format: selectedFormat,
        fields: selectedFields,
        ...(applyCurrentFilters && currentFilters ? { filters: currentFilters } : {})
      };

      // Chama a função de exportação passada como prop
      await onExport(options);
      
      // Fecha o modal após a exportação
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido durante a exportação');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div 
            className="absolute inset-0 bg-gray-500 opacity-75"
            onClick={onClose}
          />
        </div>

        {/* Modal container */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Exportar {entityType}
                </h3>
                
                {error && (
                  <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <span className="block sm:inline">{error}</span>
                  </div>
                )}
                
                <div className="mt-2">
                  {/* Seleção de formato */}
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-700 mb-2">Formato de exportação</h4>
                    <div className="flex space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-4 w-4 text-blue-600"
                          checked={selectedFormat === 'csv'}
                          onChange={() => setSelectedFormat('csv')}
                        />
                        <span className="ml-2">CSV</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-4 w-4 text-blue-600"
                          checked={selectedFormat === 'excel'}
                          onChange={() => setSelectedFormat('excel')}
                        />
                        <span className="ml-2">Excel</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Aplicar filtros */}
                  {currentFilters && Object.keys(currentFilters).length > 0 && (
                    <div className="mb-6">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-blue-600"
                          checked={applyCurrentFilters}
                          onChange={(e) => setApplyCurrentFilters(e.target.checked)}
                        />
                        <span className="ml-2">Aplicar filtros atuais</span>
                      </label>
                      {applyCurrentFilters && (
                        <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                          <p>Filtros aplicados:</p>
                          {Object.entries(currentFilters).map(([key, value]) => (
                            <p key={key} className="ml-2"><strong>{key}:</strong> {String(value)}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Seleção de campos */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-md font-medium text-gray-700">Campos para exportar</h4>
                      <div className="space-x-2">
                        <button
                          type="button"
                          className="text-xs inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          onClick={handleSelectAll}
                        >
                          Selecionar todos
                        </button>
                        <button
                          type="button"
                          className="text-xs inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          onClick={handleDeselectAll}
                        >
                          Desmarcar todos
                        </button>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                      {availableFields.map((field) => {
                        const isRequired = field.required;
                        return (
                          <label 
                            key={field.id} 
                            className={`flex items-center p-3 border-b border-gray-200 cursor-pointer ${
                              isRequired ? 'bg-blue-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="form-checkbox h-4 w-4 text-blue-600"
                              checked={selectedFields.includes(field.id) || isRequired}
                              onChange={() => !isRequired && handleFieldToggle(field.id)}
                              disabled={isRequired}
                            />
                            <div className="ml-3 flex flex-col">
                              <span className={`text-sm font-medium ${isRequired ? 'text-blue-700' : 'text-gray-700'}`}>
                                {field.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                {field.name} ({field.type})
                                {isRequired && ' (obrigatório)'}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                      
                      {availableFields.length === 0 && (
                        <div className="p-3 text-center text-gray-500">
                          Nenhum campo disponível para exportação
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              disabled={isLoading}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-base ${
                isLoading 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white'
              }`}
              onClick={handleSubmit}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exportando...
                </>
              ) : (
                'Exportar'
              )}
            </button>
            
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-base"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;