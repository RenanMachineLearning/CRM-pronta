/**
 * Utilitário para validação de dados CSV
 * 
 * Responsável por:
 * - Validar formato de campos (emails, telefones, datas)
 * - Verificar campos obrigatórios
 * - Validar relacionamentos (ex: empresa existente)
 * - Detectar possíveis duplicatas
 */

import { prisma } from '../utils/prisma';
import {
  MissingRequiredFieldError,
  InvalidTypeError,
  DuplicateValueError
} from '../errors/ImportExportError';

export interface ValidationError {
  rowIndex: number;
  field: string;
  value: any;
  message: string;
}

export interface ValidationOptions {
  requiredFields?: string[];
  fieldValidators?: { [fieldName: string]: (value: any) => boolean | Promise<boolean> };
  tenantId: string;
  entityType: 'contact' | 'company' | 'lead' | 'opportunity'; // Tipo de entidade sendo importada
}

// Validadores padrão para diferentes tipos de campos
const DEFAULT_FIELD_VALIDATORS: { [key: string]: (value: any) => boolean } = {
  email: (value: any) => {
    if (!value) return true; // Permitir valores vazios, a menos que sejam obrigatórios
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(value));
  },
  phone: (value: any) => {
    if (!value) return true;
    // Aceitar números com ou sem formatação
    const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
    return phoneRegex.test(String(value));
  },
  date: (value: any) => {
    if (!value) return true;
    // Tentar criar uma data válida
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  },
  url: (value: any) => {
    if (!value) return true;
    try {
      new URL(String(value));
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Valida um campo individual usando o validador apropriado
 */
async function validateField(
  fieldName: string,
  value: any,
  validators: { [fieldName: string]: (value: any) => boolean | Promise<boolean> },
  rowIndex: number
): Promise<ValidationError | null> {
  // Verificar validador personalizado primeiro
  if (validators[fieldName]) {
    try {
      const isValid = await Promise.resolve(validators[fieldName](value));
      if (!isValid) {
        return {
          rowIndex,
          field: fieldName,
          value,
          message: `Valor inválido para o campo ${fieldName}: ${value}`
        };
      }
    } catch (error) {
      return {
        rowIndex,
        field: fieldName,
        value,
        message: `Erro ao validar campo ${fieldName}: ${(error as Error).message}`
      };
    }
  }

  // Verificar validador padrão
  const defaultValidator = DEFAULT_FIELD_VALIDATORS[fieldName.toLowerCase()];
  if (defaultValidator) {
    if (!defaultValidator(value)) {
      return {
        rowIndex,
        field: fieldName,
        value,
        message: `Formato inválido para o campo ${fieldName}: ${value}`
      };
    }
  }

  return null;
}

/**
 * Valida um conjunto de dados CSV
 */
export async function validateCsvData(
  data: any[],
  options: ValidationOptions,
  jobId?: string
): Promise<{ valid: boolean; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];
  let isValid = true;

  // Verificar campos obrigatórios
  if (options.requiredFields) {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      for (const requiredField of options.requiredFields) {
        if (!row.hasOwnProperty(requiredField) || row[requiredField] === null || row[requiredField] === undefined || row[requiredField] === '') {
          const error = new MissingRequiredFieldError(
            requiredField,
            `Campo obrigatório "${requiredField}" está ausente ou vazio`,
            { rowIndex: i, value: row[requiredField] },
            options.tenantId,
            jobId
          );

          errors.push({
            rowIndex: i,
            field: requiredField,
            value: row[requiredField],
            message: error.message
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
      const error = await validateField(fieldName, fieldValue, options.fieldValidators || {}, i);
      if (error) {
        // Se for um erro de tipo inválido, criar erro específico
        if (fieldValue !== undefined && fieldValue !== null) {
          // Verificar se o tipo é compatível com o esperado
          const expectedType = inferExpectedType(fieldName);
          if (expectedType && typeof fieldValue !== expectedType && !isValidTypeMatch(fieldValue, expectedType)) {
            const typeError = new InvalidTypeError(
              fieldName,
              expectedType,
              fieldValue,
              `Tipo inválido para o campo "${fieldName}". Esperado: ${expectedType}, Recebido: ${typeof fieldValue}`,
              { rowIndex: i },
              options.tenantId,
              jobId
            );

            errors.push({
              rowIndex: i,
              field: fieldName,
              value: fieldValue,
              message: typeError.message
            });
            isValid = false;
            continue; // Pular para o próximo campo
          }
        }

        errors.push(error);
        isValid = false;
      }
    }
  }

  // Validar relacionamentos e duplicatas
  if (options.entityType === 'contact') {
    const contactErrors = await validateContactRelations(data, options.tenantId, jobId);
    if (contactErrors.length > 0) {
      errors.push(...contactErrors);
      isValid = false;
    }
  } else if (options.entityType === 'company') {
    const companyErrors = await validateCompanyRelations(data, options.tenantId, jobId);
    if (companyErrors.length > 0) {
      errors.push(...companyErrors);
      isValid = false;
    }
  }

  return { valid: isValid, errors };
}

/**
 * Inferir o tipo esperado com base no nome do campo
 */
function inferExpectedType(fieldName: string): string | null {
  const lowerFieldName = fieldName.toLowerCase();

  if (lowerFieldName.includes('email')) return 'string';
  if (lowerFieldName.includes('phone') || lowerFieldName.includes('tel') || lowerFieldName.includes('cell')) return 'string';
  if (lowerFieldName.includes('date') || lowerFieldName.includes('birth') || lowerFieldName.includes('created') || lowerFieldName.includes('updated')) return 'string';
  if (lowerFieldName.includes('value') || lowerFieldName.includes('price') || lowerFieldName.includes('amount') || lowerFieldName.includes('salary')) return 'number';
  if (lowerFieldName.includes('age') || lowerFieldName.includes('quantity') || lowerFieldName.includes('count')) return 'number';
  if (lowerFieldName.includes('active') || lowerFieldName.includes('enabled') || lowerFieldName.includes('published')) return 'boolean';

  return null;
}

/**
 * Verificar se o tipo é compatível
 */
function isValidTypeMatch(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'number':
      return !isNaN(Number(value));
    case 'boolean':
      return ['true', 'false', '1', '0', true, false, 1, 0].includes(value);
    case 'string':
      return true; // Qualquer valor pode ser convertido para string
    default:
      return typeof value === expectedType;
  }
}

/**
 * Valida relacionamentos para contatos
 */
async function validateContactRelations(data: any[], tenantId: string, jobId?: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

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
          message: `Empresa com ID ${row.companyId} não encontrada no tenant`
        });
      }
    }

    // Verificar duplicatas potenciais baseado em email
    if (row.email) {
      // Procurar por contatos existentes com o mesmo email
      // Isso é uma verificação básica - em produção poderia ser mais sofisticada
      const existingContact = await prisma.contact.findFirst({
        where: {
          tenantId,
          emails: {
            some: {
              email: String(row.email).toLowerCase()
            }
          }
        }
      });

      if (existingContact) {
        const duplicateError = new DuplicateValueError(
          'email',
          row.email,
          `Contato com email ${row.email} já existe`,
          { rowIndex: i, existingContactId: existingContact.id },
          tenantId,
          jobId
        );

        errors.push({
          rowIndex: i,
          field: 'email',
          value: row.email,
          message: duplicateError.message
        });
      }
    }
  }

  return errors;
}

