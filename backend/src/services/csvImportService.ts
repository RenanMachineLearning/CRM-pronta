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
import { CreateContactData } from './contactService';
import { CreateCompanyData } from './companyService';
import { Contact, Company } from '@prisma/client';
import {
  InsufficientMemoryError,
  DatabaseError
} from '../errors/ImportExportError';
import { IMPORT_CONFIG } from '../config/importConfig';
import { prisma } from '../utils/prisma';
import { validateEmail, validatePhone, validateDateNotFuture } from '../utils/validators';

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
  isAsync?: boolean; // Indica se a importação será assíncrona
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

      // Verificar se o arquivo é grande o suficiente para necessitar de streaming
      const needsStreaming = fileBuffer.length > 5 * 1024 * 1024; // 5MB ou mais

      if (needsStreaming && options.fileType === 'csv') {
        // Processar arquivo CSV com streaming para economizar memória
        return await this.importFromCsvWithStreaming(fileBuffer, options, summary, errors);
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

      // Verificar se o número de linhas ultrapassa o limite síncrono e definir modo de processamento
      const isAsync = options.isAsync ||
                      summary.totalRows > IMPORT_CONFIG.SYNC_THRESHOLD_ROWS ||
                      options.fileType === 'xlsx' || options.fileType === 'xls';

      // Se for para processamento assíncrono mas foi chamado de forma síncrona, lançar erro
      if (isAsync && !options.isAsync) {
        throw new Error(`Arquivo com ${summary.totalRows} linhas excede o limite de ${IMPORT_CONFIG.SYNC_THRESHOLD_ROWS} linhas para processamento síncrono. Use o modo assíncrono.`);
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
   * Importa dados de um arquivo CSV com streaming para controle de memória
   */
  private static async importFromCsvWithStreaming(
    fileBuffer: Buffer,
    options: ImportOptions,
    summary: ImportSummary,
    errors: ImportError[]
  ): Promise<ImportResult> {
    const importedCount = 0;
    let processedCount = 0;

    try {
      // Para arquivos grandes, usaremos uma abordagem baseada em lotes para controle de memória
      // Implementação simplificada para demonstrar o conceito
      console.log('Processando arquivo CSV com controle de memória...');

      // Processamento direto para demonstração
      const csvString = fileBuffer.toString('utf8');
      const Papa = await import('papaparse');

      // Parsear o CSV completo
      const parsed = Papa.default.parse(csvString, {
        header: true,
        skipEmptyLines: true
      });

      // Processar em lotes
      const batchSize = options.batchSize || IMPORT_CONFIG.BATCH_SIZE;
      const data = parsed.data;

      for (let i = 0; i < data.length; i += batchSize) {
        // Verificar uso de memória antes de processar o lote
        const currentMemoryUsage = process.memoryUsage().heapUsed;
        if (currentMemoryUsage > IMPORT_CONFIG.MEMORY_LIMIT) {
          throw new Error(`Limite de memória excedido: ${Math.round(currentMemoryUsage / 1024 / 1024)}MB`);
        }

        const batch = data.slice(i, i + batchSize);

        // Atualizar o número total de linhas
        summary.totalRows = data.length;

        // Processar o lote com transação
        const batchResult = await this.processBatch(batch, options, summary);

        processedCount += batch.length;
        summary.processedRows = processedCount;

        if (batchResult.errors.length > 0) {
          errors.push(...batchResult.errors);
          summary.failedRows += batchResult.errors.length;
        }

        // Log de progresso e uso de memória
        const memoryUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        const percentageUsed = heapTotalMB > 0 ? Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) : 0;

        console.log(`Processando lote ${Math.floor(i / batchSize) + 1}, memória usada: ${heapUsedMB}MB (${percentageUsed}%)`);
      }

      summary.endTime = new Date();
      summary.durationMs = summary.endTime.getTime() - summary.startTime.getTime();
      summary.importedRows = importedCount;
      summary.processedRows = processedCount;

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
        message: `Erro crítico durante a importação com streaming: ${(error as Error).message}`
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
    const maxMemory = IMPORT_CONFIG.MEMORY_LIMIT; // Usar configuração definida
    if (usedMemory > maxMemory) {
      throw new InsufficientMemoryError(
        `Memória insuficiente para processar o lote. Memória usada: ${Math.round(usedMemory / 1024 / 1024)}MB`,
        { batchSize: batch.length, usedMemory, maxMemory },
        options.tenantId,
        options.jobId
      );
    }

    // Processar cada registro no lote dentro de uma transação
    try {
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < batch.length; i++) {
          const rowIndex = (summary.processedRows || 0) + i;
          const record = batch[i];

          try {
            // Converter e validar o registro
            const convertedRecord = await this.convertRecord(record, options);

            // Importar o registro com base no tipo de entidade
            switch (options.entityType) {
              case 'contact':
                await this.importContactWithTransaction(tx, convertedRecord, options);
                break;
              case 'company':
                await this.importCompanyWithTransaction(tx, convertedRecord, options);
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

            // Se não for para continuar com erros, interromper o processamento
            if (!options.continueOnError) {
              throw error; // Isso vai abortar a transação
            }
          }
        }
      });
    } catch (transactionError) {
      // Se a transação falhou, todos os dados importados neste lote serão revertidos
      console.error(`Transação de lote falhou: ${(transactionError as Error).message}`);
      // Os erros já estão registrados no array errors
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
   * Importa um contato com transação
   */
  private static async importContactWithTransaction(
    tx: any,
    contactData: CreateContactData,
    options: ImportOptions
  ): Promise<Contact> {
    // Este método replica a lógica de ContactService.createContact mas usando a transação fornecida
    // Validar que id não foi fornecido (gerado automaticamente)
    if ((contactData as any).id !== undefined) {
      throw new Error('O ID é gerado automaticamente e não pode ser fornecido');
    }

    // Validar que pelo menos firstName ou lastName é fornecido
    const hasFirstName = contactData.firstName && contactData.firstName.trim().length > 0;
    const hasLastName = contactData.lastName && contactData.lastName.trim().length > 0;

    if (!hasFirstName && !hasLastName) {
      throw new Error('Pelo menos firstName ou lastName deve ser fornecido');
    }

    // Validar emails se fornecidos
    if (contactData.emails) {
      for (const emailData of contactData.emails) {
        if (!validateEmail(emailData.email)) {
          throw new Error(`Email inválido: ${emailData.email}`);
        }
      }
    }

    // Validar telefones se fornecidos
    if (contactData.phones) {
      for (const phoneData of contactData.phones) {
        if (!validatePhone(phoneData.phone)) {
          throw new Error(`Telefone inválido: ${phoneData.phone}`);
        }
      }
    }

    // Validar birthDate se fornecido
    if (contactData.birthDate) {
      if (!validateDateNotFuture(contactData.birthDate)) {
        throw new Error('Data de nascimento não pode ser futura');
      }
    }

    // Validar e normalizar gender se fornecido
    let normalizedGender: string | null | undefined = undefined;
    if (contactData.gender !== undefined) {
      if (contactData.gender === null) {
        // Permitir null explicitamente
        normalizedGender = null;
      } else {
        const validGenders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
        normalizedGender = (contactData.gender as string).trim().toUpperCase();
        if (!validGenders.includes(normalizedGender)) {
          throw new Error(`gender deve ser um dos valores: ${validGenders.join(', ')}`);
        }
      }
    }

    // Validar companyId se fornecido
    if (contactData.companyId) {
      const company = await tx.company.findFirst({
        where: {
          id: contactData.companyId,
          tenantId: options.tenantId, // Garantir isolamento multi-tenant
          deletedAt: null, // Empresa não pode estar soft deleted
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

      if (!company) {
        throw new Error('Empresa não encontrada, não pertence ao seu tenant ou foi deletada');
      }
    }

    // Validar tagIds se fornecidos
    if (contactData.tagIds && contactData.tagIds.length > 0) {
      const tags = await tx.tag.findMany({
        where: {
          id: { in: contactData.tagIds },
          tenantId: options.tenantId, // Garantir que tags pertencem ao tenant
        },
      });

      if (tags.length !== contactData.tagIds.length) {
        throw new Error('Uma ou mais tags não foram encontradas ou não pertencem ao tenant');
      }
    }

    // Normalizar emails (lowercase)
    const normalizedEmails = contactData.emails?.map((e) => ({
      ...e,
      email: e.email.trim().toLowerCase(),
    }));

    // Verificar duplicatas dentro do array de emails fornecido
    if (normalizedEmails && normalizedEmails.length > 0) {
      const emailSet = new Set<string>();
      for (const emailData of normalizedEmails) {
        if (emailSet.has(emailData.email)) {
          throw new Error(`Email duplicado no array: ${emailData.email}`);
        }
        emailSet.add(emailData.email);
      }
    }

    // Garantir que apenas um email seja primary
    if (normalizedEmails && normalizedEmails.length > 0) {
      const primaryEmails = normalizedEmails.filter((e) => e.isPrimary);
      if (primaryEmails.length > 1) {
        // Manter apenas o primeiro como primary
        let firstPrimaryFound = false;
        normalizedEmails.forEach((e) => {
          if (e.isPrimary && !firstPrimaryFound) {
            firstPrimaryFound = true;
          } else {
            e.isPrimary = false;
          }
        });
      }
    }

    // Garantir que apenas um telefone seja primary
    if (contactData.phones && contactData.phones.length > 0) {
      const primaryPhones = contactData.phones.filter((p) => p.isPrimary);
      if (primaryPhones.length > 1) {
        // Manter apenas o primeiro como primary
        let firstPrimaryFound = false;
        contactData.phones.forEach((p) => {
          if (p.isPrimary && !firstPrimaryFound) {
            firstPrimaryFound = true;
          } else {
            p.isPrimary = false;
          }
        });
      }
    }

    // Converter birthDate para Date se for string
    const birthDate = contactData.birthDate
      ? contactData.birthDate instanceof Date
        ? contactData.birthDate
        : new Date(contactData.birthDate)
      : undefined;

    // Criar contato e relacionamentos
    const newContact = await tx.contact.create({
      data: {
        tenantId: options.tenantId,
        firstName: contactData.firstName?.trim() || '',
        lastName: contactData.lastName?.trim() || null,
        title: contactData.title?.trim() || null,
        gender: normalizedGender,
        birthDate,
        notes: contactData.notes?.trim() || null,
        status: contactData.status || 'ACTIVE',
        companyId: contactData.companyId || null,
      },
    });

    // Criar emails se fornecidos
    if (normalizedEmails && normalizedEmails.length > 0) {
      await tx.contactEmail.createMany({
        data: normalizedEmails.map((emailData) => ({
          tenantId: options.tenantId,
          contactId: newContact.id,
          email: emailData.email,
          type: emailData.type,
          isPrimary: emailData.isPrimary || false,
        })),
      });
    }

    // Criar telefones se fornecidos
    if (contactData.phones && contactData.phones.length > 0) {
      await tx.contactPhone.createMany({
        data: contactData.phones.map((phoneData) => ({
          tenantId: options.tenantId,
          contactId: newContact.id,
          phone: phoneData.phone.trim(),
          type: phoneData.type,
          isPrimary: phoneData.isPrimary || false,
        })),
      });
    }

    // Criar endereços se fornecidos
    if (contactData.addresses && contactData.addresses.length > 0) {
      await tx.address.createMany({
        data: contactData.addresses.map((addressData) => ({
          tenantId: options.tenantId,
          contactId: newContact.id,
          companyId: null,
          street: addressData.street.trim(),
          city: addressData.city.trim(),
          state: addressData.state.trim(),
          zipCode: addressData.zipCode.trim(),
          country: addressData.country?.trim() || 'Brasil',
          type: addressData.type,
        })),
      });
    }

    // Criar associações de tags se fornecidas
    if (contactData.tagIds && contactData.tagIds.length > 0) {
      await tx.contactTag.createMany({
        data: contactData.tagIds.map((tagId) => ({
          contactId: newContact.id,
          tagId,
        })),
        skipDuplicates: true,
      });
    }

    // Buscar contato criado com relacionamentos
    const contact = await tx.contact.findUnique({
      where: { id: newContact.id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        emails: true,
        phones: true,
        addresses: true,
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!contact) {
      throw new Error('Erro ao criar contato');
    }

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
   * Importa uma empresa com transação
   */
  private static async importCompanyWithTransaction(
    tx: any,
    companyData: CreateCompanyData,
    options: ImportOptions
  ): Promise<Company> {
    // Este método replica a lógica de CompanyService.createCompany mas usando a transação fornecida
    // Validar que id não foi fornecido (gerado automaticamente)
    if ((companyData as any).id !== undefined) {
      throw new Error('O ID é gerado automaticamente e não pode ser fornecido');
    }

    // Validar nome da empresa
    if (!companyData.name || companyData.name.trim().length === 0) {
      throw new Error('Nome da empresa é obrigatório');
    }

    // Validar website se fornecido
    if (companyData.website) {
      // Simples validação de formato de URL
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      if (!urlRegex.test(companyData.website)) {
        throw new Error(`Website inválido: ${companyData.website}`);
      }
    }

    // Validar industry se fornecido
    if (companyData.industry) {
      // Validar tamanho máximo
      if (companyData.industry.length > 100) {
        throw new Error('Industry deve ter no máximo 100 caracteres');
      }
    }

    // Validar size se fornecido
    if (companyData.size) {
      const validSizes = ['UNKNOWN', 'MICRO', 'SMALL', 'MEDIUM', 'ENTERPRISE'];
      if (!validSizes.includes(companyData.size)) {
        throw new Error(`size deve ser um dos valores: ${validSizes.join(', ')}`);
      }
    }

    // Validar status se fornecido
    if (companyData.status) {
      const validStatus = ['ACTIVE', 'INACTIVE', 'PROSPECT', 'CUSTOMER'];
      if (!validStatus.includes(companyData.status)) {
        throw new Error(`status deve ser um dos valores: ${validStatus.join(', ')}`);
      }
    }

    // Validar tagIds se fornecidos
    if (companyData.tagIds && companyData.tagIds.length > 0) {
      const tags = await tx.tag.findMany({
        where: {
          id: { in: companyData.tagIds },
          tenantId: options.tenantId, // Garantir que tags pertencem ao tenant
        },
      });

      if (tags.length !== companyData.tagIds.length) {
        throw new Error('Uma ou mais tags não foram encontradas ou não pertencem ao tenant');
      }
    }

    // Criar empresa e relacionamentos
    const newCompany = await tx.company.create({
      data: {
        tenantId: options.tenantId,
        name: companyData.name.trim(),
        website: companyData.website?.trim() || null,
        industry: companyData.industry?.trim() || null,
        size: companyData.size || 'SMALL',
        status: companyData.status || 'ACTIVE',
      },
    });

    // Criar endereços se fornecidos
    if (companyData.addresses && companyData.addresses.length > 0) {
      await tx.address.createMany({
        data: companyData.addresses.map((addressData) => ({
          tenantId: options.tenantId,
          contactId: null,
          companyId: newCompany.id,
          street: addressData.street.trim(),
          city: addressData.city.trim(),
          state: addressData.state.trim(),
          zipCode: addressData.zipCode.trim(),
          country: addressData.country?.trim() || 'Brasil',
          type: addressData.type,
        })),
      });
    }

    // Criar associações de tags se fornecidas
    if (companyData.tagIds && companyData.tagIds.length > 0) {
      await tx.companyTag.createMany({
        data: companyData.tagIds.map((tagId) => ({
          companyId: newCompany.id,
          tagId,
        })),
        skipDuplicates: true,
      });
    }

    // Buscar empresa criada com relacionamentos
    const company = await tx.company.findUnique({
      where: { id: newCompany.id },
      include: {
        addresses: true,
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!company) {
      throw new Error('Erro ao criar empresa');
    }

    // Ensure required fields are defined
    return {
      ...company,
      website: company.website || null,
      industry: company.industry || null,
      size: company.size || null,
      deletedAt: company.deletedAt || null
    };
  }

}