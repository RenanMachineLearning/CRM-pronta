/**
 * Validação e processamento de valores por tipo de campo
 * 
 * Separação explícita entre:
 * - Processamento: conversão de tipos (string → number, string → Date, etc.)
 * - Validação: regras de negócio (min/max, maxLength, opções válidas, etc.)
 * 
 * Regra de ouro:
 * - Processamento não valida regras de negócio
 * - Validação não converte valores
 * - Cada etapa faz só uma coisa
 */

import { FieldResponse } from '../services/fieldService';

// Tipos e interfaces
export type ProcessResult =
  | { ok: true; value: any }
  | { ok: false; error: string };

// Schema de options por tipo (documentado, não validado rigidamente na V1)
export type FieldOptionsByType = {
  text?: { maxLength?: number };
  number?: { min?: number; max?: number };
  date?: { dateFormat?: string };
  select?: Array<{ value: string; label: string; color?: string }>;
  lookup?: { entityId?: string }; // Apenas para referência, não valida existência na V1
};

// Exceção customizada para erros de validação
export class FieldValidationError extends Error {
  constructor(
    public fieldName: string,
    public fieldLabel: string,
    message: string
  ) {
    super(message);
    this.name = 'FieldValidationError';
    // Manter stack trace para debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FieldValidationError);
    }
  }
}

// Regex para validar UUID v4
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Trata valores nulos (null/undefined)
 * 
 * @param field - Campo a ser validado
 * @param value - Valor a ser verificado
 * @returns true se valor nulo é válido (campo opcional), false se inválido (campo obrigatório)
 */
function handleNullValue(field: FieldResponse, value: any): boolean {
  if (value === null || value === undefined) {
    if (field.required) {
      throw new FieldValidationError(
        field.name,
        field.label,
        `Campo '${field.label}' é obrigatório`
      );
    }
    return true; // Valor nulo é válido para campos opcionais
  }
  return false; // Valor não é nulo, continuar validação
}

// ============================================================================
// PROCESSADORES (Conversão de tipos apenas)
// ============================================================================

/**
 * Processa valor do tipo text (converte para string se necessário)
 */
function processText(_field: FieldResponse, value: any): ProcessResult {
  // Valores nulos são tratados antes de chamar processadores
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }

  // Se já é string, retornar como está
  if (typeof value === 'string') {
    return { ok: true, value };
  }

  // Tentar converter para string
  try {
    const stringValue = String(value);
    return { ok: true, value: stringValue };
  } catch (error) {
    return {
      ok: false,
      error: `Não foi possível converter valor para string`,
    };
  }
}

/**
 * Processa valor do tipo number (converte string para número)
 */
function processNumber(_field: FieldResponse, value: any): ProcessResult {
  // Valores nulos são tratados antes de chamar processadores
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }

  // Se já é número, retornar como está
  if (typeof value === 'number') {
    if (isNaN(value)) {
      return {
        ok: false,
        error: `Valor não é um número válido`,
      };
    }
    return { ok: true, value };
  }

  // Se é string, tentar converter para número
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return { ok: true, value: null }; // String vazia vira null
    }

    const numValue = Number(trimmed);
    if (isNaN(numValue)) {
      return {
        ok: false,
        error: `'${trimmed}' não é um número válido`,
      };
    }
    return { ok: true, value: numValue };
  }

  return {
    ok: false,
    error: `Valor deve ser um número ou string numérica`,
  };
}

/**
 * Processa valor do tipo date (converte string ISO 8601/timestamp para Date)
 */
function processDate(_field: FieldResponse, value: any): ProcessResult {
  // Valores nulos são tratados antes de chamar processadores
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }

  // Se já é Date, retornar como está
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return {
        ok: false,
        error: `Data inválida`,
      };
    }
    return { ok: true, value };
  }

  // Se é número (timestamp), converter para Date
  if (typeof value === 'number') {
    const dateValue = new Date(value);
    if (isNaN(dateValue.getTime())) {
      return {
        ok: false,
        error: `Timestamp inválido: ${value}`,
      };
    }
    return { ok: true, value: dateValue };
  }

  // Se é string, tentar converter para Date (ISO 8601)
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return { ok: true, value: null }; // String vazia vira null
    }

    const dateValue = new Date(trimmed);
    if (isNaN(dateValue.getTime())) {
      return {
        ok: false,
        error: `'${trimmed}' não é uma data válida (formato esperado: ISO 8601)`,
      };
    }
    return { ok: true, value: dateValue };
  }

  return {
    ok: false,
    error: `Valor deve ser uma data (Date, string ISO 8601 ou timestamp)`,
  };
}

/**
 * Processa valor do tipo boolean (converte string "true"/"false" para boolean)
 */
