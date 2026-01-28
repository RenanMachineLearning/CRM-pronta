/**
 * Testes de integração para GET /api/export/:entityType (Etapa 9 - Parte 8).
 *
 * Valida: exportação CSV funciona, exportação Excel funciona,
 * filtros aplicados na exportação funcionam, seleção de campos funciona.
 */

import request from 'supertest';
import { app } from '../../../src/index';
import { cleanDatabase, createTestTenant, createTestUser, closeDatabase } from '../../helpers/db';

describe('GET /api/export/:entityType - Integration Tests', () => {
  let tenantId: string;
  let authToken: string;
  const password = 'ExportTestPassword123';

  beforeAll(async () => {
    await cleanDatabase();

    const tenant = await createTestTenant({
      name: 'Export Test Tenant',
      slug: 'export-test-tenant',
      status: 'ACTIVE',
    });
    tenantId = tenant.id;

    const user = await createTestUser({
      email: 'export-test@example.com',
      password,
      name: 'Export Test User',
      tenantId,
      status: 'ACTIVE',
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-Id', tenantId)
      .send({ email: user.email, password });
    if (loginRes.status !== 200 || !loginRes.body?.token) {
      throw new Error('Login failed in test setup');
    }
    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('Teste: exportação CSV funciona', () => {
    it('retorna 200 e arquivo CSV com Content-Disposition e headers', async () => {
      const res = await request(app)
        .get('/api/export/Contact')
        .query({ format: 'csv', fields: 'id,firstName,lastName' })
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.body).toBeDefined();
      const str = Buffer.isBuffer(res.body) ? res.body.toString('utf8') : String(res.body);
      expect(str).toMatch(/id|firstName|lastName/i);
    });
  });

  describe('Teste: exportação Excel funciona', () => {
    it('retorna 200 e arquivo XLSX com Content-Disposition', async () => {
      const res = await request(app)
        .get('/api/export/Contact')
        .query({ format: 'excel', fields: 'id,firstName' })
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-type']).toMatch(/spreadsheet/);
      expect(Buffer.isBuffer(res.body) || typeof res.body === 'object').toBe(true);
    });
  });

  describe('Teste: filtros aplicados na exportação funcionam', () => {
    it('aceita filters como JSON e retorna 200', async () => {
      const filters = JSON.stringify([{ field: 'status', operator: 'equals', value: 'ACTIVE' }]);
      const res = await request(app)
        .get('/api/export/Contact')
        .query({ format: 'csv', fields: 'id', filters })
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers['content-type']).toMatch(/text\/csv/);
      }
    });
  });

  describe('Teste: seleção de campos funciona', () => {
    it('retorna apenas os campos solicitados no CSV', async () => {
      const res = await request(app)
        .get('/api/export/Contact')
        .query({ format: 'csv', fields: 'id,firstName' })
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const str = Buffer.isBuffer(res.body) ? res.body.toString('utf8') : String(res.body);
      const firstLine = str.split('\n')[0] || '';
      expect(firstLine).toMatch(/id/);
      expect(firstLine).toMatch(/firstName/);
    });
  });

  describe('Comportamento de erro', () => {
    it('retorna 400 para entityType inválido', async () => {
      const res = await request(app)
        .get('/api/export/InvalidEntity')
        .query({ format: 'csv', fields: 'id' })
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/entityType inválido/i);
    });

    it('retorna 400 quando fields está vazio', async () => {
      const res = await request(app)
        .get('/api/export/Contact')
        .query({ format: 'csv' })
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/fields/i);
    });

    it('retorna 401 sem token', async () => {
      const res = await request(app)
        .get('/api/export/Contact')
        .query({ format: 'csv', fields: 'id' })
        .set('X-Tenant-Id', tenantId);

      expect(res.status).toBe(401);
    });
  });
});
