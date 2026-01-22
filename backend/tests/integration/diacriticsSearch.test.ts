/**
 * Testes de integração para busca tolerante a diacríticos
 *
 * Valida que buscas sem acentos encontram registros com acentos e vice-versa.
 * Testa em todas as entidades e na busca global.
 */

import request from 'supertest';
import { app } from '../../src/index';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  assignRoleToUser,
  createStandardRoles,
  createTestPermission,
  closeDatabase,
  prisma,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';

describe('Diacritics Search Integration Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string; email: string; password: string };
  let adminToken: string;
  let adminRole: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Diacritics Test Tenant',
      slug: 'diacritics-test-tenant',
      status: 'ACTIVE',
    });
    tenant = { id: tenantObj.id, slug: tenantObj.slug };

    // Criar roles padrão
    const roles = await createStandardRoles(tenant.id);
    adminRole = roles.admin;

    // Criar permissões para todas as entidades
    const entities = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task', 'Note'];
    for (const entity of entities) {
      await createTestPermission({ tenantId: tenant.id, entity, action: 'list' });
      await createTestPermission({ tenantId: tenant.id, entity, action: 'read' });
      await createTestPermission({ tenantId: tenant.id, entity, action: 'create' });
    }

    // Criar usuário admin
    const userObj = await createTestUser({
      tenantId: tenant.id,
      email: 'admin@diacritics.test',
      password: 'Test123!@#',
      name: 'Admin User',
    });
    adminUser = { id: userObj.id, email: userObj.email, password: 'Test123!@#' };

    // Associar role admin ao usuário
    await assignRoleToUser(adminUser.id, adminRole.id, tenant.id);

    // Gerar token
    adminToken = generateToken(adminUser.id, tenant.id);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Contact - Busca tolerante a diacríticos', () => {
    beforeAll(async () => {
      // Criar contato com acentos
      await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          firstName: 'José',
          lastName: 'Silva',
          status: 'ACTIVE',
        },
      });

      // Criar outro contato com acentos
      await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          firstName: 'Maria',
          lastName: 'Ação',
          status: 'ACTIVE',
        },
      });
    });

    it('deve encontrar "José" ao buscar "jose"', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'jose' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      const found = response.body.data.find((c: any) => c.firstName === 'José');
      expect(found).toBeDefined();
    });

    it('deve encontrar "José" ao buscar "JOSÉ" (case-insensitive + normalização)', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'JOSÉ' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      const found = response.body.data.find((c: any) => c.firstName === 'José');
      expect(found).toBeDefined();
    });

    it('deve encontrar "Ação" ao buscar "acao"', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'acao' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      const found = response.body.data.find((c: any) => c.lastName === 'Ação');
      expect(found).toBeDefined();
    });
  });

  describe('Company - Busca tolerante a diacríticos', () => {
    beforeAll(async () => {
      // Criar empresa com acentos
      await prisma.company.create({
        data: {
          tenantId: tenant.id,
          name: 'São Paulo Tech',
          status: 'ACTIVE',
        },
      });

      // Criar outra empresa com acentos
      await prisma.company.create({
        data: {
          tenantId: tenant.id,
          name: 'Ação Digital',
          status: 'ACTIVE',
        },
      });
    });

    it('deve encontrar "São Paulo Tech" ao buscar "sao paulo"', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'sao paulo' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      const found = response.body.data.find((c: any) => c.name === 'São Paulo Tech');
      expect(found).toBeDefined();
    });

    it('deve encontrar "São Paulo Tech" ao buscar "SÃO PAULO"', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'SÃO PAULO' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      const found = response.body.data.find((c: any) => c.name === 'São Paulo Tech');
      expect(found).toBeDefined();
    });

    it('deve encontrar "Ação Digital" ao buscar "acao"', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'acao' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      const found = response.body.data.find((c: any) => c.name === 'Ação Digital');
      expect(found).toBeDefined();
    });
  });

  describe('Lead - Busca tolerante a diacríticos', () => {
    beforeAll(async () => {
      // Criar lead com acentos
      await prisma.lead.create({
        data: {
          tenantId: tenant.id,
          firstName: 'João',
          lastName: 'Santos',
          status: 'NEW',
        },
      });
    });

    it('deve encontrar "João" ao buscar "joao"', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'joao' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      const found = response.body.data.find((l: any) => l.firstName === 'João');
      expect(found).toBeDefined();
    });
  });

  describe('Opportunity - Busca tolerante a diacríticos', () => {
    let pipeline: any;
    let stage: any;

    beforeAll(async () => {
      // Criar pipeline e stage
      pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant.id,
          name: 'Test Pipeline',
          isDefault: true,
        },
      });

      stage = await prisma.pipelineStage.create({
        data: {
          tenantId: tenant.id,
          pipelineId: pipeline.id,
          name: 'Test Stage',
          order: 1,
        },
      });

      // Criar oportunidade com acentos
      await prisma.opportunity.create({
        data: {
          tenantId: tenant.id,
          name: 'Projeto Ação',
          value: 10000,
          stageId: stage.id,
          status: 'OPEN',
        },
      });
    });

    it('deve encontrar "Projeto Ação" ao buscar "acao"', async () => {
      const response = await request(app)
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'acao' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      const found = response.body.data.find((o: any) => o.name === 'Projeto Ação');
      expect(found).toBeDefined();
    });
  });

  describe('Busca Global - Tolerante a diacríticos', () => {
    it('deve encontrar contato "José" na busca global com "jose"', async () => {
      const response = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'jose' });

      expect(response.status).toBe(200);
      expect(response.body.results.contacts.length).toBeGreaterThan(0);
      const found = response.body.results.contacts.find((c: any) => 
        c.data.firstName === 'José'
      );
      expect(found).toBeDefined();
    });

    it('deve encontrar empresa "São Paulo Tech" na busca global com "sao paulo"', async () => {
      const response = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'sao paulo' });

      expect(response.status).toBe(200);
      expect(response.body.results.companies.length).toBeGreaterThan(0);
      const found = response.body.results.companies.find((c: any) => 
        c.data.name === 'São Paulo Tech'
      );
      expect(found).toBeDefined();
    });
  });

  describe('Casos especiais', () => {
    it('deve funcionar com caracteres especiais como ç', async () => {
      // Criar contato com ç
      await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          firstName: 'François',
          lastName: 'Müller',
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'francois' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      const found = response.body.data.find((c: any) => c.firstName === 'François');
      expect(found).toBeDefined();
    });

    it('deve funcionar com múltiplas palavras acentuadas', async () => {
      await prisma.company.create({
        data: {
          tenantId: tenant.id,
          name: 'Empresa de Ação e Reação',
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'acao reacao' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      const found = response.body.data.find((c: any) => 
        c.name === 'Empresa de Ação e Reação'
      );
      expect(found).toBeDefined();
    });
  });
});
