/**
 * Serviço para importação de dados (CSV e Excel)
 *
 * Responsável por:
 * - Processar arquivos CSV e Excel em lotes
 * - Validar dados antes da importação
 * - Converter dados para modelos do sistema
 * - Executar importação com tratamento de erros
 * - Manter consistência dos dados
 * - Implementar rollback em caso de falhas críticas
 */

import { parseCSV, CsvParseResult } from '../utils/csvParser';
import { validateCsvData } from '../utils/csvValidator';
import { parseExcel, ExcelParseResult } from '../utils/excelParser';
import { validateExcelData } from '../utils/excelValidator';
import { ContactService } from './contactService';
import { CompanyService } from './companyService';
import { CreateContactData } from './contactService';
import { CreateCompanyData } from './companyService';
import { Contact, Company, Lead, Opportunity } from '@prisma/client';
import {
  InsufficientMemoryError,
  DatabaseError
} from '../errors/ImportExportError';

export interface ImportResult {
  success: boolean;
  importedCount: number;
  errorCount: number;
  errors: ImportError[];
  summary: ImportSummary;
}

export interface ImportError {
  rowIndex: number;
  message: string;
  originalData?: any;
}

export interface ImportSummary {
  totalRows: number;
  processedRows: number;
  importedRows: number;
  failedRows: number;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
}

export interface ImportOptions {
  batchSize?: number; // Número de registros por lote
  validateBeforeImport?: boolean; // Validar antes de importar
  continueOnError?: boolean; // Continuar importando mesmo com erros
  fieldMapping?: { [originalField: string]: string }; // Mapeamento de campos para campos do modelo
  tenantId: string;
  userId: string;
  entityType: 'contact' | 'company' | 'lead' | 'opportunity';
  fileType: 'csv' | 'xlsx' | 'xls'; // Tipo de arquivo sendo importado
  sheetName?: string; // Nome da planilha a ser usada (para Excel)
  sheetIndex?: number; // Índice da planilha a ser usada (para Excel)
  jobId?: string; // ID do job de importação (para rastreamento de erros)
}

