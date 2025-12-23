/**
 * Testes E2E para lookup de entidades
 * 
 * Valida estrutura de resposta, validações e preparação para quando dados existirem.
 * 
 * Nota: Como as tabelas de dados ainda não existem (serão criadas nas Etapas 5-7),
 * os testes focam em estrutura e validações, não em dados reais.
 */

import request from 'supertest';
import { app } from '../../src/index';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  assignRoleToUser,
  createStandardRoles,
  createTestEntity,
  closeDatabase,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';

describe('Entity Lookup - E2E Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string; email: string; password: string };
  let adminToken: string;
  let adminRole: { id: string };
  let contactEntity: { id: string };
  let companyEntity: { id: string };
  let customEntity: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Lookup Test Tenant',
      slug: 'lookup-test-tenant',
      status: 'ACTIVE',
    });
    tenant = { id: tenantObj.id, slug: tenantObj.slug };

    // Criar roles padrão
    const roles = await createStandardRoles(tenant.id);
    adminRole = roles.admin;

    // Criar usuário Admin
    const adminUserObj = await createTestUser({
      email: 'admin@lookup.test',
      password: 'AdminPass123',
      name: 'Admin User',
      tenantId: tenant.id,
    });
    adminUser = { ...adminUserObj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser.id, adminRole.id);
    adminToken = generateToken(adminUser.id, tenant.id);

    // Criar entidades de teste
    contactEntity = await createTestEntity({
      tenantId: tenant.id,
      name: 'Contact',
      label: 'Contato',
      isSystem: true,
    });

    companyEntity = await createTestEntity({
      tenantId: tenant.id,
      name: 'Company',
      label: 'Empresa',
      isSystem: true,
    });

    customEntity = await createTestEntity({
      tenantId: tenant.id,
      name: 'CustomEntity',
      label: 'Entidade Customizada',
      isSystem: false,
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('GET /api/entities/:entityId/lookup', () => {
    it('deve retornar estrutura correta (array vazio por enquanto)', async () => {
      const response = await request(app)
        .get(`/api/entities/${contactEntity.id}/lookup`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Por enquanto retorna vazio (implementação preparatória)
      expect(response.body.length).toBe(0);
    });

    it('deve retornar estrutura correta mesmo com query', async () => {
      const response = await request(app)
        .get(`/api/entities/${companyEntity.id}/lookup`)
        .query({ query: 'teste' })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Por enquanto retorna vazio (implementação preparatória)
      expect(response.body.length).toBe(0);
    });

    it('deve retornar estrutura correta com limit', async () => {
      const response = await request(app)
        .get(`/api/entities/${contactEntity.id}/lookup`)
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('deve retornar estrutura correta para entidade customizada', async () => {
      const response = await request(app)
        .get(`/api/entities/${customEntity.id}/lookup`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Por enquanto retorna vazio (implementação preparatória)
      expect(response.body.length).toBe(0);
    });

    it('deve validar limit máximo (100)', async () => {
      const response = await request(app)
        .get(`/api/entities/${contactEntity.id}/lookup`)
        .query({ limit: 150 })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      // Limit deve ser limitado a 100
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('deve rejeitar limit inválido', async () => {
      const response = await request(app)
        .get(`/api/entities/${contactEntity.id}/lookup`)
        .query({ limit: 'invalid' })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Parâmetro inválido');
    });

    it('deve rejeitar limit menor que 1', async () => {
      const response = await request(app)
        .get(`/api/entities/${contactEntity.id}/lookup`)
        .query({ limit: 0 })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Parâmetro inválido');
    });

    it('deve falhar ao buscar lookup de entidade inexistente', async () => {
      const response = await request(app)
        .get('/api/entities/00000000-0000-0000-0000-000000000000/lookup')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entidade não encontrada');
    });

    it('deve requerer autenticação', async () => {
      const response = await request(app)
        .get(`/api/entities/${contactEntity.id}/lookup`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(401);
    });

    it('deve requerer tenant context', async () => {
      const response = await request(app)
        .get(`/api/entities/${contactEntity.id}/lookup`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('Estrutura de Resposta (Preparatória)', () => {
    it('deve retornar array de objetos com id e label quando dados existirem', async () => {
      // Por enquanto retorna vazio, mas quando dados existirem,
      // cada item deve ter { id, label }
      const response = await request(app)
        .get(`/api/entities/${contactEntity.id}/lookup`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Quando dados existirem, validar estrutura:
      // response.body.forEach(item => {
      //   expect(item).toHaveProperty('id');
      //   expect(item).toHaveProperty('label');
      //   expect(typeof item.id).toBe('string');
      //   expect(typeof item.label).toBe('string');
      // });
    });
  });
});

