/**
 * Utilitário para validação de linhas de importação
 * 
 * Responsável por:
 * - Validar campos obrigatórios
 * - Validar tipos de campo
 * - Validar formatos específicos
 * - Validar unicidade de campos
 * - Normalizar valores
 * - Retornar erros detalhados
 */

import { ValidationResult, ValidationError, FieldValidationRules, ValidationStats, ErrorSeverity } from '../types/validation.types';
import { ValidationRulesService } from '../services/validationRulesService';
import { normalizeValue, NormalizationOptions } from './valueNormalizer';
import { validateUniqueness } from '../services/uniquenessValidator';
import { validateBusinessRules } from '../services/businessRuleValidator';

/**
 * Valida uma linha de dados de importação
 */
export async function validateImportRow(
  row: Record<string, any>,
  entityType: string,
  fieldRules: Record<string, FieldValidationRules>,
  tenantId: string,
  userId?: string,
  normalizationOptions?: Partial<NormalizationOptions>
): Promise<ValidationResult> {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const normalizedData: Record<string, any> = {};

  // Valida campos obrigatórios
  const requiredFieldErrors = await validateRequiredFields(row, fieldRules);
  errors.push(...requiredFieldErrors);

  // Valida tipos e formatos de campos
  const typeFormatErrors = await validateTypesAndFormats(row, fieldRules, normalizedData, normalizationOptions);
  errors.push(...typeFormatErrors);

  // Valida unicidade de campos (somente se não houver erros de tipo/formato)
  if (errors.length === 0) {
    const uniquenessErrors = await validateUniquenessFields(row, fieldRules, entityType, tenantId, userId);
    errors.push(...uniquenessErrors);
  }

  // Valida regras de negócio
  const businessRuleErrors = await validateBusinessRules(row, entityType, tenantId);
  errors.push(...businessRuleErrors);

  // Calcula estatísticas
  const stats: ValidationStats = {
    totalFields: Object.keys(row).length,
    validFields: Object.keys(row).length - errors.length,
    invalidFields: errors.length,
    errorCount: errors.length,
    warningCount: warnings.length,
    processingTimeMs: Date.now() - startTime,
    normalizationApplied: Object.keys(normalizedData).length
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    normalizedData,
    stats
  };
}

/**
 * Valida campos obrigatórios
 */
async function validateRequiredFields(
  row: Record<string, any>,
  fieldRules: Record<string, FieldValidationRules>
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  for (const [fieldName, rule] of Object.entries(fieldRules)) {
    if (rule.required) {
      const value = row[fieldName];
      
      // Verifica se o campo está presente e tem um valor válido
      if (value === undefined || value === null || value === '') {
        errors.push({
          field: fieldName,
          code: 'REQUIRED',
          message: `Campo obrigatório "${fieldName}" está vazio`,
          severity: 'error',
          value: value
        });
      }
    }
  }

  return errors;
}

/**
 * Valida tipos e formatos de campos
 */
async function validateTypesAndFormats(
  row: Record<string, any>,
  fieldRules: Record<string, FieldValidationRules>,
  normalizedData: Record<string, any>,
  normalizationOptions?: Partial<NormalizationOptions>
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  for (const [fieldName, rule] of Object.entries(fieldRules)) {
    const value = row[fieldName];

    // Se o valor for indefinido ou nulo e o campo não for obrigatório, pula a validação
    if ((value === undefined || value === null) && !rule.required) {
      continue;
    }

    // Se o campo não existir na linha, pula a validação (já foi verificado nos campos obrigatórios)
    if (!(fieldName in row)) {
      continue;
    }

    // Valida tipo do campo
    if (rule.type) {
      const typeValidationResult = validateFieldType(value, rule.type, fieldName);
      if (!typeValidationResult.isValid) {
        errors.push(typeValidationResult.error!);
        continue; // Se o tipo for inválido, não precisa validar formato
      }

      // Se a validação do tipo for válida, aplica normalização e continua com validação de formato
      try {
        const normalizedValue = normalizeValue(value, rule.type, normalizationOptions);
        normalizedData[fieldName] = normalizedValue;

        const formatValidationResult = validateFieldFormat(normalizedValue, rule, fieldName);
        if (!formatValidationResult.isValid) {
          errors.push(formatValidationResult.error!);
        }
      } catch (normalizationError) {
        errors.push({
          field: fieldName,
          code: 'VALUE_CONVERSION_ERROR',
          message: `Erro ao normalizar valor do campo "${fieldName}": ${(normalizationError as Error).message}`,
          severity: 'error',
          value: value,
          details: { originalError: (normalizationError as Error).message }
        });
      }
    }
  }

  return errors;
}