export class CsvImportService {
  private static readonly DEFAULT_BATCH_SIZE = 100;
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Importa dados de um arquivo (CSV ou Excel)
   */
  static async importFromFile(
    fileBuffer: Buffer,
    options: ImportOptions
  ): Promise<ImportResult> {
    const summary: ImportSummary = {
      totalRows: 0,
      processedRows: 0,
      importedRows: 0,
      failedRows: 0,
      startTime: new Date()
    };

    const errors: ImportError[] = [];
    let importedCount = 0;

    try {
      // Validar tamanho do arquivo
      if (fileBuffer.length > this.MAX_FILE_SIZE) {
        throw new Error(`Arquivo muito grande. Tamanho máximo permitido: ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      let parseResult: CsvParseResult | ExcelParseResult;
      let parsedData: any[];

      // Parsear o arquivo com base no tipo
      if (options.fileType === 'csv') {
        parseResult = await parseCSV(fileBuffer);
        parsedData = (parseResult as CsvParseResult).data;
        summary.totalRows = parsedData.length;

        // Processar erros de parsing CSV
        if ((parseResult as CsvParseResult).errors && (parseResult as CsvParseResult).errors.length > 0) {
          (parseResult as CsvParseResult).errors.forEach(error => {
            errors.push({
              rowIndex: error.row,
              message: `Erro de parsing na linha ${error.row}: ${error.message}`,
              originalData: error
            });
          });
        }
      } else if (options.fileType === 'xlsx' || options.fileType === 'xls') {
        parseResult = await parseExcel(fileBuffer, {
          sheetName: options.sheetName,
          sheetIndex: options.sheetIndex,
          header: true
        });
        parsedData = (parseResult as ExcelParseResult).data;
        summary.totalRows = parsedData.length;

        // Adicionar informações sobre a planilha processada
        console.log(`Processando planilha: ${(parseResult as ExcelParseResult).activeSheet}`);
      } else {
        throw new Error(`Tipo de arquivo não suportado: ${options.fileType}`);
      }

      // Validar dados se solicitado
      if (options.validateBeforeImport) {
        let validation;
        if (options.fileType === 'csv') {
          validation = await validateCsvData(parsedData, {
            tenantId: options.tenantId,
            entityType: options.entityType
          }, options.jobId); // Passar o jobId para os erros
        } else {
          // Para Excel, usamos a validação específica
          validation = await validateExcelData(parsedData,
            (parseResult as ExcelParseResult).activeSheet || 'Sheet1', {
            tenantId: options.tenantId,
            entityType: options.entityType
          }); // jobId não é suportado em validateExcelData
        }

        if (!validation.valid) {
          // Converter erros para o formato padrão
          const validationErrors = (validation as any).errors || [];
          validationErrors.forEach((validationError: any) => {
            errors.push({
              rowIndex: validationError.rowIndex,
              message: `Erro de validação: ${validationError.message}`,
              originalData: validationError
            });
          });

          // Se não for para continuar com erros e houver erros de validação, interromper
          if (!options.continueOnError && validationErrors.length > 0) {
            return {
              success: false,
              importedCount: 0,
              errorCount: validationErrors.length,
              errors,
              summary
            };
          }
        }
      }

      // Aplicar mapeamento de campos se fornecido
      let mappedData = parsedData;
      if (options.fieldMapping) {
        mappedData = this.applyFieldMapping(mappedData, options.fieldMapping);
      }

      // Processar em lotes
      const batchSize = options.batchSize || this.DEFAULT_BATCH_SIZE;
      const batches = this.createBatches(mappedData, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        try {
          const batchResult = await this.processBatch(batch, options, summary);
          importedCount += batchResult.importedCount;

          if (batchResult.errors.length > 0) {
            errors.push(...batchResult.errors);
            summary.failedRows += batchResult.errors.length;
          }
        } catch (batchError) {
          // Se ocorrer um erro crítico no lote, registrar e continuar ou interromper
          const batchStartIndex = i * batchSize;
          errors.push({
            rowIndex: batchStartIndex,
            message: `Erro crítico ao processar lote começando na linha ${batchStartIndex}: ${(batchError as Error).message}`
          });

          if (!options.continueOnError) {
            break; // Interromper se não for para continuar com erros
          }
        }
      }

      summary.endTime = new Date();
      summary.durationMs = summary.endTime.getTime() - summary.startTime.getTime();
      summary.importedRows = importedCount;
      summary.processedRows = summary.totalRows - summary.failedRows;

      return {
        success: errors.length === 0 || (options.continueOnError ?? false),
        importedCount,
        errorCount: errors.length,
        errors,
        summary
      };
    } catch (error) {
      summary.endTime = new Date();
      summary.durationMs = summary.endTime.getTime() - summary.startTime.getTime();

      errors.push({
        rowIndex: -1, // Erro geral, não específico de linha
        message: `Erro crítico durante a importação: ${(error as Error).message}`
      });

      return {
        success: false,
        importedCount: 0,
        errorCount: errors.length,
        errors,
        summary
      };
    }
  }

  /**
   * Importa dados de um arquivo CSV (mantido para compatibilidade)
   * @deprecated Use importFromFile em vez disso
   */
  static async importFromCsv(
    fileBuffer: Buffer,
    options: ImportOptions
  ): Promise<ImportResult> {
    // Configurar opções para arquivo CSV
    const csvOptions: ImportOptions = {
      ...options,
      fileType: 'csv'
    };

    return this.importFromFile(fileBuffer, csvOptions);
  }

  /**
   * Aplica mapeamento de campos CSV para campos do modelo
   */
  private static applyFieldMapping(data: any[], fieldMapping: { [csvField: string]: string }): any[] {
    return data.map(row => {
      const newRow: any = {};
      for (const [csvField, modelField] of Object.entries(fieldMapping)) {
        if (row[csvField] !== undefined) {
          newRow[modelField] = row[csvField];
        }
      }
      return newRow;
    });
  }

  /**
   * Divide os dados em lotes menores
   */
  private static createBatches(data: any[], batchSize: number): any[][] {
    const batches: any[][] = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Processa um lote de dados
   */
  private static async processBatch(
    batch: any[],
    options: ImportOptions,
    summary: ImportSummary
  ): Promise<{ importedCount: number; errors: ImportError[] }> {
    const errors: ImportError[] = [];
    let importedCount = 0;

    // Verificar uso de memória antes de processar o lote
    const usedMemory = process.memoryUsage().heapUsed;
    const maxMemory = 512 * 1024 * 1024; // 512MB - pode ser configurável
    if (usedMemory > maxMemory) {
      throw new InsufficientMemoryError(
        `Memória insuficiente para processar o lote. Memória usada: ${Math.round(usedMemory / 1024 / 1024)}MB`,
        { batchSize: batch.length, usedMemory, maxMemory },
        options.tenantId,
        options.jobId
      );
    }

    // Processar cada registro no lote
    for (let i = 0; i < batch.length; i++) {
      const rowIndex = (summary.processedRows || 0) + i;
      const record = batch[i];

      try {
        // Converter e validar o registro
        const convertedRecord = await this.convertRecord(record, options);

        // Importar o registro com base no tipo de entidade
        switch (options.entityType) {
          case 'contact':
            await this.importContact(convertedRecord, options);
            break;
          case 'company':
            await this.importCompany(convertedRecord, options);
            break;
          case 'lead':
            await this.importLead(convertedRecord, options);
            break;
          case 'opportunity':
            await this.importOpportunity(convertedRecord, options);
            break;
          default:
            throw new Error(`Tipo de entidade não suportado: ${options.entityType}`);
        }

        importedCount++;
      } catch (error) {
        // Verificar se é um dos nossos erros personalizados
        if (error instanceof DatabaseError) {
          errors.push({
            rowIndex,
            message: `Erro de banco de dados: ${error.message}`,
            originalData: record
          });
        } else if (error instanceof InsufficientMemoryError) {
          // Se for erro de memória, propagar para interromper o processamento
          throw error;
        } else {
          errors.push({
            rowIndex,
            message: `Erro ao importar registro: ${(error as Error).message}`,
            originalData: record
          });
        }
      }
    }

    return { importedCount, errors };
  }

  /**
   * Converte um registro CSV para o formato apropriado
   */
  private static async convertRecord(record: any, options: ImportOptions): Promise<any> {
    // Converter campos com base no tipo de entidade
    switch (options.entityType) {
      case 'contact':
        return this.convertToContactData(record);
      case 'company':
        return this.convertToCompanyData(record);
      case 'lead':
        return this.convertToLeadData(record);
      case 'opportunity':
        return this.convertToOpportunityData(record);
      default:
        throw new Error(`Tipo de entidade não suportado: ${options.entityType}`);
    }
  }

  /**
   * Converte dados para formato de contato
   */
  private static convertToContactData(csvData: any): CreateContactData {
    return {
      firstName: csvData.firstName || csvData.first_name || csvData.nome || '',
      lastName: csvData.lastName || csvData.last_name || csvData.sobrenome || '',
      title: csvData.title || csvData.cargo || csvData.funcao || '',
      gender: csvData.gender || csvData.genero || csvData.sexo || '',
      birthDate: csvData.birthDate || csvData.dataNascimento || csvData.birth_date || null,
      notes: csvData.notes || csvData.notas || csvData.observacoes || '',
      status: csvData.status || 'ACTIVE',
      companyId: csvData.companyId || csvData.company_id || csvData.empresaId || null,
      emails: csvData.email ? [{ 
        email: csvData.email, 
        type: 'WORK', 
        isPrimary: true 
      }] : [],
      phones: csvData.phone || csvData.telefone ? [{
        phone: csvData.phone || csvData.telefone,
        type: 'WORK',
        isPrimary: true
      }] : [],
      addresses: csvData.street || csvData.endereco ? [{
        street: csvData.street || csvData.endereco || '',
        city: csvData.city || csvData.cidade || '',
        state: csvData.state || csvData.estado || '',
        zipCode: csvData.zipCode || csvData.cep || '',
        country: csvData.country || csvData.pais || 'Brasil',
        type: 'BILLING'
      }] : [],
      tagIds: csvData.tagIds || csvData.tags || [],
      customFields: {} // Campos customizados podem ser adicionados aqui se necessário
    };
  }

  /**
   * Converte dados para formato de empresa
   */
  private static convertToCompanyData(csvData: any): CreateCompanyData {
    return {
      name: csvData.name || csvData.nome || csvData.razaoSocial || '',
      website: csvData.website || csvData.site || csvData.url || '',
      industry: csvData.industry || csvData.setor || csvData.ramo || '',
      size: csvData.size || csvData.porte || 'SMALL',
      status: csvData.status || 'ACTIVE',
      addresses: csvData.street || csvData.endereco ? [{
        street: csvData.street || csvData.endereco || '',
        city: csvData.city || csvData.cidade || '',
        state: csvData.state || csvData.estado || '',
        zipCode: csvData.zipCode || csvData.cep || '',
        country: csvData.country || csvData.pais || 'Brasil',
        type: 'BILLING'
      }] : [],
      tagIds: csvData.tagIds || csvData.tags || [],
      customFields: {} // Campos customizados podem ser adicionados aqui se necessário
    };
  }

  /**
   * Converte dados para formato de lead
   */
  private static convertToLeadData(csvData: any): any {
    // Implementação para conversão de dados de lead
    return {
      firstName: csvData.firstName || csvData.first_name || csvData.nome || '',
      lastName: csvData.lastName || csvData.last_name || csvData.sobrenome || '',
      email: csvData.email || '',
      phone: csvData.phone || csvData.telefone || '',
      company: csvData.company || csvData.empresa || '',
      source: csvData.source || csvData.origem || '',
      status: csvData.status || 'NEW'
    };
  }

  /**
   * Converte dados para formato de oportunidade
   */
  private static convertToOpportunityData(csvData: any): any {
    // Implementação para conversão de dados de oportunidade
    return {
      name: csvData.name || csvData.nome || csvData.descricao || '',
      value: csvData.value || csvData.valor || 0,
      currency: csvData.currency || csvData.moeda || 'BRL',
      status: csvData.status || 'OPEN',
      closeDate: csvData.closeDate || csvData.dataFechamento || null,
      probability: csvData.probability || csvData.probabilidade || 0,
      contactId: csvData.contactId || csvData.contatoId || null,
      companyId: csvData.companyId || csvData.empresaId || null,
      tagIds: csvData.tagIds || csvData.tags || []
    };
  }

  /**
   * Importa um contato
   */
  private static async importContact(contactData: CreateContactData, options: ImportOptions): Promise<Contact> {
    // Adicionar tenantId e userId ao dados de criação
    const contact = await ContactService.createContact(
      contactData,
      options.tenantId,
      options.userId
    );
    // Ensure required fields are defined
    return {
      ...contact,
      lastName: contact.lastName || null,
      title: contact.title || null,
      gender: contact.gender || null,
      birthDate: contact.birthDate || null,
      notes: contact.notes || null,
      companyId: contact.companyId || null,
      deletedAt: contact.deletedAt || null
    };
  }

  /**
   * Importa uma empresa
   */
  private static async importCompany(companyData: CreateCompanyData, options: ImportOptions): Promise<Company> {
    // Adicionar tenantId e userId ao dados de criação
    const company = await CompanyService.createCompany(
      companyData,
      options.tenantId,
      options.userId
    );
    // Ensure required fields are defined
    return {
      ...company,
      website: company.website || null,
      industry: company.industry || null,
      size: company.size || null,
      deletedAt: company.deletedAt || null
    };
  }

  /**
   * Importa um lead
   */
  private static async importLead(_leadData: any, _options: ImportOptions): Promise<Lead> {
    // Implementação para importação de lead
    // Esta é uma implementação simplificada - a completa dependeria do serviço de Lead
    throw new Error('Serviço de importação de Lead não implementado');
  }

  /**
   * Importa uma oportunidade
   */
  private static async importOpportunity(_opportunityData: any, _options: ImportOptions): Promise<Opportunity> {
    // Implementação para importação de oportunidade
    // Esta é uma implementação simplificada - a completa dependeria do serviço de Opportunity
    throw new Error('Serviço de importação de Oportunidade não implementado');
  }
}