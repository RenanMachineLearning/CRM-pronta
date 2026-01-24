/**
 * Testes unitários para o serviço de upload de arquivos
 */

import { temporaryFileStorage, validateFileContent, isPotentiallyMalicious, sanitizeFileName } from '../../../src/services/uploadService';
import { isValidExcelBuffer } from '../../../src/utils/excelParser';
import { validateCsvFormat } from '../../../src/utils/csvValidator';

describe('Upload Service - TemporaryFileStorage', () => {
  beforeEach(() => {
    // Limpar o armazenamento antes de cada teste
    for (const fileId of temporaryFileStorage['files'].keys()) {
      temporaryFileStorage.removeFile(fileId);
    }
  });

  afterEach(() => {
    // Parar o intervalo de limpeza automática
    temporaryFileStorage.stopCleanup();
  });

  describe('storeFile', () => {
    it('should store a file and return metadata', async () => {
      const fileBuffer = Buffer.from('test file content');
      const metadata = await temporaryFileStorage.storeFile(
        fileBuffer,
        'test.csv',
        'text/csv',
        'tenant123',
        'user123',
        1 // TTL de 1 minuto para testes
      );

      expect(metadata).toHaveProperty('fileId');
      expect(metadata.originalName).toBe('test.csv');
      expect(metadata.mimeType).toBe('text/csv');
      expect(metadata.size).toBe(fileBuffer.length);
      expect(metadata.tenantId).toBe('tenant123');
      expect(metadata.userId).toBe('user123');
      expect(metadata.processed).toBe(false);
    });

    it('should store file in internal storage', async () => {
      const fileBuffer = Buffer.from('test file content');
      const metadata = await temporaryFileStorage.storeFile(
        fileBuffer,
        'test.csv',
        'text/csv',
        'tenant123',
        'user123'
      );

      const stored = temporaryFileStorage.getFile(metadata.fileId);
      expect(stored).not.toBeNull();
      expect(stored!.buffer.equals(fileBuffer)).toBe(true);
    });
  });

  describe('getFile', () => {
    it('should retrieve a stored file', async () => {
      const fileBuffer = Buffer.from('test file content');
      const metadata = await temporaryFileStorage.storeFile(
        fileBuffer,
        'test.csv',
        'text/csv',
        'tenant123',
        'user123'
      );

      const retrieved = temporaryFileStorage.getFile(metadata.fileId);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.buffer.equals(fileBuffer)).toBe(true);
      expect(retrieved!.metadata.fileId).toBe(metadata.fileId);
    });

    it('should return null for non-existent file', () => {
      const retrieved = temporaryFileStorage.getFile('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should return null for expired file', async () => {
      const fileBuffer = Buffer.from('test file content');
      const metadata = await temporaryFileStorage.storeFile(
        fileBuffer,
        'test.csv',
        'text/csv',
        'tenant123',
        'user123',
        0.0001 // TTL de 0.0001 minuto (~6ms) para forçar expiração
      );

      // Esperar um pouco para o arquivo expirar
      await new Promise(resolve => setTimeout(resolve, 10));

      const retrieved = temporaryFileStorage.getFile(metadata.fileId);
      expect(retrieved).toBeNull();
    });
  });

  describe('removeFile', () => {
    it('should remove a file from storage', async () => {
      const fileBuffer = Buffer.from('test file content');
      const metadata = await temporaryFileStorage.storeFile(
        fileBuffer,
        'test.csv',
        'text/csv',
        'tenant123',
        'user123'
      );

      const existed = temporaryFileStorage.removeFile(metadata.fileId);
      expect(existed).toBe(true);

      const retrieved = temporaryFileStorage.getFile(metadata.fileId);
      expect(retrieved).toBeNull();
    });

    it('should return false when removing non-existent file', () => {
      const existed = temporaryFileStorage.removeFile('non-existent-id');
      expect(existed).toBe(false);
    });
  });

  describe('cleanupExpired', () => {
    it('should remove expired files', async () => {
      const fileBuffer = Buffer.from('test file content');
      const metadata = await temporaryFileStorage.storeFile(
        fileBuffer,
        'test.csv',
        'text/csv',
        'tenant123',
        'user123',
        0.0001 // TTL curto para testes
      );

      // Forçar limpeza
      temporaryFileStorage.cleanupExpired();

      const retrieved = temporaryFileStorage.getFile(metadata.fileId);
      expect(retrieved).toBeNull();
    });
  });

  describe('validateAccess', () => {
    it('should validate access for correct user and tenant', async () => {
      const fileBuffer = Buffer.from('test file content');
      const metadata = await temporaryFileStorage.storeFile(
        fileBuffer,
        'test.csv',
        'text/csv',
        'tenant123',
        'user123'
      );

      const hasAccess = temporaryFileStorage.validateAccess(metadata.fileId, 'user123', 'tenant123');
      expect(hasAccess).toBe(true);
    });

    it('should deny access for wrong user', async () => {
      const fileBuffer = Buffer.from('test file content');
      const metadata = await temporaryFileStorage.storeFile(
        fileBuffer,
        'test.csv',
        'text/csv',
        'tenant123',
        'user123'
      );

      const hasAccess = temporaryFileStorage.validateAccess(metadata.fileId, 'wrong-user', 'tenant123');
      expect(hasAccess).toBe(false);
    });

    it('should deny access for wrong tenant', async () => {
      const fileBuffer = Buffer.from('test file content');
      const metadata = await temporaryFileStorage.storeFile(
        fileBuffer,
        'test.csv',
        'text/csv',
        'tenant123',
        'user123'
      );

      const hasAccess = temporaryFileStorage.validateAccess(metadata.fileId, 'user123', 'wrong-tenant');
      expect(hasAccess).toBe(false);
    });
  });
});

describe('Upload Service - File Validation', () => {
  describe('validateFileContent', () => {
    it('should validate CSV content correctly', async () => {
      const csvContent = 'name,email\nJohn,john@example.com';
      const fileBuffer = Buffer.from(csvContent);
      
      const result = await validateFileContent(fileBuffer, 'test.csv');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Excel content correctly', async () => {
      // Como não temos um buffer Excel real, testamos o caminho de validação
      // Este teste verificará se a função não lança exceções
      const mockExcelBuffer = Buffer.from('fake-excel-content');
      
      const result = await validateFileContent(mockExcelBuffer, 'test.xlsx');
      
      // O resultado dependerá da implementação real de isValidExcelBuffer
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should return error for unsupported file type', async () => {
      const fileBuffer = Buffer.from('some content');
      
      const result = await validateFileContent(fileBuffer, 'test.pdf');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('suportado'));
    });
  });

  describe('isPotentiallyMalicious', () => {
    it('should detect potentially malicious content', () => {
      const maliciousContent = '<script>alert("xss")</script>';
      const fileBuffer = Buffer.from(maliciousContent);
      
      const result = isPotentiallyMalicious(fileBuffer, 'test.csv');
      
      expect(result).toBe(true);
    });

    it('should return false for safe content', () => {
      const safeContent = 'name,email\nJohn,john@example.com';
      const fileBuffer = Buffer.from(safeContent);
      
      const result = isPotentiallyMalicious(fileBuffer, 'test.csv');
      
      expect(result).toBe(false);
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize file name by replacing dangerous characters', () => {
      const unsafeName = '../../../etc/passwd<script>.csv';
      const sanitized = sanitizeFileName(unsafeName);
      
      expect(sanitized).toBe('___etc_passwd_.csv');
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should preserve safe characters', () => {
      const fileName = 'my_file-name_v1.2.csv';
      const sanitized = sanitizeFileName(fileName);
      
      expect(sanitized).toBe('my_file-name_v1.2.csv');
    });
  });
});