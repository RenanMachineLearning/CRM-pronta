/**
 * Testes de segurança para a funcionalidade de mapeamento de importação
 */

import request from 'supertest';
import { app } from '../../../src/index';
import { prisma } from '../../../src/utils/prisma';
import { temporaryFileStorage } from '../../../src/services/uploadService';
import { FieldMapping } from '../../../src/types/mapping.types';

describe('Import Mapping Security Tests', () => {
  const mockTenantId = 'test-tenant-id-security';
  const mockUserId = 'test-user-id-security';
  const mockTenantId2 = 'test-tenant-id-security-2';
  const mockUserId2 = 'test-user-id-security-2';
  let authToken: string;
  let authToken2: string;

  beforeAll(async () => {
    // Setup: Create test tenants and users
    await prisma.tenant.upsert({
      where: { id: mockTenantId },
      update: {},
      create: {
        id: mockTenantId,
        name: 'Test Tenant Security 1',
        slug: 'test-tenant-security-1',
        status: 'ACTIVE'
      }
    });

    await prisma.tenant.upsert({
      where: { id: mockTenantId2 },
      update: {},
      create: {
        id: mockTenantId2,
        name: 'Test Tenant Security 2',
        slug: 'test-tenant-security-2',
        status: 'ACTIVE'
      }
    });

    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: mockTenantId, email: 'security-test1@example.com' } },
      update: {},
      create: {
        email: 'security-test1@example.com',
        name: 'Security Test User 1',
        passwordHash: '$2b$10$examplehashedpasswordthatmeetsminimumrequirements', // Hashed password
        status: 'ACTIVE',
        tenantId: mockTenantId,
      }
    });

    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: mockTenantId2, email: 'security-test2@example.com' } },
      update: {},
      create: {
        email: 'security-test2@example.com',
        name: 'Security Test User 2',
        passwordHash: '$2b$10$examplehashedpasswordthatmeetsminimumrequirements', // Hashed password
        status: 'ACTIVE',
        tenantId: mockTenantId2,
      }
    });

    // Mock tokens for testing
    authToken = 'mock-valid-token-1';
    authToken2 = 'mock-valid-token-2';
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    await prisma.contact.deleteMany({
      where: {
        tenantId: mockTenantId
      }
    });

    await prisma.contact.deleteMany({
      where: {
        tenantId: mockTenantId2
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

    await prisma.contact.deleteMany({
      where: {
        tenantId: mockTenantId2
      }
    });

    // Clean up temporary files from previous tests
    for (const fileId of temporaryFileStorage['files'].keys()) {
      temporaryFileStorage.removeFile(fileId);
    }
  });

  describe('Tenant Isolation Tests', () => {
    let fileForTenant1: string;
    let fileForTenant2: string;

    beforeEach(async () => {
      // Create files for both tenants
      const csvContent1 = 'firstName,lastName,email\nJohn,Doe,john@example.com';
      const csvBuffer1 = Buffer.from(csvContent1);

      const metadata1 = await temporaryFileStorage.storeFile(
        csvBuffer1,
        'tenant1_file.csv',
        'text/csv',
        mockTenantId,
        mockUserId
      );

      fileForTenant1 = metadata1.fileId;

      const csvContent2 = 'firstName,lastName,email\nJane,Smith,jane@example.com';
      const csvBuffer2 = Buffer.from(csvContent2);

      const metadata2 = await temporaryFileStorage.storeFile(
        csvBuffer2,
        'tenant2_file.csv',
        'text/csv',
        mockTenantId2,
        mockUserId2
      );

      fileForTenant2 = metadata2.fileId;
    });

    afterEach(() => {
      // Clean up test files
      temporaryFileStorage.removeFile(fileForTenant1);
      temporaryFileStorage.removeFile(fileForTenant2);
    });

    it('should prevent tenant 1 from accessing tenant 2 file', async () => {
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true }
      ];

      // Tenant 1 tries to access file belonging to Tenant 2
      const response = await request(app)
        .post(`/api/import/${fileForTenant2}/map`) // File belongs to tenant 2
        .set('X-Tenant-Id', mockTenantId) // But request comes from tenant 1
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado');
    });

    it('should allow tenant to access their own file', async () => {
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true }
      ];

      // Tenant 1 accesses their own file
      const response = await request(app)
        .post(`/api/import/${fileForTenant1}/map`) // File belongs to tenant 1
        .set('X-Tenant-Id', mockTenantId) // Request comes from tenant 1
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent tenant 2 from accessing tenant 1 file', async () => {
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true }
      ];

      // Tenant 2 tries to access file belonging to Tenant 1
      const response = await request(app)
        .post(`/api/import/${fileForTenant1}/map`) // File belongs to tenant 1
        .set('X-Tenant-Id', mockTenantId2) // But request comes from tenant 2
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          entityType: 'Contact',
          mappings
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado');
    });
  });

  describe('SQL Injection Prevention Tests', () => {
    it('should prevent SQL injection through field names', async () => {
      const csvContent = 'normal_field,malicious_field\nvalue1,value2';
      const csvBuffer = Buffer.from(csvContent);

      const metadata = await temporaryFileStorage.storeFile(
        csvBuffer,
        'sql_injection_test.csv',
        'text/csv',
        mockTenantId,
        mockUserId
      );

      const maliciousMappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: "'; DROP TABLE contacts; --", required: true },
        { columnIndex: 1, fieldName: 'normalField', required: false }
      ];

      const response = await request(app)
        .post(`/api/import/${metadata.fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: maliciousMappings
        });

      // Should fail validation before reaching DB
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Mapeamento inválido');

      // Clean up
      temporaryFileStorage.removeFile(metadata.fileId);
    });

    it('should prevent injection through entity type', async () => {
      const csvContent = 'field1,field2\nvalue1,value2';
      const csvBuffer = Buffer.from(csvContent);

      const metadata = await temporaryFileStorage.storeFile(
        csvBuffer,
        'entity_injection_test.csv',
        'text/csv',
        mockTenantId,
        mockUserId
      );

      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true }
      ];

      // Try to inject malicious entity name
      const maliciousEntityType = "Contact'; DROP TABLE users; --";

      const response = await request(app)
        .post(`/api/import/${metadata.fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: maliciousEntityType,
          mappings
        });

      // Should fail validation
      expect(response.status).toBe(400);

      // Clean up
      temporaryFileStorage.removeFile(metadata.fileId);
    });
  });

  describe('Rate Limiting and Resource Exhaustion Tests', () => {
    it('should handle multiple concurrent mapping requests', async () => {
      const csvContent = 'firstName,lastName,email\nJohn,Doe,john@example.com';
      const csvBuffer = Buffer.from(csvContent);

      const metadata = await temporaryFileStorage.storeFile(
        csvBuffer,
        'concurrent_test.csv',
        'text/csv',
        mockTenantId,
        mockUserId
      );

      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true },
        { columnIndex: 1, fieldName: 'lastName', required: false },
        { columnIndex: 2, fieldName: 'email', required: false }
      ];

      // Send multiple requests concurrently
      const requests = Array.from({ length: 5 }, () => 
        request(app)
          .post(`/api/import/${metadata.fileId}/map`)
          .set('X-Tenant-Id', mockTenantId)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            entityType: 'Contact',
            mappings
          })
      );

      const responses = await Promise.all(requests);

      // All requests should be processed appropriately
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status); // Either success or rate limited
      });

      // Clean up
      temporaryFileStorage.removeFile(metadata.fileId);
    });
  });

  describe('File Access Validation Tests', () => {
    it('should validate file existence before mapping', async () => {
      const fakeFileId = 'non-existent-file-id';
      const mappings: FieldMapping[] = [
        { columnIndex: 0, fieldName: 'firstName', required: true }
      ];

      const response = await request(app)
        .post(`/api/import/${fakeFileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Arquivo não encontrado');
    });

    it('should validate file expiration', async () => {
      const csvContent = 'firstName,lastName\nJohn,Doe';
      const csvBuffer = Buffer.from(csvContent);

      // Create file with very short TTL
      const metadata = await temporaryFileStorage.storeFile(
        csvBuffer,
        'expiring_file.csv',
        'text/csv',
        mockTenantId,
        mockUserId,
        0.0001 // TTL in minutes (very short)
      );

      // Wait for file to expire
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

      // Attempt cleanup (may already be cleaned by TTL)
      temporaryFileStorage.removeFile(metadata.fileId);
    });
  });

  describe('Input Sanitization Tests', () => {
    it('should sanitize malicious inputs in mapping definitions', async () => {
      const csvContent = 'field1,field2\nvalue1,value2';
      const csvBuffer = Buffer.from(csvContent);

      const metadata = await temporaryFileStorage.storeFile(
        csvBuffer,
        'sanitization_test.csv',
        'text/csv',
        mockTenantId,
        mockUserId
      );

      // Malicious mapping with potential XSS/scripting attempts
      const maliciousMappings: FieldMapping[] = [
        { 
          columnIndex: 0, 
          fieldName: '<script>alert("xss")</script>', 
          required: true 
        },
        { 
          columnIndex: 1, 
          fieldName: 'normalField', 
          required: false 
        }
      ];

      const response = await request(app)
        .post(`/api/import/${metadata.fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: maliciousMappings
        });

      // Should fail validation
      expect(response.status).toBe(400);

      // Clean up
      temporaryFileStorage.removeFile(metadata.fileId);
    });

    it('should validate mapping structure thoroughly', async () => {
      const csvContent = 'field1,field2\nvalue1,value2';
      const csvBuffer = Buffer.from(csvContent);

      const metadata = await temporaryFileStorage.storeFile(
        csvBuffer,
        'validation_test.csv',
        'text/csv',
        mockTenantId,
        mockUserId
      );

      // Invalid mapping structure
      const invalidMappings = [
        { 
          columnIndex: 'not-a-number', // Should be number
          fieldName: 'firstName', 
          required: 'not-a-boolean' // Should be boolean
        }
      ];

      const response = await request(app)
        .post(`/api/import/${metadata.fileId}/map`)
        .set('X-Tenant-Id', mockTenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          entityType: 'Contact',
          mappings: invalidMappings
        });

      expect(response.status).toBe(400);

      // Clean up
      temporaryFileStorage.removeFile(metadata.fileId);
    });
  });
});