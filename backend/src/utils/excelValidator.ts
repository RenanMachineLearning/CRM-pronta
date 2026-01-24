/**
 * Utilitário para validação de dados Excel
 * 
 * Responsável por:
 * - Validar formato de arquivos Excel (XLSX/XLS)
 * - Validar conteúdo e estrutura do arquivo
 * - Verificar integridade do arquivo
 * - Validar dados semelhante ao validador de CSV
 */

import { ValidationError } from './csvValidator';
import { prisma } from '../utils/prisma';

export interface ExcelValidationOptions {
  requiredFields?: string[];
  fieldValidators?: { [fieldName: string]: (value: any) => boolean | Promise<boolean> };
  tenantId: string;
  entityType: 'contact' | 'company' | 'lead' | 'opportunity'; // Tipo de entidade sendo importada
  maxFileSize?: number; // Tamanho máximo do arquivo em bytes (padrão: 10MB)
}

// Extensão da interface de erro para validação Excel
export interface ExcelValidationError extends ValidationError {
  sheetName?: string; // Nome da planilha onde ocorreu o erro
}

/**
 * Valida um arquivo Excel quanto à sua integridade e formato
 */
export async function validateExcelFile(
  fileBuffer: Buffer,
  fileName: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  let valid = true;

  // Verificar tamanho do arquivo (padrão: 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileBuffer.length > maxSize) {
    errors.push(`Arquivo muito grande. Tamanho máximo permitido: ${maxSize / (1024 * 1024)}MB`);
    valid = false;
  }

  // Verificar extensão do arquivo
  const validExtensions = ['.xlsx', '.xls'];
  const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
  if (!validExtensions.includes(fileExtension)) {
    errors.push(`Extensão de arquivo inválida. Apenas ${validExtensions.join(', ')} são permitidos.`);
    valid = false;
  }

  // Verificar se é um arquivo Excel válido
  try {
    // Importar dinamicamente para evitar problemas de ciclo
    const { isValidExcelBuffer } = await import('./excelParser');
    if (!isValidExcelBuffer(fileBuffer)) {
      errors.push('O arquivo não é um arquivo Excel válido ou está corrompido.');
      valid = false;
    }
  } catch (error) {
    errors.push(`Erro ao validar o arquivo Excel: ${(error as Error).message}`);
    valid = false;
  }

  return { valid, errors };
}

/**
 * Valida dados de um arquivo Excel
 */
export async function validateExcelData(
  data: any[],
  sheetName: string,
  options: ExcelValidationOptions
): Promise<{ valid: boolean; errors: ExcelValidationError[] }> {
  const errors: ExcelValidationError[] = [];
  let isValid = true;

  // Verificar campos obrigatórios
  if (options.requiredFields) {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      for (const requiredField of options.requiredFields) {
        if (!row.hasOwnProperty(requiredField) || row[requiredField] === null || row[requiredField] === undefined || row[requiredField] === '') {
          errors.push({
            rowIndex: i,
            field: requiredField,
            value: row[requiredField],
            message: `Campo obrigatório ${requiredField} está ausente ou vazio`,
            sheetName
          });
          isValid = false;
        }
      }
    }
  }

  // Validar campos individuais
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const fieldNames = Object.keys(row);

    for (const fieldName of fieldNames) {
      const fieldValue = row[fieldName];
      const error = await validateExcelField(fieldName, fieldValue, options.fieldValidators || {}, i, sheetName);
      if (error) {
        errors.push(error);
        isValid = false;
      }
    }
  }

  // Validar relacionamentos e duplicatas
  if (options.entityType === 'contact') {
    const contactErrors = await validateContactRelations(data, options.tenantId, sheetName);
    if (contactErrors.length > 0) {
      errors.push(...contactErrors);
      isValid = false;
    }
  } else if (options.entityType === 'company') {
    const companyErrors = await validateCompanyRelations(data, options.tenantId, sheetName);
    if (companyErrors.length > 0) {
      errors.push(...companyErrors);
      isValid = false;
    }
  }

  return { valid: isValid, errors };
}

/**
 * Valida um campo individual em um arquivo Excel
 */
