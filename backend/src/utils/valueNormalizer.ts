/**
 * Utilitário para normalização de valores
 * 
 * Responsável por:
 * - Converter valores entre diferentes tipos
 * - Sanitizar valores de entrada
 * - Padronizar formatos de dados
 * - Aplicar transformações específicas por tipo
 */

import { NormalizationOptions } from '../types/validation.types';
export { NormalizationOptions };

/**
 * Normaliza um valor de acordo com o tipo de campo
 */
export function normalizeValue(
  value: any,
  fieldType: string,
  options?: Partial<NormalizationOptions>
): any {
  // Opções padrão
  const opts: NormalizationOptions = {
    trimStrings: true,
    lowercaseEmails: true,
    normalizePhone: true,
    convertNumbers: true,
    convertDates: true,
    convertBooleans: true,
    sanitizeHtml: true,
    maxLength: undefined,
    customTransformers: {},
    ...options
  };

  // Se o valor for nulo ou indefinido, retornar como está
  if (value === null || value === undefined) {
    return value;
  }

  // Aplica transformadores personalizados primeiro, se existirem
  if (opts.customTransformers && fieldType in opts.customTransformers) {
    return opts.customTransformers[fieldType](value);
  }

  // Normaliza de acordo com o tipo do campo
  switch (fieldType) {
    case 'text':
    case 'textarea':
      return normalizeText(value, opts);

    case 'number':
      return normalizeNumber(value, opts);

    case 'date':
    case 'datetime':
      return normalizeDate(value, opts);

    case 'email':
      return normalizeEmail(value, opts);

    case 'phone':
      return normalizePhone(value, opts);

    case 'boolean':
      return normalizeBoolean(value, opts);

    case 'select':
    case 'multiselect':
      return normalizeSelect(value, opts);

    case 'currency':
    case 'percentage':
      return normalizeNumber(value, opts);

    case 'url':
      return normalizeUrl(value, opts);

    case 'relationship':
      return normalizeRelationship(value, opts);

    default:
      // Para tipos desconhecidos, aplica normalização de texto
      return normalizeText(value, opts);
  }
}

/**
 * Normaliza texto
 */
function normalizeText(value: any, options: NormalizationOptions): string {
  let stringValue = String(value);

  // Aplica sanitização HTML se necessário
  if (options.sanitizeHtml) {
    stringValue = sanitizeHtml(stringValue);
  }

  // Remove caracteres de controle (exceto espaços normais)
  stringValue = stringValue.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trims se necessário
  if (options.trimStrings) {
    stringValue = stringValue.trim();
  }

  // Limita comprimento se necessário
  if (options.maxLength !== undefined && stringValue.length > options.maxLength) {
    stringValue = stringValue.substring(0, options.maxLength);
  }

  return stringValue;
}

/**
 * Normaliza número
 */
function normalizeNumber(value: any, options: NormalizationOptions): number | null {
  if (!options.convertNumbers) {
    return value;
  }

  // Se já for um número, retornar como está
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }

  // Tenta converter string para número
  if (typeof value === 'string') {
    // Remove caracteres que não são dígitos, ponto ou sinal negativo
    const cleanedValue = value.replace(/[^\d.,\-+]/g, '').replace(/,/g, '.');
    const numValue = parseFloat(cleanedValue);

    if (!isNaN(numValue)) {
      return numValue;
    }
  }

  // Tenta converter de outras formas
  const numValue = Number(value);
  if (!isNaN(numValue)) {
    return numValue;
  }

  // Se não for possível converter, retornar null
  return null;
}

/**
 * Normaliza data
 */
