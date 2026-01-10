/**
 * Testes E2E para CRUD de tags
 * 
 * Valida criação, listagem, atualização e deleção de tags,
 * incluindo validações, isolamento multi-tenant, permissões e auditoria.
 * Foca no teste obrigatório "criar tag funciona".
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

describe('Tag CRUD - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };
  let userWithoutPermission: { id: string; email: string; password: string };
  let userTokenWithoutPermission: string;

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Tag CRUD Test Tenant 1',
      slug: 'tag-crud-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Tag CRUD Test Tenant 2',
      slug: 'tag-crud-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Tag no tenant1
    const tagPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Tag', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Tag', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Tag', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Tag', action: 'delete' }),
    ]);

    const tagPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Tag', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Tag', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Tag', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Tag', action: 'delete' }),
    ]);

    // Associar permissões aos Admins
    await prisma.rolePermission.createMany({
      data: [
        ...tagPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...tagPermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin1@tag.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@tag.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Criar usuário sem permissão de Tag
    const userObj = await createTestUser({
      email: 'user@tag.test',
      password: 'UserPass123',
      name: 'User Without Permission',
      tenantId: tenant1.id,
    });
    userWithoutPermission = { ...userObj, password: 'UserPass123' };

    // Gerar tokens JWT
    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);
    userTokenWithoutPermission = generateToken(userWithoutPermission.id, tenant1.id);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Teste Obrigatório: Criar tag funciona', () => {
    it('deve criar tag com nome e cor', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Cliente VIP',
          color: '#FF5733',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('Cliente VIP');
      expect(response.body.color).toBe('#FF5733');
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('deve criar tag sem cor (deve usar padrão #3B82F6)', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag Sem Cor',
        })
        .expect(201);

      expect(response.body.name).toBe('Tag Sem Cor');
      expect(response.body.color).toBe('#3B82F6'); // Cor padrão
    });

    it('deve verificar que GET /api/tags retorna a tag criada', async () => {
      // Criar tag
      const createResponse = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag para Listar',
          color: '#00FF00',
        })
        .expect(201);

      const tagId = createResponse.body.id;

      // Listar tags
      const listResponse = await request(app)
        .get('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(Array.isArray(listResponse.body)).toBe(true);
      const foundTag = listResponse.body.find((tag: any) => tag.id === tagId);
      expect(foundTag).toBeDefined();
      expect(foundTag.name).toBe('Tag para Listar');
      expect(foundTag.color).toBe('#00FF00');
    });

    it('deve retornar 409 ao tentar criar tag com nome duplicado no mesmo tenant', async () => {
      // Criar primeira tag
      await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag Duplicada',
          color: '#FF0000',
        })
        .expect(201);

      // Tentar criar tag com mesmo nome
      const response = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag Duplicada',
          color: '#00FF00',
        })
        .expect(409);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('duplicado');
    });

    it('deve retornar 400 ao tentar criar tag com cor inválida', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag Cor Inválida',
          color: 'INVALID_COLOR',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('hexadecimal');
    });

    it('deve retornar 400 ao tentar criar tag sem nome', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          color: '#FF0000',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('name');
    });
  });

  describe('Testes Adicionais de Robustez', () => {
    it('deve listar tags do tenant', async () => {
      // Criar algumas tags
      await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ name: 'Tag 1' })
        .expect(201);

      await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ name: 'Tag 2' })
        .expect(201);

      const response = await request(app)
        .get('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('deve atualizar tag', async () => {
      // Criar tag
      const createResponse = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag para Atualizar',
          color: '#FF0000',
        })
        .expect(201);

      const tagId = createResponse.body.id;

      // Atualizar tag
      const updateResponse = await request(app)
        .put(`/api/tags/${tagId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag Atualizada',
          color: '#00FF00',
        })
        .expect(200);

      expect(updateResponse.body.name).toBe('Tag Atualizada');
      expect(updateResponse.body.color).toBe('#00FF00');
    });

    it('deve deletar tag', async () => {
      // Criar tag
      const createResponse = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag para Deletar',
        })
        .expect(201);

      const tagId = createResponse.body.id;

      // Deletar tag
      await request(app)
        .delete(`/api/tags/${tagId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      // Verificar que tag foi deletada (tentar listar e não encontrar)
      const listResponse = await request(app)
        .get('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const foundTag = listResponse.body.find((tag: any) => tag.id === tagId);
      expect(foundTag).toBeUndefined();
    });

    it('deve testar isolamento multi-tenant', async () => {
      // Criar tag no tenant1
      const createResponse = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag Tenant 1',
        })
        .expect(201);

      const tagId = createResponse.body.id;

      // Listar tags do tenant2 (não deve ver tag do tenant1)
      const listResponse = await request(app)
        .get('/api/tags')
        .set('X-Tenant-Slug', tenant2.slug)
        .set('Authorization', `Bearer ${adminToken2}`)
        .expect(200);

      const foundTag = listResponse.body.find((tag: any) => tag.id === tagId);
      expect(foundTag).toBeUndefined();
    });

    it('deve retornar 403 ao criar tag sem permissão Tag.create', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${userTokenWithoutPermission}`)
        .send({
          name: 'Tag Sem Permissão',
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('deve registrar auditoria ao criar tag', async () => {
      const createResponse = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag com Auditoria',
        })
        .expect(201);

      const tagId = createResponse.body.id;

      // Aguardar auditoria ser registrada
      await waitForAuditLog();

      // Verificar audit log
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'Tag',
          entityId: tagId,
          tenantId: tenant1.id,
          action: 'create',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].userId).toBe(adminUser1.id);
    });
  });
});

