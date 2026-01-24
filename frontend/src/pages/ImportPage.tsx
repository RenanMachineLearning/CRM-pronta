/**
 * Página de Importação de Dados
 *
 * Página que permite aos usuários importar dados via arquivos CSV ou Excel
 */

import React, { useState } from 'react';
import { CSVImport } from '../components/CSVImport';
import { Button } from '../components/Button';

export function ImportPage() {
  const [entityType, setEntityType] = useState<'contact' | 'company' | 'lead' | 'opportunity'>('contact');
  const [showImport, setShowImport] = useState(false);

  const handleImportSuccess = (result: any) => {
    console.log('Importação concluída com sucesso:', result);
    // Aqui você pode mostrar uma mensagem de sucesso ou atualizar a UI
  };

  const handleImportError = (error: any) => {
    console.error('Erro na importação:', error);
    // Aqui você pode mostrar uma mensagem de erro ao usuário
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Importação de Dados</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Importar Dados via CSV</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione o tipo de dado que deseja importar:
          </label>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setEntityType('contact')}
              className={`px-4 py-2 rounded-md ${
                entityType === 'contact'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Contatos
            </button>
            <button
              onClick={() => setEntityType('company')}
              className={`px-4 py-2 rounded-md ${
                entityType === 'company'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Empresas
            </button>
            <button
              onClick={() => setEntityType('lead')}
              className={`px-4 py-2 rounded-md ${
                entityType === 'lead'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Leads
            </button>
            <button
              onClick={() => setEntityType('opportunity')}
              className={`px-4 py-2 rounded-md ${
                entityType === 'opportunity'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Oportunidades
            </button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-gray-600">
            Selecione o tipo de entidade acima e clique no botão abaixo para iniciar a importação de dados via CSV ou Excel.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            O arquivo (CSV ou Excel) deve conter colunas com cabeçalhos correspondentes aos campos da entidade selecionada.
          </p>
        </div>

        {!showImport ? (
          <Button
            variant="primary"
            onClick={() => setShowImport(true)}
          >
            Iniciar Importação de {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
          </Button>
        ) : (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Importando {entityType === 'contact' ? 'Contatos' :
                         entityType === 'company' ? 'Empresas' :
                         entityType === 'lead' ? 'Leads' : 'Oportunidades'}
              </h3>
              <Button
                variant="secondary"
                onClick={() => setShowImport(false)}
              >
                Voltar
              </Button>
            </div>

            <CSVImport
              entityType={entityType}
              onImportSuccess={handleImportSuccess}
              onImportError={handleImportError}
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Formato do Arquivo CSV</h2>
        <div className="prose max-w-none">
          <p className="text-gray-600">
            Para garantir uma importação bem-sucedida, seu arquivo CSV deve seguir o formato abaixo:
          </p>
          
          <h3 className="text-lg font-medium mt-4">Campos Disponíveis:</h3>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {entityType === 'contact' && (
              <>
                <li><code>firstName</code> - Nome do contato (obrigatório)</li>
                <li><code>lastName</code> - Sobrenome do contato</li>
                <li><code>email</code> - Email do contato</li>
                <li><code>phone</code> - Telefone do contato</li>
                <li><code>title</code> - Cargo do contato</li>
                <li><code>company</code> - Empresa do contato</li>
                <li><code>notes</code> - Observações sobre o contato</li>
              </>
            )}
            {entityType === 'company' && (
              <>
                <li><code>name</code> - Nome da empresa (obrigatório)</li>
                <li><code>website</code> - Site da empresa</li>
                <li><code>industry</code> - Indústria da empresa</li>
                <li><code>size</code> - Porte da empresa (SMALL, MEDIUM, LARGE, ENTERPRISE)</li>
                <li><code>status</code> - Status da empresa (ACTIVE, INACTIVE, ARCHIVED)</li>
              </>
            )}
            {entityType === 'lead' && (
              <>
                <li><code>firstName</code> - Nome do lead (obrigatório)</li>
                <li><code>lastName</code> - Sobrenome do lead</li>
                <li><code>email</code> - Email do lead</li>
                <li><code>phone</code> - Telefone do lead</li>
                <li><code>company</code> - Empresa do lead</li>
                <li><code>source</code> - Fonte do lead</li>
                <li><code>status</code> - Status do lead (NEW, QUALIFIED, CONVERTED, LOST)</li>
              </>
            )}
            {entityType === 'opportunity' && (
              <>
                <li><code>name</code> - Nome da oportunidade (obrigatório)</li>
                <li><code>value</code> - Valor da oportunidade</li>
                <li><code>currency</code> - Moeda (padrão: BRL)</li>
                <li><code>status</code> - Status da oportunidade (OPEN, WON, LOST, ARCHIVED)</li>
                <li><code>closeDate</code> - Data de fechamento esperada</li>
                <li><code>probability</code> - Probabilidade de fechamento (0-100)</li>
                <li><code>contactId</code> - ID do contato associado</li>
                <li><code>companyId</code> - ID da empresa associada</li>
              </>
            )}
          </ul>

          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-2">Exemplo de CSV/Excel:</h4>
            <p className="text-sm mb-2">Os arquivos Excel devem ter os dados na primeira planilha, com os cabeçalhos na primeira linha.</p>
            <pre className="text-sm bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto">
              {entityType === 'contact'
                ? '"firstName","lastName","email","phone","title","company"\n"João","Silva","joao@example.com","(11) 99999-9999","Gerente","Empresa ABC"'
                : entityType === 'company'
                ? '"name","website","industry","size","status"\n"Empresa ABC","www.empresaabc.com","Tecnologia","MEDIUM","ACTIVE"'
                : entityType === 'lead'
                ? '"firstName","lastName","email","phone","company","source","status"\n"Maria","Souza","maria@example.com","(11) 88888-8888","Empresa XYZ","Website","QUALIFIED"'
                : '"name","value","currency","status","closeDate","probability"\n"Oportunidade 1",50000,"BRL","OPEN","2023-12-31","75"'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}