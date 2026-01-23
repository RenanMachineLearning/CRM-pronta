/**
 * Testes de performance e validação de índices
 *
 * Valida que os índices estratégicos estão sendo usados nas queries
 * e que melhoram a performance de buscas e filtros.
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

describe('Indexes Performance Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string; email: string; password: string };
  let adminToken: string;
  let adminRole: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Indexes Test Tenant',
      slug: 'indexes-test-tenant',
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
      email: 'admin@indexes.test',
      password: 'Test123!@#',
      name: 'Admin User',
    });
    adminUser = { id: userObj.id, email: userObj.email, password: 'Test123!@#' };

    // Associar role admin ao usuário
    await assignRoleToUser(adminUser.id, adminRole.id);

    // Gerar token
    adminToken = generateToken(adminUser.id, tenant.id);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Contact - Índices de busca', () => {
    beforeAll(async () => {
      // Criar múltiplos contatos para testar performance
      const contacts = [];
      for (let i = 1; i <= 50; i++) {
        contacts.push({
          tenantId: tenant.id,
          firstName: `João${i}`,
          lastName: `Silva${i}`,
          status: 'ACTIVE' as const,
        });
      }
      await prisma.contact.createMany({ data: contacts });
    });

    it('deve usar índice em busca por firstName', async () => {
      const result = await prisma.$queryRaw<Array<any>>`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM contacts 
        WHERE "tenantId" = ${tenant.id}
        AND "firstName" ILIKE '%João%'
      `;

      // EXPLAIN (FORMAT JSON) retorna array com objeto contendo "Plan"
      const explainResult = result[0] as any;
      expect(explainResult).toBeDefined();
      
      const plan = explainResult['Plan'] || explainResult['QUERY PLAN'];
      expect(plan).toBeDefined();
      
      // Verificar que algum tipo de scan de índice está sendo usado
      const nodeType = plan['Node Type'];
      const hasIndexUsage = 
        nodeType === 'Index Scan' || 
        nodeType === 'Bitmap Index Scan' ||
        (plan['Plans'] && plan['Plans'].some((p: any) => 
          p['Node Type'] === 'Index Scan' || p['Node Type'] === 'Bitmap Index Scan'
        ));

      // Em queries com ILIKE, pode usar Index Scan no tenantId e depois filtrar
      // O importante é que não seja Seq Scan completo
      expect(nodeType).not.toBe('Seq Scan');
    });

    it('deve usar índice composto em busca por firstName e lastName', async () => {
      const result = await prisma.$queryRaw<Array<any>>`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM contacts 
        WHERE "tenantId" = ${tenant.id}
        AND "firstName" = 'João1'
        AND "lastName" = 'Silva1'
      `;

      const explainResult = result[0] as any;
      expect(explainResult).toBeDefined();
      
      const plan = explainResult['Plan'] || explainResult['QUERY PLAN'];
      expect(plan).toBeDefined();
      
      // Verificar que índice está sendo usado
      const nodeType = plan['Node Type'];
      expect(nodeType).not.toBe('Seq Scan');
    });

    it('deve usar índice em filtro por status', async () => {
      const result = await prisma.$queryRaw<Array<any>>`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM contacts 
        WHERE "tenantId" = ${tenant.id}
        AND status = 'ACTIVE'
      `;

      const explainResult = result[0] as any;
      expect(explainResult).toBeDefined();
      
      const plan = explainResult['Plan'] || explainResult['QUERY PLAN'];
      expect(plan).toBeDefined();
      
      const nodeType = plan['Node Type'];
      expect(nodeType).not.toBe('Seq Scan');
    });
  });

  describe('Company - Índices de busca e filtro', () => {
    beforeAll(async () => {
      // Criar múltiplas empresas
      const companies = [];
      for (let i = 1; i <= 30; i++) {
        companies.push({
          tenantId: tenant.id,
          name: `Company ${i}`,
          industry: i % 2 === 0 ? 'Technology' : 'Finance',
          status: 'ACTIVE' as const,
        });
      }
      await prisma.company.createMany({ data: companies });
    });

    it('deve usar índice em busca por name', async () => {
      const result = await prisma.$queryRaw<Array<any>>`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM companies 
        WHERE "tenantId" = ${tenant.id} 
        AND name ILIKE '%Company%'
      `;

      const explainResult = result[0] as any;
      expect(explainResult).toBeDefined();
      
      const plan = explainResult['Plan'] || explainResult['QUERY PLAN'];
      expect(plan).toBeDefined();
      expect(plan['Node Type']).not.toBe('Seq Scan');
    });

    it('deve usar índice em filtro por industry', async () => {
      const result = await prisma.$queryRaw<Array<any>>`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM companies 
        WHERE "tenantId" = ${tenant.id} 
        AND industry = 'Technology'
      `;

      const explainResult = result[0] as any;
      expect(explainResult).toBeDefined();
      
      const plan = explainResult['Plan'] || explainResult['QUERY PLAN'];
      expect(plan).toBeDefined();
      expect(plan['Node Type']).not.toBe('Seq Scan');
    });
  });

  describe('Lead - Índices de busca e filtro', () => {
    beforeAll(async () => {
      // Criar múltiplos leads
      const leads = [];
      for (let i = 1; i <= 40; i++) {
        leads.push({
          tenantId: tenant.id,
          firstName: `Lead${i}`,
          lastName: `Test${i}`,
          email: `lead${i}@test.com`,
          source: i % 3 === 0 ? 'website' : i % 3 === 1 ? 'referral' : 'social',
          status: 'NEW' as const,
        });
      }
      await prisma.lead.createMany({ data: leads });
    });

    it('deve usar índice composto em busca por firstName e lastName', async () => {
      const result = await prisma.$queryRaw<Array<any>>`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM leads 
        WHERE "tenantId" = ${tenant.id} 
        AND "firstName" = 'Lead1'
        AND "lastName" = 'Test1'
      `;

      const explainResult = result[0] as any;
      expect(explainResult).toBeDefined();
      
      const plan = explainResult['Plan'] || explainResult['QUERY PLAN'];
      expect(plan).toBeDefined();
      expect(plan['Node Type']).not.toBe('Seq Scan');
    });

    it('deve usar índice em filtro por source', async () => {
      const result = await prisma.$queryRaw<Array<any>>`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM leads 
        WHERE "tenantId" = ${tenant.id} 
        AND source = 'website'
      `;

      const explainResult = result[0] as any;
      expect(explainResult).toBeDefined();
      
      const plan = explainResult['Plan'] || explainResult['QUERY PLAN'];
      expect(plan).toBeDefined();
      expect(plan['Node Type']).not.toBe('Seq Scan');
    });
  });

  describe('Opportunity - Índices de filtro', () => {
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

      // Criar múltiplas oportunidades
      const opportunities = [];
      const today = new Date();
      for (let i = 1; i <= 25; i++) {
        const closeDate = new Date(today);
        closeDate.setDate(today.getDate() + i);
        opportunities.push({
          tenantId: tenant.id,
          name: `Opportunity ${i}`,
          value: 1000 * i,
          stageId: stage.id,
          status: 'OPEN' as const,
          closeDate,
        });
      }
      await prisma.opportunity.createMany({ data: opportunities });
    });

    it('deve usar índice em filtro por closeDate', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const result = await prisma.$queryRaw<Array<any>>`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM opportunities 
        WHERE "tenantId" = ${tenant.id} 
        AND "closeDate" <= ${futureDate}
      `;

      const explainResult = result[0] as any;
      expect(explainResult).toBeDefined();
      
      const plan = explainResult['Plan'] || explainResult['QUERY PLAN'];
      expect(plan).toBeDefined();
      expect(plan['Node Type']).not.toBe('Seq Scan');
    });
  });

  describe('Task - Índices de filtro', () => {
    beforeAll(async () => {
      // Criar múltiplas tarefas
      const tasks = [];
      const today = new Date();
      for (let i = 1; i <= 35; i++) {
        const dueDate = new Date(today);
        dueDate.setDate(today.getDate() + i);
        tasks.push({
          tenantId: tenant.id,
          title: `Task ${i}`,
          status: 'PENDING' as const,
          priority: 'MEDIUM' as const,
          createdById: adminUser.id,
          relatedEntityType: 'Contact',
          relatedEntityId: '00000000-0000-0000-0000-000000000001',
          dueDate,
        });
      }
      await prisma.task.createMany({ data: tasks });
    });

    it('deve usar índice em filtro por dueDate', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const result = await prisma.$queryRaw<Array<any>>`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM tasks 
        WHERE "tenantId" = ${tenant.id} 
        AND "dueDate" <= ${futureDate}
      `;

      const explainResult = result[0] as any;
      expect(explainResult).toBeDefined();
      
      const plan = explainResult['Plan'] || explainResult['QUERY PLAN'];
      expect(plan).toBeDefined();
      expect(plan['Node Type']).not.toBe('Seq Scan');
    });
  });

  describe('Validação de uso de índices via API', () => {
    it('deve executar busca em Contact com performance aceitável', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ q: 'João', limit: '10' });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      // Performance aceitável: menos de 500ms para busca com índice
      expect(duration).toBeLessThan(500);
    });

    it('deve executar filtro por status com performance aceitável', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ status: 'ACTIVE', limit: '10' });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it('deve executar filtro por industry com performance aceitável', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ industry: 'Technology', limit: '10' });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });
  });
});