/**
 * Valida relacionamentos para empresas
 */
async function validateCompanyRelations(data: any[], tenantId: string, jobId?: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

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
        const duplicateError = new DuplicateValueError(
          'name',
          row.name,
          `Empresa com nome ${row.name} já existe`,
          { rowIndex: i, existingCompanyId: existingCompany.id },
          tenantId,
          jobId
        );

        errors.push({
          rowIndex: i,
          field: 'name',
          value: row.name,
          message: duplicateError.message
        });
      }
    }
  }

  return errors;
}

/**
 * Valida o formato do arquivo CSV antes do parsing
 */
export function validateCsvFormat(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  let valid = true;

  // Verificar se tem conteúdo
  if (!content || content.trim() === '') {
    errors.push('Arquivo CSV está vazio');
    valid = false;
  }

  if (valid) {
    const lines = content.split('\n');
    
    // Verificar se tem pelo menos cabeçalho e uma linha de dados
    if (lines.length < 2) {
      errors.push('Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados');
      valid = false;
    } else {
      // Verificar se o cabeçalho tem campos
      const headerLine = lines[0];
      if (!headerLine || headerLine.trim() === '') {
        errors.push('Linha de cabeçalho está vazia');
        valid = false;
      }
    }
  }

  return { valid, errors };
}