/**
 * Valida o tipo de um campo
 */
function validateFieldType(
  value: any,
  fieldType: string,
  fieldName: string
): { isValid: boolean; error?: ValidationError } {
  if (value === null || value === undefined) {
    return { isValid: true }; // Validação de tipo não se aplica a valores nulos (validado separadamente)
  }

  switch (fieldType) {
    case 'text':
    case 'textarea':
      if (typeof value !== 'string') {
        return {
          isValid: false,
          error: {
            field: fieldName,
            code: 'INVALID_TYPE',
            message: `Campo "${fieldName}" deve ser do tipo texto, mas recebeu ${typeof value}`,
            severity: 'error',
            value: value,
            expectedType: 'string'
          }
        };
      }
      break;

    case 'number':
      if (typeof value !== 'number' && isNaN(Number(value))) {
        return {
          isValid: false,
          error: {
            field: fieldName,
            code: 'INVALID_TYPE',
            message: `Campo "${fieldName}" deve ser do tipo número, mas recebeu "${value}" (${typeof value})`,
            severity: 'error',
            value: value,
            expectedType: 'number'
          }
        };
      }
      break;

    case 'date':
      if (typeof value !== 'string' && !(value instanceof Date)) {
        // Tenta converter para Date para verificação
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return {
            isValid: false,
            error: {
              field: fieldName,
              code: 'INVALID_TYPE',
              message: `Campo "${fieldName}" deve ser uma data válida`,
              severity: 'error',
              value: value,
              expectedType: 'date'
            }
          };
        }
      }
      break;

    case 'datetime':
      if (typeof value !== 'string' && !(value instanceof Date)) {
        // Tenta converter para Date para verificação
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return {
            isValid: false,
            error: {
              field: fieldName,
              code: 'INVALID_TYPE',
              message: `Campo "${fieldName}" deve ser uma data/hora válida`,
              severity: 'error',
              value: value,
              expectedType: 'datetime'
            }
          };
        }
      }
      break;

    case 'email':
      if (typeof value !== 'string') {
        return {
          isValid: false,
          error: {
            field: fieldName,
            code: 'INVALID_TYPE',
            message: `Campo "${fieldName}" deve ser do tipo texto (email)`,
            severity: 'error',
            value: value,
            expectedType: 'string'
          }
        };
      }
      break;

    case 'phone':
      if (typeof value !== 'string') {
        return {
          isValid: false,
          error: {
            field: fieldName,
            code: 'INVALID_TYPE',
            message: `Campo "${fieldName}" deve ser do tipo texto (telefone)`,
            severity: 'error',
            value: value,
            expectedType: 'string'
          }
        };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        // Aceita valores que podem ser convertidos para boolean
        const stringValue = String(value).toLowerCase();
        if (!['true', 'false', '1', '0', 'yes', 'no', 'sim', 'não', 'nao'].includes(stringValue)) {
          return {
            isValid: false,
            error: {
              field: fieldName,
              code: 'INVALID_TYPE',
              message: `Campo "${fieldName}" deve ser do tipo booleano`,
              severity: 'error',
              value: value,
              expectedType: 'boolean'
            }
          };
        }
      }
      break;

    case 'select':
      if (typeof value !== 'string') {
        return {
          isValid: false,
          error: {
            field: fieldName,
            code: 'INVALID_TYPE',
            message: `Campo "${fieldName}" deve ser do tipo texto (opção selecionada)`,
            severity: 'error',
            value: value,
            expectedType: 'string'
          }
        };
      }
      break;

    case 'multiselect':
      if (!Array.isArray(value) && typeof value !== 'string') {
        return {
          isValid: false,
          error: {
            field: fieldName,
            code: 'INVALID_TYPE',
            message: `Campo "${fieldName}" deve ser uma lista de opções ou texto separado por vírgula`,
            severity: 'error',
            value: value,
            expectedType: 'array or string'
          }
        };
      }
      break;

    case 'currency':
    case 'percentage':
      if (typeof value !== 'number' && isNaN(Number(value))) {
        return {
          isValid: false,
          error: {
            field: fieldName,
            code: 'INVALID_TYPE',
            message: `Campo "${fieldName}" deve ser do tipo número`,
            severity: 'error',
            value: value,
            expectedType: 'number'
          }
        };
      }
      break;

    case 'url':
      if (typeof value !== 'string') {
        return {
          isValid: false,
          error: {
            field: fieldName,
            code: 'INVALID_TYPE',
            message: `Campo "${fieldName}" deve ser do tipo texto (URL)`,
            severity: 'error',
            value: value,
            expectedType: 'string'
          }
        };
      }
      break;

    case 'relationship':
      // Aceita string (ID) ou objeto com ID
      if (typeof value !== 'string' && typeof value !== 'object') {
        return {
          isValid: false,
          error: {
            field: fieldName,
            code: 'INVALID_TYPE',
            message: `Campo "${fieldName}" deve ser uma referência a uma entidade relacionada`,
            severity: 'error',
            value: value,
            expectedType: 'string or object'
          }
        };
      }
      break;

    default:
      // Para tipos desconhecidos, apenas verifica se o valor existe
      break;
  }

  return { isValid: true };
}

