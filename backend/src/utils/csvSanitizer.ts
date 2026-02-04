/**
 * Utilitário para sanitização de dados CSV
 * 
 * Responsável por:
 * - Prevenir CSV injection
 * - Remover caracteres potencialmente perigosos
 * - Sanitizar campos para prevenir XSS
 */

// Expressão regular para detectar possíveis fórmulas de CSV injection
// Mais comumente começa com =, +, -, @ seguido de uma fórmula
const CSV_INJECTION_PATTERNS = [
  /^\s*[=+\-@]/,  // Começa com =, +, -, @
  /(?:^|\s)(?:SUM|AVERAGE|COUNT|IF|VLOOKUP|CONCATENATE|CHAR|UNICODE|INDIRECT)\s*\(/i,  // Fórmulas comuns
];

/**
 * Sanitiza um valor individual para prevenir CSV injection
 */
export function sanitizeCsvValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  // Converter para string para manipulação
  let stringValue = String(value);

  // Verificar se o valor corresponde a um padrão de injeção de CSV
  for (const pattern of CSV_INJECTION_PATTERNS) {
    if (pattern.test(stringValue)) {
      // Prefixar com apóstrofo para neutralizar fórmulas
      stringValue = "'" + stringValue;
      break;
    }
  }

  // Remover caracteres que possam causar problemas
  // Substituir quebras de linha por espaços para evitar problemas de parsing
  stringValue = stringValue.replace(/[\r\n]+/g, ' ');

  // Remover caracteres de controle (exceto tab e quebras de linha que já foram tratados)
  stringValue = stringValue.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return stringValue;
}

/**
 * Sanitiza um objeto inteiro de dados CSV
 */
export function sanitizeCsvData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeCsvValue(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeCsvData(item));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Sanitizar também a chave (nome do campo)
      const sanitizedKey = sanitizeCsvValue(key);
      sanitized[sanitizedKey] = sanitizeCsvData(value);
    }
    return sanitized;
  }

  return sanitizeCsvValue(data);
}

/**
 * Escapa valores para prevenir CSV injection de forma mais agressiva
 */
export function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  let stringValue = String(value);

  // Verificar se o valor corresponde a um padrão de injeção de CSV
  for (const pattern of CSV_INJECTION_PATTERNS) {
    if (pattern.test(stringValue)) {
      // Prefixar com apóstrofo para neutralizar fórmulas
      stringValue = "'" + stringValue;
      break;
    }
  }

  // Se o valor contém vírgula, aspas ou quebra de linha, envolver em aspas
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Escapar aspas duplas
    stringValue = stringValue.replace(/"/g, '""');
    // Envolver em aspas
    stringValue = `"${stringValue}"`;
  }

  return stringValue;
}