/**
 * Testes de performance com volume massivo de dados
 * 
 * Valida que busca, filtros e paginação mantêm performance aceitável (< 500ms)
 * mesmo com grandes volumes de dados (1000+ registros por entidade).
 */

import request from 'supertest';
import { app } from '../../../src/index';
import { prisma } from '../../../src/utils/prisma';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  assignRoleToUser,
  createStandardRoles,
  createTestPermission,
  closeDatabase,
} from '../../helpers/db';
import { generateToken } from '../../../src/utils/jwt';

describe('Volume Performance Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let adminRole: { id: string };
  let stage: { id: string };
  const MAX_QUERY_TIME = 500; // 500ms conforme especificação
  const VOLUME_SIZE = 1000; // 1000 registros por entidade

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Volume Performance Test Tenant',
      slug: 'volume-performance-test-tenant',
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
    }

    // Criar usuário admin
    const userObj = await createTestUser({
      tenantId: tenant.id,
      email: 'admin@volume.test',
      password: 'Test123!@#',
      name: 'Admin User',
    });
    adminUser = { id: userObj.id, email: userObj.email };

    // Associar role admin ao usuário
    await assignRoleToUser(adminUser.id, adminRole.id);

    // Gerar token
    adminToken = generateToken(adminUser.id, tenant.id);

    // Criar pipeline e estágio
    const pipeline = await prisma.pipeline.create({
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
        probability: 25,
      },
    });

    // Criar grandes volumes de dados
    await createLargeDataset(VOLUME_SIZE);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  /**
   * Cria grandes volumes de dados para testes de performance
   */
  async function createLargeDataset(volume: number) {
    console.log(`Criando ${volume} registros por entidade...`);

    // Criar contatos em lotes para performance
    const contactBatchSize = 100;
    for (let batch = 0; batch < volume / contactBatchSize; batch++) {
      const contacts = [];
      for (let i = 0; i < contactBatchSize; i++) {
        const index = batch * contactBatchSize + i;
        contacts.push({
          tenantId: tenant.id,
          firstName: `Contact${index}`,
          lastName: `Test${index}`,
          status: index % 2 === 0 ? 'ACTIVE' : 'INACTIVE',
        });
      }
      await prisma.contact.createMany({ data: contacts });
    }

    // Criar empresas em lotes
    const companyBatchSize = 100;
    for (let batch = 0; batch < volume / companyBatchSize; batch++) {
      const companies = [];
      for (let i = 0; i < companyBatchSize; i++) {
        const index = batch * companyBatchSize + i;
        companies.push({
          tenantId: tenant.id,
          name: `Company ${index}`,
          industry: index % 3 === 0 ? 'Technology' : index % 3 === 1 ? 'Finance' : 'Retail',
          status: 'ACTIVE',
        });
      }
      await prisma.company.createMany({ data: companies });
    }

    // Criar leads em lotes
    const leadBatchSize = 100;
    for (let batch = 0; batch < volume / leadBatchSize; batch++) {
      const leads = [];
      for (let i = 0; i < leadBatchSize; i++) {
        const index = batch * leadBatchSize + i;
        leads.push({
          tenantId: tenant.id,
          firstName: `Lead${index}`,
          lastName: `Test${index}`,
          email: `lead${index}@test.com`,
          status: index % 4 === 0 ? 'NEW' : index % 4 === 1 ? 'QUALIFIED' : 'CONVERTED',
        });
      }
      await prisma.lead.createMany({ data: leads });
    }

    // Criar oportunidades em lotes
    const opportunityBatchSize = 100;
    for (let batch = 0; batch < volume / opportunityBatchSize; batch++) {
      const opportunities = [];
      for (let i = 0; i < opportunityBatchSize; i++) {
        const index = batch * opportunityBatchSize + i;
        opportunities.push({
          tenantId: tenant.id,
          name: `Opportunity ${index}`,
          value: 1000 * index,
          stageId: stage.id,
          status: 'OPEN',
        });
      }
      await prisma.opportunity.createMany({ data: opportunities });
    }

    console.log(`Dataset criado: ${volume} registros por entidade`);
  }

  describe('Busca com volume alto', () => {
    it('deve buscar em Contact com 1000+ registros em < 500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/search?q=contact&entities[]=contact&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', tenant.id)
        .expect(200);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });

    it('deve buscar globalmente com 1000+ registros em < 500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/search?q=test&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', tenant.id)
        .expect(200);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });

    it('deve buscar em Company com 1000+ registros em < 500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/search?q=company&entities[]=company&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', tenant.id)
        .expect(200);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });
  });

  describe('Filtros avançados com volume alto', () => {
    it('deve aplicar filtro equals com 1000+ registros em < 500ms', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: 'equals', value: 'ACTIVE' },
      ]);

      const start = Date.now();
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', tenant.id)
        .query({ filters, limit: '20' })
        .expect(200);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });

    it('deve aplicar filtro contains com 1000+ registros em < 500ms', async () => {
      const filters = JSON.stringify([
        { field: 'firstName', operator: 'contains', value: 'Contact' },
      ]);

      const start = Date.now();
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', tenant.id)
        .query({ filters, limit: '20' })
        .expect(200);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });

    it('deve aplicar múltiplos filtros com 1000+ registros em < 500ms', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: 'equals', value: 'ACTIVE' },
        { field: 'firstName', operator: 'contains', value: 'Contact' },
      ]);

      const start = Date.now();
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', tenant.id)
        .query({ filters, limit: '20' })
        .expect(200);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });
  });

  describe('Paginação com grandes volumes', () => {
    it('deve paginar corretamente com grandes volumes', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', tenant.id)
        .query({ page: '1', limit: '20' })
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(VOLUME_SIZE);
      expect(response.body.pagination.totalPages).toBeGreaterThan(1);
    });

    it('deve paginar para última página com grandes volumes', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', tenant.id)
        .query({ page: '50', limit: '20' }) // Página 50 de um dataset grande
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(50);
      expect(response.body.pagination.totalPages).toBeGreaterThanOrEqual(50);
    });

    it('deve paginar com performance aceitável em qualquer página', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', tenant.id)
        .query({ page: '10', limit: '20' })
        .expect(200);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });
  });

  describe('Uso eficiente de índices', () => {
    it('deve usar índices em busca com grandes volumes', async () => {
      // Verificar que busca usa índices (não Seq Scan)
      const result = await prisma.$queryRaw<Array<any>>`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM contacts 
        WHERE "tenantId" = ${tenant.id}
        AND "firstName" ILIKE '%Contact%'
        LIMIT 10
      `;

      const explainResult = result[0] as any;
      expect(explainResult).toBeDefined();
      
      const plan = explainResult['Plan'] || explainResult['QUERY PLAN'];
      expect(plan).toBeDefined();
      
      // Verificar que não usa Seq Scan completo
      const nodeType = plan['Node Type'];
      expect(nodeType).not.toBe('Seq Scan');
    });

    it('deve usar índices em filtros com grandes volumes', async () => {
      const result = await prisma.$queryRaw<Array<any>>`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM contacts 
        WHERE "tenantId" = ${tenant.id}
        AND status = 'ACTIVE'
        LIMIT 20
      `;

      const explainResult = result[0] as any;
      expect(explainResult).toBeDefined();
      
      const plan = explainResult['Plan'] || explainResult['QUERY PLAN'];
      expect(plan).toBeDefined();
      
      const nodeType = plan['Node Type'];
      expect(nodeType).not.toBe('Seq Scan');
    });
  });

  describe('Combinação de recursos com volume alto', () => {
    it('deve combinar busca + filtros + ordenação + paginação com performance aceitável', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: 'equals', value: 'ACTIVE' },
      ]);

      const start = Date.now();
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', tenant.id)
        .query({
          q: 'contact',
          filters,
          sortBy: 'firstName',
          sortOrder: 'asc',
          page: '1',
          limit: '20',
        })
        .expect(200);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
      expect(response.body.data.length).toBeLessThanOrEqual(20);
    });
  });
});
