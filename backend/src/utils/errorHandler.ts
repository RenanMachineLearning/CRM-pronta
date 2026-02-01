/**
 * Sistema de tratamento de erros para validação de importação
 * 
 * Responsável por:
 * - Padronizar mensagens de erro
 * - Gerar mensagens em português
 * - Classificar erros por severidade
 * - Fornecer contexto para debugging
 */

import { ValidationError, ValidationErrorCode, ErrorSeverity } from '../types/validation.types';

/**
 * Mapeia códigos de erro para mensagens em português
 */
export function getErrorMessage(
  errorCode: ValidationErrorCode,
  fieldName?: string,
  details?: Record<string, any>
): string {
  switch (errorCode) {
    case 'REQUIRED':
      return fieldName 
        ? `Campo obrigatório "${fieldName}" não foi fornecido`
        : 'Campo obrigatório não foi fornecido';
    
    case 'INVALID_TYPE':
      if (details?.expectedType) {
        return fieldName
          ? `Campo "${fieldName}" deve ser do tipo ${details.expectedType}`
          : `Valor deve ser do tipo ${details.expectedType}`;
      }
      return fieldName 
        ? `Tipo inválido para o campo "${fieldName}"`
        : 'Tipo inválido para o valor';
    
    case 'INVALID_FORMAT':
      return fieldName 
        ? `Formato inválido para o campo "${fieldName}"`
        : 'Formato inválido para o valor';
    
    case 'NOT_UNIQUE':
      return fieldName 
        ? `Valor já existe para o campo "${fieldName}" e deve ser único`
        : 'Valor já existe e deve ser único';
    
    case 'OUT_OF_RANGE':
      if (details?.minValue !== undefined && details?.maxValue !== undefined) {
        return fieldName
          ? `Campo "${fieldName}" deve estar entre ${details.minValue} e ${details.maxValue}`
          : `Valor deve estar entre ${details.minValue} e ${details.maxValue}`;
      } else if (details?.minValue !== undefined) {
        return fieldName
          ? `Campo "${fieldName}" deve ser maior ou igual a ${details.minValue}`
          : `Valor deve ser maior ou igual a ${details.minValue}`;
      } else if (details?.maxValue !== undefined) {
        return fieldName
          ? `Campo "${fieldName}" deve ser menor ou igual a ${details.maxValue}`
          : `Valor deve ser menor ou igual a ${details.maxValue}`;
      }
      return fieldName 
        ? `Valor do campo "${fieldName}" fora do intervalo permitido`
        : 'Valor fora do intervalo permitido';
    
    case 'TOO_LONG':
      return fieldName 
        ? `Campo "${fieldName}" excede o comprimento máximo de ${details?.maxLength} caracteres`
        : `Valor excede o comprimento máximo de ${details?.maxLength} caracteres`;
    
    case 'TOO_SHORT':
      return fieldName 
        ? `Campo "${fieldName}" tem menos de ${details?.minLength} caracteres`
        : `Valor tem menos de ${details?.minLength} caracteres`;
    
    case 'PATTERN_MISMATCH':
      return fieldName 
        ? `Campo "${fieldName}" não corresponde ao padrão esperado`
        : 'Valor não corresponde ao padrão esperado';
    
    case 'INVALID_RELATION':
      return fieldName 
        ? `Relacionamento inválido para o campo "${fieldName}"`
        : 'Relacionamento inválido';
    
    case 'BUSINESS_RULE_VIOLATION':
      return details?.ruleDescription || 
        (fieldName 
          ? `Regra de negócio violada para o campo "${fieldName}"`
          : 'Regra de negócio violada');
    
    case 'MALFORMED_DATA':
      return fieldName 
        ? `Dados malformados no campo "${fieldName}"`
        : 'Dados malformados';
    
    case 'VALUE_CONVERSION_ERROR':
      return fieldName 
        ? `Erro ao converter valor do campo "${fieldName}"`
        : 'Erro ao converter valor';
    
    case 'INVALID_ENTITY':
      return details?.entityType 
        ? `Entidade "${details.entityType}" não suportada`
        : 'Entidade não suportada';
    
    case 'UNIQUENESS_CHECK_ERROR':
      return fieldName 
        ? `Erro ao verificar unicidade do campo "${fieldName}"`
        : 'Erro ao verificar unicidade';
    
    case 'COMPOSITE_UNIQUENESS_CHECK_ERROR':
      return 'Erro ao verificar unicidade composta';
    
    case 'INVALID_VALUE':
      return fieldName 
        ? `Valor inválido para o campo "${fieldName}"`
        : 'Valor inválido';
    
    case 'INVALID_DATE':
      return fieldName 
        ? `Data inválida para o campo "${fieldName}"`
        : 'Data inválida';
    
    case 'REQUIRED_LOGICALLY':
      return fieldName 
        ? `Campo "${fieldName}" é logicamente necessário`
        : 'Campo logicamente necessário';
    
    case 'BUSINESS_RULE_WARNING':
      return details?.ruleDescription || 
        (fieldName 
          ? `Aviso de regra de negócio para o campo "${fieldName}"`
          : 'Aviso de regra de negócio');
    
    case 'INVALID_FIELD':
      return fieldName 
        ? `Campo "${fieldName}" não é válido para esta entidade`
        : 'Campo não é válido';
    
    case 'TOO_MANY_ITEMS':
      return 'Quantidade de itens excede o limite permitido';
    
    case 'PAYLOAD_TOO_LARGE':
      return 'Tamanho do payload excede o limite permitido';
    
    default:
      return fieldName 
        ? `Erro de validação desconhecido para o campo "${fieldName}"`
        : 'Erro de validação desconhecido';
  }
}

