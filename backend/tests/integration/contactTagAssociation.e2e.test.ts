/**
 * Testes E2E para associação de tags com contatos
 * 
 * Valida adição e remoção de tags de contatos,
 * incluindo validações, isolamento multi-tenant e permissões.
 * Foca nos 2 testes obrigatórios:
 * - Associar tag a contato funciona
 * - Filtrar contatos por tag funciona
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

describe('Contact Tag Association - E2E Tests', () => {
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
      name: 'Contact Tag Test Tenant 1',
      slug: 'contact-tag-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Contact Tag Test Tenant 2',
      slug: 'contact-tag-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Contact e Tag no tenant1
    const contactPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'list' }),
    ]);

    const tagPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Tag', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Tag', action: 'read' }),
    ]);

    const contactPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'list' }),
    ]);

    const tagPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Tag', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Tag', action: 'read' }),
    ]);

    // Associar permissões aos Admins
    await prisma.rolePermission.createMany({
      data: [
        ...contactPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...tagPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...contactPermissions2.map((perm) => ({
          roleId: adminRole2.id,
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
      email: 'admin1@contacttag.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@contacttag.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Criar usuário sem permissão de Contact.update
    const userObj = await createTestUser({
      email: 'user@contacttag.test',
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

  describe('Teste Obrigatório: Associar tag a contato funciona', () => {
    it('deve adicionar tag ao contato via POST /api/contacts/:id/tags', async () => {
      // Criar contato
      const contactResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
        })
        .expect(201);

      const contactId = contactResponse.body.id;

      // Criar tag
      const tagResponse = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Cliente VIP',
          color: '#FF5733',
        })
        .expect(201);

      const tagId = tagResponse.body.id;

      // Adicionar tag ao contato
      const addTagResponse = await request(app)
        .post(`/api/contacts/${contactId}/tags`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          tagId,
        })
        .expect(200);

      // Verificar que a associação foi criada
      expect(addTagResponse.body.id).toBe(contactId);
      expect(addTagResponse.body.tags).toBeDefined();
      expect(Array.isArray(addTagResponse.body.tags)).toBe(true);
      const foundTag = addTagResponse.body.tags.find((tag: any) => tag.id === tagId);
      expect(foundTag).toBeDefined();
      expect(foundTag.name).toBe('Cliente VIP');
    });

    it('deve verificar que GET /api/contacts/:id retorna o contato com a tag associada', async () => {
      // Criar contato
      const contactResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Maria',
          lastName: 'Santos',
        })
        .expect(201);

      const contactId = contactResponse.body.id;

      // Criar tag
      const tagResponse = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag para Verificar',
        })
        .expect(201);

      const tagId = tagResponse.body.id;

      // Adicionar tag ao contato
      await request(app)
        .post(`/api/contacts/${contactId}/tags`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          tagId,
        })
        .expect(200);

      // Verificar que GET retorna contato com tag
      const getResponse = await request(app)
        .get(`/api/contacts/${contactId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(getResponse.body.tags).toBeDefined();
      expect(Array.isArray(getResponse.body.tags)).toBe(true);
      const foundTag = getResponse.body.tags.find((tag: any) => tag.id === tagId);
      expect(foundTag).toBeDefined();
    });

    it('deve retornar 409 ao tentar adicionar tag duplicada', async () => {
      // Criar contato
      const contactResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Pedro',
          lastName: 'Oliveira',
        })
        .expect(201);

      const contactId = contactResponse.body.id;

      // Criar tag
      const tagResponse = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag Duplicada',
        })
        .expect(201);

      const tagId = tagResponse.body.id;

      // Adicionar tag pela primeira vez
      await request(app)
        .post(`/api/contacts/${contactId}/tags`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          tagId,
        })
        .expect(200);

      // Tentar adicionar tag duplicada
      const response = await request(app)
        .post(`/api/contacts/${contactId}/tags`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          tagId,
        })
        .expect(409);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('já está associada');
    });

    it('deve retornar 404 ao tentar adicionar tag inexistente', async () => {
      // Criar contato
      const contactResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Ana',
          lastName: 'Costa',
        })
        .expect(201);

      const contactId = contactResponse.body.id;

      // Tentar adicionar tag inexistente
      const fakeTagId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/contacts/${contactId}/tags`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          tagId: fakeTagId,
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 404 ao tentar adicionar tag de outro tenant', async () => {
      // Criar contato no tenant1
      const contactResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Carlos',
          lastName: 'Ferreira',
        })
        .expect(201);

      const contactId = contactResponse.body.id;

      // Criar tag no tenant2
      const tagResponse = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant2.slug)
        .set('Authorization', `Bearer ${adminToken2}`)
        .send({
          name: 'Tag Tenant 2',
        })
        .expect(201);

      const tagId = tagResponse.body.id;

      // Tentar adicionar tag do tenant2 ao contato do tenant1
      const response = await request(app)
        .post(`/api/contacts/${contactId}/tags`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          tagId,
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Teste Obrigatório: Filtrar contatos por tag funciona', () => {
    it('deve filtrar contatos por tag usando GET /api/contacts?tagId=<tagId>', async () => {
      // Criar tag
      const tagResponse = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag para Filtrar',
        })
        .expect(201);

      const tagId = tagResponse.body.id;

      // Criar 3 contatos
      const contact1Response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Contato 1',
        })
        .expect(201);

      const contact2Response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Contato 2',
        })
        .expect(201);

      const contact3Response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Contato 3',
        })
        .expect(201);

      const contact1Id = contact1Response.body.id;
      const contact2Id = contact2Response.body.id;
      const contact3Id = contact3Response.body.id;

      // Adicionar tag apenas aos contatos 1 e 2
      await request(app)
        .post(`/api/contacts/${contact1Id}/tags`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          tagId,
        })
        .expect(200);

      await request(app)
        .post(`/api/contacts/${contact2Id}/tags`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          tagId,
        })
        .expect(200);

      // Filtrar contatos por tag
      const filterResponse = await request(app)
        .get(`/api/contacts?tagId=${tagId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      // Verificar que apenas contatos com a tag são retornados
      expect(filterResponse.body.data).toBeDefined();
      expect(Array.isArray(filterResponse.body.data)).toBe(true);
      const contactIds = filterResponse.body.data.map((contact: any) => contact.id);
      expect(contactIds).toContain(contact1Id);
      expect(contactIds).toContain(contact2Id);
      expect(contactIds).not.toContain(contact3Id);

      // Verificar que contatos sem a tag não são retornados
      const contact3InResults = filterResponse.body.data.find(
        (contact: any) => contact.id === contact3Id
      );
      expect(contact3InResults).toBeUndefined();
    });
  });

  describe('Testes Adicionais de Robustez', () => {
    it('deve remover tag de contato', async () => {
      // Criar contato
      const contactResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Contato para Remover Tag',
        })
        .expect(201);

      const contactId = contactResponse.body.id;

      // Criar tag
      const tagResponse = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag para Remover',
        })
        .expect(201);

      const tagId = tagResponse.body.id;

      // Adicionar tag
      await request(app)
        .post(`/api/contacts/${contactId}/tags`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          tagId,
        })
        .expect(200);

      // Remover tag
      await request(app)
        .delete(`/api/contacts/${contactId}/tags/${tagId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      // Verificar que tag foi removida
      const getResponse = await request(app)
        .get(`/api/contacts/${contactId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const foundTag = getResponse.body.tags?.find((tag: any) => tag.id === tagId);
      expect(foundTag).toBeUndefined();
    });

    it('deve testar isolamento multi-tenant em associações', async () => {
      // Criar contato e tag no tenant1
      const contactResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Contato Tenant 1',
        })
        .expect(201);

      const contactId = contactResponse.body.id;

      await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag Tenant 1',
        })
        .expect(201);

      // Tentar associar tag do tenant2 ao contato do tenant1 (deve falhar)
      const response = await request(app)
        .post(`/api/contacts/${contactId}/tags`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          tagId: '00000000-0000-0000-0000-000000000000', // Tag inexistente no tenant1
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 403 ao tentar adicionar tag sem permissão Contact.update', async () => {
      // Criar contato
      const contactResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Contato Sem Permissão',
        })
        .expect(201);

      const contactId = contactResponse.body.id;

      // Criar tag
      const tagResponse = await request(app)
        .post('/api/tags')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Tag Sem Permissão',
        })
        .expect(201);

      const tagId = tagResponse.body.id;

      // Tentar adicionar tag sem permissão
      const response = await request(app)
        .post(`/api/contacts/${contactId}/tags`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${userTokenWithoutPermission}`)
        .send({
          tagId,
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });
});

