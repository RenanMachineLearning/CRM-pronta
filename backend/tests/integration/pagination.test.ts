/**
 * Testes de integração para paginação em todas as entidades
 *
 * Valida paginação com page/limit, estrutura de resposta, cálculo de totalPages,
 * validações e compatibilidade com offset (legado) em todas as entidades.
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

describe('Pagination Integration Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string; email: string; password: string };
  let adminToken: string;
  let adminRole: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Pagination Test Tenant',
      slug: 'pagination-test-tenant',
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
      email: 'admin@pagination.test',
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

  describe('Contact - Paginação', () => {
    beforeAll(async () => {
      // Criar 25 contatos de teste
      const contacts = [];
      for (let i = 1; i <= 25; i++) {
        contacts.push({
          tenantId: tenant.id,
          firstName: `Contact${i}`,
          lastName: `Test${i}`,
          status: 'ACTIVE' as const,
        });
      }
      await prisma.contact.createMany({ data: contacts });
    });

    it('deve paginar com page e limit', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '1', limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        offset: 0,
      });
    });

    it('deve retornar segunda página corretamente', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '2', limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        offset: 10,
      });
    });

    it('deve retornar última página corretamente', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '3', limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(5); // Última página tem 5 itens
      expect(response.body.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 25,
        totalPages: 3,
        offset: 20,
      });
    });

    it('deve usar valores padrão quando não especificados', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('deve calcular totalPages corretamente', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ limit: '7' }); // 25 / 7 = 3.57, arredondado para 4

      expect(response.status).toBe(200);
      expect(response.body.pagination.totalPages).toBe(4);
    });

    it('deve retornar totalPages = 0 quando total = 0', async () => {
      // Criar outro tenant sem contatos
      const tenant2 = await createTestTenant({
        name: 'Empty Tenant',
        slug: 'empty-tenant',
        status: 'ACTIVE',
      });
      const roles2 = await createStandardRoles(tenant2.id);
      const user2 = await createTestUser({
        tenantId: tenant2.id,
        email: 'admin2@pagination.test',
        password: 'Test123!@#',
        name: 'Admin User 2',
      });
      await assignRoleToUser(user2.id, roles2.admin.id);
      await createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'list' });
      const token2 = generateToken(user2.id, tenant2.id);

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${token2}`)
        .set('X-Tenant-Slug', tenant2.slug);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.totalPages).toBe(0);
    });

    it('deve respeitar limite máximo de 100', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ limit: '200' }); // Deve ser limitado a 100

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(100);
    });

    it('deve retornar erro 400 para page inválida', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '0' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_PAGE');
    });

    it('deve retornar erro 400 para limit inválido', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ limit: '0' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_LIMIT');
    });

    it('deve manter compatibilidade com offset (legado)', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ offset: '10', limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination.offset).toBe(10);
      // page deve ser calculado a partir do offset
      expect(response.body.pagination.page).toBe(2);
    });

    it('deve priorizar page sobre offset quando ambos fornecidos', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '1', offset: '20', limit: '10' });

      expect(response.status).toBe(200);
      // Deve usar page=1, não offset=20
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('Company - Paginação', () => {
    beforeAll(async () => {
      // Criar 15 empresas de teste
      const companies = [];
      for (let i = 1; i <= 15; i++) {
        companies.push({
          tenantId: tenant.id,
          name: `Company ${i}`,
          status: 'ACTIVE' as const,
        });
      }
      await prisma.company.createMany({ data: companies });
    });

    it('deve paginar corretamente', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '1', limit: '5' });

      expect(response.status).toBe(200);
      expect(response.body.pagination.totalPages).toBe(3); // 15 / 5 = 3
    });
  });

  describe('Lead - Paginação', () => {
    beforeAll(async () => {
      // Criar 12 leads de teste
      const leads = [];
      for (let i = 1; i <= 12; i++) {
        leads.push({
          tenantId: tenant.id,
          firstName: `Lead${i}`,
          lastName: `Test${i}`,
          status: 'NEW' as const,
        });
      }
      await prisma.lead.createMany({ data: leads });
    });

    it('deve paginar corretamente', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '2', limit: '5' });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.totalPages).toBe(3); // 12 / 5 = 2.4, arredondado para 3
    });
  });

  describe('Opportunity - Paginação', () => {
    let stage: any;

    beforeAll(async () => {
      // Criar pipeline e stage
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
        },
      });

      // Criar 8 oportunidades de teste
      const opportunities = [];
      for (let i = 1; i <= 8; i++) {
        opportunities.push({
          tenantId: tenant.id,
          name: `Opportunity ${i}`,
          value: 1000 * i,
          stageId: stage.id,
          status: 'OPEN' as const,
        });
      }
      await prisma.opportunity.createMany({ data: opportunities });
    });

    it('deve paginar corretamente', async () => {
      const response = await request(app)
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '1', limit: '3' });

      expect(response.status).toBe(200);
      expect(response.body.pagination.totalPages).toBe(3); // 8 / 3 = 2.67, arredondado para 3
    });
  });

  describe('Task - Paginação', () => {
    let contact1: { id: string };

    beforeAll(async () => {
      // Criar contato para relacionamento
      const contactObj = await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          firstName: 'Task Related',
          lastName: 'Contact',
          status: 'ACTIVE',
        },
      });
      contact1 = { id: contactObj.id };

      // Criar 18 tarefas de teste
      const tasks = [];
      for (let i = 1; i <= 18; i++) {
        tasks.push({
          tenantId: tenant.id,
          title: `Task ${i}`,
          status: 'PENDING' as const,
          priority: 'MEDIUM' as const,
          createdById: adminUser.id,
          type: 'OTHER' as const,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });
      }
      await prisma.task.createMany({ data: tasks });
    });

    it('deve paginar corretamente', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '1', limit: '6' });

      expect(response.status).toBe(200);
      expect(response.body.pagination.totalPages).toBe(3); // 18 / 6 = 3
    });
  });

  describe('Note - Paginação', () => {
    beforeAll(async () => {
      // Criar 7 notas de teste
      const notes = [];
      for (let i = 1; i <= 7; i++) {
        notes.push({
          tenantId: tenant.id,
          content: `Note ${i}`,
          type: 'NOTE' as const,
          relatedEntityType: 'Contact',
          relatedEntityId: '00000000-0000-0000-0000-000000000001',
          createdById: adminUser.id,
        });
      }
      await prisma.note.createMany({ data: notes });
    });

    it('deve paginar corretamente', async () => {
      const response = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '1', limit: '3' });

      expect(response.status).toBe(200);
      expect(response.body.pagination.totalPages).toBe(3); // 7 / 3 = 2.33, arredondado para 3
    });
  });

  describe('Combinação com filtros e ordenação', () => {
    it('deve combinar paginação com filtros', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({
          status: 'ACTIVE',
          page: '1',
          limit: '5',
        });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('deve combinar paginação com ordenação', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({
          page: '1',
          limit: '10',
          sortBy: 'firstName',
          sortOrder: 'asc',
        });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    it('deve combinar paginação, filtros e ordenação', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({
          status: 'ACTIVE',
          page: '2',
          limit: '5',
          sortBy: 'firstName',
          sortOrder: 'asc',
        });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
    });
  });

  describe('Paginação com grandes volumes', () => {
    beforeAll(async () => {
      // Criar 500 contatos para testar paginação com volume
      const batchSize = 100;
      for (let batch = 0; batch < 5; batch++) {
        const batchContacts = [];
        for (let i = 0; i < batchSize; i++) {
          const index = batch * batchSize + i;
          batchContacts.push({
            tenantId: tenant.id,
            firstName: `Volume${index}`,
            lastName: `Test${index}`,
            status: index % 2 === 0 ? 'ACTIVE' as const : 'INACTIVE' as const,
          });
        }
        await prisma.contact.createMany({ data: batchContacts });
      }
    });

    it('deve paginar corretamente com grandes volumes', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '1', limit: '20' });

      expect(response.status).toBe(200);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(500);
      expect(response.body.pagination.totalPages).toBeGreaterThan(1);
      expect(response.body.data.length).toBeLessThanOrEqual(20);
    });

    it('deve paginar para última página com grandes volumes', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '25', limit: '20' }); // Página 25 de um dataset grande

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(25);
      expect(response.body.pagination.totalPages).toBeGreaterThanOrEqual(25);
    });

    it('deve calcular totalPages corretamente com grandes volumes', async () => {
      const limit = 20;
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ page: '1', limit: limit.toString() });

      expect(response.status).toBe(200);
      const expectedTotalPages = Math.ceil(response.body.pagination.total / limit);
      expect(response.body.pagination.totalPages).toBe(expectedTotalPages);
    });
  });

  describe('Paginação com filtros complexos', () => {
    beforeAll(async () => {
      // Criar dados variados para testes de filtros
      const contacts = [];
      for (let i = 1; i <= 50; i++) {
        contacts.push({
          tenantId: tenant.id,
          firstName: `Filter${i}`,
          lastName: i % 2 === 0 ? 'Active' : 'Inactive',
          status: i % 2 === 0 ? 'ACTIVE' as const : 'INACTIVE' as const,
        });
      }
      await prisma.contact.createMany({ data: contacts });
    });

    it('deve paginar com filtros avançados', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: 'equals', value: 'ACTIVE' },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({
          filters,
          page: '1',
          limit: '10',
        });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      // Verificar que apenas contatos ACTIVE foram retornados
      response.body.data.forEach((contact: any) => {
        expect(contact.status).toBe('ACTIVE');
      });
    });

    it('deve paginar com busca textual + filtros', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: 'equals', value: 'ACTIVE' },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({
          q: 'filter',
          filters,
          page: '1',
          limit: '10',
        });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
    });
  });

  describe('Paginação com ordenação múltipla', () => {
    beforeAll(async () => {
      // Criar dados para teste de ordenação múltipla
      const contacts = [];
      for (let i = 1; i <= 30; i++) {
        contacts.push({
          tenantId: tenant.id,
          firstName: `Sort${i % 3}`,
          lastName: `Test${i}`,
          status: 'ACTIVE' as const,
        });
      }
      await prisma.contact.createMany({ data: contacts });
    });

    it('deve paginar com ordenação múltipla', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({
          sortBy: 'firstName,lastName',
          sortOrder: 'asc,asc',
          page: '1',
          limit: '10',
        });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
      
      // Verificar que ordenação foi aplicada
      const firstNames = response.body.data.map((c: any) => c.firstName);
      const sortedFirstNames = [...firstNames].sort();
      expect(firstNames).toEqual(sortedFirstNames);
    });

    it('deve manter ordenação consistente entre páginas', async () => {
      const page1 = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({
          sortBy: 'firstName',
          sortOrder: 'asc',
          page: '1',
          limit: '10',
        });

      const page2 = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({
          sortBy: 'firstName',
          sortOrder: 'asc',
          page: '2',
          limit: '10',
        });

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);
      
      // Último item da página 1 deve ser menor ou igual ao primeiro da página 2
      const lastPage1 = page1.body.data[page1.body.data.length - 1];
      const firstPage2 = page2.body.data[0];
      expect(lastPage1.firstName <= firstPage2.firstName).toBe(true);
    });
  });
});
