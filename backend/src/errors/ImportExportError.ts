/**
 * Classe base para erros relacionados a importação/exportação
 */
export abstract class ImportExportError extends Error {
  public readonly code: string;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly tenantId?: string;
  public readonly jobId?: string;

  constructor(
    message: string,
    code: string,
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.jobId = jobId;

    // Manter o stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Erros relacionados a parsing de arquivos
 */
export class ParsingError extends ImportExportError {
  constructor(
    message: string,
    code: string,
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message, code, details, tenantId, jobId);
    this.name = 'ParsingError';
  }
}

/**
 * Erro para arquivos corrompidos
 */
export class CorruptedFileError extends ParsingError {
  constructor(
    message: string = 'Arquivo corrompido ou com estrutura inválida',
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message, 'CORRUPTED_FILE_ERROR', details, tenantId, jobId);
    this.name = 'CorruptedFileError';
  }
}

/**
 * Erro para encoding inválido
 */
export class InvalidEncodingError extends ParsingError {
  constructor(
    message: string = 'Encoding do arquivo não suportado ou inválido',
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message, 'INVALID_ENCODING_ERROR', details, tenantId, jobId);
    this.name = 'InvalidEncodingError';
  }
}

/**
 * Erro para formato inválido
 */
export class InvalidFormatError extends ParsingError {
  constructor(
    message: string = 'Formato do arquivo não suportado',
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message, 'INVALID_FORMAT_ERROR', details, tenantId, jobId);
    this.name = 'InvalidFormatError';
  }
}

/**
 * Erros relacionados a validação de dados
 */
export class ValidationError extends ImportExportError {
  constructor(
    message: string,
    code: string,
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message, code, details, tenantId, jobId);
    this.name = 'ValidationError';
  }
}

/**
 * Erro para campos obrigatórios faltando
 */
export class MissingRequiredFieldError extends ValidationError {
  constructor(
    fieldName: string,
    message: string = `Campo obrigatório "${fieldName}" está faltando`,
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message, 'MISSING_REQUIRED_FIELD_ERROR', {
      fieldName,
      ...details
    }, tenantId, jobId);
    this.name = 'MissingRequiredFieldError';
  }
}

/**
 * Erro para tipo de dado inválido
 */
export class InvalidTypeError extends ValidationError {
  constructor(
    fieldName: string,
    expectedType: string,
    actualValue: any,
    message: string = `Tipo inválido para o campo "${fieldName}". Esperado: ${expectedType}, Recebido: ${typeof actualValue}`,
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message, 'INVALID_TYPE_ERROR', {
      fieldName,
      expectedType,
      actualValue,
      ...details
    }, tenantId, jobId);
    this.name = 'InvalidTypeError';
  }
}

/**
 * Erro para valores duplicados
 */
export class DuplicateValueError extends ValidationError {
  constructor(
    fieldName: string,
    fieldValue: any,
    message: string = `Valor duplicado para o campo único "${fieldName}": ${fieldValue}`,
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message, 'DUPLICATE_VALUE_ERROR', {
      fieldName,
      fieldValue,
      ...details
    }, tenantId, jobId);
    this.name = 'DuplicateValueError';
  }
}

/**
 * Erros relacionados a processamento
 */
export class ProcessingError extends ImportExportError {
  constructor(
    message: string,
    code: string,
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message, code, details, tenantId, jobId);
    this.name = 'ProcessingError';
  }
}

/**
 * Erro de timeout de processamento
 */
export class ProcessingTimeoutError extends ProcessingError {
  constructor(
    message: string = 'Tempo limite de processamento excedido',
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message, 'PROCESSING_TIMEOUT_ERROR', details, tenantId, jobId);
    this.name = 'ProcessingTimeoutError';
  }
}

/**
 * Erro de memória insuficiente
 */
export class InsufficientMemoryError extends ProcessingError {
  constructor(
    message: string = 'Memória insuficiente para processar o arquivo',
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message, 'INSUFFICIENT_MEMORY_ERROR', details, tenantId, jobId);
    this.name = 'InsufficientMemoryError';
  }
}

/**
 * Erro de banco de dados
 */
export class DatabaseError extends ProcessingError {
  constructor(
    message: string = 'Erro no banco de dados durante o processamento',
    details?: any,
    tenantId?: string,
    jobId?: string
  ) {
    super(message, 'DATABASE_ERROR', details, tenantId, jobId);
    this.name = 'DatabaseError';
  }
}