function processBoolean(_field: FieldResponse, value: any): ProcessResult {
  // Valores nulos são tratados antes de chamar processadores
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }

  // Se já é boolean, retornar como está
  if (typeof value === 'boolean') {
    return { ok: true, value };
  }

  // Se é string, tentar converter para boolean
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true' || trimmed === '1') {
      return { ok: true, value: true };
    }
    if (trimmed === 'false' || trimmed === '0' || trimmed === '') {
      return { ok: true, value: false };
    }
    return {
      ok: false,
      error: `'${value}' não pode ser convertido para boolean (valores aceitos: true, false, "true", "false", "1", "0")`,
    };
  }

  // Se é número, converter 0/1 para boolean
  if (typeof value === 'number') {
    return { ok: true, value: value !== 0 };
  }

  return {
    ok: false,
    error: `Valor deve ser um boolean (true/false) ou string "true"/"false"`,
  };
}

/**
 * Processa valor do tipo select (mantém como string)
 */
function processSelect(_field: FieldResponse, value: any): ProcessResult {
  // Valores nulos são tratados antes de chamar processadores
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }

  // Select sempre retorna string (valor da opção)
  if (typeof value === 'string') {
    return { ok: true, value };
  }

  // Tentar converter para string
  try {
    const stringValue = String(value);
    return { ok: true, value: stringValue };
  } catch (error) {
    return {
      ok: false,
      error: `Não foi possível converter valor para string`,
    };
  }
}

/**
 * Processa valor do tipo lookup (mantém como string, valida formato UUID depois)
 */
function processLookup(_field: FieldResponse, value: any): ProcessResult {
  // Valores nulos são tratados antes de chamar processadores
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }

  // Lookup sempre retorna string (UUID)
  if (typeof value === 'string') {
    return { ok: true, value };
  }

  // Tentar converter para string
  try {
    const stringValue = String(value);
    return { ok: true, value: stringValue };
  } catch (error) {
    return {
      ok: false,
      error: `Não foi possível converter valor para string`,
    };
  }
}

// ============================================================================
// VALIDADORES (Regras de negócio apenas)
// ============================================================================

/**
 * Valida valor do tipo text (maxLength)
 */
function validateText(field: FieldResponse, processedValue: any): void {
  // Valores nulos já foram tratados antes
  if (processedValue === null || processedValue === undefined) {
    return;
  }

  // Validar que é string
  if (typeof processedValue !== 'string') {
    throw new FieldValidationError(
      field.name,
      field.label,
      `Campo '${field.label}' deve ser uma string`
    );
  }

  // Validar maxLength se presente em options
  const options = field.options as FieldOptionsByType['text'] | undefined;
  if (options?.maxLength !== undefined) {
    if (processedValue.length > options.maxLength) {
      throw new FieldValidationError(
        field.name,
        field.label,
        `Campo '${field.label}' excede o tamanho máximo de ${options.maxLength} caracteres (atual: ${processedValue.length})`
      );
    }
  }
}

/**
 * Valida valor do tipo number (min/max)
 */
function validateNumber(field: FieldResponse, processedValue: any): void {
  // Valores nulos já foram tratados antes
  if (processedValue === null || processedValue === undefined) {
    return;
  }

  // Validar que é número
  if (typeof processedValue !== 'number' || isNaN(processedValue)) {
    throw new FieldValidationError(
      field.name,
      field.label,
      `Campo '${field.label}' deve ser um número válido`
    );
  }

  // Validar min/max se presentes em options
  const options = field.options as FieldOptionsByType['number'] | undefined;
  if (options?.min !== undefined && processedValue < options.min) {
    throw new FieldValidationError(
      field.name,
      field.label,
      `Campo '${field.label}' deve ser maior ou igual a ${options.min} (valor atual: ${processedValue})`
    );
  }
  if (options?.max !== undefined && processedValue > options.max) {
    throw new FieldValidationError(
      field.name,
      field.label,
      `Campo '${field.label}' deve ser menor ou igual a ${options.max} (valor atual: ${processedValue})`
    );
  }
}

/**
 * Valida valor do tipo date (data válida)
 */
function validateDate(field: FieldResponse, processedValue: any): void {
  // Valores nulos já foram tratados antes
  if (processedValue === null || processedValue === undefined) {
    return;
  }

  // Validar que é Date válida
  if (!(processedValue instanceof Date) || isNaN(processedValue.getTime())) {
    throw new FieldValidationError(
      field.name,
      field.label,
      `Campo '${field.label}' deve ser uma data válida`
    );
  }
}

/**
 * Valida valor do tipo boolean (true/false)
 */
function validateBoolean(field: FieldResponse, processedValue: any): void {
  // Valores nulos já foram tratados antes
  if (processedValue === null || processedValue === undefined) {
    return;
  }

  // Validar que é boolean
  if (typeof processedValue !== 'boolean') {
    throw new FieldValidationError(
      field.name,
      field.label,
      `Campo '${field.label}' deve ser um boolean (true/false)`
    );
  }
}

