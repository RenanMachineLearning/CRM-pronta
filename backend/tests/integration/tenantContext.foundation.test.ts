/**
 * Testes de fundação do contexto de tenant
 * 
 * Valida que a identificação de tenant funciona corretamente e que
 * nenhuma requisição entra no sistema sem tenant válido.
 */

import request from 'supertest';
import { app } from '../../src/index';
import { cleanDatabase, createTestTenant, closeDatabase } from '../helpers/db';

describe('Tenant Context - Foundation Tests', () => {
  let activeTenant: { id: string; slug: string };
  let suspendedTenant: { id: string; slug: string };
  let cancelledTenant: { id: string; slug: string };

  beforeAll(async () => {
    await cleanDatabase();

    const active = await createTestTenant({
      name: 'Active Tenant',
      slug: 'active-tenant',
      status: 'ACTIVE',
    });

    const suspended = await createTestTenant({
      name: 'Suspended Tenant',
      slug: 'suspended-tenant',
      status: 'SUSPENDED',
    });

    const cancelled = await createTestTenant({
      name: 'Cancelled Tenant',
      slug: 'cancelled-tenant',
      status: 'CANCELLED',
    });

    activeTenant = { id: active.id, slug: active.slug };
    suspendedTenant = { id: suspended.id, slug: suspended.slug };
    cancelledTenant = { id: cancelled.id, slug: cancelled.slug };
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });


  describe('Rota pública', () => {
    it('GET /health deve retornar 200 sem header de tenant', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('Requisição sem tenant', () => {
    it('Rotas protegidas retornam 400 quando tenant não é fornecido', async () => {
      const response = await request(app).get('/api/test');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('Tenant');
    });
  });

  describe('Tenant inexistente', () => {
    it('Header com ID inválido (UUID inexistente) retorna 403', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Id', '00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('Header com slug inválido (slug inexistente) retorna 403', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Slug', 'tenant-inexistente');

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Tenant inativo', () => {
    it('Tenant com status SUSPENDED retorna 403', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Id', suspendedTenant.id);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('Tenant com status CANCELLED retorna 403', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Id', cancelledTenant.id);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('Tenant SUSPENDED via slug retorna 403', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Slug', suspendedTenant.slug);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Tenant válido', () => {
    it('Header X-Tenant-Id válido retorna 200', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Id', activeTenant.id);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tenantId', activeTenant.id);
      expect(response.body).toHaveProperty('tenant');
    });

    it('Header X-Tenant-Slug válido retorna 200', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Slug', activeTenant.slug);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tenantId', activeTenant.id);
      expect(response.body).toHaveProperty('tenant');
    });
  });
});