/**
 * Valida o formato de um campo
 */
function validateFieldFormat(
  value: any,
  rule: FieldValidationRules,
  fieldName: string
): { isValid: boolean; error?: ValidationError } {
  if (value === null || value === undefined) {
    return { isValid: true }; // Validação de formato não se aplica a valores nulos
  }

  // Validações de comprimento para strings
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return {
        isValid: false,
        error: {
          field: fieldName,
          code: 'TOO_SHORT',
          message: `Campo "${fieldName}" deve ter pelo menos ${rule.minLength} caracteres`,
          severity: 'error',
          value: value,
          details: { minLength: rule.minLength, actualLength: value.length }
        }
      };
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return {
        isValid: false,
        error: {
          field: fieldName,
          code: 'TOO_LONG',
          message: `Campo "${fieldName}" não pode ter mais de ${rule.maxLength} caracteres`,
          severity: 'error',
          value: value,
          details: { maxLength: rule.maxLength, actualLength: value.length }
        }
      };
    }
  }

  // Validações específicas por tipo
  switch (rule.type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value === 'string' && !emailRegex.test(value)) {
        return {
          isValid: false,
          error: {
            field: fieldName,
            code: 'INVALID_FORMAT',
            message: `Campo "${fieldName}" não é um email válido`,
            severity: 'error',
            value: value,
            details: { format: 'email' }
          }
        };
      }
      break;

    case 'url':
      try {
        new URL(value);
      } catch {
        return {
          isValid: false,
          error: {
            field: fieldName,
            code: 'INVALID_FORMAT',
            message: `Campo "${fieldName}" não é uma URL válida`,
            severity: 'error',
            value: value,
            details: { format: 'url' }
          }
        };
      }
      break;

    case 'date':
      // Validação adicional de formato de data
      if (typeof value === 'string') {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return {
            isValid: false,
            error: {
              field: fieldName,
              code: 'INVALID_FORMAT',
              message: `Campo "${fieldName}" não é uma data válida`,
              severity: 'error',
              value: value,
              details: { format: 'date' }
            }
          };
        }
      }
      break;

    case 'number':
      if (typeof value === 'number') {
        if (rule.minValue !== undefined && value < rule.minValue) {
          return {
            isValid: false,
            error: {
              field: fieldName,
              code: 'OUT_OF_RANGE',
              message: `Campo "${fieldName}" deve ser maior ou igual a ${rule.minValue}`,
              severity: 'error',
              value: value,
              details: { minValue: rule.minValue, actualValue: value }
            }
          };
        }

        if (rule.maxValue !== undefined && value > rule.maxValue) {
          return {
            isValid: false,
            error: {
              field: fieldName,
              code: 'OUT_OF_RANGE',
              message: `Campo "${fieldName}" deve ser menor ou igual a ${rule.maxValue}`,
              severity: 'error',
              value: value,
              details: { maxValue: rule.maxValue, actualValue: value }
            }
          };
        }
      }
      break;

    case 'select':
      if (rule.options && rule.options.length > 0) {
        if (typeof value === 'string' && !rule.options.includes(value)) {
          return {
            isValid: false,
            error: {
              field: fieldName,
              code: 'INVALID_FORMAT',
              message: `Campo "${fieldName}" tem valor inválido. Valores permitidos: ${rule.options.join(', ')}`,
              severity: 'error',
              value: value,
              details: { allowedOptions: rule.options }
            }
          };
        }
      }
      break;

    case 'multiselect':
      if (rule.options && rule.options.length > 0) {
        const values = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
        const invalidValues = values.filter(v => !rule.options!.includes(v));
        if (invalidValues.length > 0) {
          return {
            isValid: false,
            error: {
              field: fieldName,
              code: 'INVALID_FORMAT',
              message: `Campo "${fieldName}" contém valores inválidos: ${invalidValues.join(', ')}. Valores permitidos: ${rule.options.join(', ')}`,
              severity: 'error',
              value: value,
              details: { allowedOptions: rule.options, invalidValues }
            }
          };
        }
      }
      break;

    case 'pattern':
      if (rule.pattern) {
        const pattern = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
        if (typeof value === 'string' && !pattern.test(value)) {
          return {
            isValid: false,
            error: {
              field: fieldName,
              code: 'PATTERN_MISMATCH',
              message: `Campo "${fieldName}" não corresponde ao padrão esperado`,
              severity: 'error',
              value: value,
              details: { pattern: rule.pattern.toString() }
            }
          };
        }
      }
      break;
  }

  return { isValid: true };
}