/**
 * Valida valor do tipo select (valor nas opções)
 */
function validateSelect(field: FieldResponse, processedValue: any): void {
  // Valores nulos já foram tratados antes
  if (processedValue === null || processedValue === undefined) {
    return;
  }

  // Validar que é string
  if (typeof processedValue !== 'string') {
    throw new FieldValidationError(
      field.name,
      field.label,
      `Campo '${field.label}' deve ser uma string`
    );
  }

  // Validar que opções existem
  const options = field.options as FieldOptionsByType['select'] | undefined;
  if (!options || !Array.isArray(options) || options.length === 0) {
    throw new FieldValidationError(
      field.name,
      field.label,
      `Campo '${field.label}' não tem opções definidas`
    );
  }

  // Validar que valor está nas opções
  const validValues = options.map((opt) => opt.value);
  if (!validValues.includes(processedValue)) {
    const validValuesStr = validValues.join(', ');
    throw new FieldValidationError(
      field.name,
      field.label,
      `Campo '${field.label}' deve ser uma das opções: ${validValuesStr} (valor atual: ${processedValue})`
    );
  }
}

/**
 * Valida valor do tipo lookup (UUID v4 válido)
 * 
 * V1: Apenas valida formato UUID, não valida existência no banco
 */
function validateLookup(field: FieldResponse, processedValue: any): void {
  // Valores nulos já foram tratados antes
  if (processedValue === null || processedValue === undefined) {
    return;
  }

  // Validar que é string
  if (typeof processedValue !== 'string') {
    throw new FieldValidationError(
      field.name,
      field.label,
      `Campo '${field.label}' deve ser uma string (UUID)`
    );
  }

  // Validar formato UUID v4
  if (!UUID_V4_REGEX.test(processedValue)) {
    throw new FieldValidationError(
      field.name,
      field.label,
      `Campo '${field.label}' deve ser um UUID válido (formato: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)`
    );
  }

  // V1: NÃO validar existência no banco (performance, bulk inserts, dependências circulares)
}

// ============================================================================
// FUNÇÕES PÚBLICAS (Orquestradores)
// ============================================================================

/**
 * Processa valor (conversão de tipos apenas)
 * 
 * @param field - Campo a ser processado
 * @param value - Valor a ser processado
 * @returns ProcessResult com valor processado ou erro
 */
export function processFieldValue(field: FieldResponse, value: any): ProcessResult {
  // Tratar valores nulos primeiro
  const isNullValid = handleNullValue(field, value);
  if (isNullValid) {
    return { ok: true, value: null };
  }

  // Chamar processador específico por tipo
  switch (field.type) {
    case 'text':
      return processText(field, value);
    case 'number':
      return processNumber(field, value);
    case 'date':
      return processDate(field, value);
    case 'boolean':
      return processBoolean(field, value);
    case 'select':
      return processSelect(field, value);
    case 'lookup':
      return processLookup(field, value);
    default:
      return {
        ok: false,
        error: `Tipo de campo não suportado: ${field.type}`,
      };
  }
}

/**
 * Valida valor (regras de negócio apenas)
 * 
 * @param field - Campo a ser validado
 * @param processedValue - Valor já processado
 * @returns Valor validado (mesmo valor se válido)
 * @throws FieldValidationError se valor inválido
 */
export function validateFieldValue(field: FieldResponse, processedValue: any): any {
  // Tratar valores nulos primeiro
  const isNullValid = handleNullValue(field, processedValue);
  if (isNullValid) {
    return null;
  }

  // Chamar validador específico por tipo
  switch (field.type) {
    case 'text':
      validateText(field, processedValue);
      break;
    case 'number':
      validateNumber(field, processedValue);
      break;
    case 'date':
      validateDate(field, processedValue);
      break;
    case 'boolean':
      validateBoolean(field, processedValue);
      break;
    case 'select':
      validateSelect(field, processedValue);
      break;
    case 'lookup':
      validateLookup(field, processedValue);
      break;
    default:
      throw new FieldValidationError(
        field.name,
        field.label,
        `Tipo de campo não suportado: ${field.type}`
      );
  }

  // Retornar valor processado se validação passou
  return processedValue;
}

/**
 * Processa e valida valor (combina processamento + validação)
 * 
 * @param field - Campo a ser processado e validado
 * @param value - Valor a ser processado e validado
 * @returns Valor processado e validado
 * @throws FieldValidationError se processamento ou validação falhar
 */
export function processAndValidateFieldValue(field: FieldResponse, value: any): any {
  // Processar valor primeiro
  const processResult = processFieldValue(field, value);
  if (!processResult.ok) {
    // Se processamento falhou, lançar FieldValidationError
    throw new FieldValidationError(
      field.name,
      field.label,
      processResult.error
    );
  }

  // Validar valor processado
  return validateFieldValue(field, processResult.value);
}

