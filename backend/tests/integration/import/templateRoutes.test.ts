/**
 * Testes de integração para GET /api/import/templates/:entityType (Etapa 9 - Parte 9).
 *
 * Valida: template de importação funciona, template tem headers corretos,
 * entityType inválido retorna 400, sem token retorna 401.
 */

import request from 'supertest';
import { app } from '../../../src/index';
import { cleanDatabase, createTestTenant, createTestUser, closeDatabase } from '../../helpers/db';

describe('GET /api/import/templates/:entityType - Integration Tests', () => {
  let tenantId: string;
  let authToken: string;
  const password = 'TemplateTestPassword123';

  beforeAll(async () => {
    await cleanDatabase();

    const tenant = await createTestTenant({
      name: 'Template Test Tenant',
      slug: 'template-test-tenant',
      status: 'ACTIVE',
    });
    tenantId = tenant.id;

    const user = await createTestUser({
      email: 'template-test@example.com',
      password,
      name: 'Template Test User',
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

  describe('Teste: template de importação funciona', () => {
    it('retorna 200 e arquivo CSV com Content-Disposition e headers', async () => {
      const res = await request(app)
        .get('/api/import/templates/Contact')
        .query({ format: 'csv' })
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-disposition']).toMatch(/template-import-Contact/);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.body).toBeDefined();
      const str = Buffer.isBuffer(res.body) ? res.body.toString('utf8') : String(res.body);
      expect(str).toMatch(/firstName|lastName|email/i);
    });

    it('retorna 200 e arquivo Excel com formato excel', async () => {
      const res = await request(app)
        .get('/api/import/templates/Company')
        .query({ format: 'excel' })
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-type']).toMatch(/spreadsheet/);
      expect(Buffer.isBuffer(res.body) || typeof res.body === 'object').toBe(true);
    });

    it('usa csv como formato padrão quando format não informado', async () => {
      const res = await request(app)
        .get('/api/import/templates/Lead')
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
    });
  });

  describe('Teste: template tem headers corretos', () => {
    it('CSV Contact contém firstName, lastName, email na primeira linha', async () => {
      const res = await request(app)
        .get('/api/import/templates/Contact')
        .query({ format: 'csv' })
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const str = Buffer.isBuffer(res.body) ? res.body.toString('utf8') : String(res.body);
      const firstLine = str.split('\n')[0] || '';
      expect(firstLine).toMatch(/firstName/);
      expect(firstLine).toMatch(/lastName/);
      expect(firstLine).toMatch(/email/);
    });

    it('CSV Opportunity contém name, value, stageId', async () => {
      const res = await request(app)
        .get('/api/import/templates/Opportunity')
        .query({ format: 'csv' })
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const str = Buffer.isBuffer(res.body) ? res.body.toString('utf8') : String(res.body);
      const firstLine = str.split('\n')[0] || '';
      expect(firstLine).toMatch(/name/);
      expect(firstLine).toMatch(/value/);
      expect(firstLine).toMatch(/stageId/);
    });
  });

  describe('Comportamento de erro', () => {
    it('retorna 400 para entityType inválido', async () => {
      const res = await request(app)
        .get('/api/import/templates/InvalidEntity')
        .query({ format: 'csv' })
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/entityType inválido/i);
    });

    it('retorna 401 sem token', async () => {
      const res = await request(app)
        .get('/api/import/templates/Contact')
        .query({ format: 'csv' })
        .set('X-Tenant-Id', tenantId);

      expect(res.status).toBe(401);
    });
  });
});
