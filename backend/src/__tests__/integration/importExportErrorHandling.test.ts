/**
 * Testes de integração para o tratamento de erros de importação/exportação
 * 
 * Estes testes verificam se os diferentes tipos de erros são corretamente
 * capturados, tratados e respondidos com os códigos HTTP apropriados.
 */

import request from 'supertest';
import { app } from '../../index';
import { importExportLogger } from '../../utils/importExportLogger';

describe('Tratamento de Erros de Importação/Exportação', () => {
  // Mock de tenant e usuário para testes
  const mockTenantId = 'test-tenant-id';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    // Limpar logs antes de cada teste
    importExportLogger.clearLogs();
  });

  describe('Erros de Parsing', () => {
    test('Deve tratar erro de arquivo corrompido', async () => {
      // Criar um buffer de arquivo intencionalmente corrompido
      const corruptedBuffer = Buffer.from('This is not a valid CSV content with intentional corruption \x00\x01\x02');
      
      const response = await request(app)
        .post('/api/import/validate')
        .set('X-Tenant-Id', mockTenantId)
        .set('X-User-Id', mockUserId)
        .attach('file', corruptedBuffer, 'test.csv');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('CORRUPTED_FILE_ERROR');
      expect(response.body.message).toContain('corrompido');
    });

    test('Deve tratar erro de encoding inválido', async () => {
      // Criar um buffer com encoding inválido
      const invalidEncodingBuffer = Buffer.from([0xFF, 0xFE, 0xFD]); // Sequência inválida de UTF-8
      
      const response = await request(app)
        .post('/api/import/validate')
        .set('X-Tenant-Id', mockTenantId)
        .set('X-User-Id', mockUserId)
        .attach('file', invalidEncodingBuffer, 'test.csv');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_ENCODING_ERROR');
    });

    test('Deve tratar erro de formato inválido', async () => {
      // Enviar um arquivo com extensão .csv mas conteúdo inválido
      const invalidFormatBuffer = Buffer.from('This is not CSV content at all!');
      
      const response = await request(app)
        .post('/api/import/validate')
        .set('X-Tenant-Id', mockTenantId)
        .set('X-User-Id', mockUserId)
        .attach('file', invalidFormatBuffer, 'test.csv');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_FORMAT_ERROR');
    });
  });

  describe('Erros de Validação', () => {
    test('Deve tratar erro de campo obrigatório faltando', async () => {
      // Criar um CSV com campo obrigatório faltando
      const csvWithMissingRequiredField = 'name,email,phone\nJohn Doe,john@example.com,\nJane Smith,,555-1234';
      
      const response = await request(app)
        .post('/api/import/process')
        .set('X-Tenant-Id', mockTenantId)
        .set('X-User-Id', mockUserId)
        .field('entityType', 'contact')
        .field('validateBeforeImport', 'true')
        .attach('file', Buffer.from(csvWithMissingRequiredField), 'test.csv');

      expect(response.status).toBe(422); // Unprocessable Entity
      expect(response.body.error).toBe('MISSING_REQUIRED_FIELD_ERROR');
    });

    test('Deve tratar erro de tipo inválido', async () => {
      // Criar um CSV com tipo inválido para um campo numérico
      const csvWithInvalidType = 'name,value\nProduct A,not_a_number\nProduct B,25.99';
      
      const response = await request(app)
        .post('/api/import/process')
        .set('X-Tenant-Id', mockTenantId)
        .set('X-User-Id', mockUserId)
        .field('entityType', 'opportunity')
        .field('validateBeforeImport', 'true')
        .attach('file', Buffer.from(csvWithInvalidType), 'test.csv');

      expect(response.status).toBe(422); // Unprocessable Entity
      expect(response.body.error).toBe('INVALID_TYPE_ERROR');
    });

    test('Deve tratar erro de valor duplicado', async () => {
      // Criar um CSV com valores duplicados para um campo único
      const csvWithDuplicateValues = 'email,name\njohn@example.com,John Doe\njohn@example.com,Jane Doe';
      
      const response = await request(app)
        .post('/api/import/process')
        .set('X-Tenant-Id', mockTenantId)
        .set('X-User-Id', mockUserId)
        .field('entityType', 'contact')
        .field('validateBeforeImport', 'true')
        .attach('file', Buffer.from(csvWithDuplicateValues), 'test.csv');

      expect(response.status).toBe(409); // Conflict
      expect(response.body.error).toBe('DUPLICATE_VALUE_ERROR');
    });
  });

  describe('Erros de Processamento', () => {
    test('Deve tratar timeout de processamento', async () => {
      // Simular um timeout criando um CSV muito grande ou com processamento demorado
      // Neste caso, vamos simular diretamente no serviço de importação
      const largeCsv = 'name,email\n' + 'Test,'.repeat(10000) + 'test@example.com\n';
      
      const response = await request(app)
        .post('/api/import/process')
        .set('X-Tenant-Id', mockTenantId)
        .set('X-User-Id', mockUserId)
        .field('entityType', 'contact')
        .field('batchSize', '10') // Tamanho pequeno para forçar mais batches
        .field('validateBeforeImport', 'true')
        .attach('file', Buffer.from(largeCsv), 'test.csv');

      // O status pode variar dependendo da configuração de timeout, mas deve ser um erro
      expect([408, 500]).toContain(response.status); // 408 = Request Timeout, 500 = Internal Server Error
    });
  });

  describe('Logging de Erros', () => {
    test('Deve registrar erros no logger', async () => {
      // Criar um CSV com erro conhecido
      const csvWithError = 'name,email\n,invalid_email\nValid Name,valid@example.com';
      
      await request(app)
        .post('/api/import/process')
        .set('X-Tenant-Id', mockTenantId)
        .set('X-User-Id', mockUserId)
        .field('entityType', 'contact')
        .field('validateBeforeImport', 'true')
        .attach('file', Buffer.from(csvWithError), 'test.csv');

      // Verificar se o erro foi registrado no logger
      const errorLogs = importExportLogger.getLogsByLevel('error');
      expect(errorLogs.length).toBeGreaterThan(0);
      
      // Verificar se o log contém informações relevantes
      const firstErrorLog = errorLogs[0];
      expect(firstErrorLog.context.tenantId).toBe(mockTenantId);
      expect(firstErrorLog.context.userId).toBe(mockUserId);
    });
  });

  describe('Respostas de Erro Adequadas', () => {
    test('Erros devem conter informações detalhadas', async () => {
      const invalidCsv = 'name,email\n,invalid_email_format';
      
      const response = await request(app)
        .post('/api/import/process')
        .set('X-Tenant-Id', mockTenantId)
        .set('X-User-Id', mockUserId)
        .field('entityType', 'contact')
        .field('validateBeforeImport', 'true')
        .attach('file', Buffer.from(invalidCsv), 'test.csv');

      // Verificar que a resposta contém campos esperados
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('details');
      expect(response.body.tenantId).toBe(mockTenantId);
    });
  });
});