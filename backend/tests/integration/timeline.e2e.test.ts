/**
 * Testes E2E para Timeline/Histórico de Atividades
 * 
 * Valida timeline que agrega tarefas, notas e logs de auditoria relacionados a uma entidade.
 * Testa isolamento multi-tenant, validações, ordenação, paginação e filtros.
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
  waitForAuditLog,
  prisma,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';
import { Prisma } from '@prisma/client';
import { logAudit } from '../../src/utils/auditLog';

describe('Timeline - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };
  let contact1: { id: string };
  let company1: { id: string };
  let lead1: { id: string };
  let opportunity1: { id: string };
  let task1: { id: string };
  let pipeline1: { id: string };
  let stage1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Timeline Test Tenant 1',
      slug: 'timeline-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Timeline Test Tenant 2',
      slug: 'timeline-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Timeline
    const timelinePermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Timeline', action: 'read' }),
    ]);

    const timelinePermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Timeline', action: 'read' }),
    ]);

    // Criar permissões para Task e Note (necessárias para criar atividades)
    const taskPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'read' }),
    ]);

    const notePermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'read' }),
    ]);

    // Associar permissões aos Admins
    await prisma.rolePermission.createMany({
      data: [
        ...timelinePermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...timelinePermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
        ...taskPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...notePermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin1@timeline.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@timeline.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Gerar tokens JWT
    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);

    // Criar entidades relacionadas para testar timeline
    contact1 = await prisma.contact.create({
      data: {
        tenantId: tenant1.id,
        firstName: 'João',
        lastName: 'Silva',
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

    // Criar uma tarefa para usar como entidade relacionada
    task1 = await prisma.task.create({
      data: {
        tenantId: tenant1.id,
        title: 'Tarefa Teste',
        description: 'Descrição da tarefa',
        type: 'CALL',
        status: 'PENDING',
        priority: 'MEDIUM',
        createdById: adminUser1.id,
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('GET /api/timeline/:entityType/:entityId', () => {
    describe('Testes obrigatórios', () => {
      it('deve retornar timeline com tarefas, notas e auditoria relacionadas à mesma entidade', async () => {
        // Criar tarefa relacionada ao contato
        const taskResponse = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            title: 'Tarefa Timeline Test',
            description: 'Descrição da tarefa',
            type: 'CALL',
            status: 'PENDING',
            priority: 'MEDIUM',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          });

        expect(taskResponse.status).toBe(201);
        const taskId = taskResponse.body.id;

        // Aguardar log de auditoria
        await waitForAuditLog({
          tenantId: tenant1.id,
          entityType: 'Task',
          entityId: taskId,
          action: 'create',
        });

        // Criar nota relacionada ao contato
        const noteResponse = await request(app)
          .post('/api/notes')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            content: 'Nota Timeline Test',
            type: 'NOTE',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          });

        expect(noteResponse.status).toBe(201);
        const noteId = noteResponse.body.id;

        // Aguardar log de auditoria
        await waitForAuditLog({
          tenantId: tenant1.id,
          entityType: 'Note',
          entityId: noteId,
          action: 'create',
        });

        // Criar alteração de auditoria (atualizar contato)
        await prisma.contact.update({
          where: { id: contact1.id },
          data: { firstName: 'João Atualizado' },
        });

        await logAudit('Contact', contact1.id, 'update', adminUser1.id, tenant1.id, {
          firstName: { old: 'João', new: 'João Atualizado' },
        });

        // Buscar timeline
        const timelineResponse = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timelineResponse.status).toBe(200);
        expect(timelineResponse.body).toHaveProperty('data');
        expect(timelineResponse.body).toHaveProperty('pagination');
        expect(timelineResponse.body).toHaveProperty('entity');

        const { data } = timelineResponse.body;

        // Verificar que todas as atividades aparecem
        const taskItem = data.find((item: any) => item.type === 'task' && item.id === taskId);
        const noteItem = data.find((item: any) => item.type === 'note' && item.id === noteId);
        const auditItem = data.find((item: any) => item.type === 'audit' && item.data.action === 'update');

        expect(taskItem).toBeDefined();
        expect(noteItem).toBeDefined();
        expect(auditItem).toBeDefined();

        // Verificar que atividades de outras entidades não aparecem
        const otherEntityItems = data.filter(
          (item: any) =>
            (item.type === 'task' && item.data.title === 'Tarefa Teste') ||
            (item.type === 'note' && item.data.content === 'Nota Timeline Test' && item.id !== noteId)
        );
        expect(otherEntityItems.length).toBe(0);
      });

      it('deve retornar timeline ordenada por timestamp DESC (mais recente primeiro)', async () => {
        // Criar atividades com delays para garantir timestamps diferentes
        const task1 = await prisma.task.create({
          data: {
            tenantId: tenant1.id,
            title: 'Tarefa 1',
            type: 'CALL',
            status: 'PENDING',
            priority: 'MEDIUM',
            createdById: adminUser1.id,
            relatedEntityType: 'Company',
            relatedEntityId: company1.id,
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        const note1 = await prisma.note.create({
          data: {
            tenantId: tenant1.id,
            content: 'Nota 1',
            type: 'NOTE',
            createdById: adminUser1.id,
            relatedEntityType: 'Company',
            relatedEntityId: company1.id,
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        const task2 = await prisma.task.create({
          data: {
            tenantId: tenant1.id,
            title: 'Tarefa 2',
            type: 'EMAIL',
            status: 'PENDING',
            priority: 'MEDIUM',
            createdById: adminUser1.id,
            relatedEntityType: 'Company',
            relatedEntityId: company1.id,
          },
        });

        // Buscar timeline
        const timelineResponse = await request(app)
          .get(`/api/timeline/Company/${company1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timelineResponse.status).toBe(200);
        const { data } = timelineResponse.body;

        // Verificar ordenação (mais recente primeiro)
        expect(data.length).toBeGreaterThanOrEqual(3);

        // Encontrar os itens criados
        const task2Item = data.find((item: any) => item.id === task2.id);
        const note1Item = data.find((item: any) => item.id === note1.id);
        const task1Item = data.find((item: any) => item.id === task1.id);

        expect(task2Item).toBeDefined();
        expect(note1Item).toBeDefined();
        expect(task1Item).toBeDefined();

        // Verificar que task2 (mais recente) vem antes de note1, que vem antes de task1
        const task2Index = data.findIndex((item: any) => item.id === task2.id);
        const note1Index = data.findIndex((item: any) => item.id === note1.id);
        const task1Index = data.findIndex((item: any) => item.id === task1.id);

        expect(task2Index).toBeLessThan(note1Index);
        expect(note1Index).toBeLessThan(task1Index);
      });

      it('deve incluir tarefas, notas e auditoria na timeline', async () => {
        // Criar uma tarefa, uma nota e uma alteração (auditoria)
        const task = await prisma.task.create({
          data: {
            tenantId: tenant1.id,
            title: 'Tarefa Timeline Test 2',
            type: 'MEETING',
            status: 'PENDING',
            priority: 'HIGH',
            createdById: adminUser1.id,
            relatedEntityType: 'Lead',
            relatedEntityId: lead1.id,
          },
        });

        const note = await prisma.note.create({
          data: {
            tenantId: tenant1.id,
            content: 'Nota Timeline Test 2',
            type: 'COMMENT',
            createdById: adminUser1.id,
            relatedEntityType: 'Lead',
            relatedEntityId: lead1.id,
          },
        });

        await logAudit('Lead', lead1.id, 'update', adminUser1.id, tenant1.id, {
          status: { old: 'NEW', new: 'QUALIFIED' },
        });

        // Buscar timeline
        const timelineResponse = await request(app)
          .get(`/api/timeline/Lead/${lead1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timelineResponse.status).toBe(200);
        const { data } = timelineResponse.body;

        // Verificar que todos os 3 tipos aparecem
        const taskItem = data.find((item: any) => item.type === 'task' && item.id === task.id);
        const noteItem = data.find((item: any) => item.type === 'note' && item.id === note.id);
        const auditItem = data.find((item: any) => item.type === 'audit' && item.data.action === 'update');

        expect(taskItem).toBeDefined();
        expect(noteItem).toBeDefined();
        expect(auditItem).toBeDefined();

        // Verificar que cada item tem type correto
        expect(taskItem.type).toBe('task');
        expect(noteItem.type).toBe('note');
        expect(auditItem.type).toBe('audit');
      });
    });

    describe('Testes adicionais', () => {
      it('deve excluir tarefas soft deleted da timeline', async () => {
        const task = await prisma.task.create({
          data: {
            tenantId: tenant1.id,
            title: 'Tarefa para deletar',
            type: 'CALL',
            status: 'PENDING',
            priority: 'MEDIUM',
            createdById: adminUser1.id,
            relatedEntityType: 'Opportunity',
            relatedEntityId: opportunity1.id,
          },
        });

        // Buscar timeline antes de deletar
        const timelineBefore = await request(app)
          .get(`/api/timeline/Opportunity/${opportunity1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timelineBefore.status).toBe(200);
        const taskBefore = timelineBefore.body.data.find((item: any) => item.id === task.id);
        expect(taskBefore).toBeDefined();

        // Deletar tarefa (soft delete)
        await prisma.task.update({
          where: { id: task.id },
          data: { deletedAt: new Date() },
        });

        // Buscar timeline após deletar
        const timelineAfter = await request(app)
          .get(`/api/timeline/Opportunity/${opportunity1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timelineAfter.status).toBe(200);
        const taskAfter = timelineAfter.body.data.find((item: any) => item.id === task.id);
        expect(taskAfter).toBeUndefined();
      });

      it('deve excluir notas soft deleted da timeline', async () => {
        const note = await prisma.note.create({
          data: {
            tenantId: tenant1.id,
            content: 'Nota para deletar',
            type: 'NOTE',
            createdById: adminUser1.id,
            relatedEntityType: 'Opportunity',
            relatedEntityId: opportunity1.id,
          },
        });

        // Buscar timeline antes de deletar
        const timelineBefore = await request(app)
          .get(`/api/timeline/Opportunity/${opportunity1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timelineBefore.status).toBe(200);
        const noteBefore = timelineBefore.body.data.find((item: any) => item.id === note.id);
        expect(noteBefore).toBeDefined();

        // Deletar nota (soft delete)
        await prisma.note.update({
          where: { id: note.id },
          data: { deletedAt: new Date() },
        });

        // Buscar timeline após deletar
        const timelineAfter = await request(app)
          .get(`/api/timeline/Opportunity/${opportunity1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timelineAfter.status).toBe(200);
        const noteAfter = timelineAfter.body.data.find((item: any) => item.id === note.id);
        expect(noteAfter).toBeUndefined();
      });

      it('deve filtrar por tenant (atividades de outro tenant não aparecem)', async () => {
        // Criar atividade no tenant1
        const task1 = await prisma.task.create({
          data: {
            tenantId: tenant1.id,
            title: 'Tarefa Tenant 1',
            type: 'CALL',
            status: 'PENDING',
            priority: 'MEDIUM',
            createdById: adminUser1.id,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
        });

        // Criar contato no tenant2
        const contact2 = await prisma.contact.create({
          data: {
            tenantId: tenant2.id,
            firstName: 'Contato',
            lastName: 'Tenant 2',
            status: 'ACTIVE',
          },
        });

        // Criar atividade no tenant2 relacionada a contato diferente
        const task2 = await prisma.task.create({
          data: {
            tenantId: tenant2.id,
            title: 'Tarefa Tenant 2',
            type: 'CALL',
            status: 'PENDING',
            priority: 'MEDIUM',
            createdById: adminUser2.id,
            relatedEntityType: 'Contact',
            relatedEntityId: contact2.id,
          },
        });

        // Buscar timeline do tenant1
        const timeline1 = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timeline1.status).toBe(200);
        const task1InTimeline = timeline1.body.data.find((item: any) => item.id === task1.id);
        const task2InTimeline = timeline1.body.data.find((item: any) => item.id === task2.id);

        expect(task1InTimeline).toBeDefined();
        expect(task2InTimeline).toBeUndefined();

        // Buscar timeline do tenant2
        const timeline2 = await request(app)
          .get(`/api/timeline/Contact/${contact2.id}`)
          .set('Authorization', `Bearer ${adminToken2}`)
          .set('X-Tenant-Slug', tenant2.slug);

        expect(timeline2.status).toBe(200);
        const task2InTimeline2 = timeline2.body.data.find((item: any) => item.id === task2.id);
        const task1InTimeline2 = timeline2.body.data.find((item: any) => item.id === task1.id);

        expect(task2InTimeline2).toBeDefined();
        expect(task1InTimeline2).toBeUndefined();
      });

      it('deve retornar 404 se entidade não existir ou não pertence ao tenant', async () => {
        // UUID inválido (não existe)
        const fakeId = '00000000-0000-0000-0000-000000000000';

        const response = await request(app)
          .get(`/api/timeline/Contact/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Não encontrado');
      });

      it('deve retornar 400 se entityType for inválido', async () => {
        const response = await request(app)
          .get(`/api/timeline/InvalidType/${contact1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Parâmetro inválido');
      });

      it('deve retornar 400 se entityId não for UUID válido', async () => {
        const response = await request(app)
          .get(`/api/timeline/Contact/invalid-uuid`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Parâmetro inválido');
      });

      it('deve retornar 400 se limit for inválido', async () => {
        const response = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}?limit=200`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Parâmetro inválido');
      });

      it('deve retornar 400 se offset for inválido', async () => {
        const response = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}?offset=-1`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Parâmetro inválido');
      });

      it('deve incluir informações de usuário (userId, userName) em cada item', async () => {
        const task = await prisma.task.create({
          data: {
            tenantId: tenant1.id,
            title: 'Tarefa com usuário',
            type: 'CALL',
            status: 'PENDING',
            priority: 'MEDIUM',
            createdById: adminUser1.id,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
        });

        const timeline = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timeline.status).toBe(200);
        const taskItem = timeline.body.data.find((item: any) => item.id === task.id);

        expect(taskItem).toBeDefined();
        expect(taskItem).toHaveProperty('userId');
        expect(taskItem).toHaveProperty('userName');
        expect(taskItem.userId).toBe(adminUser1.id);
        expect(taskItem.userName).toBe('Admin User 1');
      });

      it('deve incluir dados específicos corretos (TaskTimelineData, NoteTimelineData, AuditTimelineData)', async () => {
        const task = await prisma.task.create({
          data: {
            tenantId: tenant1.id,
            title: 'Tarefa Dados',
            description: 'Descrição da tarefa',
            type: 'MEETING',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            dueDate: new Date('2024-12-31'),
            createdById: adminUser1.id,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
        });

        const note = await prisma.note.create({
          data: {
            tenantId: tenant1.id,
            content: 'Nota Dados',
            type: 'ANNOTATION',
            createdById: adminUser1.id,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
        });

        await logAudit('Contact', contact1.id, 'update', adminUser1.id, tenant1.id, {
          lastName: { old: 'Silva', new: 'Silva Atualizado' },
        });

        const timeline = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timeline.status).toBe(200);
        const { data } = timeline.body;

        const taskItem = data.find((item: any) => item.id === task.id);
        const noteItem = data.find((item: any) => item.id === note.id);
        const auditItem = data.find((item: any) => item.type === 'audit' && item.data.action === 'update');

        // Verificar TaskTimelineData
        expect(taskItem.data).toHaveProperty('title');
        expect(taskItem.data).toHaveProperty('description');
        expect(taskItem.data).toHaveProperty('type');
        expect(taskItem.data).toHaveProperty('status');
        expect(taskItem.data).toHaveProperty('priority');
        expect(taskItem.data.title).toBe('Tarefa Dados');
        expect(taskItem.data.type).toBe('MEETING');
        expect(taskItem.data.status).toBe('IN_PROGRESS');
        expect(taskItem.data.priority).toBe('HIGH');

        // Verificar NoteTimelineData
        expect(noteItem.data).toHaveProperty('content');
        expect(noteItem.data).toHaveProperty('noteType');
        expect(noteItem.data.content).toBe('Nota Dados');
        expect(noteItem.data.noteType).toBe('ANNOTATION');

        // Verificar AuditTimelineData
        expect(auditItem.data).toHaveProperty('action');
        expect(auditItem.data).toHaveProperty('changes');
        expect(auditItem.data.action).toBe('update');
        expect(auditItem.data.changes).toHaveProperty('lastName');
      });

      it('deve funcionar com paginação (limit, offset)', async () => {
        // Criar múltiplas atividades
        for (let i = 0; i < 5; i++) {
          await prisma.task.create({
            data: {
              tenantId: tenant1.id,
              title: `Tarefa ${i}`,
              type: 'CALL',
              status: 'PENDING',
              priority: 'MEDIUM',
              createdById: adminUser1.id,
              relatedEntityType: 'Contact',
              relatedEntityId: contact1.id,
            },
          });
        }

        // Buscar primeira página (limit 2)
        const page1 = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}?limit=2&offset=0`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(page1.status).toBe(200);
        expect(page1.body.data.length).toBeLessThanOrEqual(2);
        expect(page1.body.pagination.limit).toBe(2);
        expect(page1.body.pagination.offset).toBe(0);

        // Buscar segunda página
        const page2 = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}?limit=2&offset=2`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(page2.status).toBe(200);
        expect(page2.body.data.length).toBeLessThanOrEqual(2);
        expect(page2.body.pagination.limit).toBe(2);
        expect(page2.body.pagination.offset).toBe(2);
      });

      it('deve retornar total correto na paginação', async () => {
        // Criar algumas atividades
        for (let i = 0; i < 3; i++) {
          await prisma.note.create({
            data: {
              tenantId: tenant1.id,
              content: `Nota ${i}`,
              type: 'NOTE',
              createdById: adminUser1.id,
              relatedEntityType: 'Contact',
              relatedEntityId: contact1.id,
            },
          });
        }

        const timeline = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}?limit=10`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timeline.status).toBe(200);
        expect(timeline.body.pagination).toHaveProperty('total');
        expect(timeline.body.pagination.total).toBeGreaterThanOrEqual(3);
      });

      it('deve funcionar para diferentes tipos de entidade (Contact, Company, Lead, Opportunity, Task)', async () => {
        // Testar Contact
        const contactTimeline = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);
        expect(contactTimeline.status).toBe(200);

        // Testar Company
        const companyTimeline = await request(app)
          .get(`/api/timeline/Company/${company1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);
        expect(companyTimeline.status).toBe(200);

        // Testar Lead
        const leadTimeline = await request(app)
          .get(`/api/timeline/Lead/${lead1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);
        expect(leadTimeline.status).toBe(200);

        // Testar Opportunity
        const opportunityTimeline = await request(app)
          .get(`/api/timeline/Opportunity/${opportunity1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);
        expect(opportunityTimeline.status).toBe(200);

        // Testar Task
        const taskTimeline = await request(app)
          .get(`/api/timeline/Task/${task1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);
        expect(taskTimeline.status).toBe(200);
      });

      it('deve retornar informações básicas da entidade (name) quando disponível', async () => {
        const timeline = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timeline.status).toBe(200);
        expect(timeline.body.entity).toHaveProperty('type');
        expect(timeline.body.entity).toHaveProperty('id');
        expect(timeline.body.entity).toHaveProperty('name');
        expect(timeline.body.entity.type).toBe('Contact');
        expect(timeline.body.entity.id).toBe(contact1.id);
        expect(timeline.body.entity.name).toBe('João Silva');
      });

      it('deve retornar array vazio quando não há atividades', async () => {
        // Criar novo contato sem atividades
        const newContact = await prisma.contact.create({
          data: {
            tenantId: tenant1.id,
            firstName: 'Novo',
            lastName: 'Contato',
            status: 'ACTIVE',
          },
        });

        const timeline = await request(app)
          .get(`/api/timeline/Contact/${newContact.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(timeline.status).toBe(200);
        expect(timeline.body.data).toEqual([]);
        expect(timeline.body.pagination.total).toBe(0);
      });

      it('deve requerer autenticação (401 sem token)', async () => {
        const response = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(response.status).toBe(401);
      });

      it('deve requerer permissão Timeline.read (403 sem permissão)', async () => {
        // Criar usuário sem permissão de Timeline
        const userWithoutPermission = await createTestUser({
          email: 'noperm@timeline.test',
          password: 'NoPermPass123',
          name: 'User No Permission',
          tenantId: tenant1.id,
        });
        await assignRoleToUser(userWithoutPermission.id, adminRole1.id);
        const tokenNoPerm = generateToken(userWithoutPermission.id, tenant1.id);

        const response = await request(app)
          .get(`/api/timeline/Contact/${contact1.id}`)
          .set('Authorization', `Bearer ${tokenNoPerm}`)
          .set('X-Tenant-Slug', tenant1.slug);

        expect(response.status).toBe(403);
      });
    });
  });
});
