/**
 * Middleware de tratamento de erros para importação/exportação
 * 
 * Este middleware captura erros personalizados de importação/exportação
 * e os converte para respostas HTTP apropriadas.
 */

import { Request, Response, NextFunction } from 'express';
import {
  ImportExportError,
  CorruptedFileError,
  InvalidEncodingError,
  InvalidFormatError,
  MissingRequiredFieldError,
  InvalidTypeError,
  DuplicateValueError,
  ProcessingTimeoutError,
  InsufficientMemoryError,
  DatabaseError
} from '../errors/ImportExportError';
import { logImportExportError } from '../utils/importExportLogger';

/**
 * Middleware para tratamento de erros de importação/exportação
 */
export const importExportErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Se não for um dos nossos erros personalizados, delegar para o próximo middleware
  if (!(error instanceof ImportExportError)) {
    next(error);
    return;
  }

  // Logar o erro com contexto
  logImportExportError(error, {
    tenantId: req.tenantId,
    userId: req.userId,
    jobId: (error as ImportExportError).jobId,
    requestId: generateRequestId()
  });

  // Mapear erros personalizados para códigos HTTP apropriados
  let statusCode = 500;
  let errorType = 'INTERNAL_ERROR';

  if (error instanceof CorruptedFileError) {
    statusCode = 400;
    errorType = 'CORRUPTED_FILE_ERROR';
  } else if (error instanceof InvalidEncodingError) {
    statusCode = 400;
    errorType = 'INVALID_ENCODING_ERROR';
  } else if (error instanceof InvalidFormatError) {
    statusCode = 400;
    errorType = 'INVALID_FORMAT_ERROR';
  } else if (error instanceof MissingRequiredFieldError) {
    statusCode = 422;
    errorType = 'MISSING_REQUIRED_FIELD_ERROR';
  } else if (error instanceof InvalidTypeError) {
    statusCode = 422;
    errorType = 'INVALID_TYPE_ERROR';
  } else if (error instanceof DuplicateValueError) {
    statusCode = 409;
    errorType = 'DUPLICATE_VALUE_ERROR';
  } else if (error instanceof ProcessingTimeoutError) {
    statusCode = 408;
    errorType = 'PROCESSING_TIMEOUT_ERROR';
  } else if (error instanceof InsufficientMemoryError) {
    statusCode = 507; // Insufficient Storage
    errorType = 'INSUFFICIENT_MEMORY_ERROR';
  } else if (error instanceof DatabaseError) {
    statusCode = 500;
    errorType = 'DATABASE_ERROR';
  }

  // Preparar resposta de erro
  const errorResponse = {
    error: errorType,
    message: error.message,
    code: error.code,
    timestamp: error.timestamp,
    tenantId: error.tenantId,
    jobId: error.jobId,
    details: error.details || {},
    // Não incluir stack trace em produção
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };

  res.status(statusCode).json(errorResponse);
  return; // Certificar que todas as rotas de código retornam um valor
};

/**
 * Gera um ID de requisição único
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware para capturar erros não tratados em operações assíncronas
 * Deve ser usado com wrapAsync em torno de handlers de rota assíncronos
 */
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Middleware para validação de parâmetros de importação
 */
export const validateImportParams = (req: Request, res: Response, next: NextFunction) => {
  const { entityType } = req.body;

  if (entityType) {
    const validEntityTypes = ['contact', 'company', 'lead', 'opportunity'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        error: 'INVALID_ENTITY_TYPE',
        message: `Tipo de entidade inválido: ${entityType}`,
        validTypes: validEntityTypes
      });
    }
  }

  return next();
};