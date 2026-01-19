/**
 * Testes E2E para CRUD completo de tarefas via API
 * 
 * Valida criação, leitura, atualização e deleção de tarefas.
 * Testa isolamento multi-tenant, validações, auditoria, permissões ACL,
 * relacionamentos polimórficos e filtros avançados.
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
  createTestRole,
  closeDatabase,
  waitForAuditLog,
  getAuditLogs,
  prisma,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';
import { Prisma } from '@prisma/client';

describe('Task CRUD - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let regularUser1: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let regularToken1: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };
  let regularRole1: { id: string };
  let contact1: { id: string };
  let contact2: { id: string };
  let company1: { id: string };
  let lead1: { id: string };
  let opportunity1: { id: string };
  let pipeline1: { id: string };
  let stage1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Task CRUD Test Tenant 1',
      slug: 'task-crud-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Task CRUD Test Tenant 2',
      slug: 'task-crud-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;
    regularRole1 = roles1.user;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Task
    const taskPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'list' }),
    ]);

    const taskPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Task', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Task', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Task', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Task', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Task', action: 'list' }),
    ]);

    // Associar permissões aos Admins
    await prisma.rolePermission.createMany({
      data: [
        ...taskPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...taskPermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin1@taskcrud.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@taskcrud.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Criar usuário regular (sem permissões de Task)
    const regularUser1Obj = await createTestUser({
      email: 'regular1@taskcrud.test',
      password: 'RegularPass123',
      name: 'Regular User 1',
      tenantId: tenant1.id,
    });
    regularUser1 = { ...regularUser1Obj, password: 'RegularPass123' };
    await assignRoleToUser(regularUser1.id, regularRole1.id);

    // Gerar tokens JWT
    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);
    regularToken1 = generateToken(regularUser1.id, tenant1.id);

    // Criar entidades relacionadas para testar relacionamentos polimórficos
    contact1 = await prisma.contact.create({
      data: {
        tenantId: tenant1.id,
        firstName: 'João',
        lastName: 'Silva',
        status: 'ACTIVE',
      },
    });

    contact2 = await prisma.contact.create({
      data: {
        tenantId: tenant1.id,
        firstName: 'Maria',
        lastName: 'Santos',
        status: 'ACTIVE',
      },
    });

    company1 = await prisma.company.create({
      data: {
        tenantId: tenant1.id,
        name: 'Empresa ABC',
        status: 'ACTIVE',
      },
    });

    lead1 = await prisma.lead.create({
      data: {
        tenantId: tenant1.id,
        firstName: 'Lead',
        lastName: 'Test',
        status: 'NEW',
        converted: false,
      },
    });

    // Criar pipeline e estágio para opportunity
    pipeline1 = await prisma.pipeline.create({
      data: {
        tenantId: tenant1.id,
        name: 'Pipeline de Vendas',
        isDefault: true,
      },
    });

    stage1 = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline1.id,
        tenantId: tenant1.id,
        name: 'Qualificação',
        order: 1,
        probability: 10,
        color: '#3B82F6',
      },
    });

    opportunity1 = await prisma.opportunity.create({
      data: {
        tenantId: tenant1.id,
        name: 'Oportunidade Teste',
        value: new Prisma.Decimal(50000),
        currency: 'BRL',
        stageId: stage1.id,
        status: 'OPEN',
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /api/tasks - Criar tarefa', () => {
    it('deve criar task com dados válidos completos', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Ligar para cliente',
          description: 'Seguir up sobre proposta',
          type: 'CALL',
          status: 'PENDING',
          dueDate: tomorrow.toISOString(),
          priority: 'HIGH',
          assignedToId: adminUser1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Ligar para cliente');
      expect(response.body.description).toBe('Seguir up sobre proposta');
      expect(response.body.type).toBe('CALL');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.priority).toBe('HIGH');
      expect(response.body.assignedToId).toBe(adminUser1.id);
      expect(response.body.relatedEntityType).toBe('Contact');
      expect(response.body.relatedEntityId).toBe(contact1.id);
      expect(response.body.createdById).toBe(adminUser1.id);
    });

    it('deve criar task apenas com title obrigatório', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Tarefa simples',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Tarefa simples');
      expect(response.body.status).toBe('PENDING'); // Default
      expect(response.body.priority).toBe('MEDIUM'); // Default
    });

    it('deve criar task com relatedEntityType=Contact', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task Contact',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.relatedEntityType).toBe('Contact');
      expect(response.body.relatedEntityId).toBe(contact1.id);
    });

    it('deve criar task com relatedEntityType=Company', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task Company',
          relatedEntityType: 'Company',
          relatedEntityId: company1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.relatedEntityType).toBe('Company');
      expect(response.body.relatedEntityId).toBe(company1.id);
    });

    it('deve criar task com relatedEntityType=Lead', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task Lead',
          relatedEntityType: 'Lead',
          relatedEntityId: lead1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.relatedEntityType).toBe('Lead');
      expect(response.body.relatedEntityId).toBe(lead1.id);
    });

    it('deve criar task com relatedEntityType=Opportunity', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task Opportunity',
          relatedEntityType: 'Opportunity',
          relatedEntityId: opportunity1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.relatedEntityType).toBe('Opportunity');
      expect(response.body.relatedEntityId).toBe(opportunity1.id);
    });

    it('deve criar task com assignedToId válido', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task Assigned',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          assignedToId: adminUser1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.assignedToId).toBe(adminUser1.id);
      expect(response.body.assignedTo).toBeDefined();
      expect(response.body.assignedTo.id).toBe(adminUser1.id);
    });

    it('deve criar task com dueDate válida (futura)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task com dueDate',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          dueDate: tomorrow.toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.dueDate).toBeDefined();
    });

    it('deve criar task com dueDate exatamente hoje', async () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task hoje',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          dueDate: today.toISOString(),
        });

      expect(response.status).toBe(201);
    });

    it('deve criar task com description null ou vazio', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task sem description',
          description: '',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
    });

    it('deve rejeitar task sem title', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task com title vazio após trim', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: '   ',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task com id no body', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          id: '00000000-0000-0000-0000-000000000000',
          title: 'Task',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task com type inválido', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          type: 'INVALID',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task com status inválido', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          status: 'INVALID',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task com priority inválido', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          priority: 'INVALID',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task com dueDate no passado', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          dueDate: yesterday.toISOString(),
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task com dueDate formato inválido', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          dueDate: 'invalid-date',
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task sem relatedEntityType', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task sem relatedEntityId', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          relatedEntityType: 'Contact',
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task com relatedEntityType inválido', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          relatedEntityType: 'Invalid',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task com relatedEntityId formato UUID inválido', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          relatedEntityType: 'Contact',
          relatedEntityId: 'invalid-uuid',
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task com relatedEntityId inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          relatedEntityType: 'Contact',
          relatedEntityId: fakeId,
        });

      expect(response.status).toBe(404);
    });

    it('deve rejeitar task com relatedEntityId de outro tenant', async () => {
      const contactTenant2 = await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Contact',
          lastName: 'Tenant2',
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          relatedEntityType: 'Contact',
          relatedEntityId: contactTenant2.id,
        });

      expect(response.status).toBe(404);
    });

    it('deve rejeitar task com assignedToId formato UUID inválido', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          assignedToId: 'invalid-uuid',
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar task com assignedToId inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          assignedToId: fakeId,
        });

      expect(response.status).toBe(404);
    });

    it('deve registrar auditoria ao criar task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task Auditoria',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      const taskId = response.body.id;

      // Aguardar auditoria
      const auditLog = await waitForAuditLog({
        tenantId: tenant1.id,
        entityType: 'Task',
        entityId: taskId,
        action: 'create',
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(adminUser1.id);
    });
  });

  describe('GET /api/tasks - Listar tarefas', () => {
    it('deve listar tasks do tenant atual', async () => {
      // Criar algumas tasks primeiro
      await prisma.task.createMany({
        data: [
          {
            tenantId: tenant1.id,
            title: 'Task 1',
            type: 'CALL',
            status: 'PENDING',
            priority: 'MEDIUM',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
            createdById: adminUser1.id,
          },
          {
            tenantId: tenant1.id,
            title: 'Task 2',
            type: 'EMAIL',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
            createdById: adminUser1.id,
          },
        ],
      });

      const response = await request(app)
        .get('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
    });

    it('deve filtrar tasks por status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=PENDING')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((task: any) => {
        expect(task.status).toBe('PENDING');
      });
    });

    it('deve filtrar tasks por type', async () => {
      const response = await request(app)
        .get('/api/tasks?type=CALL')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((task: any) => {
        expect(task.type).toBe('CALL');
      });
    });

    it('deve filtrar tasks por assignedToId', async () => {
      const response = await request(app)
        .get(`/api/tasks?assignedToId=${adminUser1.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((task: any) => {
        if (task.assignedToId) {
          expect(task.assignedToId).toBe(adminUser1.id);
        }
      });
    });

    it('deve filtrar tasks por relatedEntityType e relatedEntityId', async () => {
      const response = await request(app)
        .get(`/api/tasks?relatedEntityType=Contact&relatedEntityId=${contact1.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((task: any) => {
        expect(task.relatedEntityType).toBe('Contact');
        expect(task.relatedEntityId).toBe(contact1.id);
      });
    });

    it('deve ordenar tasks por dueDate', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      await prisma.task.createMany({
        data: [
          {
            tenantId: tenant1.id,
            title: 'Task A',
            type: 'CALL',
            status: 'PENDING',
            priority: 'MEDIUM',
            dueDate: dayAfter,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
            createdById: adminUser1.id,
          },
          {
            tenantId: tenant1.id,
            title: 'Task B',
            type: 'CALL',
            status: 'PENDING',
            priority: 'MEDIUM',
            dueDate: tomorrow,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
            createdById: adminUser1.id,
          },
        ],
      });

      const response = await request(app)
        .get('/api/tasks?orderBy=dueDate&order=asc')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      const tasksWithDueDate = response.body.data.filter((t: any) => t.dueDate);
      if (tasksWithDueDate.length >= 2) {
        const dates = tasksWithDueDate.map((t: any) => new Date(t.dueDate).getTime());
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
        }
      }
    });

    it('deve paginar tasks corretamente', async () => {
      const response = await request(app)
        .get('/api/tasks?limit=2&offset=0')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('deve retornar apenas tasks do tenant atual', async () => {
      // Criar task no tenant2
      await prisma.task.create({
        data: {
          tenantId: tenant2.id,
          title: 'Task Tenant 2',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id, // Mesmo ID mas tenant diferente
          createdById: adminUser2.id,
        },
      });

      // Listar tasks do tenant1
      const response = await request(app)
        .get('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      const tenant2Tasks = response.body.data.filter((task: any) => task.title === 'Task Tenant 2');
      expect(tenant2Tasks).toHaveLength(0);
    });

    it('deve excluir tasks soft deleted', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task para deletar',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      // Soft delete
      await prisma.task.update({
        where: { id: task.id },
        data: { deletedAt: new Date() },
      });

      // Listar tasks
      const response = await request(app)
        .get('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      const deletedTask = response.body.data.find((t: any) => t.id === task.id);
      expect(deletedTask).toBeUndefined();
    });

    it('deve rejeitar limit > 100', async () => {
      const response = await request(app)
        .get('/api/tasks?limit=101')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(400);
    });

    it('deve rejeitar limit < 1', async () => {
      const response = await request(app)
        .get('/api/tasks?limit=0')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(400);
    });

    it('deve rejeitar offset < 0', async () => {
      const response = await request(app)
        .get('/api/tasks?offset=-1')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(400);
    });

    it('deve rejeitar orderBy inválido', async () => {
      const response = await request(app)
        .get('/api/tasks?orderBy=invalid')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(400);
    });

    it('deve rejeitar order inválido', async () => {
      const response = await request(app)
        .get('/api/tasks?order=invalid')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/tasks/:id - Obter tarefa', () => {
    it('deve retornar task específica', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Get',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
          assignedToId: adminUser1.id,
        },
      });

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(task.id);
      expect(response.body.title).toBe('Task Get');
      expect(response.body.assignedTo).toBeDefined();
      expect(response.body.assignedTo.id).toBe(adminUser1.id);
      expect(response.body.createdBy).toBeDefined();
      expect(response.body.createdBy.id).toBe(adminUser1.id);
      expect(response.body.relatedEntity).toBeDefined();
    });

    it('deve retornar 404 para task inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar 404 para task de outro tenant', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant2.id,
          title: 'Task Tenant 2',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser2.id,
        },
      });

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar 404 para task soft deleted', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Deleted',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      await prisma.task.update({
        where: { id: task.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar 400 para taskId formato UUID inválido', async () => {
      const response = await request(app)
        .get('/api/tasks/invalid-id')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(400);
    });

    it('deve retornar 404 ao tentar atualizar task já soft deleted', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Para Deletar',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      // Soft delete
      await prisma.task.update({
        where: { id: task.id },
        data: { deletedAt: new Date() },
      });

      // Tentar atualizar task deletada
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Tentativa de Atualizar',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('não encontrada');
    });
  });

  describe('PUT /api/tasks/:id - Atualizar tarefa', () => {
    it('deve atualizar task com dados válidos', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Update',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task Updated',
          status: 'IN_PROGRESS',
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Task Updated');
      expect(response.body.status).toBe('IN_PROGRESS');
    });

    it('deve atualizar status para COMPLETED e definir completedAt', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Complete',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'COMPLETED',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.completedAt).toBeDefined();
      expect(response.body.completedAt).not.toBeNull();
    });

    it('deve atualizar status de COMPLETED para outro e limpar completedAt', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Complete',
          type: 'CALL',
          status: 'COMPLETED',
          priority: 'MEDIUM',
          completedAt: new Date(),
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'PENDING',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PENDING');
      expect(response.body.completedAt).toBeNull();
    });

    it('deve rejeitar atualização de task de outro tenant', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant2.id,
          title: 'Task Tenant 2',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser2.id,
        },
      });

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Updated',
        });

      expect(response.status).toBe(404);
    });

    it('deve rejeitar atualização com dueDate no passado', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          dueDate: yesterday.toISOString(),
        });

      expect(response.status).toBe(400);
    });

    it('deve registrar auditoria com changes ao atualizar task', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Auditoria',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task Auditoria Updated',
          status: 'COMPLETED',
        });

      expect(response.status).toBe(200);

      // Aguardar auditoria
      const auditLog = await waitForAuditLog({
        tenantId: tenant1.id,
        entityType: 'Task',
        entityId: task.id,
        action: 'update',
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.changes).toBeDefined();
      expect(auditLog?.changes).toBeInstanceOf(Object);

      // Verificar estrutura de changes (old/new values)
      const changes = auditLog?.changes as Record<string, { old?: any; new?: any }>;
      expect(changes).toBeDefined();

      // Verificar que title foi atualizado
      if (changes.title) {
        expect(changes.title.old).toBe('Task Auditoria');
        expect(changes.title.new).toBe('Task Auditoria Updated');
      }

      // Verificar que status foi atualizado
      if (changes.status) {
        expect(changes.status.old).toBe('PENDING');
        expect(changes.status.new).toBe('COMPLETED');
      }
    });

    it('deve registrar auditoria com changes para múltiplos campos atualizados', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Original',
          description: 'Descrição original',
          type: 'CALL',
          status: 'PENDING',
          priority: 'LOW',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task Atualizada',
          description: 'Nova descrição',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
        });

      expect(response.status).toBe(200);

      // Aguardar auditoria
      const auditLog = await waitForAuditLog({
        tenantId: tenant1.id,
        entityType: 'Task',
        entityId: task.id,
        action: 'update',
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.changes).toBeDefined();

      const changes = auditLog?.changes as Record<string, { old?: any; new?: any }>;
      
      // Verificar que todos os campos atualizados estão em changes
      expect(changes.title).toBeDefined();
      expect(changes.description).toBeDefined();
      expect(changes.status).toBeDefined();
      expect(changes.priority).toBeDefined();

      // Verificar valores old/new
      expect(changes.title.old).toBe('Task Original');
      expect(changes.title.new).toBe('Task Atualizada');
      expect(changes.description.old).toBe('Descrição original');
      expect(changes.description.new).toBe('Nova descrição');
      expect(changes.status.old).toBe('PENDING');
      expect(changes.status.new).toBe('IN_PROGRESS');
      expect(changes.priority.old).toBe('LOW');
      expect(changes.priority.new).toBe('HIGH');
    });

    it('deve registrar auditoria sem changes ao criar task (apenas action=create)', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Task Create Auditoria',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      const taskId = response.body.id;

      // Aguardar auditoria
      const auditLog = await waitForAuditLog({
        tenantId: tenant1.id,
        entityType: 'Task',
        entityId: taskId,
        action: 'create',
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('create');
      // Changes deve estar ausente ou null em create
      const changes = auditLog?.changes;
      expect(changes === undefined || changes === null).toBe(true);
    });
  });

  describe('DELETE /api/tasks/:id - Deletar tarefa', () => {
    it('deve fazer soft delete da task', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Delete',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deletada com sucesso');
      expect(response.body.id).toBe(task.id);

      // Verificar que task foi soft deleted
      const deletedTask = await prisma.task.findUnique({
        where: { id: task.id },
      });
      expect(deletedTask).not.toBeNull();
      expect(deletedTask?.deletedAt).not.toBeNull();

      // Verificar que task não aparece em listagem
      const listResponse = await request(app)
        .get('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      const foundTask = listResponse.body.data.find((t: any) => t.id === task.id);
      expect(foundTask).toBeUndefined();
    });

    it('deve retornar 404 para task de outro tenant', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant2.id,
          title: 'Task Tenant 2',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser2.id,
        },
      });

      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve registrar auditoria ao deletar task', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Delete Auditoria',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);

      // Aguardar auditoria
      const auditLog = await waitForAuditLog({
        tenantId: tenant1.id,
        entityType: 'Task',
        entityId: task.id,
        action: 'delete',
      });

      expect(auditLog).toBeDefined();
    });

    it('deve retornar 404 ao tentar deletar task já soft deleted', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Para Deletar 2',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      // Soft delete via API
      await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      // Tentar deletar novamente
      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('não encontrada');
    });
  });

  describe('Isolamento Multi-Tenant', () => {
    it('tenant1 não deve ver tasks do tenant2', async () => {
      // Criar task no tenant2
      await prisma.task.create({
        data: {
          tenantId: tenant2.id,
          title: 'Task Tenant 2',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser2.id,
        },
      });

      // Listar tasks do tenant1
      const response = await request(app)
        .get('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      const tenant2Tasks = response.body.data.filter((task: any) => task.title === 'Task Tenant 2');
      expect(tenant2Tasks).toHaveLength(0);
    });
  });

  describe('Autorização', () => {
    it('usuário sem permissão Task.create deve receber 403', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${regularToken1}`)
        .send({
          title: 'Task',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(403);
    });

    it('usuário sem permissão Task.update deve receber 403', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${regularToken1}`)
        .send({
          title: 'Updated',
        });

      expect(response.status).toBe(403);
    });

    it('usuário sem autenticação deve receber 401', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('X-Tenant-Id', tenant1.id);
        // Sem Authorization header

      expect(response.status).toBe(401);
    });
  });

  describe('Permissões por Campo', () => {
    let fieldUser: { id: string; email: string; password: string };
    let fieldToken: string;
    let fieldRole: { id: string };

    beforeAll(async () => {
      // Criar permissões por campo
      const taskListPermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Task',
        action: 'list',
      });

      const taskReadPermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Task',
        action: 'read',
      });

      const taskTitleReadPermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Task',
        action: 'read',
        field: 'title',
      });

      const taskUpdatePermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Task',
        action: 'update',
      });

      const taskTitleUpdatePermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Task',
        action: 'update',
        field: 'title',
      });

      // Criar role com permissões por campo
      fieldRole = await createTestRole({
        tenantId: tenant1.id,
        name: 'Field Permission Role',
        permissionIds: [
          taskListPermission.id,
          taskReadPermission.id,
          taskTitleReadPermission.id,
          taskUpdatePermission.id,
          taskTitleUpdatePermission.id,
        ],
      });

      // Criar usuário com role
      const fieldUserObj = await createTestUser({
        email: 'fielduser@taskcrud.test',
        password: 'FieldUserPass123',
        name: 'Field User',
        tenantId: tenant1.id,
      });
      fieldUser = { ...fieldUserObj, password: 'FieldUserPass123' };
      await assignRoleToUser(fieldUser.id, fieldRole.id);
      fieldToken = generateToken(fieldUser.id, tenant1.id);
    });

    it('GET: usuário com apenas Task.read.title não vê outros campos', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Field Test',
          description: 'Descrição secreta',
          type: 'CALL',
          status: 'PENDING',
          priority: 'HIGH',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${fieldToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title', 'Task Field Test');
      // Campos sem permissão não devem estar presentes
      expect(response.body).not.toHaveProperty('description');
      expect(response.body).not.toHaveProperty('priority');
    });

    it('UPDATE: usuário sem Task.update.description não pode atualizar description', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Update Field Test',
          description: 'Descrição original',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${fieldToken}`)
        .send({
          title: 'Título Atualizado',
          description: 'Tentativa de atualizar descrição',
        });

      // Deve retornar erro de permissão
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('permissão para atualizar');
    });

    it('UPDATE: usuário com Task.update.title pode atualizar title', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Update Title Test',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${fieldToken}`)
        .send({
          title: 'Título Atualizado com Sucesso',
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Título Atualizado com Sucesso');
    });

    it('Admin vê todos os campos (tem todas as permissões)', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Task Admin View',
          description: 'Descrição completa',
          type: 'CALL',
          status: 'PENDING',
          priority: 'HIGH',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('priority');
      expect(response.body).toHaveProperty('status');
    });
  });
});