/**
 * Valida campos únicos
 */
async function validateUniquenessFields(
  row: Record<string, any>,
  fieldRules: Record<string, FieldValidationRules>,
  entityType: string,
  tenantId: string,
  userId?: string
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  for (const [fieldName, rule] of Object.entries(fieldRules)) {
    if (rule.unique) {
      const value = row[fieldName];
      
      // Só valida unicidade se o campo tiver um valor
      if (value !== undefined && value !== null && value !== '') {
        const uniquenessResult = await validateUniqueness(
          value,
          fieldName,
          entityType,
          tenantId,
          userId
        );

        if (!uniquenessResult.isUnique) {
          errors.push({
            field: fieldName,
            code: 'NOT_UNIQUE',
            message: `Valor "${value}" para o campo "${fieldName}" já existe e deve ser único`,
            severity: 'error',
            value: value,
            details: { conflictingIds: uniquenessResult.conflictingIds }
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Função auxiliar para validação rápida de várias linhas
 */
export async function validateImportRows(
  rows: Record<string, any>[],
  entityType: string,
  tenantId: string,
  userId?: string,
  normalizationOptions?: Partial<NormalizationOptions>
): Promise<ValidationResult[]> {
  // Recupera as regras de validação uma vez para todas as linhas
  const fieldRules = await ValidationRulesService.getValidationRules(entityType, tenantId);

  // Valida cada linha
  const results = await Promise.all(
    rows.map(row => validateImportRow(row, entityType, fieldRules, tenantId, userId, normalizationOptions))
  );

  return results;
}

/**
 * Validação simplificada para um campo específico
 */
export async function validateField(
  value: any,
  fieldName: string,
  entityType: string,
  tenantId: string,
  userId?: string
): Promise<{ isValid: boolean; errors: ValidationError[] }> {
  // Recupera as regras de validação para o campo específico
  const fieldRules = await ValidationRulesService.getValidationRules(entityType, tenantId, [fieldName]);

  if (!fieldRules[fieldName]) {
    return {
      isValid: false,
      errors: [{
        field: fieldName,
        code: 'INVALID_FIELD',
        message: `Campo "${fieldName}" não encontrado na entidade "${entityType}"`,
        severity: 'error',
        value: value
      }]
    };
  }

  // Cria uma linha com apenas o campo a ser validado
  const row: Record<string, any> = { [fieldName]: value };
  const result = await validateImportRow(
    row,
    entityType,
    fieldRules,
    tenantId,
    userId
  );

  return {
    isValid: result.isValid,
    errors: result.errors
  };
}