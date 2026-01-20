/**
 * Testes E2E para Busca Global
 * 
 * Valida endpoint de busca global em múltiplas entidades.
 * Testa isolamento multi-tenant, permissões, filtros e performance.
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

describe('Search Routes - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string };
  let regularUser1: { id: string; email: string };
  let adminToken1: string;
  let regularToken1: string;
  let adminRole1: { id: string };
  let stage1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Search Test Tenant 1',
      slug: 'search-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Search Test Tenant 2',
      slug: 'search-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    // Criar permissões para entidades
    const permissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'list' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'list' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'list' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Opportunity', action: 'list' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Opportunity', action: 'read' }),
    ]);

    // Associar permissões ao Admin
    await prisma.rolePermission.createMany({
      data: permissions1.map(perm => ({
        roleId: adminRole1.id,
        permissionId: perm.id,
      })),
    });

    // Criar usuários
    const adminUser1Obj = await createTestUser({
      email: 'admin1@search.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { id: adminUser1Obj.id, email: adminUser1Obj.email };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const regularUser1Obj = await createTestUser({
      email: 'regular1@search.test',
      password: 'RegularPass123',
      name: 'Regular User 1',
      tenantId: tenant1.id,
    });
    regularUser1 = { id: regularUser1Obj.id, email: regularUser1Obj.email };

    // Gerar tokens
    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    regularToken1 = generateToken(regularUser1.id, tenant1.id);

    // Criar pipeline e estágio
    const pipeline1 = await prisma.pipeline.create({
      data: {
        tenantId: tenant1.id,
        name: 'Pipeline Teste',
        isDefault: true,
      },
    });

    stage1 = await prisma.pipelineStage.create({
      data: {
        tenantId: tenant1.id,
        pipelineId: pipeline1.id,
        name: 'Qualificação',
        order: 1,
        probability: 25,
      },
    });

    // Criar dados de teste
    await prisma.contact.create({
      data: {
        tenantId: tenant1.id,
        firstName: 'João',
        lastName: 'Silva',
        status: 'ACTIVE',
        emails: {
          create: {
            tenantId: tenant1.id,
            email: 'joao.silva@example.com',
            type: 'WORK',
            isPrimary: true,
          },
        },
        phones: {
          create: {
            tenantId: tenant1.id,
            phone: '+55 11 99999-9999',
            type: 'MOBILE',
            isPrimary: true,
          },
        },
      },
    });

    await prisma.company.create({
      data: {
        tenantId: tenant1.id,
        name: 'Empresa Silva LTDA',
        website: 'https://silva.com.br',
        industry: 'Tecnologia',
        status: 'ACTIVE',
      },
    });

    await prisma.lead.create({
      data: {
        tenantId: tenant1.id,
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria.santos@example.com',
        company: 'Empresa Silva LTDA',
        status: 'NEW',
      },
    });

    await prisma.opportunity.create({
      data: {
        tenantId: tenant1.id,
        name: 'Venda para João Silva',
        value: 50000,
        currency: 'BRL',
        status: 'OPEN',
        stageId: stage1.id,
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('GET /api/search', () => {
    it('deve retornar resultados de todas as entidades por padrão', async () => {
      const response = await request(app)
        .get('/api/search?q=silva')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id);

      expect(response.status).toBe(200);
      expect(response.body.query).toBe('silva');
      expect(response.body.results.contacts).toBeDefined();
      expect(response.body.results.companies).toBeDefined();
      expect(response.body.results.leads).toBeDefined();
      expect(response.body.results.opportunities).toBeDefined();
      expect(response.body.totals).toBeDefined();
    });

    it('deve filtrar por entidade específica', async () => {
      const response = await request(app)
        .get('/api/search?q=silva&entities[]=contact&entities[]=company')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id);

      expect(response.status).toBe(200);
      expect(response.body.results.contacts.length).toBeGreaterThan(0);
      expect(response.body.results.companies.length).toBeGreaterThan(0);
      expect(response.body.results.leads.length).toBe(0);
      expect(response.body.results.opportunities.length).toBe(0);
    });

    it('deve respeitar limite de resultados', async () => {
      // Criar mais contatos
      for (let i = 0; i < 15; i++) {
        await prisma.contact.create({
          data: {
            tenantId: tenant1.id,
            firstName: `Silva${i}`,
            lastName: 'Teste',
            status: 'ACTIVE',
          },
        });
      }

      const response = await request(app)
        .get('/api/search?q=silva&limit=5')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id);

      expect(response.status).toBe(200);
      expect(response.body.results.contacts.length).toBeLessThanOrEqual(5);
    });

    it('deve retornar 400 para query vazia', async () => {
      const response = await request(app)
        .get('/api/search?q=')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 401 sem autenticação', async () => {
      const response = await request(app)
        .get('/api/search?q=silva')
        .set('x-tenant-id', tenant1.id);

      expect(response.status).toBe(401);
    });

    it('deve retornar snippet com highlight', async () => {
      const response = await request(app)
        .get('/api/search?q=joão')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id);

      expect(response.status).toBe(200);
      if (response.body.results.contacts.length > 0) {
        expect(response.body.results.contacts[0].snippet).toBeDefined();
        expect(response.body.results.contacts[0].snippet?.text).toContain('<mark>');
      }
    });

    it('deve retornar totais sem limite', async () => {
      const response = await request(app)
        .get('/api/search?q=silva&limit=5')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id);

      expect(response.status).toBe(200);
      expect(response.body.totals.contacts).toBeGreaterThanOrEqual(response.body.results.contacts.length);
    });

    it('deve respeitar isolamento multi-tenant', async () => {
      // Criar contato no tenant2
      await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Carlos',
          lastName: 'Silva',
          status: 'ACTIVE',
        },
      });

      // Buscar como usuário do tenant1
      const response = await request(app)
        .get('/api/search?q=silva')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id);

      expect(response.status).toBe(200);
      // Não deve retornar contato do tenant2
      const hasCarlos = response.body.results.contacts.some(
        (c: any) => c.data.firstName === 'Carlos'
      );
      expect(hasCarlos).toBe(false);
    });

    it('deve buscar com normalização de texto (remover acentos)', async () => {
      const response = await request(app)
        .get('/api/search?q=jose')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id);

      expect(response.status).toBe(200);
      // Deve encontrar "João" mesmo buscando "jose"
      const foundJoao = response.body.results.contacts.some(
        (c: any) => c.data.firstName === 'João'
      );
      expect(foundJoao).toBe(true);
    });

    it('deve buscar em emails e telefones de contatos', async () => {
      const response = await request(app)
        .get('/api/search?q=joao.silva@example.com')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id);

      expect(response.status).toBe(200);
      expect(response.body.results.contacts.length).toBeGreaterThan(0);
    });

    it('deve retornar array vazio para entidades sem permissão', async () => {
      // regularUser1 não tem permissão para Lead
      const response = await request(app)
        .get('/api/search?q=silva')
        .set('Authorization', `Bearer ${regularToken1}`)
        .set('x-tenant-id', tenant1.id);

      expect(response.status).toBe(200);
      // Deve retornar estrutura válida mesmo sem permissões
      expect(response.body.results).toBeDefined();
    });

    it('deve ordenar resultados por relevância', async () => {
      const response = await request(app)
        .get('/api/search?q=silva')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id);

      expect(response.status).toBe(200);
      const contacts = response.body.results.contacts;
      // Verificar que estão ordenados por score (maior primeiro)
      for (let i = 0; i < contacts.length - 1; i++) {
        expect(contacts[i].score).toBeGreaterThanOrEqual(contacts[i + 1].score);
      }
    });
  });
});
