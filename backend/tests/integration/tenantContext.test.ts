/**
 * Testes de integração para o middleware de contexto de tenant
 */

import request from 'supertest';
import { app } from '../../src/index';
import { cleanDatabase, createTestTenant, closeDatabase } from '../helpers/db';

describe('Tenant Context Middleware - Integração', () => {
  let activeTenant: { id: string; slug: string };
  let suspendedTenant: { id: string; slug: string };
  let cancelledTenant: { id: string; slug: string };

  beforeAll(async () => {
    // Limpar banco antes de todos os testes
    await cleanDatabase();

    // Criar tenants de teste
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

  describe('Rota Pública (sem tenant)', () => {
    it('GET /health deve retornar 200 sem header de tenant', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('Rota Protegida sem Tenant', () => {
    it('GET /api/test sem header deve retornar 400', async () => {
      const response = await request(app).get('/api/test');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Tenant não identificado');
      expect(response.body).toHaveProperty(
        'message',
        'Forneça X-Tenant-Id ou X-Tenant-Slug no header'
      );
    });
  });

  describe('Rota Protegida com Tenant Inválido', () => {
    it('GET /api/test com X-Tenant-Id inválido deve retornar 403', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Id', '00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Acesso negado');
      expect(response.body).toHaveProperty(
        'message',
        'Tenant inválido ou inativo'
      );
    });

    it('GET /api/test com X-Tenant-Slug inexistente deve retornar 403', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Slug', 'tenant-inexistente');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Acesso negado');
      expect(response.body).toHaveProperty(
        'message',
        'Tenant inválido ou inativo'
      );
    });
  });

  describe('Rota Protegida com Tenant Válido', () => {
    it('GET /api/test com X-Tenant-Id válido deve retornar 200', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Id', activeTenant.id);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Rota protegida');
      expect(response.body).toHaveProperty('tenantId', activeTenant.id);
      expect(response.body).toHaveProperty('tenant', 'Active Tenant');
    });

    it('GET /api/test com X-Tenant-Slug válido deve retornar 200', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Slug', activeTenant.slug);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Rota protegida');
      expect(response.body).toHaveProperty('tenantId', activeTenant.id);
      expect(response.body).toHaveProperty('tenant', 'Active Tenant');
    });
  });

  describe('Rota Protegida com Tenant Inativo', () => {
    it('GET /api/test com tenant SUSPENDED deve retornar 403', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Id', suspendedTenant.id);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Acesso negado');
      expect(response.body).toHaveProperty(
        'message',
        'Tenant inválido ou inativo'
      );
    });

    it('GET /api/test com tenant CANCELLED deve retornar 403', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Id', cancelledTenant.id);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Acesso negado');
      expect(response.body).toHaveProperty(
        'message',
        'Tenant inválido ou inativo'
      );
    });

    it('GET /api/test com tenant SUSPENDED via slug deve retornar 403', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Slug', suspendedTenant.slug);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Acesso negado');
    });
  });

  describe('Prioridade de Headers', () => {
    it('X-Tenant-Id deve ter prioridade sobre X-Tenant-Slug quando ambos estão presentes', async () => {
      // Criar um tenant com ID diferente do slug
      const tenant = await createTestTenant({
        name: 'Priority Test',
        slug: 'priority-test',
        status: 'ACTIVE',
      });

      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Id', tenant.id)
        .set('X-Tenant-Slug', 'active-tenant'); // Slug de outro tenant

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tenantId', tenant.id);
      expect(response.body).toHaveProperty('tenant', 'Priority Test');
    });
  });
});

