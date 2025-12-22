/**
 * Testes E2E para CRUD completo de entidades via API
 * 
 * Valida criação, leitura, atualização e deleção de entidades.
 * Testa isolamento multi-tenant, validações, auditoria e permissões ACL.
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
  createTestEntity,
  createTestField,
  closeDatabase,
  waitForAuditLog,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';

describe('Entity CRUD - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Entity CRUD Test Tenant 1',
      slug: 'entity-crud-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Entity CRUD Test Tenant 2',
      slug: 'entity-crud-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Entity (se não existirem)
    const entityPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Entity', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Entity', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Entity', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Entity', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Entity', action: 'list' }),
    ]);

    const entityPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Entity', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Entity', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Entity', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Entity', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Entity', action: 'list' }),
    ]);

    // Associar permissões aos Admins
    const { prisma } = await import('../helpers/db');
    await prisma.rolePermission.createMany({
      data: [
        ...entityPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...entityPermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin1@entitycrud.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);
    adminToken1 = generateToken(adminUser1.id, tenant1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@entitycrud.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('POST /api/entities - Create', () => {
    it('deve criar entidade customizada com sucesso', async () => {
      const response = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: 'TestEntity',
          label: 'Entidade de Teste',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('TestEntity');
      expect(response.body.label).toBe('Entidade de Teste');
      expect(response.body.tenantId).toBe(tenant1.id);
      expect(response.body.isSystem).toBe(false);
    });

    it('deve validar que name é obrigatório', async () => {
      const response = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          label: 'Entidade sem Nome',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Nome é obrigatório');
    });

    it('deve validar que label é obrigatório', async () => {
      const response = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: 'EntityWithoutLabel',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Label é obrigatório');
    });

    it('deve rejeitar nome duplicado no mesmo tenant', async () => {
      // Criar primeira entidade
      await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: 'DuplicateEntity',
          label: 'Entidade Duplicada',
        });

      // Tentar criar outra com mesmo nome (deve falhar)
      const response = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: 'DuplicateEntity',
          label: 'Entidade Duplicada 2',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Nome duplicado');
    });

    it('deve permitir mesmo nome em tenants diferentes (isolamento)', async () => {
      // Criar em tenant1
      const response1 = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: 'SharedEntity',
          label: 'Entidade Compartilhada',
        });

      expect(response1.status).toBe(201);

      // Criar em tenant2 com mesmo nome (deve funcionar)
      const response2 = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${adminToken2}`)
        .set('X-Tenant-Id', tenant2.id)
        .send({
          name: 'SharedEntity',
          label: 'Entidade Compartilhada',
        });

      expect(response2.status).toBe(201);
      expect(response2.body.name).toBe('SharedEntity');
      expect(response2.body.tenantId).toBe(tenant2.id);
      expect(response2.body.id).not.toBe(response1.body.id);
    });

    it('deve gerar log de auditoria ao criar entidade', async () => {
      const response = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: 'AuditedEntity',
          label: 'Entidade Auditada',
        });

      expect(response.status).toBe(201);

      // Aguardar log de auditoria
      const hasLog = await waitForAuditLog(tenant1.id, {
        entityType: 'Entity',
        entityId: response.body.id,
        action: 'create',
        userId: adminUser1.id,
      });

      expect(hasLog).toBe(true);
    });

    it('deve requerer autenticação', async () => {
      const response = await request(app)
        .post('/api/entities')
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: 'UnauthenticatedEntity',
          label: 'Entidade Não Autenticada',
        });

      expect(response.status).toBe(401);
    });

    it('deve requerer tenant context', async () => {
      const response = await request(app)
        .post('/api/entities')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'NoTenantEntity',
          label: 'Entidade sem Tenant',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/entities - List', () => {
    it('deve listar entidades do tenant', async () => {
      // Criar algumas entidades
      await createTestEntity({
        tenantId: tenant1.id,
        name: 'ListEntity1',
        label: 'Entidade Lista 1',
      });
      await createTestEntity({
        tenantId: tenant1.id,
        name: 'ListEntity2',
        label: 'Entidade Lista 2',
      });

      const response = await request(app)
        .get('/api/entities')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('label');
      expect(response.body[0]).toHaveProperty('fieldsCount');
    });

    it('deve isolar entidades por tenant', async () => {
      // Criar entidade em tenant1
      await createTestEntity({
        tenantId: tenant1.id,
        name: 'Tenant1Entity',
        label: 'Entidade Tenant 1',
      });

      // Criar entidade em tenant2
      await createTestEntity({
        tenantId: tenant2.id,
        name: 'Tenant2Entity',
        label: 'Entidade Tenant 2',
      });

      const response1 = await request(app)
        .get('/api/entities')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      const response2 = await request(app)
        .get('/api/entities')
        .set('Authorization', `Bearer ${adminToken2}`)
        .set('X-Tenant-Id', tenant2.id);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const tenant1HasOwn = response1.body.some((e: any) => e.name === 'Tenant1Entity');
      const tenant1HasOther = response1.body.some((e: any) => e.name === 'Tenant2Entity');

      const tenant2HasOwn = response2.body.some((e: any) => e.name === 'Tenant2Entity');
      const tenant2HasOther = response2.body.some((e: any) => e.name === 'Tenant1Entity');

      expect(tenant1HasOwn).toBe(true);
      expect(tenant1HasOther).toBe(false);
      expect(tenant2HasOwn).toBe(true);
      expect(tenant2HasOther).toBe(false);
    });
  });

  describe('GET /api/entities/:id - Get by ID', () => {
    it('deve obter entidade por ID com campos e relacionamentos', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'GetEntity',
        label: 'Entidade Get',
      });

      // Criar campos
      await createTestField({
        tenantId: tenant1.id,
        entityId: entity.id,
        name: 'field1',
        label: 'Campo 1',
        type: 'text',
      });

      const response = await request(app)
        .get(`/api/entities/${entity.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(entity.id);
      expect(response.body.name).toBe('GetEntity');
      expect(response.body.fields).toBeDefined();
      expect(Array.isArray(response.body.fields)).toBe(true);
      expect(response.body.fields.length).toBe(1);
      expect(response.body.relationships).toBeDefined();
      expect(Array.isArray(response.body.relationships)).toBe(true);
    });

    it('deve lançar erro se entidade não encontrada', async () => {
      const response = await request(app)
        .get('/api/entities/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entidade não encontrada');
    });

    it('deve isolar entidades por tenant (não acessar de outro tenant)', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'IsolatedEntity',
        label: 'Entidade Isolada',
      });

      // Tentar buscar com tenant2 (deve falhar)
      const response = await request(app)
        .get(`/api/entities/${entity.id}`)
        .set('Authorization', `Bearer ${adminToken2}`)
        .set('X-Tenant-Id', tenant2.id);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/entities/:id - Update', () => {
    it('deve atualizar label da entidade', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'UpdatableEntity',
        label: 'Label Original',
      });

      const response = await request(app)
        .put(`/api/entities/${entity.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          label: 'Label Atualizado',
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(entity.id);
      expect(response.body.name).toBe('UpdatableEntity'); // name não muda
      expect(response.body.label).toBe('Label Atualizado');
    });

    it('deve validar que label é obrigatório', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityWithoutLabel',
        label: 'Label',
      });

      const response = await request(app)
        .put(`/api/entities/${entity.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Label é obrigatório');
    });

    it('deve rejeitar atualização de entidade do sistema', async () => {
      const systemEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'SystemEntity',
        label: 'Entidade do Sistema',
        isSystem: true,
      });

      const response = await request(app)
        .put(`/api/entities/${systemEntity.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          label: 'Novo Label',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Operação não permitida');
    });

    it('deve gerar log de auditoria ao atualizar entidade', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'AuditedUpdateEntity',
        label: 'Label Original',
      });

      const response = await request(app)
        .put(`/api/entities/${entity.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          label: 'Label Atualizado',
        });

      expect(response.status).toBe(200);

      // Aguardar log de auditoria
      const hasLog = await waitForAuditLog(tenant1.id, {
        entityType: 'Entity',
        entityId: entity.id,
        action: 'update',
        userId: adminUser1.id,
      });

      expect(hasLog).toBe(true);
    });
  });

  describe('DELETE /api/entities/:id - Delete', () => {
    it('deve deletar entidade sem campos associados', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'DeletableEntity',
        label: 'Entidade Deletável',
      });

      const response = await request(app)
        .delete(`/api/entities/${entity.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(200);

      // Verificar que entidade foi deletada
      const getResponse = await request(app)
        .get(`/api/entities/${entity.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(getResponse.status).toBe(404);
    });

    it('deve rejeitar deleção de entidade com campos associados', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityWithFields',
        label: 'Entidade com Campos',
      });

      // Criar campo associado
      await createTestField({
        tenantId: tenant1.id,
        entityId: entity.id,
        name: 'field1',
        label: 'Campo 1',
        type: 'text',
      });

      const response = await request(app)
        .delete(`/api/entities/${entity.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Operação não permitida');
      expect(response.body.message).toContain('campos associados');
    });

    it('deve rejeitar deleção de entidade do sistema', async () => {
      const systemEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'SystemEntityDel',
        label: 'Entidade do Sistema',
        isSystem: true,
      });

      const response = await request(app)
        .delete(`/api/entities/${systemEntity.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Operação não permitida');
      expect(response.body.message).toContain('sistema');
    });

    it('deve gerar log de auditoria ao deletar entidade', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'AuditedDeleteEntity',
        label: 'Entidade Deletada Auditada',
      });

      const response = await request(app)
        .delete(`/api/entities/${entity.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(200);

      // Aguardar log de auditoria
      const hasLog = await waitForAuditLog(tenant1.id, {
        entityType: 'Entity',
        entityId: entity.id,
        action: 'delete',
        userId: adminUser1.id,
      });

      expect(hasLog).toBe(true);
    });
  });
});

