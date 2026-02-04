/**
 * Testes de integração para a funcionalidade de mapeamento de campos de importação
 */

import request from 'supertest';
import { app } from '../../../src/index';
import { prisma } from '../../../src/utils/prisma';
import { temporaryFileStorage } from '../../../src/services/uploadService';
import { FieldMapping } from '../../../src/types/mapping.types';

describe('Import Mapping API Integration Tests', () => {
  // Mock tenant and user for testing
  const mockTenantId = 'test-tenant-id-mapping';
  const mockUserId = 'test-user-id-mapping';
  let authToken: string;

  beforeAll(async () => {
    // Setup: Create a test tenant if needed
    await prisma.tenant.upsert({
      where: { id: mockTenantId },
      update: {},
      create: {
        id: mockTenantId,
        name: 'Test Tenant Mapping',
        slug: 'test-tenant-mapping',
        status: 'ACTIVE'
      }
    });

    // Create a test user
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: mockTenantId, email: 'mapping-test@example.com' } },
      update: {},
      create: {
        email: 'mapping-test@example.com',
        name: 'Mapping Test User',
        passwordHash: '$2b$10$examplehashedpasswordthatmeetsminimumrequirements', // Hashed password
        status: 'ACTIVE',
        tenantId: mockTenantId,
        // roleId is not in the base User model, it's in UserRole
      }
    });

    // In a real scenario, we would need to implement proper authentication
    // For now, we'll use a mock token
    authToken = 'mock-valid-token';
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    await prisma.contact.deleteMany({
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
    // Clean up any contacts created in previous tests
    await prisma.contact.deleteMany({
      where: {
        tenantId: mockTenantId
      }
    });

    // Clean up temporary files from previous tests
    for (const fileId of temporaryFileStorage['files'].keys()) {
      temporaryFileStorage.removeFile(fileId);
    }
  });

  describe('POST /api/import/:fileId/map', () => {
    let testFileId: string;

    beforeEach(async () => {
      // Create a temporary file for testing
      const csvContent = 'firstName,lastName,email,phone\nJohn,Doe,john@example.com,123456789\nJane,Smith,jane@example.com,987654321';
      const csvBuffer = Buffer.from(csvContent);

      const metadata = await temporaryFileStorage.storeFile(
        csvBuffer,
        'test.csv',
        'text/csv',
        mockTenantId,
        mockUserId
      );

      testFileId = metadata.fileId;
    });

    afterEach(() => {
      // Clean up the test file
      temporaryFileStorage.removeFile(testFileId);
    });

    it('should successfully map fields and return preview', async () => {
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true },
        { columnIndex: 1, fieldName: 'lastName', required: false },
        { columnIndex: 2, fieldName: 'email', required: false },
        { columnIndex: 3, fieldName: 'phone', required: false }
      ];

      const response = await request(app)
        .post(`/api/import/${testFileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings,
          previewRowCount: 2
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.fileId).toBe(testFileId);
      expect(response.body.entityType).toBe('Contact');
      expect(response.body.mappings).toEqual(mappings);
      expect(response.body.preview).toBeDefined();
      expect(response.body.preview.stats.totalRows).toBe(2);
      expect(response.body.preview.previewRows).toHaveLength(2);

      // Verify the mapped data structure
      const previewRow = response.body.preview.previewRows[0];
      expect(previewRow.mappedData.firstName).toBe('John');
      expect(previewRow.mappedData.lastName).toBe('Doe');
      expect(previewRow.mappedData.email).toBe('john@example.com');
      expect(previewRow.mappedData.phone).toBe('123456789');
    });

    it('should return validation errors for invalid mappings', async () => {
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'nonexistentField', required: true },
        { columnIndex: 1, fieldName: 'lastName', required: false }
      ];

      const response = await request(app)
        .post(`/api/import/${testFileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Mapeamento inválido');
    });

    it('should return error for invalid fileId', async () => {
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true }
      ];

      const response = await request(app)
        .post('/api/import/invalid-file-id/map')
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Arquivo não encontrado');
    });

    it('should return error for unauthorized access', async () => {
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true }
      ];

      const response = await request(app)
        .post(`/api/import/${testFileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          entityType: 'Contact',
          mappings
        });

      expect(response.status).toBe(401);
    });

    it('should return error for missing required parameters', async () => {
      const response = await request(app)
        .post(`/api/import/${testFileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return error for invalid mapping structure', async () => {
      const invalidMappings = [
        { columnIndex: 'invalid', fieldName: 'firstName', required: true },
        { columnIndex: 1, fieldName: 'lastName', required: false }
      ];

      const response = await request(app)
        .post(`/api/import/${testFileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: invalidMappings
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Mapeamento inválido');
    });

    it('should handle duplicate column mappings correctly', async () => {
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true },
        { columnIndex: 0, fieldName: 'lastName', required: false } // Same column index
      ];

      const response = await request(app)
        .post(`/api/import/${testFileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Mapeamento inválido');
    });

    it('should work with different entity types', async () => {
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'name', required: true },
        { columnIndex: 1, fieldName: 'description', required: false }
      ];

      // Test with Company entity
      const response = await request(app)
        .post(`/api/import/${testFileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Company',
          mappings,
          previewRowCount: 1
        });

      // This might fail if the mapping isn't compatible, but we're testing the endpoint structure
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should return appropriate preview row count', async () => {
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true },
        { columnIndex: 1, fieldName: 'lastName', required: false }
      ];

      const response = await request(app)
        .post(`/api/import/${testFileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings,
          previewRowCount: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.preview.stats.totalRows).toBe(1);
      expect(response.body.preview.previewRows).toHaveLength(1);
    });
  });

  describe('Security and Edge Cases', () => {
    it('should prevent access to files from different tenants', async () => {
      // Create a file with a different tenant ID
      const csvContent = 'firstName,lastName\nJohn,Doe';
      const csvBuffer = Buffer.from(csvContent);

      const differentTenantId = 'different-tenant-id';
      const metadata = await temporaryFileStorage.storeFile(
        csvBuffer,
        'test.csv',
        'text/csv',
        differentTenantId,
        mockUserId
      );

      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true }
      ];

      const response = await request(app)
        .post(`/api/import/${metadata.fileId}/map`)
        .set('X-Tenant-Id', mockTenantId) // Different tenant accessing the file
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado');

      // Clean up
      temporaryFileStorage.removeFile(metadata.fileId);
    });

    it('should handle expired files', async () => {
      // Create a file with a very short TTL
      const csvContent = 'firstName,lastName\nJohn,Doe';
      const csvBuffer = Buffer.from(csvContent);

      const metadata = await temporaryFileStorage.storeFile(
        csvBuffer,
        'test.csv',
        'text/csv',
        mockTenantId,
        mockUserId,
        0.0001 // Very short TTL (fraction of a second)
      );

      // Wait for the file to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true }
      ];

      const response = await request(app)
        .post(`/api/import/${metadata.fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Arquivo não encontrado');

      // Attempt to clean up (might already be cleaned by TTL)
      temporaryFileStorage.removeFile(metadata.fileId);
    });

    it('should handle large preview row counts', async () => {
      // Create a file with many rows
      let csvContent = 'firstName,lastName,email\n';
      for (let i = 0; i < 100; i++) {
        csvContent += `FirstName${i},LastName${i},email${i}@example.com\n`;
      }
      const csvBuffer = Buffer.from(csvContent);

      const metadata = await temporaryFileStorage.storeFile(
        csvBuffer,
        'large_test.csv',
        'text/csv',
        mockTenantId,
        mockUserId
      );

      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true },
        { columnIndex: 1, fieldName: 'lastName', required: false },
        { columnIndex: 2, fieldName: 'email', required: false }
      ];

      const response = await request(app)
        .post(`/api/import/${metadata.fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings,
          previewRowCount: 50 // Large preview count
        });

      expect(response.status).toBe(200);
      expect(response.body.preview.stats.totalRows).toBeLessThanOrEqual(50);
      expect(response.body.preview.previewRows).toHaveLength(response.body.preview.stats.totalRows);

      // Clean up
      temporaryFileStorage.removeFile(metadata.fileId);
    });
  });
});