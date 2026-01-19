/**
 * Testes E2E para CRUD completo de notas via API
 * 
 * Valida criação, leitura, atualização e deleção de notas.
 * Testa isolamento multi-tenant, validações, auditoria, permissões ACL,
 * permissões de edição (criador ou Admin), relacionamentos polimórficos e filtros.
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
  prisma,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';
import { Prisma } from '@prisma/client';

describe('Note CRUD - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let regularUser1: { id: string; email: string; password: string };
  let regularUser2: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let regularToken1: string;
  let regularToken2: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };
  let regularRole1: { id: string };
  let contact1: { id: string };
  let company1: { id: string };
  let lead1: { id: string };
  let opportunity1: { id: string };
  let task1: { id: string };
  let pipeline1: { id: string };
  let stage1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    const tenant1Obj = await createTestTenant({
      name: 'Note CRUD Test Tenant 1',
      slug: 'note-crud-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Note CRUD Test Tenant 2',
      slug: 'note-crud-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;
    regularRole1 = roles1.user;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    const notePermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'list' }),
    ]);

    const notePermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Note', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Note', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Note', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Note', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Note', action: 'list' }),
    ]);

    await prisma.rolePermission.createMany({
      data: [
        ...notePermissions1.map((perm) => ({ roleId: adminRole1.id, permissionId: perm.id })),
        ...notePermissions2.map((perm) => ({ roleId: adminRole2.id, permissionId: perm.id })),
      ],
      skipDuplicates: true,
    });

    const adminUser1Obj = await createTestUser({
      email: 'admin1@notecrud.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@notecrud.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    const regularUser1Obj = await createTestUser({
      email: 'regular1@notecrud.test',
      password: 'RegularPass123',
      name: 'Regular User 1',
      tenantId: tenant1.id,
    });
    regularUser1 = { ...regularUser1Obj, password: 'RegularPass123' };
    await assignRoleToUser(regularUser1.id, regularRole1.id);

    const regularUser2Obj = await createTestUser({
      email: 'regular2@notecrud.test',
      password: 'RegularPass123',
      name: 'Regular User 2',
      tenantId: tenant1.id,
    });
    regularUser2 = { ...regularUser2Obj, password: 'RegularPass123' };
    await assignRoleToUser(regularUser2.id, regularRole1.id);

    const regularNotePermissions = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'list' }),
    ]);

    await prisma.rolePermission.createMany({
      data: regularNotePermissions.map((perm) => ({
        roleId: regularRole1.id,
        permissionId: perm.id,
      })),
      skipDuplicates: true,
    });

    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);
    regularToken1 = generateToken(regularUser1.id, tenant1.id);
    regularToken2 = generateToken(regularUser2.id, tenant1.id);

    contact1 = await prisma.contact.create({
      data: { tenantId: tenant1.id, firstName: 'João', lastName: 'Silva', status: 'ACTIVE' },
    });

    company1 = await prisma.company.create({
      data: { tenantId: tenant1.id, name: 'Empresa ABC', status: 'ACTIVE' },
    });

    lead1 = await prisma.lead.create({
      data: { tenantId: tenant1.id, firstName: 'Lead', lastName: 'Test', status: 'NEW', converted: false },
    });

    pipeline1 = await prisma.pipeline.create({
      data: { tenantId: tenant1.id, name: 'Pipeline de Vendas', isDefault: true },
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

    task1 = await prisma.task.create({
      data: {
        tenantId: tenant1.id,
        title: 'Tarefa Teste',
        type: 'CALL',
        status: 'PENDING',
        priority: 'MEDIUM',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
        createdById: adminUser1.id,
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /api/notes - Criar nota', () => {
    it('deve criar note com dados válidos completos', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Cliente interessado em proposta. Seguir up em 2 dias.',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('Cliente interessado em proposta. Seguir up em 2 dias.');
      expect(response.body.type).toBe('NOTE');
      expect(response.body.relatedEntityType).toBe('Contact');
      expect(response.body.relatedEntityId).toBe(contact1.id);
      expect(response.body.createdById).toBe(adminUser1.id);
      expect(response.body.createdBy).toBeDefined();
      expect(response.body.relatedEntity).toBeDefined();
    });

    it('deve criar note apenas com content obrigatório (valor padrão: type=NOTE)', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota simples',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.content).toBe('Nota simples');
      expect(response.body.type).toBe('NOTE'); // Default
    });

    it('deve criar note com relatedEntityType=Contact', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota Contact',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.relatedEntityType).toBe('Contact');
      expect(response.body.relatedEntityId).toBe(contact1.id);
    });

    it('deve criar note com relatedEntityType=Company', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota Company',
          relatedEntityType: 'Company',
          relatedEntityId: company1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.relatedEntityType).toBe('Company');
      expect(response.body.relatedEntityId).toBe(company1.id);
    });

    it('deve criar note com relatedEntityType=Lead', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota Lead',
          relatedEntityType: 'Lead',
          relatedEntityId: lead1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.relatedEntityType).toBe('Lead');
      expect(response.body.relatedEntityId).toBe(lead1.id);
    });

    it('deve criar note com relatedEntityType=Opportunity', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota Opportunity',
          relatedEntityType: 'Opportunity',
          relatedEntityId: opportunity1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.relatedEntityType).toBe('Opportunity');
      expect(response.body.relatedEntityId).toBe(opportunity1.id);
    });

    it('deve criar note com relatedEntityType=Task', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota Task',
          relatedEntityType: 'Task',
          relatedEntityId: task1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.relatedEntityType).toBe('Task');
      expect(response.body.relatedEntityId).toBe(task1.id);
    });

    it('deve criar note com type=NOTE', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota tipo NOTE',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('NOTE');
    });

    it('deve criar note com type=COMMENT', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Comentário',
          type: 'COMMENT',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('COMMENT');
    });

    it('deve criar note com type=ANNOTATION', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Anotação',
          type: 'ANNOTATION',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('ANNOTATION');
    });

    it('deve criar note com content de tamanho válido (até 10.000 caracteres)', async () => {
      const longContent = 'a'.repeat(10000);
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: longContent,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.content.length).toBe(10000);
    });

    it('deve criar note com content exatamente 10.000 caracteres', async () => {
      const content = 'a'.repeat(10000);
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
    });

    it('deve criar note com content contendo caracteres especiais/Unicode', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota com acentos: ção, emoji: 🎉, símbolos: ©®™',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.content).toContain('ção');
      expect(response.body.content).toContain('🎉');
    });

    it('deve rejeitar note sem content', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com content null', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: null,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com content não string', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 123,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com content vazio após trim', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: '   ',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com content apenas espaços', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: '     ',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com content > 10.000 caracteres', async () => {
      const longContent = 'a'.repeat(10001);
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: longContent,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com content de 10.001 caracteres', async () => {
      const content = 'a'.repeat(10001);
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com id no body', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          id: '00000000-0000-0000-0000-000000000000',
          content: 'Nota',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com type inválido', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          type: 'INVALID',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com type não string', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          type: 123,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note sem relatedEntityType', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com relatedEntityType null', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: null,
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com relatedEntityType não string', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 123,
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note sem relatedEntityId', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Contact',
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com relatedEntityId null', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Contact',
          relatedEntityId: null,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com relatedEntityId não string', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Contact',
          relatedEntityId: 123,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com relatedEntityType inválido', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Invalid',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com relatedEntityId formato UUID inválido', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Contact',
          relatedEntityId: 'invalid-uuid',
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar note com relatedEntityId inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Contact',
          relatedEntityId: fakeId,
        });

      expect(response.status).toBe(404);
    });

    it('deve rejeitar note com relatedEntityId de outro tenant', async () => {
      const contact2 = await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Contact',
          lastName: 'Tenant2',
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Contact',
          relatedEntityId: contact2.id,
        });

      expect(response.status).toBe(404);
    });

    it('deve rejeitar note com relatedEntityId soft deleted', async () => {
      const deletedContact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Deleted',
          lastName: 'Contact',
          status: 'ACTIVE',
        },
      });

      await prisma.contact.update({
        where: { id: deletedContact.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Contact',
          relatedEntityId: deletedContact.id,
        });

      expect(response.status).toBe(404);
    });

    it('deve registrar auditoria ao criar note', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota para auditoria',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      const noteId = response.body.id;

      const auditLog = await waitForAuditLog({
        tenantId: tenant1.id,
        entityType: 'Note',
        entityId: noteId,
        action: 'create',
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(adminUser1.id);
    });

    it('deve retornar note criada com createdById igual ao userId do token', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.createdById).toBe(adminUser1.id);
    });

    it('deve retornar note criada com relacionamento createdBy preenchido', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.createdBy).toBeDefined();
      expect(response.body.createdBy.id).toBe(adminUser1.id);
      expect(response.body.createdBy.name).toBeDefined();
      expect(response.body.createdBy.email).toBeDefined();
    });

    it('deve retornar note criada com relacionamento relatedEntity preenchido', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.relatedEntity).toBeDefined();
      expect(response.body.relatedEntity.id).toBe(contact1.id);
    });
  });

  describe('GET /api/notes - Listar notas', () => {
    it('deve listar notes do tenant atual', async () => {
      await prisma.note.createMany({
        data: [
          {
            tenantId: tenant1.id,
            content: 'Nota 1',
            type: 'NOTE',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
            createdById: adminUser1.id,
          },
          {
            tenantId: tenant1.id,
            content: 'Nota 2',
            type: 'COMMENT',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
            createdById: adminUser1.id,
          },
        ],
      });

      const response = await request(app)
        .get('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('deve filtrar por type (NOTE, COMMENT, ANNOTATION)', async () => {
      await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota COMMENT',
          type: 'COMMENT',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .get('/api/notes?type=COMMENT')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((note: any) => {
        expect(note.type).toBe('COMMENT');
      });
    });

    it('deve filtrar por relatedEntityType=Task e relatedEntityId válido', async () => {
      await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Task',
          type: 'NOTE',
          relatedEntityType: 'Task',
          relatedEntityId: task1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .get(`/api/notes?relatedEntityType=Task&relatedEntityId=${task1.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((note: any) => {
        expect(note.relatedEntityType).toBe('Task');
        expect(note.relatedEntityId).toBe(task1.id);
      });
    });

    it('deve ordenar por createdAt desc (mais recente primeiro) - padrão', async () => {
      const response = await request(app)
        .get('/api/notes?orderBy=createdAt&order=desc')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      if (response.body.data.length >= 2) {
        const dates = response.body.data.map((note: any) => new Date(note.createdAt).getTime());
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
        }
      }
    });

    it('deve paginar corretamente (limit, offset)', async () => {
      const response = await request(app)
        .get('/api/notes?limit=2&offset=0')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('deve retornar apenas notes do tenant atual', async () => {
      await prisma.note.create({
        data: {
          tenantId: tenant2.id,
          content: 'Nota Tenant 2',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser2.id,
        },
      });

      const response = await request(app)
        .get('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      const tenant2Notes = response.body.data.filter((note: any) => note.content === 'Nota Tenant 2');
      expect(tenant2Notes).toHaveLength(0);
    });

    it('deve excluir notes soft deleted', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota para deletar',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      await prisma.note.update({
        where: { id: note.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(app)
        .get('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      const deletedNote = response.body.data.find((n: any) => n.id === note.id);
      expect(deletedNote).toBeUndefined();
    });

    it('deve rejeitar limit > 100 ou < 1', async () => {
      const response1 = await request(app)
        .get('/api/notes?limit=101')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);
      expect(response1.status).toBe(400);

      const response2 = await request(app)
        .get('/api/notes?limit=0')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);
      expect(response2.status).toBe(400);
    });

    it('deve rejeitar offset < 0', async () => {
      const response = await request(app)
        .get('/api/notes?offset=-1')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(400);
    });

    it('deve rejeitar orderBy inválido (apenas createdAt permitido)', async () => {
      const response = await request(app)
        .get('/api/notes?orderBy=invalid')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(400);
    });

    it('deve rejeitar relatedEntityType fornecido sem relatedEntityId', async () => {
      const response = await request(app)
        .get('/api/notes?relatedEntityType=Contact')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/notes/:id - Obter nota', () => {
    it('deve retornar note específica com todos os campos', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Get',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .get(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(note.id);
      expect(response.body.content).toBe('Nota Get');
      expect(response.body.createdBy).toBeDefined();
      expect(response.body.relatedEntity).toBeDefined();
    });

    it('deve retornar 404 para note inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/notes/${fakeId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar 404 para note de outro tenant', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant2.id,
          content: 'Nota Tenant 2',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser2.id,
        },
      });

      const response = await request(app)
        .get(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar 404 para note soft deleted', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Deleted',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      await prisma.note.update({
        where: { id: note.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(app)
        .get(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar 400 para noteId formato UUID inválido', async () => {
      const response = await request(app)
        .get('/api/notes/invalid-id')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(400);
    });

    it('deve incluir relacionamento createdBy sempre (id, name, email)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .get(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.createdBy.id).toBe(adminUser1.id);
      expect(response.body.createdBy.name).toBeDefined();
      expect(response.body.createdBy.email).toBeDefined();
    });

    it('deve incluir relacionamento relatedEntity com informações básicas para Task', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Task',
          type: 'NOTE',
          relatedEntityType: 'Task',
          relatedEntityId: task1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .get(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.relatedEntity).toBeDefined();
      expect(response.body.relatedEntity.id).toBe(task1.id);
      expect(response.body.relatedEntity.title).toBeDefined();
    });
  });

  describe('PUT /api/notes/:id - Atualizar nota', () => {
    it('deve atualizar note com dados válidos', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Update',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota Updated',
          type: 'COMMENT',
        });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Nota Updated');
      expect(response.body.type).toBe('COMMENT');
    });

    it('deve atualizar apenas campos fornecidos (partial update)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Original',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota Atualizada',
        });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Nota Atualizada');
      expect(response.body.type).toBe('NOTE'); // Não mudou
    });

    it('deve permitir que criador edite note', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota do regularUser1',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: regularUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${regularToken1}`)
        .send({
          content: 'Nota editada pelo criador',
        });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Nota editada pelo criador');
    });

    it('deve permitir que Admin edite note de outro usuário', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota do regularUser1',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: regularUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota editada pelo Admin',
        });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Nota editada pelo Admin');
    });

    it('deve rejeitar atualização de note de outro tenant (404)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant2.id,
          content: 'Nota Tenant 2',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser2.id,
        },
      });

      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Updated',
        });

      expect(response.status).toBe(404);
    });

    it('deve rejeitar atualização de usuário regular que não é criador (403)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota do regularUser1',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: regularUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${regularToken2}`)
        .send({
          content: 'Tentativa de editar',
        });

      expect(response.status).toBe(403);
    });

    it('deve rejeitar atualização com content vazio após trim', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: '   ',
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar atualização com content > 10.000 caracteres', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const longContent = 'a'.repeat(10001);
      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: longContent,
        });

      expect(response.status).toBe(400);
    });

    it('deve aceitar atualização com content exatamente 10.000 caracteres', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const content = 'a'.repeat(10000);
      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content,
        });

      expect(response.status).toBe(200);
    });

    it('deve registrar auditoria com changes ao atualizar note (verificar estrutura old/new)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Original',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota Atualizada',
          type: 'COMMENT',
        });

      expect(response.status).toBe(200);

      const auditLog = await waitForAuditLog({
        tenantId: tenant1.id,
        entityType: 'Note',
        entityId: note.id,
        action: 'update',
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.changes).toBeDefined();
      expect(auditLog?.changes).toBeInstanceOf(Object);

      // Verificar estrutura de changes (old/new values)
      const changes = auditLog?.changes as Record<string, { old?: any; new?: any }>;
      expect(changes).toBeDefined();

      // Verificar que content foi atualizado
      if (changes.content) {
        expect(changes.content.old).toBe('Nota Original');
        expect(changes.content.new).toBe('Nota Atualizada');
      }

      // Verificar que type foi atualizado
      if (changes.type) {
        expect(changes.type.old).toBe('NOTE');
        expect(changes.type.new).toBe('COMMENT');
      }
    });

    it('deve registrar auditoria sem changes ao criar note (apenas action=create)', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota Create Auditoria',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
      const noteId = response.body.id;

      // Aguardar auditoria
      const auditLog = await waitForAuditLog({
        tenantId: tenant1.id,
        entityType: 'Note',
        entityId: noteId,
        action: 'create',
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('create');
      // Changes deve estar ausente ou null em create
      const changes = auditLog?.changes;
      expect(changes === undefined || changes === null).toBe(true);
    });

    it('deve registrar auditoria sem changes ao deletar note (apenas action=delete)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Delete Auditoria',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .delete(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);

      // Aguardar auditoria
      const auditLog = await waitForAuditLog({
        tenantId: tenant1.id,
        entityType: 'Note',
        entityId: note.id,
        action: 'delete',
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('delete');
      // Changes deve estar ausente ou null em delete
      const deleteChanges = auditLog?.changes;
      expect(deleteChanges === undefined || deleteChanges === null).toBe(true);
    });

    it('deve retornar 404 ao tentar atualizar note já soft deleted', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Para Deletar',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      // Soft delete
      await prisma.note.update({
        where: { id: note.id },
        data: { deletedAt: new Date() },
      });

      // Tentar atualizar note deletada
      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Tentativa de Atualizar',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('não encontrada');
    });
  });

  describe('DELETE /api/notes/:id - Deletar nota', () => {
    it('deve fazer soft delete (marcar deletedAt com timestamp atual)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Delete',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .delete(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deletada com sucesso');
      expect(response.body.id).toBe(note.id);

      const deletedNote = await prisma.note.findUnique({
        where: { id: note.id },
      });
      expect(deletedNote).not.toBeNull();
      expect(deletedNote?.deletedAt).not.toBeNull();
    });

    it('deve permitir que criador delete note', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota do regularUser1',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: regularUser1.id,
        },
      });

      const response = await request(app)
        .delete(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${regularToken1}`);

      expect(response.status).toBe(200);
    });

    it('deve permitir que Admin delete note de outro usuário', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota do regularUser1',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: regularUser1.id,
        },
      });

      const response = await request(app)
        .delete(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
    });

    it('deve rejeitar delete de note inexistente (404)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/notes/${fakeId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve rejeitar delete de note de outro tenant (404)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant2.id,
          content: 'Nota Tenant 2',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser2.id,
        },
      });

      const response = await request(app)
        .delete(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve rejeitar delete de note já deletada (404)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      await prisma.note.update({
        where: { id: note.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(app)
        .delete(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve rejeitar delete de usuário regular que não é criador (403)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota do regularUser1',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: regularUser1.id,
        },
      });

      const response = await request(app)
        .delete(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${regularToken2}`);

      expect(response.status).toBe(403);
    });

    it('deve registrar auditoria ao deletar note', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Delete Auditoria',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .delete(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);

      const auditLog = await waitForAuditLog({
        tenantId: tenant1.id,
        entityType: 'Note',
        entityId: note.id,
        action: 'delete',
      });

      expect(auditLog).toBeDefined();
    });

    it('Note deletada não deve aparecer em listagens (GET /api/notes)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota para deletar',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      await request(app)
        .delete(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      const listResponse = await request(app)
        .get('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      const foundNote = listResponse.body.data.find((n: any) => n.id === note.id);
      expect(foundNote).toBeUndefined();
    });
  });

  describe('Isolamento Multi-Tenant', () => {
    it('Note criada no tenant1 não deve aparecer no tenant2', async () => {
      await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Tenant 1',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .get('/api/notes')
        .set('X-Tenant-Id', tenant2.id)
        .set('Authorization', `Bearer ${adminToken2}`);

      expect(response.status).toBe(200);
      const tenant1Notes = response.body.data.filter((note: any) => note.content === 'Nota Tenant 1');
      expect(tenant1Notes).toHaveLength(0);
    });

    it('Tentativa de acessar note de outro tenant deve retornar 404', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota Tenant 1',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .get(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant2.id)
        .set('Authorization', `Bearer ${adminToken2}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Autorização', () => {
    it('usuário sem permissão Note.list deve receber 403 em GET /api/notes', async () => {
      const userWithoutPerms = await createTestUser({
        email: 'noperms@notecrud.test',
        password: 'NoPerms123',
        name: 'No Perms User',
        tenantId: tenant1.id,
      });
      const tokenNoPerms = generateToken(userWithoutPerms.id, tenant1.id);

      const response = await request(app)
        .get('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${tokenNoPerms}`);

      expect(response.status).toBe(403);
    });

    it('usuário sem permissão Note.create deve receber 403 em POST /api/notes', async () => {
      const userWithoutPerms = await createTestUser({
        email: 'noperms2@notecrud.test',
        password: 'NoPerms123',
        name: 'No Perms User 2',
        tenantId: tenant1.id,
      });
      const tokenNoPerms = generateToken(userWithoutPerms.id, tenant1.id);

      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${tokenNoPerms}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(403);
    });

    it('usuário sem autenticação deve receber 401 em todas as rotas', async () => {
      const response1 = await request(app)
        .get('/api/notes')
        .set('X-Tenant-Id', tenant1.id);
      expect(response1.status).toBe(401);

      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response2 = await request(app)
        .get(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id);
      expect(response2.status).toBe(401);
    });

    it('usuário com permissão Note.update mas que não é criador nem Admin não pode editar note de outro usuário (403)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota do regularUser1',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: regularUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${regularToken2}`)
        .send({
          content: 'Tentativa de editar',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Edge Cases', () => {
    it('Note com content exatamente 10.000 caracteres (deve ser aceito)', async () => {
      const content = 'a'.repeat(10000);
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(201);
    });

    it('Note com content de 10.001 caracteres (deve ser rejeitado)', async () => {
      const content = 'a'.repeat(10001);
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('Note com content apenas espaços (deve ser rejeitado após trim)', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: '     ',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(response.status).toBe(400);
    });

    it('Note com múltiplos filtros combinados (type + relatedEntityType + relatedEntityId)', async () => {
      await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota COMMENT',
          type: 'COMMENT',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .get(`/api/notes?type=COMMENT&relatedEntityType=Contact&relatedEntityId=${contact1.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((note: any) => {
        expect(note.type).toBe('COMMENT');
        expect(note.relatedEntityType).toBe('Contact');
        expect(note.relatedEntityId).toBe(contact1.id);
      });
    });

    it('Note criada e imediatamente atualizada (verificar auditoria com 2 logs: create e update)', async () => {
      const createResponse = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota Original',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        });

      expect(createResponse.status).toBe(201);
      const noteId = createResponse.body.id;

      await request(app)
        .put(`/api/notes/${noteId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota Atualizada',
        });

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          tenantId: tenant1.id,
          entityType: 'Note',
          entityId: noteId,
        },
        orderBy: { timestamp: 'asc' },
      });

      expect(auditLogs.length).toBeGreaterThanOrEqual(2);
      expect(auditLogs.some((log) => log.action === 'create')).toBe(true);
      expect(auditLogs.some((log) => log.action === 'update')).toBe(true);
    });

    it('Note relacionada a task que foi soft deleted (deve ser rejeitada na criação)', async () => {
      const deletedTask = await prisma.task.create({
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
        where: { id: deletedTask.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(app)
        .post('/api/notes')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          content: 'Nota',
          relatedEntityType: 'Task',
          relatedEntityId: deletedTask.id,
        });

      expect(response.status).toBe(404);
    });
  });

  describe('Permissões por Campo', () => {
    let fieldUser: { id: string; email: string; password: string };
    let fieldToken: string;
    let fieldRole: { id: string };

    beforeAll(async () => {
      // Criar permissões por campo
      const noteListPermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Note',
        action: 'list',
      });

      const noteReadPermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Note',
        action: 'read',
      });

      const noteContentReadPermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Note',
        action: 'read',
        field: 'content',
      });

      const noteUpdatePermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Note',
        action: 'update',
      });

      const noteContentUpdatePermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Note',
        action: 'update',
        field: 'content',
      });

      // Criar role com permissões por campo
      fieldRole = await createTestRole({
        tenantId: tenant1.id,
        name: 'Note Field Permission Role',
        permissionIds: [
          noteListPermission.id,
          noteReadPermission.id,
          noteContentReadPermission.id,
          noteUpdatePermission.id,
          noteContentUpdatePermission.id,
        ],
      });

      // Criar usuário com role
      const fieldUserObj = await createTestUser({
        email: 'fielduser@notecrud.test',
        password: 'FieldUserPass123',
        name: 'Field User',
        tenantId: tenant1.id,
      });
      fieldUser = { ...fieldUserObj, password: 'FieldUserPass123' };
      await assignRoleToUser(fieldUser.id, fieldRole.id);
      fieldToken = generateToken(fieldUser.id, tenant1.id);
    });

    it('GET: usuário com apenas Note.read.content não vê outros campos', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Conteúdo da nota',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .get(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${fieldToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('content', 'Conteúdo da nota');
      // Campos sem permissão não devem estar presentes
      expect(response.body).not.toHaveProperty('type');
    });

    it('UPDATE: usuário sem Note.update.type não pode atualizar type', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota original',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${fieldToken}`)
        .send({
          content: 'Conteúdo atualizado',
          type: 'COMMENT',
        });

      // Deve retornar erro de permissão
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('permissão para atualizar');
    });

    it('UPDATE: usuário com Note.update.content pode atualizar content', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Conteúdo original',
          type: 'NOTE',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .put(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${fieldToken}`)
        .send({
          content: 'Conteúdo atualizado com sucesso',
        });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Conteúdo atualizado com sucesso');
    });

    it('Admin vê todos os campos (tem todas as permissões)', async () => {
      const note = await prisma.note.create({
        data: {
          tenantId: tenant1.id,
          content: 'Nota completa',
          type: 'COMMENT',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
          createdById: adminUser1.id,
        },
      });

      const response = await request(app)
        .get(`/api/notes/${note.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('relatedEntityType');
    });
  });
});