function normalizeDate(value: any, options: NormalizationOptions): Date | string | null {
  if (!options.convertDates) {
    return value;
  }

  // Se já for um objeto Date, retornar como está
  if (value instanceof Date) {
    return value;
  }

  // Se for string, tenta converter para Date
  if (typeof value === 'string') {
    // Tenta diferentes formatos comuns de data
    const dateFormats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // D/M/YYYY
      /^\d{1,2}-\d{1,2}-\d{4}$/ // D-M-YYYY
    ];

    for (const format of dateFormats) {
      if (format.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // Tenta converter como timestamp
    const timestamp = Date.parse(value);
    if (!isNaN(timestamp)) {
      return new Date(timestamp);
    }
  }

  // Se for timestamp numérico
  if (typeof value === 'number') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Se não for possível converter, retornar null
  return null;
}

/**
 * Normaliza email
 */
function normalizeEmail(value: any, options: NormalizationOptions): string {
  let emailString = String(value);

  // Aplica normalização de texto primeiro
  emailString = normalizeText(emailString, {
    ...options,
    trimStrings: true,
    maxLength: 255 // Limite comum para emails
  });

  // Converte para minúsculas se necessário
  if (options.lowercaseEmails) {
    emailString = emailString.toLowerCase();
  }

  // Remove espaços extras entre partes do email
  emailString = emailString.replace(/\s+/g, '');

  return emailString;
}

/**
 * Normaliza telefone
 */
function normalizePhone(value: any, options: NormalizationOptions): string {
  let phoneString = String(value);

  // Aplica normalização de texto primeiro
  phoneString = normalizeText(phoneString, {
    ...options,
    trimStrings: true,
    maxLength: 20 // Limite comum para números de telefone
  });

  // Remove caracteres especiais se necessário
  if (options.normalizePhone) {
    // Remove tudo que não é dígito, +, ou parênteses
    phoneString = phoneString.replace(/[^\d+\-\s\(\)]/g, '');
    
    // Remove espaços extras
    phoneString = phoneString.replace(/\s+/g, '');
  }

  return phoneString;
}

/**
 * Normaliza booleano
 */
function normalizeBoolean(value: any, options: NormalizationOptions): boolean {
  if (!options.convertBooleans) {
    return value;
  }

  // Se já for booleano, retornar como está
  if (typeof value === 'boolean') {
    return value;
  }

  // Converte strings comuns para booleanos
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    if (['true', '1', 'yes', 'sim', 'on', 'ativo', 'verdadeiro', 'y', 't'].includes(lowerValue)) {
      return true;
    }
    if (['false', '0', 'no', 'não', 'nao', 'off', 'inativo', 'falso', 'n', 'f'].includes(lowerValue)) {
      return false;
    }
  }

  // Converte números (1 = true, 0 = false)
  if (typeof value === 'number') {
    return value !== 0;
  }

  // Para outros tipos, converte usando !! (double negation)
  return Boolean(value);
}

/**
 * Normaliza campos select/multiselect
 */
function normalizeSelect(value: any, options: NormalizationOptions): string | string[] {
  if (Array.isArray(value)) {
    // É um campo multiselect
    return value.map(item => normalizeText(item, options));
  } else {
    // É um campo select
    return normalizeText(value, options);
  }
}

/**
 * Normaliza URL
 */
function normalizeUrl(value: any, options: NormalizationOptions): string {
  let urlString = String(value);

  // Aplica normalização de texto primeiro
  urlString = normalizeText(urlString, options);

  // Tenta padronizar a URL
  try {
    // Se não tiver protocolo, adiciona https:// por padrão
    if (!urlString.match(/^https?:\/\//)) {
      urlString = 'https://' + urlString;
    }

    // Valida e normaliza a URL
    const url = new URL(urlString);
    return url.toString();
  } catch {
    // Se não for uma URL válida, retornar como string normalizada
    return urlString;
  }
}

/**
 * Normaliza relacionamento
 */
function normalizeRelationship(value: any, options: NormalizationOptions): string | Record<string, any> {
  if (typeof value === 'string') {
    // É um ID de relacionamento
    return normalizeText(value, options);
  } else if (typeof value === 'object') {
    // É um objeto de relacionamento - normaliza os campos relevantes
    const normalized: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      // Normaliza recursivamente, assumindo que campos de relacionamento são textuais
      normalized[key] = normalizeText(val, options);
    }
    return normalized;
  }

  // Se for outro tipo, converte para string
  return normalizeText(value, options);
}

/**
 * Sanitiza HTML de um valor
 */
function sanitizeHtml(html: string): string {
  // Remove tags HTML potencialmente perigosas
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onclick=/gi, '')
    .replace(/onmouseover=/gi, '')
    .replace(/onmouseout=/gi, '');
}

/**
 * Função auxiliar para normalizar múltiplos valores
 */
export function normalizeValues(
  values: any[],
  fieldType: string,
  options?: Partial<NormalizationOptions>
): any[] {
  return values.map(value => normalizeValue(value, fieldType, options));
}

/**
 * Função auxiliar para normalizar um objeto de dados
 */
export function normalizeData(
  data: Record<string, any>,
  fieldTypes: Record<string, string>,
  options?: Partial<NormalizationOptions>
): Record<string, any> {
  const normalizedData: Record<string, any> = {};

  for (const [fieldName, value] of Object.entries(data)) {
    const fieldType = fieldTypes[fieldName] || 'text';
    normalizedData[fieldName] = normalizeValue(value, fieldType, options);
  }

  return normalizedData;
}