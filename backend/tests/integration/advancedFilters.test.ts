/**
 * Testes E2E para filtros avançados
 *
 * Valida filtros avançados em todas as entidades (Contact, Company, Lead, Opportunity, Task, Note).
 * Testa integração com busca textual (q), conflitos, erros e isolamento multi-tenant.
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
import { FilterOperator } from '../../src/types/filter.types';
import { Prisma } from '@prisma/client';

describe('Advanced Filters - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminRole1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenant1Obj = await createTestTenant({
      name: 'Advanced Filters Test Tenant',
      slug: 'advanced-filters-test-tenant',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    // Criar roles padrão
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    // Criar permissões para todas as entidades
    const entities = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task', 'Note'];
    const actions = ['list', 'read', 'create', 'update', 'delete'];

    for (const entity of entities) {
      for (const action of actions) {
        await createTestPermission({
          tenantId: tenant1.id,
          entity,
          action,
        });
      }
    }

    // Associar permissões ao Admin
    const permissions = await prisma.permission.findMany({
      where: { tenantId: tenant1.id },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((perm) => ({
        roleId: adminRole1.id,
        permissionId: perm.id,
      })),
      skipDuplicates: true,
    });

    // Criar usuário Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin@advancedfilters.test',
      password: 'AdminPass123',
      name: 'Admin User',
      tenantId: tenant1.id,
      roleId: adminRole1.id,
    });
    adminUser1 = {
      id: adminUser1Obj.id,
      email: adminUser1Obj.email,
      password: 'AdminPass123',
    };

    adminToken1 = generateToken(adminUser1.id, tenant1.id);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Contact - Advanced Filters', () => {
    let contact1: { id: string };
    let contact2: { id: string };
    let company1: { id: string };

    beforeAll(async () => {
      // Criar empresa
      company1 = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Test Company',
          website: 'https://test.com',
        },
      });

      // Criar contatos
      contact1 = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João',
          lastName: 'Silva',
          status: 'ACTIVE',
          companyId: company1.id,
        },
      });

      contact2 = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Maria',
          lastName: 'Santos',
          status: 'INACTIVE',
        },
      });
    });

    it('deve filtrar contatos por status usando equals', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(contact1.id);
    });

    it('deve filtrar contatos por múltiplos filtros', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
        { field: 'firstName', operator: FilterOperator.CONTAINS, value: 'João' },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(contact1.id);
    });

    it('deve combinar filtros avançados com busca textual (q)', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters, q: 'João' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(contact1.id);
    });

    it('deve retornar erro para campo inexistente', async () => {
      const filters = JSON.stringify([
        { field: 'nonexistentField', operator: FilterOperator.EQUALS, value: 'value' },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Filtro inválido');
    });

    it('deve retornar erro para operador inválido', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: 'invalidOperator', value: 'ACTIVE' },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(400);
    });

    it('deve retornar erro para JSON inválido', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters: 'invalid-json' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('JSON válido');
    });
  });

  describe('Company - Advanced Filters', () => {
    let company1: { id: string };
    let company2: { id: string };

    beforeAll(async () => {
      company1 = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Tech Corp',
          industry: 'Technology',
          size: 'LARGE',
          status: 'ACTIVE',
        },
      });

      company2 = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Small Business',
          industry: 'Retail',
          size: 'SMALL',
          status: 'INACTIVE',
        },
      });
    });

    it('deve filtrar empresas por size usando equals', async () => {
      const filters = JSON.stringify([
        { field: 'size', operator: FilterOperator.EQUALS, value: 'LARGE' },
      ]);

      const response = await request(app)
        .get('/api/companies')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.some((c: any) => c.id === company1.id)).toBe(true);
    });

    it('deve filtrar empresas por industry usando contains', async () => {
      const filters = JSON.stringify([
        { field: 'industry', operator: FilterOperator.CONTAINS, value: 'Tech' },
      ]);

      const response = await request(app)
        .get('/api/companies')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.data.some((c: any) => c.id === company1.id)).toBe(true);
    });
  });

  describe('Lead - Advanced Filters', () => {
    let lead1: { id: string };
    let lead2: { id: string };

    beforeAll(async () => {
      lead1 = await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Lead',
          lastName: 'One',
          email: 'lead1@test.com',
          status: 'NEW',
          source: 'Website',
        },
      });

      lead2 = await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Lead',
          lastName: 'Two',
          email: 'lead2@test.com',
          status: 'QUALIFIED',
          source: 'Referral',
        },
      });
    });

    it('deve filtrar leads por status', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: FilterOperator.EQUALS, value: 'NEW' },
      ]);

      const response = await request(app)
        .get('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.data.some((l: any) => l.id === lead1.id)).toBe(true);
    });

    it('deve filtrar leads por email usando contains', async () => {
      const filters = JSON.stringify([
        { field: 'email', operator: FilterOperator.CONTAINS, value: 'lead1' },
      ]);

      const response = await request(app)
        .get('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.data.some((l: any) => l.id === lead1.id)).toBe(true);
    });
  });

  describe('Opportunity - Advanced Filters', () => {
    let stage1: { id: string };
    let opportunity1: { id: string };
    let opportunity2: { id: string };

    beforeAll(async () => {
      // Criar pipeline e stage
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Test Pipeline',
          isDefault: true,
        },
      });

      stage1 = await prisma.pipelineStage.create({
        data: {
          tenantId: tenant1.id,
          pipelineId: pipeline.id,
          name: 'Qualification',
          order: 1,
        },
      });

      opportunity1 = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Big Deal',
          value: new Prisma.Decimal('50000'),
          stageId: stage1.id,
          status: 'OPEN',
        },
      });

      opportunity2 = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Small Deal',
          value: new Prisma.Decimal('5000'),
          stageId: stage1.id,
          status: 'OPEN',
        },
      });
    });

    it('deve filtrar oportunidades por value usando greaterThan', async () => {
      const filters = JSON.stringify([
        { field: 'value', operator: FilterOperator.GREATER_THAN, value: '10000' },
      ]);

      const response = await request(app)
        .get('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.data.some((o: any) => o.id === opportunity1.id)).toBe(true);
    });

    it('deve filtrar oportunidades por status', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: FilterOperator.EQUALS, value: 'OPEN' },
      ]);

      const response = await request(app)
        .get('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Task - Advanced Filters', () => {
    let contact1: { id: string };
    let task1: { id: string };
    let task2: { id: string };

    beforeAll(async () => {
      // Criar contato
      contact1 = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Task',
          lastName: 'Contact',
        },
      });

      // Criar usuário para assignedTo
      const user1 = await createTestUser({
        email: 'user1@task.test',
        password: 'UserPass123',
        name: 'User 1',
        tenantId: tenant1.id,
        roleId: adminRole1.id,
      });

      task1 = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task 1',
          status: 'PENDING',
          type: 'CALL',
          createdById: adminUser1.id,
          assignedToId: user1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });

      task2 = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task 2',
          status: 'COMPLETED',
          type: 'EMAIL',
          createdById: adminUser1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });
    });

    it('deve filtrar tarefas por status', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: FilterOperator.EQUALS, value: 'PENDING' },
      ]);

      const response = await request(app)
        .get('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.data.some((t: any) => t.id === task1.id)).toBe(true);
    });

    it('deve filtrar tarefas por type', async () => {
      const filters = JSON.stringify([
        { field: 'type', operator: FilterOperator.EQUALS, value: 'CALL' },
      ]);

      const response = await request(app)
        .get('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.data.some((t: any) => t.id === task1.id)).toBe(true);
    });
  });

  describe('Note - Advanced Filters', () => {
    let contact1: { id: string };
    let note1: { id: string };
    let note2: { id: string };

    beforeAll(async () => {
      // Criar contato
      contact1 = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Note',
          lastName: 'Contact',
        },
      });

      note1 = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Note 1 content',
          type: 'NOTE',
          createdById: adminUser1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });

      note2 = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Note 2 content',
          type: 'COMMENT',
          createdById: adminUser1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });
    });

    it('deve filtrar notas por type', async () => {
      const filters = JSON.stringify([
        { field: 'type', operator: FilterOperator.EQUALS, value: 'NOTE' },
      ]);

      const response = await request(app)
        .get('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.data.some((n: any) => n.id === note1.id)).toBe(true);
    });

    it('deve filtrar notas por content usando contains', async () => {
      const filters = JSON.stringify([
        { field: 'content', operator: FilterOperator.CONTAINS, value: 'Note 1' },
      ]);

      const response = await request(app)
        .get('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.data.some((n: any) => n.id === note1.id)).toBe(true);
    });
  });

  describe('Multi-tenant Isolation', () => {
    let tenant2: { id: string; slug: string };
    let adminUser2: { id: string };
    let adminToken2: string;
    let contact1: { id: string };
    let contact2: { id: string };

    beforeAll(async () => {
      // Criar segundo tenant
      const tenant2Obj = await createTestTenant({
        name: 'Advanced Filters Test Tenant 2',
        slug: 'advanced-filters-test-tenant-2',
        status: 'ACTIVE',
      });
      tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

      // Criar roles e permissões para tenant2
      const roles2 = await createStandardRoles(tenant2.id);
      const adminRole2 = roles2.admin;

      const entities = ['Contact'];
      const actions = ['list', 'read'];

      for (const entity of entities) {
        for (const action of actions) {
          await createTestPermission({
            tenantId: tenant2.id,
            entity,
            action,
          });
        }
      }

      const permissions2 = await prisma.permission.findMany({
        where: { tenantId: tenant2.id },
      });

      await prisma.rolePermission.createMany({
        data: permissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
        skipDuplicates: true,
      });

      const adminUser2Obj = await createTestUser({
        email: 'admin2@advancedfilters.test',
        password: 'AdminPass123',
        name: 'Admin User 2',
        tenantId: tenant2.id,
        roleId: adminRole2.id,
      });
      adminUser2 = { id: adminUser2Obj.id };
      adminToken2 = generateToken(adminUser2.id, tenant2.id);

      // Criar contatos em cada tenant
      contact1 = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Tenant1',
          lastName: 'Contact',
          status: 'ACTIVE',
        },
      });

      contact2 = await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Tenant2',
          lastName: 'Contact',
          status: 'ACTIVE',
        },
      });
    });

    it('deve isolar resultados por tenant', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
      ]);

      // Buscar no tenant1
      const response1 = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ filters });

      expect(response1.status).toBe(200);
      expect(response1.body.data.some((c: any) => c.id === contact1.id)).toBe(true);
      expect(response1.body.data.some((c: any) => c.id === contact2.id)).toBe(false);

      // Buscar no tenant2
      const response2 = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant2.id)
        .set('Authorization', `Bearer ${adminToken2}`)
        .query({ filters });

      expect(response2.status).toBe(200);
      expect(response2.body.data.some((c: any) => c.id === contact2.id)).toBe(true);
      expect(response2.body.data.some((c: any) => c.id === contact1.id)).toBe(false);
    });
  });
});
