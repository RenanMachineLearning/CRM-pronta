/**
 * Testes de integração completa para a funcionalidade de mapeamento de importação
 * 
 * Testa o fluxo completo de mapeamento de campos desde o upload do arquivo
 * até a geração de preview com validações completas.
 */

import request from 'supertest';
import { app } from '../../../src/index';
import { prisma } from '../../../src/utils/prisma';
import { temporaryFileStorage } from '../../../src/services/uploadService';
import { FieldMapping } from '../../../src/types/mapping.types';

describe('Import Mapping Full Integration Tests', () => {
  const mockTenantId = 'test-tenant-id-integration';
  let authToken: string;

  beforeAll(async () => {
    // Setup: Create a test tenant and user
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
      where: { tenantId_email: { tenantId: mockTenantId, email: 'integration-test@example.com' } },
      update: {},
      create: {
        email: 'integration-test@example.com',
        name: 'Integration Test User',
        passwordHash: '$2b$10$examplehashedpasswordthatmeetsminimumrequirements', // Hashed password
        status: 'ACTIVE',
        tenantId: mockTenantId,
      }
    });

    // Mock token for testing
    authToken = 'mock-valid-token';
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    await prisma.contact.deleteMany({
      where: {
        tenantId: mockTenantId
      }
    });

    await prisma.company.deleteMany({
      where: {
        tenantId: mockTenantId
      }
    });

    // Cleanup temporary files
    for (const fileId of temporaryFileStorage['files'].keys()) {
      temporaryFileStorage.removeFile(fileId);
    }

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up any data created in previous tests
    await prisma.contact.deleteMany({
      where: {
        tenantId: mockTenantId
      }
    });

    await prisma.company.deleteMany({
      where: {
        tenantId: mockTenantId
      }
    });

    // Clean up temporary files from previous tests
    for (const fileId of temporaryFileStorage['files'].keys()) {
      temporaryFileStorage.removeFile(fileId);
    }
  });

  describe('Complete CSV Mapping Flow', () => {
    it('should handle complete flow: upload -> validate -> map -> preview', async () => {
      // Step 1: Upload CSV file
      const csvContent = 'firstName,lastName,email,phone,company\nJohn,Doe,john@example.com,123456789,ABC Corp\nJane,Smith,jane@example.com,987654321,XYZ Ltd';
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'test.csv' });

      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body.message).toBe('Arquivo enviado com sucesso');
      expect(uploadResponse.body.fileId).toBeDefined();
      
      const fileId = uploadResponse.body.fileId;
      expect(fileId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/); // UUID format

      // Step 2: Validate file
      const validateResponse = await request(app)
        .post('/api/import/validate')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'test.csv' });

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.message).toBe('Arquivo CSV válido');
      expect(validateResponse.body.headers).toEqual(['firstName', 'lastName', 'email', 'phone', 'company']);

      // Step 3: Perform field mapping
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true },
        { columnIndex: 1, fieldName: 'lastName', required: false },
        { columnIndex: 2, fieldName: 'email', required: false, fieldType: 'email' },
        { columnIndex: 3, fieldName: 'phone', required: false, fieldType: 'phone' },
        { columnIndex: 4, fieldName: 'company', required: false }
      ];

      const mapResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings,
          previewRowCount: 2
        });

      expect(mapResponse.status).toBe(200);
      expect(mapResponse.body.success).toBe(true);
      expect(mapResponse.body.fileId).toBe(fileId);
      expect(mapResponse.body.entityType).toBe('Contact');
      expect(mapResponse.body.mappings).toEqual(mappings);
      expect(mapResponse.body.preview).toBeDefined();
      expect(mapResponse.body.preview.stats.totalRows).toBe(2);
      expect(mapResponse.body.preview.stats.validRows).toBe(2);
      expect(mapResponse.body.preview.stats.errorCount).toBe(0);

      // Verify preview data
      const previewRows = mapResponse.body.preview.previewRows;
      expect(previewRows).toHaveLength(2);

      // First row
      expect(previewRows[0].mappedData.firstName).toBe('John');
      expect(previewRows[0].mappedData.lastName).toBe('Doe');
      expect(previewRows[0].mappedData.email).toBe('john@example.com');
      expect(previewRows[0].mappedData.phone).toBe('123456789');
      expect(previewRows[0].mappedData.company).toBe('ABC Corp');
      expect(previewRows[0].isValid).toBe(true);

      // Second row
      expect(previewRows[1].mappedData.firstName).toBe('Jane');
      expect(previewRows[1].mappedData.lastName).toBe('Smith');
      expect(previewRows[1].mappedData.email).toBe('jane@example.com');
      expect(previewRows[1].mappedData.phone).toBe('987654321');
      expect(previewRows[1].mappedData.company).toBe('XYZ Ltd');
      expect(previewRows[1].isValid).toBe(true);

      // Clean up
      temporaryFileStorage.removeFile(fileId);
    });

    it('should handle mapping with validation errors', async () => {
      // Upload CSV with invalid email format
      const csvContent = 'firstName,lastName,email\nJohn,Doe,invalid-email\nJane,Smith,jane@example.com';
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'test_with_errors.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Perform mapping with email validation
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true },
        { columnIndex: 1, fieldName: 'lastName', required: false },
        { columnIndex: 2, fieldName: 'email', required: false, fieldType: 'email' }
      ];

      const mapResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings,
          previewRowCount: 2
        });

      expect(mapResponse.status).toBe(200);
      expect(mapResponse.body.success).toBe(true);

      // Should have 1 valid row and 1 invalid row
      expect(mapResponse.body.preview.stats.totalRows).toBe(2);
      expect(mapResponse.body.preview.stats.validRows).toBe(1);
      expect(mapResponse.body.preview.stats.invalidRows).toBe(1);
      expect(mapResponse.body.preview.stats.errorCount).toBeGreaterThan(0);

      // First row should be invalid due to invalid email
      expect(mapResponse.body.preview.previewRows[0].isValid).toBe(false);
      expect(mapResponse.body.preview.previewRows[0].errors).toHaveLength(1);
      expect(mapResponse.body.preview.previewRows[0].errors[0].type).toBe('TYPE_MISMATCH');
      expect(mapResponse.body.preview.previewRows[0].errors[0].field).toBe('email');

      // Second row should be valid
      expect(mapResponse.body.preview.previewRows[1].isValid).toBe(true);
      expect(mapResponse.body.preview.previewRows[1].errors).toHaveLength(0);

      // Clean up
      temporaryFileStorage.removeFile(fileId);
    });

    it('should work with different entity types', async () => {
      // Upload CSV for company data
      const csvContent = 'name,email,phone,industry,size\nABC Corp,contact@abccorp.com,123456789,Technology,MEDIUM\nXYZ Ltd,info@xyzltd.com,987654321,Finance,SMALL';
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'companies.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Perform mapping for Company entity
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'name', required: true },
        { columnIndex: 1, fieldName: 'email', required: false, fieldType: 'email' },
        { columnIndex: 2, fieldName: 'phone', required: false },
        { columnIndex: 3, fieldName: 'industry', required: false },
        { columnIndex: 4, fieldName: 'size', required: false, fieldType: 'select' }
      ];

      const mapResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Company',
          mappings,
          previewRowCount: 2
        });

      expect(mapResponse.status).toBe(200);
      expect(mapResponse.body.success).toBe(true);
      expect(mapResponse.body.entityType).toBe('Company');

      // Verify preview data for companies
      const previewRows = mapResponse.body.preview.previewRows;
      expect(previewRows).toHaveLength(2);

      expect(previewRows[0].mappedData.name).toBe('ABC Corp');
      expect(previewRows[0].mappedData.email).toBe('contact@abccorp.com');
      expect(previewRows[0].mappedData.industry).toBe('Technology');
      expect(previewRows[0].mappedData.size).toBe('MEDIUM');

      expect(previewRows[1].mappedData.name).toBe('XYZ Ltd');
      expect(previewRows[1].mappedData.email).toBe('info@xyzltd.com');
      expect(previewRows[1].mappedData.industry).toBe('Finance');
      expect(previewRows[1].mappedData.size).toBe('SMALL');

      // Clean up
      temporaryFileStorage.removeFile(fileId);
    });

    it('should handle custom fields in mapping', async () => {
      // Create a custom field for testing
      const customField = await prisma.field.create({
        data: {
          name: 'customerSegment',
          label: 'Segmento do Cliente',
          type: 'String',
          required: false,
          unique: false,
          entity: {
            connectOrCreate: {
              where: { Entity_tenantId_name_unique: { name: 'Contact', tenantId: mockTenantId } },
              create: {
                name: 'Contact',
                label: 'Contato',
                tenantId: mockTenantId
              }
            }
          },
          tenantId: mockTenantId
        }
      });

      // Upload CSV with custom field data
      const csvContent = 'firstName,lastName,customerSegment\nJohn,Doe,Premium\nJane,Smith,Standard';
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'custom_fields.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Perform mapping including custom field
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true },
        { columnIndex: 1, fieldName: 'lastName', required: false },
        { columnIndex: 2, fieldName: 'customerSegment', required: false }
      ];

      const mapResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings,
          previewRowCount: 2
        });

      expect(mapResponse.status).toBe(200);
      expect(mapResponse.body.success).toBe(true);

      // Verify custom field data is mapped correctly
      const previewRows = mapResponse.body.preview.previewRows;
      expect(previewRows).toHaveLength(2);

      expect(previewRows[0].mappedData.customerSegment).toBe('Premium');
      expect(previewRows[1].mappedData.customerSegment).toBe('Standard');

      // Clean up
      await prisma.field.delete({ where: { id: customField.id } });
      temporaryFileStorage.removeFile(fileId);
    });

    it('should handle large files with appropriate performance', async () => {
      // Create a larger CSV file (20 rows)
      let csvContent = 'firstName,lastName,email,phone\n';
      for (let i = 0; i < 20; i++) {
        csvContent += `FirstName${i},LastName${i},email${i}@example.com,${100000000 + i}\n`;
      }
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'large_file.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Perform mapping with preview of 10 rows
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true },
        { columnIndex: 1, fieldName: 'lastName', required: false },
        { columnIndex: 2, fieldName: 'email', required: false, fieldType: 'email' },
        { columnIndex: 3, fieldName: 'phone', required: false }
      ];

      const startTime = Date.now();
      const mapResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings,
          previewRowCount: 10
        });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(mapResponse.status).toBe(200);
      expect(mapResponse.body.success).toBe(true);
      expect(mapResponse.body.preview.stats.totalRows).toBe(10);
      expect(mapResponse.body.preview.stats.validRows).toBe(10);
      
      // Processing should be reasonably fast (less than 5 seconds for this amount of data)
      expect(processingTime).toBeLessThan(5000);

      // Verify that preview contains the expected number of rows
      expect(mapResponse.body.preview.previewRows).toHaveLength(10);

      // Clean up
      temporaryFileStorage.removeFile(fileId);
    });
  });

  describe('Error Handling in Full Flow', () => {
    it('should handle file upload errors gracefully', async () => {
      // Try to upload a non-CSV file
      const txtContent = 'This is not a CSV file';
      const txtBuffer = Buffer.from(txtContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', txtBuffer, { filename: 'not_csv.txt' });

      expect(uploadResponse.status).toBe(400);
      expect(uploadResponse.body.error).toBeDefined();
    });

    it('should handle mapping errors for non-existent fields', async () => {
      const csvContent = 'firstName,lastName\nJohn,Doe';
      const csvBuffer = Buffer.from(csvContent);

      const uploadResponse = await request(app)
        .post('/api/import/upload')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvBuffer, { filename: 'test.csv' });

      expect(uploadResponse.status).toBe(200);
      const fileId = uploadResponse.body.fileId;

      // Try to map to a non-existent field
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'nonExistentField', required: true }
      ];

      const mapResponse = await request(app)
        .post(`/api/import/${fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings
        });

      expect(mapResponse.status).toBe(400);
      expect(mapResponse.body.error).toBe('Mapeamento inválido');

      // Clean up
      temporaryFileStorage.removeFile(fileId);
    });

    it('should handle missing file ID gracefully', async () => {
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true }
      ];

      const mapResponse = await request(app)
        .post('/api/import/non-existent-id/map')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings
        });

      expect(mapResponse.status).toBe(404);
      expect(mapResponse.body.error).toBe('Arquivo não encontrado');
    });
  });
});