async function validateExcelField(
  fieldName: string,
  value: any,
  validators: { [fieldName: string]: (value: any) => boolean | Promise<boolean> },
  rowIndex: number,
  sheetName: string
): Promise<ExcelValidationError | null> {
  // Verificar validador personalizado primeiro
  if (validators[fieldName]) {
    try {
      const isValid = await Promise.resolve(validators[fieldName](value));
      if (!isValid) {
        return {
          rowIndex,
          field: fieldName,
          value,
          message: `Valor inválido para o campo ${fieldName}: ${value}`,
          sheetName
        };
      }
    } catch (error) {
      return {
        rowIndex,
        field: fieldName,
        value,
        message: `Erro ao validar campo ${fieldName}: ${(error as Error).message}`,
        sheetName
      };
    }
  }

  // Verificar validador padrão (reutilizando os do CSV)
  const { DEFAULT_FIELD_VALIDATORS } = await import('./csvValidator');
  const defaultValidator = DEFAULT_FIELD_VALIDATORS[fieldName.toLowerCase()];
  if (defaultValidator) {
    if (!defaultValidator(value)) {
      return {
        rowIndex,
        field: fieldName,
        value,
        message: `Formato inválido para o campo ${fieldName}: ${value}`,
        sheetName
      };
    }
  }

  return null;
}

/**
 * Valida relacionamentos para contatos em dados Excel
 */
async function validateContactRelations(data: any[], tenantId: string, sheetName: string): Promise<ExcelValidationError[]> {
  const errors: ExcelValidationError[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // Se houver companyId, verificar se a empresa existe no tenant
    if (row.companyId) {
      const companyExists = await prisma.company.findFirst({
        where: {
          id: row.companyId,
          tenantId: tenantId
        },
        select: { id: true }
      });

      if (!companyExists) {
        errors.push({
          rowIndex: i,
          field: 'companyId',
          value: row.companyId,
          message: `Empresa com ID ${row.companyId} não encontrada no tenant`,
          sheetName
        });
      }
    }

    // Verificar duplicatas potenciais baseado em email
    if (row.email) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          tenantId,
          emails: {
            some: {
              email: String(row.email).toLowerCase(),
              deletedAt: null
            }
          },
          deletedAt: null
        }
      });

      if (existingContact) {
        errors.push({
          rowIndex: i,
          field: 'email',
          value: row.email,
          message: `Contato com email ${row.email} já existe`,
          sheetName
        });
      }
    }
  }

  return errors;
}

/**
 * Valida relacionamentos para empresas em dados Excel
 */
async function validateCompanyRelations(data: any[], tenantId: string, sheetName: string): Promise<ExcelValidationError[]> {
  const errors: ExcelValidationError[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // Verificar duplicatas potenciais baseado no nome
    if (row.name) {
      const existingCompany = await prisma.company.findFirst({
        where: {
          tenantId,
          name: String(row.name),
          deletedAt: null
        }
      });

      if (existingCompany) {
        errors.push({
          rowIndex: i,
          field: 'name',
          value: row.name,
          message: `Empresa com nome ${row.name} já existe`,
          sheetName
        });
      }
    }
  }

  return errors;
}

/**
 * Valida a estrutura de um arquivo Excel
 */
export async function validateExcelStructure(
  fileBuffer: Buffer,
  options: {
    minSheets?: number;      // Número mínimo de planilhas
    requiredSheets?: string[]; // Nomes de planilhas obrigatórias
    minRows?: number;        // Número mínimo de linhas em cada planilha
    minCols?: number;        // Número mínimo de colunas em cada planilha
  } = {}
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  let valid = true;

  try {
    const { getExcelSheetsMetadata } = await import('./excelParser');
    const sheetsMetadata = await getExcelSheetsMetadata(fileBuffer);

    // Verificar número mínimo de planilhas
    if (options.minSheets !== undefined && sheetsMetadata.length < options.minSheets) {
      errors.push(`Número mínimo de planilhas não atendido. Encontradas: ${sheetsMetadata.length}, necessário: ${options.minSheets}`);
      valid = false;
    }

    // Verificar planilhas obrigatórias
    if (options.requiredSheets) {
      for (const requiredSheet of options.requiredSheets) {
        if (!sheetsMetadata.some(sheet => sheet.name === requiredSheet)) {
          errors.push(`Planilha obrigatória não encontrada: ${requiredSheet}`);
          valid = false;
        }
      }
    }

    // Verificar número mínimo de linhas e colunas em cada planilha
    if (options.minRows !== undefined || options.minCols !== undefined) {
      for (const sheet of sheetsMetadata) {
        if (options.minRows !== undefined && sheet.rowCount < options.minRows) {
          errors.push(`Planilha "${sheet.name}" tem número insuficiente de linhas. Encontradas: ${sheet.rowCount}, necessário: ${options.minRows}`);
          valid = false;
        }
        if (options.minCols !== undefined && sheet.colCount < options.minCols) {
          errors.push(`Planilha "${sheet.name}" tem número insuficiente de colunas. Encontradas: ${sheet.colCount}, necessário: ${options.minCols}`);
          valid = false;
        }
      }
    }
  } catch (error) {
    errors.push(`Erro ao analisar estrutura do arquivo Excel: ${(error as Error).message}`);
    valid = false;
  }

  return { valid, errors };
}