/**
 * Cria um objeto de erro de validação padronizado
 */
export function createValidationError(
  field: string,
  code: ValidationErrorCode,
  severity: ErrorSeverity = 'error',
  value?: any,
  message?: string,
  details?: Record<string, any>
): ValidationError {
  return {
    field,
    code,
    message: message || getErrorMessage(code, field, details),
    severity,
    value,
    details
  };
}

/**
 * Agrupa erros por tipo para facilitar a análise
 */
export function groupErrorsByType(errors: ValidationError[]): Record<ValidationErrorCode, ValidationError[]> {
  const grouped: Record<ValidationErrorCode, ValidationError[]> = {} as Record<ValidationErrorCode, ValidationError[]>;
  
  for (const error of errors) {
    if (!grouped[error.code]) {
      grouped[error.code] = [];
    }
    grouped[error.code].push(error);
  }
  
  return grouped;
}

/**
 * Agrupa erros por campo para facilitar a análise
 */
export function groupErrorsByField(errors: ValidationError[]): Record<string, ValidationError[]> {
  const grouped: Record<string, ValidationError[]> = {};
  
  for (const error of errors) {
    const field = error.field || 'general';
    if (!grouped[field]) {
      grouped[field] = [];
    }
    grouped[field].push(error);
  }
  
  return grouped;
}

/**
 * Gera um resumo dos erros encontrados
 */
export function generateErrorSummary(errors: ValidationError[]): {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byCode: Record<ValidationErrorCode, number>;
  criticalFields: string[];
} {
  const summary = {
    total: errors.length,
    bySeverity: { info: 0, warning: 0, error: 0, critical: 0 } as Record<ErrorSeverity, number>,
    byCode: {} as Record<ValidationErrorCode, number>,
    criticalFields: new Set<string>()
  };
  
  for (const error of errors) {
    // Contabiliza por severidade
    summary.bySeverity[error.severity]++;
    
    // Contabiliza por código
    summary.byCode[error.code] = (summary.byCode[error.code] || 0) + 1;
    
    // Identifica campos críticos (aqueles com erros críticos ou de erro)
    if (error.severity === 'critical' || error.severity === 'error') {
      summary.criticalFields.add(error.field);
    }
  }
  
  return {
    total: summary.total,
    bySeverity: summary.bySeverity,
    byCode: summary.byCode,
    criticalFields: Array.from(summary.criticalFields)
  };
}

/**
 * Verifica se os erros impedem a continuação do processo
 */
export function hasBlockingErrors(errors: ValidationError[], continueOnError: boolean = false): boolean {
  if (continueOnError) {
    // Se continueOnError for true, apenas erros críticos impedem a continuação
    return errors.some(error => error.severity === 'critical');
  } else {
    // Se continueOnError for false, erros de erro e críticos impedem a continuação
    return errors.some(error => error.severity === 'error' || error.severity === 'critical');
  }
}

/**
 * Filtra erros por severidade
 */
