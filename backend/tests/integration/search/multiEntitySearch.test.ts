/**
 * Testes de integração para busca simultânea em múltiplas entidades
 * 
 * Valida que busca global funciona corretamente quando busca em Contact, Company,
 * Lead e Opportunity simultaneamente, agregando resultados e respeitando limites.
 */

import request from 'supertest';
import { app } from '../../../src/index';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  assignRoleToUser,
  createStandardRoles,
  createTestPermission,
  closeDatabase,
  prisma,
} from '../../helpers/db';
import { generateToken } from '../../../src/utils/jwt';

describe('Multi-Entity Search Integration', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string };
  let adminToken1: string;
  let adminRole1: { id: string };
  let stage1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Multi Entity Search Test Tenant 1',
      slug: 'multi-entity-search-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Multi Entity Search Test Tenant 2',
      slug: 'multi-entity-search-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    // Criar permissões para todas as entidades
    const entities = ['Contact', 'Company', 'Lead', 'Opportunity'];
    for (const entity of entities) {
      await createTestPermission({ tenantId: tenant1.id, entity, action: 'list' });
      await createTestPermission({ tenantId: tenant1.id, entity, action: 'read' });
    }

    // Criar usuário admin
    const adminUser1Obj = await createTestUser({
      email: 'admin1@multi-entity.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { id: adminUser1Obj.id, email: adminUser1Obj.email };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    // Gerar token
    adminToken1 = generateToken(adminUser1.id, tenant1.id);

    // Criar pipeline e estágio para oportunidades
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
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Busca simultânea em todas as entidades', () => {
    beforeEach(async () => {
      // Criar dados de teste com mesmo termo em todas as entidades
      const searchTerm = 'Silva';

      // Criar contato
      await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João',
          lastName: searchTerm,
          status: 'ACTIVE',
        },
      });

      // Criar empresa
      await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: `Empresa ${searchTerm}`,
          status: 'ACTIVE',
        },
      });

      // Criar lead
      await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Maria',
          lastName: searchTerm,
          status: 'NEW',
        },
      });

      // Criar oportunidade
      await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: `Oportunidade ${searchTerm}`,
          value: 50000,
          stageId: stage1.id,
          status: 'OPEN',
        },
      });
    });

    afterEach(async () => {
      // Limpar dados de teste
      await prisma.contact.deleteMany({ where: { tenantId: tenant1.id } });
      await prisma.company.deleteMany({ where: { tenantId: tenant1.id } });
      await prisma.lead.deleteMany({ where: { tenantId: tenant1.id } });
      await prisma.opportunity.deleteMany({ where: { tenantId: tenant1.id } });
    });

    it('deve buscar em Contact, Company, Lead e Opportunity simultaneamente', async () => {
      const response = await request(app)
        .get('/api/search?q=silva')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .expect(200);

      expect(response.body).toHaveProperty('query', 'silva');
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveProperty('contacts');
      expect(response.body.results).toHaveProperty('companies');
      expect(response.body.results).toHaveProperty('leads');
      expect(response.body.results).toHaveProperty('opportunities');

      // Verificar que resultados aparecem em todas as entidades
      expect(response.body.results.contacts.length).toBeGreaterThan(0);
      expect(response.body.results.companies.length).toBeGreaterThan(0);
      expect(response.body.results.leads.length).toBeGreaterThan(0);
      expect(response.body.results.opportunities.length).toBeGreaterThan(0);
    });

    it('deve agregar resultados corretamente de múltiplas entidades', async () => {
      const response = await request(app)
        .get('/api/search?q=silva')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .expect(200);

      // Verificar estrutura de resposta
      expect(response.body).toHaveProperty('totals');
      expect(response.body.totals).toHaveProperty('contacts');
      expect(response.body.totals).toHaveProperty('companies');
      expect(response.body.totals).toHaveProperty('leads');
      expect(response.body.totals).toHaveProperty('opportunities');

      // Verificar que totais são >= resultados retornados
      expect(response.body.totals.contacts).toBeGreaterThanOrEqual(response.body.results.contacts.length);
      expect(response.body.totals.companies).toBeGreaterThanOrEqual(response.body.results.companies.length);
      expect(response.body.totals.leads).toBeGreaterThanOrEqual(response.body.results.leads.length);
      expect(response.body.totals.opportunities).toBeGreaterThanOrEqual(response.body.results.opportunities.length);
    });

    it('deve ordenar resultados por relevância dentro de cada entidade', async () => {
      // Criar mais dados com diferentes relevâncias
      await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Silva',
          lastName: 'Silva', // Mais relevante (termo aparece duas vezes)
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .get('/api/search?q=silva')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .expect(200);

      // Verificar que resultados estão ordenados por score (maior primeiro)
      const contacts = response.body.results.contacts;
      if (contacts.length > 1) {
        for (let i = 0; i < contacts.length - 1; i++) {
          expect(contacts[i].score).toBeGreaterThanOrEqual(contacts[i + 1].score);
        }
      }
    });
  });

  describe('Limites por entidade em busca simultânea', () => {
    beforeAll(async () => {
      // Criar 150 registros em cada entidade
      const searchTerm = 'Test';

      // Criar 150 contatos
      const contacts = [];
      for (let i = 1; i <= 150; i++) {
        contacts.push({
          tenantId: tenant1.id,
          firstName: `${searchTerm}${i}`,
          lastName: 'Contact',
          status: 'ACTIVE' as const,
        });
      }
      await prisma.contact.createMany({ data: contacts });

      // Criar 150 empresas
      const companies = [];
      for (let i = 1; i <= 150; i++) {
        companies.push({
          tenantId: tenant1.id,
          name: `${searchTerm} Company ${i}`,
          status: 'ACTIVE' as const,
        });
      }
      await prisma.company.createMany({ data: companies });

      // Criar 150 leads
      const leads = [];
      for (let i = 1; i <= 150; i++) {
        leads.push({
          tenantId: tenant1.id,
          firstName: `${searchTerm}${i}`,
          lastName: 'Lead',
          status: 'NEW' as const,
        });
      }
      await prisma.lead.createMany({ data: leads });

      // Criar 150 oportunidades
      const opportunities = [];
      for (let i = 1; i <= 150; i++) {
        opportunities.push({
          tenantId: tenant1.id,
          name: `${searchTerm} Opportunity ${i}`,
          value: 1000 * i,
          stageId: stage1.id,
          status: 'OPEN' as const,
        });
      }
      await prisma.opportunity.createMany({ data: opportunities });
    });

    afterAll(async () => {
      // Limpar dados
      await prisma.contact.deleteMany({ where: { tenantId: tenant1.id } });
      await prisma.company.deleteMany({ where: { tenantId: tenant1.id } });
      await prisma.lead.deleteMany({ where: { tenantId: tenant1.id } });
      await prisma.opportunity.deleteMany({ where: { tenantId: tenant1.id } });
    });

    it('deve respeitar limite por entidade em busca simultânea', async () => {
      const limit = 10;
      const response = await request(app)
        .get(`/api/search?q=test&limit=${limit}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .expect(200);

      // Verificar que retorna no máximo 'limit' por entidade
      expect(response.body.results.contacts.length).toBeLessThanOrEqual(limit);
      expect(response.body.results.companies.length).toBeLessThanOrEqual(limit);
      expect(response.body.results.leads.length).toBeLessThanOrEqual(limit);
      expect(response.body.results.opportunities.length).toBeLessThanOrEqual(limit);

      // Verificar que totais são maiores que resultados (indicando que há mais dados)
      expect(response.body.totals.contacts).toBeGreaterThan(response.body.results.contacts.length);
      expect(response.body.totals.companies).toBeGreaterThan(response.body.results.companies.length);
      expect(response.body.totals.leads).toBeGreaterThan(response.body.results.leads.length);
      expect(response.body.totals.opportunities).toBeGreaterThan(response.body.results.opportunities.length);
    });

    it('deve respeitar limite máximo de 100 por entidade', async () => {
      const response = await request(app)
        .get('/api/search?q=test&limit=200') // Tentar buscar mais que o limite máximo
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .expect(200);

      // Verificar que retorna no máximo 100 por entidade (limite configurado)
      expect(response.body.results.contacts.length).toBeLessThanOrEqual(100);
      expect(response.body.results.companies.length).toBeLessThanOrEqual(100);
      expect(response.body.results.leads.length).toBeLessThanOrEqual(100);
      expect(response.body.results.opportunities.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Isolamento multi-tenant em busca simultânea', () => {
    beforeAll(async () => {
      // Criar dados no tenant2
      const tenant2Roles = await createStandardRoles(tenant2.id);
      const adminRole2 = tenant2Roles.admin;

      const entities = ['Contact', 'Company', 'Lead', 'Opportunity'];
      for (const entity of entities) {
        await createTestPermission({ tenantId: tenant2.id, entity, action: 'list' });
        await createTestPermission({ tenantId: tenant2.id, entity, action: 'read' });
      }

      const adminUser2 = await createTestUser({
        email: 'admin2@multi-entity.test',
        password: 'AdminPass123',
        name: 'Admin User 2',
        tenantId: tenant2.id,
      });
      await assignRoleToUser(adminUser2.id, adminRole2.id);

      // Criar pipeline e estágio para tenant2
      const pipeline2 = await prisma.pipeline.create({
        data: {
          tenantId: tenant2.id,
          name: 'Pipeline Tenant 2',
          isDefault: true,
        },
      });

      await prisma.pipelineStage.create({
        data: {
          tenantId: tenant2.id,
          pipelineId: pipeline2.id,
          name: 'Qualificação',
          order: 1,
          probability: 25,
        },
      });

      // Criar dados no tenant2
      await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Tenant2',
          lastName: 'Silva',
          status: 'ACTIVE',
        },
      });

      await prisma.company.create({
        data: {
          tenantId: tenant2.id,
          name: 'Empresa Tenant2',
          status: 'ACTIVE',
        },
      });
    });

    it('deve isolar resultados por tenant em busca simultânea', async () => {
      // Criar dados no tenant1
      await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Tenant1',
          lastName: 'Silva',
          status: 'ACTIVE',
        },
      });

      // Buscar como usuário do tenant1
      const response = await request(app)
        .get('/api/search?q=silva')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .expect(200);

      // Verificar que não retorna dados do tenant2
      const contactNames = response.body.results.contacts.map((c: any) => c.data?.firstName || c.data?.lastName || '');
      expect(contactNames).not.toContain('Tenant2');

      // Limpar dados do tenant1
      await prisma.contact.deleteMany({
        where: { tenantId: tenant1.id, lastName: 'Silva' },
      });
    });
  });

  describe('Busca com filtro de entidades específicas', () => {
    beforeEach(async () => {
      // Criar dados em todas as entidades
      await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João',
          lastName: 'Filtro',
          status: 'ACTIVE',
        },
      });

      await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa Filtro',
          status: 'ACTIVE',
        },
      });

      await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Maria',
          lastName: 'Filtro',
          status: 'NEW',
        },
      });
    });

    afterEach(async () => {
      await prisma.contact.deleteMany({ where: { tenantId: tenant1.id, lastName: 'Filtro' } });
      await prisma.company.deleteMany({ where: { tenantId: tenant1.id, name: { contains: 'Filtro' } } });
      await prisma.lead.deleteMany({ where: { tenantId: tenant1.id, lastName: 'Filtro' } });
    });

    it('deve buscar apenas em entidades especificadas', async () => {
      const response = await request(app)
        .get('/api/search?q=filtro&entities[]=contact&entities[]=company')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .expect(200);

      // Deve retornar resultados apenas em contact e company
      expect(response.body.results.contacts.length).toBeGreaterThan(0);
      expect(response.body.results.companies.length).toBeGreaterThan(0);
      // Leads não deve ter resultados (não foi especificado)
      expect(response.body.results.leads.length).toBe(0);
      expect(response.body.results.opportunities.length).toBe(0);
    });
  });
});
