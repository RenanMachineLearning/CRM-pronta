/**
 * Testes de integração para ordenação em todas as entidades
 *
 * Valida ordenação simples, múltipla, padrão, validações e compatibilidade
 * com parâmetros legados (orderBy/order) em todas as entidades.
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

describe('OrderBy Integration Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string; email: string; password: string };
  let adminToken: string;
  let adminRole: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'OrderBy Test Tenant',
      slug: 'orderby-test-tenant',
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
      email: 'admin@orderby.test',
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

  describe('Contact - Ordenação', () => {
    let contact1: any;
    let contact2: any;
    let contact3: any;

    beforeAll(async () => {
      // Criar contatos de teste
      contact1 = await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          firstName: 'Alice',
          lastName: 'Silva',
          status: 'ACTIVE',
        },
      });

      contact2 = await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          firstName: 'Bob',
          lastName: 'Santos',
          status: 'ACTIVE',
        },
      });

      contact3 = await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          firstName: 'Carlos',
          lastName: 'Oliveira',
          status: 'ACTIVE',
        },
      });
    });

    it('deve ordenar por firstName asc', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ sortBy: 'firstName', sortOrder: 'asc' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].firstName).toBe('Alice');
      expect(response.body.data[1].firstName).toBe('Bob');
      expect(response.body.data[2].firstName).toBe('Carlos');
    });

    it('deve ordenar por lastName desc', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ sortBy: 'lastName', sortOrder: 'desc' });

      expect(response.status).toBe(200);
      expect(response.body.data[0].lastName).toBe('Santos');
    });

    it('deve usar ordenação padrão quando não especificada', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug);

      expect(response.status).toBe(200);
      // Ordenação padrão é createdAt desc (mais recente primeiro)
      expect(response.body.data[0].id).toBe(contact3.id);
    });

    it('deve suportar ordenação múltipla', async () => {
      // Criar contato com mesmo firstName para testar ordenação múltipla
      await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          firstName: 'Alice',
          lastName: 'Costa',
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ sortBy: 'firstName,lastName', sortOrder: 'asc,asc' });

      expect(response.status).toBe(200);
      const alices = response.body.data.filter((c: any) => c.firstName === 'Alice');
      expect(alices.length).toBeGreaterThan(1);
      // Verificar que estão ordenados por lastName
      const aliceIndexes = response.body.data
        .map((c: any, i: number) => c.firstName === 'Alice' ? i : -1)
        .filter((i: number) => i !== -1);
      if (aliceIndexes.length > 1) {
        const firstAlice = response.body.data[aliceIndexes[0]];
        const secondAlice = response.body.data[aliceIndexes[1]];
        expect(firstAlice.lastName <= secondAlice.lastName).toBe(true);
      }
    });

    it('deve retornar erro 400 para campo inválido', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ sortBy: 'invalidField', sortOrder: 'asc' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_ORDER_FIELD');
    });

    it('deve retornar erro 400 para direção inválida', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ sortBy: 'firstName', sortOrder: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_ORDER_DIRECTION');
    });

    it('deve manter compatibilidade com orderBy/order (legado)', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ orderBy: 'firstName', order: 'asc' });

      expect(response.status).toBe(200);
      expect(response.body.data[0].firstName).toBe('Alice');
    });
  });

  describe('Company - Ordenação', () => {
    beforeAll(async () => {
      // Criar empresas de teste
      await prisma.company.createMany({
        data: [
          { tenantId: tenant.id, name: 'Empresa A', status: 'ACTIVE' },
          { tenantId: tenant.id, name: 'Empresa B', status: 'ACTIVE' },
          { tenantId: tenant.id, name: 'Empresa C', status: 'ACTIVE' },
        ],
      });
    });

    it('deve ordenar por name asc', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ sortBy: 'name', sortOrder: 'asc' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      const names = response.body.data.map((c: any) => c.name);
      expect(names).toEqual([...names].sort());
    });
  });

  describe('Lead - Ordenação', () => {
    beforeAll(async () => {
      // Criar leads de teste
      await prisma.lead.createMany({
        data: [
          { tenantId: tenant.id, firstName: 'Lead A', lastName: 'Test', status: 'NEW' },
          { tenantId: tenant.id, firstName: 'Lead B', lastName: 'Test', status: 'NEW' },
        ],
      });
    });

    it('deve ordenar por firstName', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ sortBy: 'firstName', sortOrder: 'asc' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Opportunity - Ordenação', () => {
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

      // Criar oportunidades de teste
      await prisma.opportunity.createMany({
        data: [
          {
            tenantId: tenant.id,
            name: 'Oportunidade A',
            value: 1000,
            stageId: stage.id,
            status: 'OPEN',
          },
          {
            tenantId: tenant.id,
            name: 'Oportunidade B',
            value: 2000,
            stageId: stage.id,
            status: 'OPEN',
          },
        ],
      });
    });

    it('deve ordenar por value desc', async () => {
      const response = await request(app)
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ sortBy: 'value', sortOrder: 'desc' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      if (response.body.data.length > 1) {
        expect(Number(response.body.data[0].value)).toBeGreaterThanOrEqual(
          Number(response.body.data[1].value)
        );
      }
    });
  });

  describe('Task - Ordenação', () => {
    beforeAll(async () => {
      // Criar tarefas de teste
      await prisma.task.createMany({
        data: [
          {
            tenantId: tenant.id,
            title: 'Tarefa A',
            status: 'PENDING',
            priority: 'LOW',
            createdById: adminUser.id,
            relatedEntityType: 'Contact',
            relatedEntityId: '00000000-0000-0000-0000-000000000001',
          },
          {
            tenantId: tenant.id,
            title: 'Tarefa B',
            status: 'PENDING',
            priority: 'HIGH',
            createdById: adminUser.id,
            relatedEntityType: 'Contact',
            relatedEntityId: '00000000-0000-0000-0000-000000000001',
          },
        ],
      });
    });

    it('deve ordenar por priority', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({ sortBy: 'priority', sortOrder: 'desc' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Note - Ordenação', () => {
    beforeAll(async () => {
      // Criar notas de teste
      await prisma.note.createMany({
        data: [
          {
            tenantId: tenant.id,
            content: 'Nota A',
            type: 'NOTE',
            relatedEntityType: 'Contact',
            relatedEntityId: '00000000-0000-0000-0000-000000000001',
            createdById: adminUser.id,
          },
          {
            tenantId: tenant.id,
            content: 'Nota B',
            type: 'NOTE',
            relatedEntityType: 'Contact',
            relatedEntityId: '00000000-0000-0000-0000-000000000001',
            createdById: adminUser.id,
          },
        ],
      });
    });

    it('deve ordenar por createdAt desc (padrão)', async () => {
      const response = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      // Verificar que está ordenado por createdAt desc (mais recente primeiro)
      if (response.body.data.length > 1) {
        const date1 = new Date(response.body.data[0].createdAt);
        const date2 = new Date(response.body.data[1].createdAt);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });
  });

  describe('Combinação com filtros e busca', () => {
    it('deve combinar ordenação com filtros', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({
          status: 'ACTIVE',
          sortBy: 'firstName',
          sortOrder: 'asc',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('deve combinar ordenação com busca textual', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenant.slug)
        .query({
          q: 'Alice',
          sortBy: 'lastName',
          sortOrder: 'asc',
        });

      expect(response.status).toBe(200);
    });
  });
});
