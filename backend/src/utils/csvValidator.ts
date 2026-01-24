/**
 * Utilitário para validação de dados CSV
 * 
 * Responsável por:
 * - Validar formato de campos (emails, telefones, datas)
 * - Verificar campos obrigatórios
 * - Validar relacionamentos (ex: empresa existente)
 * - Detectar possíveis duplicatas
 */

import { Contact } from '@prisma/client';
import { prisma } from '../utils/prisma';

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
  options: ValidationOptions
): Promise<{ valid: boolean; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];
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
            message: `Campo obrigatório ${requiredField} está ausente ou vazio`
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
        errors.push(error);
        isValid = false;
      }
    }
  }

  // Validar relacionamentos e duplicatas
  if (options.entityType === 'contact') {
    const contactErrors = await validateContactRelations(data, options.tenantId);
    if (contactErrors.length > 0) {
      errors.push(...contactErrors);
      isValid = false;
    }
  } else if (options.entityType === 'company') {
    const companyErrors = await validateCompanyRelations(data, options.tenantId);
    if (companyErrors.length > 0) {
      errors.push(...companyErrors);
      isValid = false;
    }
  }

  return { valid: isValid, errors };
}

/**
 * Valida relacionamentos para contatos
 */
async function validateContactRelations(data: any[], tenantId: string): Promise<ValidationError[]> {
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
          message: `Contato com email ${row.email} já existe`
        });
      }
    }
  }

  return errors;
}

/**
 * Valida relacionamentos para empresas
 */
async function validateCompanyRelations(data: any[], tenantId: string): Promise<ValidationError[]> {
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
        errors.push({
          rowIndex: i,
          field: 'name',
          value: row.name,
          message: `Empresa com nome ${row.name} já existe`
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