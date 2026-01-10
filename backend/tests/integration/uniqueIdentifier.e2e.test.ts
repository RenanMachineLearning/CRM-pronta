/**
 * Testes E2E para identificadores únicos (UUID)
 * 
 * Valida geração automática, formato e unicidade de UUIDs para Contact e Company,
 * incluindo validações, isolamento multi-tenant e testes obrigatórios da especificação.
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
import { validateUUID } from '../../src/utils/validators';

describe('Unique Identifier (UUID) - E2E Tests', () => {
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
      name: 'UUID Test Tenant 1',
      slug: 'uuid-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'UUID Test Tenant 2',
      slug: 'uuid-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Contact e Company
    const contactPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'list' }),
    ]);

    const companyPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'list' }),
    ]);

    const contactPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'list' }),
    ]);

    const companyPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Company', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Company', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Company', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Company', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Company', action: 'list' }),
    ]);

    // Associar permissões aos Admins
    await prisma.rolePermission.createMany({
      data: [
        ...contactPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...companyPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...contactPermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
        ...companyPermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin1@uuid.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@uuid.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Gerar tokens JWT
    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Teste Obrigatório: UUID é gerado automaticamente ao criar contato', () => {
    it('deve criar contato sem fornecer id no body e verificar que UUID foi gerado', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
        })
        .expect(201);

      // Verificar que contato foi criado com id presente
      expect(response.body.id).toBeDefined();
      
      // Verificar que id é uma string
      expect(typeof response.body.id).toBe('string');
      
      // Verificar que id tem formato UUID v4 válido
      expect(validateUUID(response.body.id)).toBe(true);
      
      // Verificar que id não é vazio ou null
      expect(response.body.id).not.toBe('');
      expect(response.body.id).not.toBeNull();
      expect(response.body.id.length).toBeGreaterThan(0);
    });

    it('deve rejeitar tentativa de fornecer id no body ao criar contato', async () => {
      const fakeId = '123e4567-e89b-42d3-a456-426614174000';
      
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          id: fakeId,
          firstName: 'Maria',
          lastName: 'Santos',
        })
        .expect(400);

      expect(response.body.error).toBe('Campo id não permitido');
      expect(response.body.message).toContain('gerado automaticamente');
    });
  });

  describe('Teste Obrigatório: UUID é gerado automaticamente ao criar empresa', () => {
    it('deve criar empresa sem fornecer id no body e verificar que UUID foi gerado', async () => {
      const response = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Empresa Teste',
        })
        .expect(201);

      // Verificar que empresa foi criada com id presente
      expect(response.body.id).toBeDefined();
      
      // Verificar que id é uma string
      expect(typeof response.body.id).toBe('string');
      
      // Verificar que id tem formato UUID v4 válido
      expect(validateUUID(response.body.id)).toBe(true);
      
      // Verificar que id não é vazio ou null
      expect(response.body.id).not.toBe('');
      expect(response.body.id).not.toBeNull();
      expect(response.body.id.length).toBeGreaterThan(0);
    });

    it('deve rejeitar tentativa de fornecer id no body ao criar empresa', async () => {
      const fakeId = '123e4567-e89b-42d3-a456-426614174000';
      
      const response = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          id: fakeId,
          name: 'Empresa com ID',
        })
        .expect(400);

      expect(response.body.error).toBe('Campo id não permitido');
      expect(response.body.message).toContain('gerado automaticamente');
    });
  });

  describe('Testes Adicionais de Robustez', () => {
    it('deve verificar que UUID é único para contatos', async () => {
      // Criar múltiplos contatos
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

      const ids = [
        contact1Response.body.id,
        contact2Response.body.id,
        contact3Response.body.id,
      ];

      // Verificar que cada contato tem UUID diferente
      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[1]).not.toBe(ids[2]);
      expect(ids[0]).not.toBe(ids[2]);

      // Verificar que não há UUIDs duplicados
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('deve verificar que UUID é único para empresas', async () => {
      // Criar múltiplas empresas
      const company1Response = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Empresa 1',
        })
        .expect(201);

      const company2Response = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Empresa 2',
        })
        .expect(201);

      const company3Response = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Empresa 3',
        })
        .expect(201);

      const ids = [
        company1Response.body.id,
        company2Response.body.id,
        company3Response.body.id,
      ];

      // Verificar que cada empresa tem UUID diferente
      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[1]).not.toBe(ids[2]);
      expect(ids[0]).not.toBe(ids[2]);

      // Verificar que não há UUIDs duplicados
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('deve verificar que UUID não pode ser alterado', async () => {
      // Criar contato
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Contato para Atualizar',
        })
        .expect(201);

      const originalId = createResponse.body.id;
      const fakeId = '123e4567-e89b-42d3-a456-426614174000';

      // Tentar atualizar contato fornecendo id diferente no body
      const updateResponse = await request(app)
        .put(`/api/contacts/${originalId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          id: fakeId,
          firstName: 'Nome Atualizado',
        })
        .expect(200);

      // Verificar que UUID não foi alterado (deve manter UUID original)
      expect(updateResponse.body.id).toBe(originalId);
      expect(updateResponse.body.id).not.toBe(fakeId);
      
      // Verificar que atualização de outros campos funciona normalmente
      expect(updateResponse.body.firstName).toBe('Nome Atualizado');
    });

    it('deve verificar que UUID persiste após atualização', async () => {
      // Criar contato
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Contato Original',
        })
        .expect(201);

      const originalId = createResponse.body.id;

      // Atualizar contato (mudar nome, status, etc.)
      await request(app)
        .put(`/api/contacts/${originalId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Contato Atualizado',
          status: 'INACTIVE',
        })
        .expect(200);

      // Buscar contato novamente
      const getResponse = await request(app)
        .get(`/api/contacts/${originalId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      // Verificar que UUID permanece o mesmo
      expect(getResponse.body.id).toBe(originalId);
    });

    it('deve verificar que UUID persiste após soft delete', async () => {
      // Criar contato
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Contato para Deletar',
        })
        .expect(201);

      const originalId = createResponse.body.id;

      // Deletar contato (soft delete)
      await request(app)
        .delete(`/api/contacts/${originalId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      // Verificar que contato tem deletedAt preenchido (buscar diretamente no banco)
      const deletedContact = await prisma.contact.findUnique({
        where: { id: originalId },
      });

      expect(deletedContact).toBeDefined();
      expect(deletedContact?.deletedAt).not.toBeNull();
      
      // Verificar que UUID permanece o mesmo
      expect(deletedContact?.id).toBe(originalId);
    });

    it('deve verificar formato UUID v4 válido', async () => {
      // Criar contato
      const contactResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Contato UUID',
        })
        .expect(201);

      const contactId = contactResponse.body.id;

      // Verificar formato UUID v4
      // Padrão: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // Versão 4 (4 no terceiro grupo)
      // Variante (8, 9, a, b no quarto grupo)
      expect(validateUUID(contactId)).toBe(true);
      expect(contactId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      // Criar empresa
      const companyResponse = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Empresa UUID',
        })
        .expect(201);

      const companyId = companyResponse.body.id;

      // Verificar formato UUID v4
      expect(validateUUID(companyId)).toBe(true);
      expect(companyId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('deve testar isolamento multi-tenant com UUID', async () => {
      // Criar contato no tenant1
      const contact1Response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Contato Tenant 1',
        })
        .expect(201);

      const contact1Id = contact1Response.body.id;

      // Criar contato no tenant2
      const contact2Response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant2.slug)
        .set('Authorization', `Bearer ${adminToken2}`)
        .send({
          firstName: 'Contato Tenant 2',
        })
        .expect(201);

      const contact2Id = contact2Response.body.id;

      // Verificar que UUIDs são diferentes (esperado, mas validar)
      expect(contact1Id).not.toBe(contact2Id);

      // Verificar que cada tenant só vê seus próprios contatos (isolamento)
      const getResponse1 = await request(app)
        .get(`/api/contacts/${contact1Id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(getResponse1.body.id).toBe(contact1Id);

      // Tentar acessar contato do tenant1 usando tenant2 (deve retornar 404)
      await request(app)
        .get(`/api/contacts/${contact1Id}`)
        .set('X-Tenant-Slug', tenant2.slug)
        .set('Authorization', `Bearer ${adminToken2}`)
        .expect(404);
    });
  });
});

