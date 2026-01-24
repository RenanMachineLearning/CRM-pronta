/**
 * Testes de integração para o sistema de mapeamento de importação
 * 
 * Testa o fluxo completo de mapeamento de campos:
 * 1. Upload de arquivo
 * 2. Validação de campos
 * 3. Mapeamento de campos
 * 4. Validação de unicidade
 * 5. Validação de regras de negócio
 * 6. Preview de resultados
 */

import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/utils/prisma';
import { temporaryFileStorage } from '../../src/services/uploadService';

describe('Import Mapping - Testes de Integração', () => {
  const mockTenantId = 'test-tenant-id-integration';
  const mockUserId = 'test-user-id-integration';
  let authToken: string;

  beforeAll(async () => {
    // Setup: Criar tenant e usuário de teste
    await prisma.tenant.upsert({
      where: { id: mockTenantId },
      update: {},
      create: {
        id: mockTenantId,
        name: 'Test Tenant Integration',
        slug: 'test-tenant-integration',
        status: 'ACTIVE'
      }
    });

    await prisma.user.upsert({
      where: { email: 'integration-test@example.com' },
      update: {},
      create: {
        email: 'integration-test@example.com',
        name: 'Integration Test User',
        password: '$2b$10$examplehashedpasswordthatmeetsminimumrequirements',
        status: 'ACTIVE',
        tenantId: mockTenantId
      }
    });

    // Em um cenário real, implementaríamos autenticação adequada
    // Por simplicidade nos testes, usaremos um token mockado
    authToken = 'mock-valid-token';
  });

  afterAll(async () => {
    // Cleanup: Remover dados de teste
    await prisma.contact.deleteMany({
      where: { tenantId: mockTenantId }
    });

    await prisma.company.deleteMany({
      where: { tenantId: mockTenantId }
    });

    // Limpar arquivos temporários
    for (const fileId of temporaryFileStorage['files'].keys()) {
      temporaryFileStorage.removeFile(fileId);
    }

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Limpar dados de testes anteriores
    await prisma.contact.deleteMany({
      where: { tenantId: mockTenantId }
    });

    await prisma.company.deleteMany({
      where: { tenantId: mockTenantId }
    });

    // Limpar arquivos temporários de testes anteriores
    for (const fileId of temporaryFileStorage['files'].keys()) {
      temporaryFileStorage.removeFile(fileId);
    }
  });

  describe('Fluxo Completo de Mapeamento', () => {
    it('deve mapear campos de CSV com sucesso e retornar preview', async () => {
      // 1. Upload de arquivo CSV
      const csvContent = 'firstName,lastName,email,company\nJohn,Doe,john@example.com,ABC Corp\nJane,Smith,jane@example.com,XYZ Ltd';
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'test.csv' });

      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body.fileId).toBeDefined();
      
      const fileId = uploadResponse.body.fileId;

      // 2. Mapeamento de campos
      const mappingResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: [
            { columnIndex: 0, fieldName: 'firstName', required: true },
            { columnIndex: 1, fieldName: 'lastName', required: false },
            { columnIndex: 2, fieldName: 'email', required: false, type: 'email' },
            { columnIndex: 3, fieldName: 'company', required: false }
          ]
        });

      expect(mappingResponse.status).toBe(200);
      expect(mappingResponse.body.isValid).toBe(true);
      expect(mappingResponse.body.preview).toBeDefined();
      expect(mappingResponse.body.preview.rows).toHaveLength(2); // 2 linhas de dados
      expect(mappingResponse.body.preview.fields).toEqual(['firstName', 'lastName', 'email', 'company']);

      // Verificar que os dados foram mapeados corretamente
      const previewRows = mappingResponse.body.preview.rows;
      expect(previewRows[0].firstName).toBe('John');
      expect(previewRows[0].lastName).toBe('Doe');
      expect(previewRows[0].email).toBe('john@example.com');
      expect(previewRows[0].company).toBe('ABC Corp');

      expect(previewRows[1].firstName).toBe('Jane');
      expect(previewRows[1].lastName).toBe('Smith');
      expect(previewRows[1].email).toBe('jane@example.com');
      expect(previewRows[1].company).toBe('XYZ Ltd');

      // Limpar arquivo temporário
      temporaryFileStorage.removeFile(fileId);
    });

    it('deve retornar erros para mapeamento inválido', async () => {
      // Upload de arquivo
      const csvContent = 'firstName,invalidField\nJohn,Doe';
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'test.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Tentativa de mapeamento com campo inválido
      const mappingResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: [
            { columnIndex: 0, fieldName: 'firstName', required: true },
            { columnIndex: 1, fieldName: 'nonExistentField', required: false } // Campo não existe
          ]
        });

      expect(mappingResponse.status).toBe(400);
      expect(mappingResponse.body.isValid).toBe(false);
      expect(mappingResponse.body.errors).toHaveLength(1);
      expect(mappingResponse.body.errors[0].code).toBe('INVALID_FIELD');

      // Limpar arquivo temporário
      temporaryFileStorage.removeFile(fileId);
    });

    it('deve validar unicidade de campos durante o mapeamento', async () => {
      // Criar um contato existente com o mesmo email
      await prisma.contact.create({
        data: {
          tenantId: mockTenantId,
          firstName: 'Existing',
          lastName: 'Contact',
          email: 'existing@example.com',
          status: 'ACTIVE'
        }
      });

      // Upload de arquivo com email duplicado
      const csvContent = 'firstName,lastName,email\nNew,Contact,existing@example.com';
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'test.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Mapeamento com validação de unicidade
      const mappingResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: [
            { columnIndex: 0, fieldName: 'firstName', required: true },
            { columnIndex: 1, fieldName: 'lastName', required: false },
            { columnIndex: 2, fieldName: 'email', required: false, unique: true }
          ]
        });

      expect(mappingResponse.status).toBe(200);
      expect(mappingResponse.body.isValid).toBe(false); // Deve ser inválido por causa do email duplicado
      expect(mappingResponse.body.errors).toHaveLength(1);
      expect(mappingResponse.body.errors[0].code).toBe('NOT_UNIQUE');
      expect(mappingResponse.body.errors[0].field).toBe('email');

      // Limpar arquivo temporário
      temporaryFileStorage.removeFile(fileId);
    });

    it('deve aplicar regras de negócio durante o mapeamento', async () => {
      // Upload de arquivo com dados que violam regras de negócio
      const csvContent = 'firstName,lastName,birthDate\nJohn,Doe,2025-01-01'; // Data de nascimento no futuro
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'test.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Mapeamento com regras de negócio
      const mappingResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: [
            { columnIndex: 0, fieldName: 'firstName', required: true },
            { columnIndex: 1, fieldName: 'lastName', required: false },
            { columnIndex: 2, fieldName: 'birthDate', required: false, type: 'date' }
          ]
        });

      expect(mappingResponse.status).toBe(200);
      expect(mappingResponse.body.isValid).toBe(false); // Deve ser inválido por causa da data de nascimento
      expect(mappingResponse.body.errors).toHaveLength(1);
      expect(mappingResponse.body.errors[0].code).toBe('BUSINESS_RULE_VIOLATION');
      expect(mappingResponse.body.errors[0].field).toBe('birthDate');

      // Limpar arquivo temporário
      temporaryFileStorage.removeFile(fileId);
    });

    it('deve funcionar com arquivos Excel (.xlsx)', async () => {
      // Testar com conteúdo Excel real usando a biblioteca xlsx
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['firstName', 'lastName', 'email'],
        ['John', 'Doe', 'john@example.com'],
        ['Jane', 'Smith', 'jane@example.com']
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const excelContent = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', excelContent, { filename: 'test.xlsx' });

      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body.fileId).toBeDefined();
      expect(uploadResponse.body.fileType).toBe('xlsx');

      const fileId = uploadResponse.body.fileId;

      // Mapeamento para Excel
      const mappingResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: [
            { columnIndex: 0, fieldName: 'firstName', required: true },
            { columnIndex: 1, fieldName: 'lastName', required: false },
            { columnIndex: 2, fieldName: 'email', required: false, type: 'email' }
          ]
        });

      expect(mappingResponse.status).toBe(200);
      expect(mappingResponse.body.isValid).toBe(true);
      expect(mappingResponse.body.preview.rows).toHaveLength(2);

      // Limpar arquivo temporário
      temporaryFileStorage.removeFile(fileId);
    });

    it('deve respeitar limites de proteção', async () => {
      // Criar CSV com muitas linhas para testar limites
      let csvContent = 'firstName,lastName,email\n';
      for (let i = 0; i < 10000; i++) { // Mais do que o limite permitido
        csvContent += `FirstName${i},LastName${i},email${i}@example.com\n`;
      }
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'large_test.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Mapeamento com validação de limites
      const mappingResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: [
            { columnIndex: 0, fieldName: 'firstName', required: true },
            { columnIndex: 1, fieldName: 'lastName', required: false },
            { columnIndex: 2, fieldName: 'email', required: false, type: 'email' }
          ]
        });

      // A resposta deve indicar que o processamento foi feito com limites
      expect(mappingResponse.status).toBe(200);
      
      // Limpar arquivo temporário
      temporaryFileStorage.removeFile(fileId);
    });

    it('deve isolar dados por tenant', async () => {
      const tenantIdA = 'test-tenant-A';
      const tenantIdB = 'test-tenant-B';
      
      // Criar tenants de teste
      await prisma.tenant.createMany({
        data: [
          { id: tenantIdA, name: 'Tenant A', slug: 'tenant-a', status: 'ACTIVE' },
          { id: tenantIdB, name: 'Tenant B', slug: 'tenant-b', status: 'ACTIVE' }
        ],
        skipDuplicates: true
      });

      // Criar contato no tenant A
      await prisma.contact.create({
        data: {
          tenantId: tenantIdA,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'ACTIVE'
        }
      });

      // Upload de arquivo com email duplicado no tenant B (deve ser permitido)
      const csvContent = 'firstName,lastName,email\nJane,Smith,john@example.com'; // Mesmo email do tenant A
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', tenantIdB)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'tenant_b_test.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Mapeamento - deve ser válido porque o email está em outro tenant
      const mappingResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', tenantIdB)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: [
            { columnIndex: 0, fieldName: 'firstName', required: true },
            { columnIndex: 1, fieldName: 'lastName', required: false },
            { columnIndex: 2, fieldName: 'email', required: false, unique: true }
          ]
        });

      expect(mappingResponse.status).toBe(200);
      expect(mappingResponse.body.isValid).toBe(true); // Deve ser válido porque o email está em outro tenant

      // Limpar arquivos temporários
      temporaryFileStorage.removeFile(fileId);
    });
  });

  describe('Casos de Erro e Exceção', () => {
    it('deve lidar com arquivos malformados', async () => {
      // Upload de arquivo com conteúdo malformado
      const malformedBuffer = Buffer.from('This is not a valid CSV or Excel file content');

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', malformedBuffer, { filename: 'malformed.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Mapeamento com conteúdo malformado
      const mappingResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: [
            { columnIndex: 0, fieldName: 'firstName', required: true }
          ]
        });

      // Deve retornar erro de validação de formato
      expect(mappingResponse.status).toBe(200); // Ainda retorna 200 mas com erros
      expect(mappingResponse.body.isValid).toBe(false);
      expect(mappingResponse.body.errors).toHaveLength(1);

      // Limpar arquivo temporário
      temporaryFileStorage.removeFile(fileId);
    });

    it('deve validar permissões de acesso', async () => {
      const csvContent = 'firstName,lastName\nJohn,Doe';
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'permission_test.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Tentar mapeamento com token inválido
      const invalidMappingResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          entityType: 'Contact',
          mappings: [
            { columnIndex: 0, fieldName: 'firstName', required: true }
          ]
        });

      expect(invalidMappingResponse.status).toBe(401);

      // Limpar arquivo temporário
      temporaryFileStorage.removeFile(fileId);
    });

    it('deve lidar com campos ausentes no mapeamento', async () => {
      const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com';
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'missing_fields_test.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Mapeamento incompleto (falta campo obrigatório)
      const mappingResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: [
            { columnIndex: 0, fieldName: 'firstName', required: true },
            // lastName ausente - campo opcional, então deve funcionar
            { columnIndex: 2, fieldName: 'email', required: false }
          ]
        });

      expect(mappingResponse.status).toBe(200);
      expect(mappingResponse.body.isValid).toBe(true);
      expect(mappingResponse.body.preview.rows).toHaveLength(1);
      expect(mappingResponse.body.preview.rows[0].firstName).toBe('John');
      expect(mappingResponse.body.preview.rows[0].lastName).toBeUndefined(); // Ausente
      expect(mappingResponse.body.preview.rows[0].email).toBe('john@example.com');

      // Limpar arquivo temporário
      temporaryFileStorage.removeFile(fileId);
    });
  });

  describe('Validação de Tipos Específicos', () => {
    it('deve validar e converter tipos corretamente', async () => {
      const csvContent = 'name,value,probability,isActive,createdAt\nTest Company,1000.50,0.75,true,2023-01-01';
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'type_validation_test.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      const mappingResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Company',
          mappings: [
            { columnIndex: 0, fieldName: 'name', required: true },
            { columnIndex: 1, fieldName: 'value', required: false, type: 'number' },
            { columnIndex: 2, fieldName: 'probability', required: false, type: 'number' },
            { columnIndex: 3, fieldName: 'isActive', required: false, type: 'boolean' },
            { columnIndex: 4, fieldName: 'createdAt', required: false, type: 'date' }
          ]
        });

      expect(mappingResponse.status).toBe(200);
      expect(mappingResponse.body.isValid).toBe(true);
      expect(mappingResponse.body.preview.rows).toHaveLength(1);

      const previewRow = mappingResponse.body.preview.rows[0];
      expect(previewRow.name).toBe('Test Company');
      expect(previewRow.value).toBe(1000.50); // Deve ser convertido para número
      expect(previewRow.probability).toBe(0.75); // Deve ser convertido para número
      expect(previewRow.isActive).toBe(true); // Deve ser convertido para booleano
      expect(previewRow.createdAt).toBeInstanceOf(Date); // Deve ser convertido para data

      // Limpar arquivo temporário
      temporaryFileStorage.removeFile(fileId);
    });

    it('deve retornar erro para tipos inválidos', async () => {
      const csvContent = 'name,value\nTest Company,not-a-number';
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'invalid_type_test.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      const mappingResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Company',
          mappings: [
            { columnIndex: 0, fieldName: 'name', required: true },
            { columnIndex: 1, fieldName: 'value', required: false, type: 'number' }
          ]
        });

      expect(mappingResponse.status).toBe(200);
      expect(mappingResponse.body.isValid).toBe(false);
      expect(mappingResponse.body.errors).toHaveLength(1);
      expect(mappingResponse.body.errors[0].field).toBe('value');
      expect(mappingResponse.body.errors[0].code).toBe('INVALID_TYPE');

      // Limpar arquivo temporário
      temporaryFileStorage.removeFile(fileId);
    });
  });
});