/**
 * Testes unitários para as classes de erro personalizadas de importação/exportação
 * 
 * Estes testes verificam se as classes de erro personalizadas funcionam corretamente,
 * incluindo suas propriedades, herança e mensagens de erro.
 */

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
} from '../../errors/ImportExportError';

describe('Classes de Erro Personalizadas - Import/Export', () => {
  // Classe concreta para testar a funcionalidade da classe base
  class ConcreteImportExportError extends ImportExportError {
    constructor(
      message: string = 'Mensagem de erro de teste',
      code: string = 'TEST_ERROR_CODE',
      details?: any,
      tenantId?: string,
      jobId?: string
    ) {
      super(message, code, details, tenantId, jobId);
      this.name = 'ConcreteImportExportError';
    }
  }

  describe('ImportExportError (Classe Base)', () => {
    test('Deve criar uma instância com todas as propriedades corretas', () => {
      const error = new ConcreteImportExportError(
        'Mensagem de erro de teste',
        'TEST_ERROR_CODE',
        { extraInfo: 'informação adicional' },
        'tenant-test-id',
        'job-test-id'
      );

      expect(error).toBeInstanceOf(ImportExportError);
      expect(error.message).toBe('Mensagem de erro de teste');
      expect(error.code).toBe('TEST_ERROR_CODE');
      expect(error.details).toEqual({ extraInfo: 'informação adicional' });
      expect(error.tenantId).toBe('tenant-test-id');
      expect(error.jobId).toBe('job-test-id');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('ConcreteImportExportError');
    });

    test('Deve manter o stack trace', () => {
      const error = new ConcreteImportExportError('Test error', 'TEST_CODE');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ConcreteImportExportError');
    });
  });

  describe('CorruptedFileError', () => {
    test('Deve estender ImportExportError corretamente', () => {
      const error = new CorruptedFileError(
        'Arquivo corrompido',
        { fileName: 'test.csv' },
        'tenant-123',
        'job-456'
      );

      expect(error).toBeInstanceOf(ImportExportError);
      expect(error).toBeInstanceOf(CorruptedFileError);
      expect(error.name).toBe('CorruptedFileError');
      expect(error.code).toBe('CORRUPTED_FILE_ERROR');
      expect(error.message).toBe('Arquivo corrompido');
      expect(error.tenantId).toBe('tenant-123');
      expect(error.jobId).toBe('job-456');
    });

    test('Deve ter mensagem padrão quando não especificada', () => {
      const error = new CorruptedFileError();

      expect(error.message).toBe('Arquivo corrompido ou com estrutura inválida');
      expect(error.code).toBe('CORRUPTED_FILE_ERROR');
    });
  });

  describe('InvalidEncodingError', () => {
    test('Deve estender ParsingError corretamente', () => {
      const error = new InvalidEncodingError(
        'Encoding inválido',
        { detected: 'utf-16', expected: 'utf-8' },
        'tenant-123',
        'job-456'
      );

      expect(error).toBeInstanceOf(ImportExportError);
      expect(error).toBeInstanceOf(InvalidEncodingError);
      expect(error.name).toBe('InvalidEncodingError');
      expect(error.code).toBe('INVALID_ENCODING_ERROR');
      expect(error.message).toBe('Encoding inválido');
    });

    test('Deve ter mensagem padrão quando não especificada', () => {
      const error = new InvalidEncodingError();

      expect(error.message).toBe('Encoding do arquivo não suportado ou inválido');
      expect(error.code).toBe('INVALID_ENCODING_ERROR');
    });
  });

  describe('InvalidFormatError', () => {
    test('Deve estender ParsingError corretamente', () => {
      const error = new InvalidFormatError(
        'Formato inválido',
        { detected: 'xml', expected: ['csv', 'xlsx'] },
        'tenant-123',
        'job-456'
      );

      expect(error).toBeInstanceOf(ImportExportError);
      expect(error).toBeInstanceOf(InvalidFormatError);
      expect(error.name).toBe('InvalidFormatError');
      expect(error.code).toBe('INVALID_FORMAT_ERROR');
      expect(error.message).toBe('Formato inválido');
    });

    test('Deve ter mensagem padrão quando não especificada', () => {
      const error = new InvalidFormatError();

      expect(error.message).toBe('Formato do arquivo não suportado');
      expect(error.code).toBe('INVALID_FORMAT_ERROR');
    });
  });

  describe('MissingRequiredFieldError', () => {
    test('Deve estender ValidationError corretamente', () => {
      const error = new MissingRequiredFieldError(
        'email',
        'Campo obrigatório email está faltando',
        { rowIndex: 5 },
        'tenant-123',
        'job-456'
      );

      expect(error).toBeInstanceOf(ImportExportError);
      expect(error).toBeInstanceOf(MissingRequiredFieldError);
      expect(error.name).toBe('MissingRequiredFieldError');
      expect(error.code).toBe('MISSING_REQUIRED_FIELD_ERROR');
      expect(error.message).toBe('Campo obrigatório email está faltando');
      expect(error.details).toEqual({ fieldName: 'email', rowIndex: 5 });
    });

    test('Deve gerar mensagem padrão quando não especificada', () => {
      const error = new MissingRequiredFieldError('name');

      expect(error.message).toBe('Campo obrigatório "name" está faltando');
      expect(error.code).toBe('MISSING_REQUIRED_FIELD_ERROR');
      expect(error.details).toEqual({ fieldName: 'name' });
    });
  });

  describe('InvalidTypeError', () => {
    test('Deve estender ValidationError corretamente', () => {
      const error = new InvalidTypeError(
        'age',
        'number',
        'not-a-number',
        'Tipo inválido para o campo age',
        { rowIndex: 10 },
        'tenant-123',
        'job-456'
      );

      expect(error).toBeInstanceOf(ImportExportError);
      expect(error).toBeInstanceOf(InvalidTypeError);
      expect(error.name).toBe('InvalidTypeError');
      expect(error.code).toBe('INVALID_TYPE_ERROR');
      expect(error.message).toBe('Tipo inválido para o campo age');
      expect(error.details).toEqual({
        fieldName: 'age',
        expectedType: 'number',
        actualValue: 'not-a-number',
        rowIndex: 10
      });
    });

    test('Deve gerar mensagem padrão quando não especificada', () => {
      const error = new InvalidTypeError('value', 'number', 'abc');

      expect(error.message).toBe('Tipo inválido para o campo "value". Esperado: number, Recebido: string');
      expect(error.code).toBe('INVALID_TYPE_ERROR');
    });
  });

  describe('DuplicateValueError', () => {
    test('Deve estender ValidationError corretamente', () => {
      const error = new DuplicateValueError(
        'email',
        'test@example.com',
        'Valor duplicado para o campo único "email"',
        { rowIndex: 15, existingId: 'contact-123' },
        'tenant-123',
        'job-456'
      );

      expect(error).toBeInstanceOf(ImportExportError);
      expect(error).toBeInstanceOf(DuplicateValueError);
      expect(error.name).toBe('DuplicateValueError');
      expect(error.code).toBe('DUPLICATE_VALUE_ERROR');
      expect(error.message).toBe('Valor duplicado para o campo único "email"');
      expect(error.details).toEqual({
        fieldName: 'email',
        fieldValue: 'test@example.com',
        rowIndex: 15,
        existingId: 'contact-123'
      });
    });

    test('Deve gerar mensagem padrão quando não especificada', () => {
      const error = new DuplicateValueError('email', 'duplicate@example.com');

      expect(error.message).toBe('Valor duplicado para o campo único "email": duplicate@example.com');
      expect(error.code).toBe('DUPLICATE_VALUE_ERROR');
    });
  });

  describe('ProcessingTimeoutError', () => {
    test('Deve estender ProcessingError corretamente', () => {
      const error = new ProcessingTimeoutError(
        'Tempo limite excedido',
        { operation: 'parsing', elapsed: 60000 },
        'tenant-123',
        'job-456'
      );

      expect(error).toBeInstanceOf(ImportExportError);
      expect(error).toBeInstanceOf(ProcessingTimeoutError);
      expect(error.name).toBe('ProcessingTimeoutError');
      expect(error.code).toBe('PROCESSING_TIMEOUT_ERROR');
      expect(error.message).toBe('Tempo limite excedido');
    });

    test('Deve ter mensagem padrão quando não especificada', () => {
      const error = new ProcessingTimeoutError();

      expect(error.message).toBe('Tempo limite de processamento excedido');
      expect(error.code).toBe('PROCESSING_TIMEOUT_ERROR');
    });
  });

  describe('InsufficientMemoryError', () => {
    test('Deve estender ProcessingError corretamente', () => {
      const error = new InsufficientMemoryError(
        'Memória insuficiente',
        { used: '600MB', limit: '512MB' },
        'tenant-123',
        'job-456'
      );

      expect(error).toBeInstanceOf(ImportExportError);
      expect(error).toBeInstanceOf(InsufficientMemoryError);
      expect(error.name).toBe('InsufficientMemoryError');
      expect(error.code).toBe('INSUFFICIENT_MEMORY_ERROR');
      expect(error.message).toBe('Memória insuficiente');
    });

    test('Deve ter mensagem padrão quando não especificada', () => {
      const error = new InsufficientMemoryError();

      expect(error.message).toBe('Memória insuficiente para processar o arquivo');
      expect(error.code).toBe('INSUFFICIENT_MEMORY_ERROR');
    });
  });

  describe('DatabaseError', () => {
    test('Deve estender ProcessingError corretamente', () => {
      const error = new DatabaseError(
        'Erro de banco de dados',
        { query: 'INSERT INTO contacts', error: 'constraint violation' },
        'tenant-123',
        'job-456'
      );

      expect(error).toBeInstanceOf(ImportExportError);
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.name).toBe('DatabaseError');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.message).toBe('Erro de banco de dados');
    });

    test('Deve ter mensagem padrão quando não especificada', () => {
      const error = new DatabaseError();

      expect(error.message).toBe('Erro no banco de dados durante o processamento');
      expect(error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('Hierarquia de Erros', () => {
    test('Erros de parsing devem estender ParsingError', () => {
      const corruptedError = new CorruptedFileError();
      const encodingError = new InvalidEncodingError();
      const formatError = new InvalidFormatError();

      expect(corruptedError).toBeInstanceOf(ImportExportError);
      expect(encodingError).toBeInstanceOf(ImportExportError);
      expect(formatError).toBeInstanceOf(ImportExportError);
    });

    test('Erros de validação devem estender ValidationError', () => {
      const missingFieldError = new MissingRequiredFieldError('field');
      const invalidTypeError = new InvalidTypeError('field', 'string', 'value');
      const duplicateError = new DuplicateValueError('field', 'value');

      expect(missingFieldError).toBeInstanceOf(ImportExportError);
      expect(invalidTypeError).toBeInstanceOf(ImportExportError);
      expect(duplicateError).toBeInstanceOf(ImportExportError);
    });

    test('Erros de processamento devem estender ProcessingError', () => {
      const timeoutError = new ProcessingTimeoutError();
      const memoryError = new InsufficientMemoryError();
      const dbError = new DatabaseError();

      expect(timeoutError).toBeInstanceOf(ImportExportError);
      expect(memoryError).toBeInstanceOf(ImportExportError);
      expect(dbError).toBeInstanceOf(ImportExportError);
    });
  });
});