export function filterErrorsBySeverity(errors: ValidationError[], severity: ErrorSeverity | ErrorSeverity[]): ValidationError[] {
  const severityArray = Array.isArray(severity) ? severity : [severity];
  return errors.filter(error => severityArray.includes(error.severity));
}

/**
 * Converte erros de validação para um formato adequado para resposta de API
 */
export function formatErrorsForApiResponse(errors: ValidationError[]): {
  success: boolean;
  errors: {
    field: string;
    code: ValidationErrorCode;
    message: string;
    severity: ErrorSeverity;
    value?: any;
    details?: Record<string, any>;
  }[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
  };
} {
  const apiErrors = errors.map(error => ({
    field: error.field,
    code: error.code,
    message: error.message,
    severity: error.severity,
    value: error.value,
    details: error.details
  }));
  
  const summary = generateErrorSummary(errors);
  
  return {
    success: errors.length === 0,
    errors: apiErrors,
    summary: {
      total: summary.total,
      errors: summary.bySeverity.error + summary.bySeverity.critical,
      warnings: summary.bySeverity.warning
    }
  };
}

/**
 * Gera mensagem de resumo para múltiplos erros
 */
export function generateErrorSummaryMessage(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'Nenhum erro encontrado';
  }
  
  const summary = generateErrorSummary(errors);
  const errorCount = summary.bySeverity.error + summary.bySeverity.critical;
  const warningCount = summary.bySeverity.warning;
  
  let message = `Foram encontrados ${errors.length} problema(s)`;
  
  if (errorCount > 0) {
    message += `, incluindo ${errorCount} erro(s) crítico(s)`;
  }
  
  if (warningCount > 0) {
    message += `${errorCount > 0 ? ' e ' : ', incluindo '}${warningCount} aviso(s)`;
  }
  
  if (summary.criticalFields.length > 0) {
    message += `. Campos afetados: ${summary.criticalFields.join(', ')}`;
  }
  
  return message;
}

/**
 * Converte erro de validação para mensagem amigável
 */
export function getFriendlyErrorMessage(error: ValidationError): string {
  switch (error.code) {
    case 'REQUIRED':
      return error.field ? `Preencha o campo "${error.field}"` : 'Preencha o campo obrigatório';
    
    case 'INVALID_TYPE':
      return error.field ? `Verifique o tipo de dado no campo "${error.field}"` : 'Verifique o tipo de dado';
    
    case 'INVALID_FORMAT':
      return error.field ? `Corrija o formato do campo "${error.field}"` : 'Corrija o formato do valor';
    
    case 'NOT_UNIQUE':
      return error.field ? `Escolha outro valor para "${error.field}", pois este já existe` : 'Escolha outro valor, pois este já existe';
    
    case 'OUT_OF_RANGE':
      return error.field ? `Ajuste o valor do campo "${error.field}" para dentro do intervalo permitido` : 'Ajuste o valor para dentro do intervalo permitido';
    
    case 'TOO_LONG':
      return error.field ? `Reduza o texto no campo "${error.field}"` : 'Reduza o texto';
    
    case 'TOO_SHORT':
      return error.field ? `Aumente o texto no campo "${error.field}"` : 'Aumente o texto';
    
    case 'PATTERN_MISMATCH':
      return error.field ? `Siga o padrão correto para o campo "${error.field}"` : 'Siga o padrão correto';
    
    default:
      return error.field ? `Corrija o campo "${error.field}": ${error.message}` : error.message;
  }
}

/**
 * Sistema de logs estruturados para erros de validação
 */
export class ValidationErrorLogger {
  static logError(error: ValidationError, context?: Record<string, any>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'VALIDATION_ERROR',
      error: {
        field: error.field,
        code: error.code,
        message: error.message,
        severity: error.severity,
        value: error.value,
        details: error.details
      },
      context: context || {}
    };
    
    console.error('[VALIDATION ERROR]', JSON.stringify(logEntry));
  }
  
  static logErrors(errors: ValidationError[], context?: Record<string, any>): void {
    for (const error of errors) {
      this.logError(error, context);
    }
  }
  
  static logSummary(errors: ValidationError[], context?: Record<string, any>): void {
    const summary = generateErrorSummary(errors);
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'VALIDATION_SUMMARY',
      summary,
      context: context || {}
    };
    
    console.info('[VALIDATION SUMMARY]', JSON.stringify(logEntry));
  }
}