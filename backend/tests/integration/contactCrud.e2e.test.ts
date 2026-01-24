/**
 * Testes E2E para CRUD completo de contatos via API
 * 
 * Valida criação, leitura, atualização e deleção de contatos.
 * Testa isolamento multi-tenant, validações, auditoria, permissões ACL,
 * múltiplos emails/telefones, associação com empresas e tags.
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
  getAuditLogs,
  prisma,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';

describe('Contact CRUD - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };
  let company1: { id: string; name: string };
  let tag1: { id: string; name: string };
  let tag2: { id: string; name: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Contact CRUD Test Tenant 1',
      slug: 'contact-crud-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Contact CRUD Test Tenant 2',
      slug: 'contact-crud-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Contact (se não existirem)
    const contactPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'list' }),
    ]);

    const contactPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Contact', action: 'list' }),
    ]);

    // Associar permissões aos Admins
    await prisma.rolePermission.createMany({
      data: [
        ...contactPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...contactPermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin1@contactcrud.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@contactcrud.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Gerar tokens JWT
    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);

    // Criar empresa de teste para tenant1
    company1 = await prisma.company.create({
      data: {
        tenantId: tenant1.id,
        name: 'Empresa Teste',
        status: 'ACTIVE',
      },
    });

    // Criar tags de teste para tenant1
    tag1 = await prisma.tag.create({
      data: {
        tenantId: tenant1.id,
        name: 'Tag 1',
        color: '#FF0000',
      },
    });

    tag2 = await prisma.tag.create({
      data: {
        tenantId: tenant1.id,
        name: 'Tag 2',
        color: '#00FF00',
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /api/contacts - Criar contato', () => {
    it('deve criar contato com dados válidos', async () => {
      const contactData = {
        firstName: 'João',
        lastName: 'Silva',
        title: 'Desenvolvedor',
        status: 'ACTIVE',
        emails: [
          {
            email: 'joao@example.com',
            type: 'WORK',
            isPrimary: true,
          },
        ],
        phones: [
          {
            phone: '(11) 98765-4321',
            type: 'MOBILE',
            isPrimary: true,
          },
        ],
        tagIds: [tag1.id],
      };

      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(contactData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.firstName).toBe(contactData.firstName);
      expect(response.body.lastName).toBe(contactData.lastName);
      expect(response.body.title).toBe(contactData.title);
      expect(response.body.status).toBe(contactData.status);
      expect(response.body.emails).toHaveLength(1);
      expect(response.body.emails[0].email).toBe(contactData.emails[0].email);
      expect(response.body.phones).toHaveLength(1);
      expect(response.body.phones[0].phone).toBe(contactData.phones[0].phone);
      expect(response.body.tags).toHaveLength(1);
      expect(response.body.tags[0].id).toBe(tag1.id);

      // Verificar que contato foi criado no banco
      const contact = await prisma.contact.findUnique({
        where: { id: response.body.id },
        include: {
          emails: true,
          phones: true,
          tags: { include: { tag: true } },
        },
      });

      expect(contact).toBeTruthy();
      expect(contact?.tenantId).toBe(tenant1.id);
      expect(contact?.emails).toHaveLength(1);
      expect(contact?.phones).toHaveLength(1);
      expect(contact?.tags).toHaveLength(1);

      // Verificar auditoria - aguardar log aparecer
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Contact',
        entityId: response.body.id,
        action: 'create',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);

      // Validar estrutura completa do log de auditoria
      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Contact',
        entityId: response.body.id,
        action: 'create',
        userId: adminUser1.id,
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('create');
      expect(auditLogs[0].changes).toBeNull(); // Create não tem changes
      expect(auditLogs[0].userId).toBe(adminUser1.id);
      expect(auditLogs[0].tenantId).toBe(tenant1.id);
      expect(auditLogs[0].entityType).toBe('Contact');
      expect(auditLogs[0].entityId).toBe(response.body.id);
    });

    it('deve criar contato apenas com firstName', async () => {
      const contactData = {
        firstName: 'Maria',
      };

      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(contactData)
        .expect(201);

      expect(response.body.firstName).toBe(contactData.firstName);
      expect(response.body.status).toBe('ACTIVE'); // Default
      expect(response.body.emails).toHaveLength(0);
      expect(response.body.phones).toHaveLength(0);
      expect(response.body.tags).toHaveLength(0);
    });

    it('deve criar contato apenas com lastName', async () => {
      const contactData = {
        lastName: 'Santos',
      };

      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(contactData)
        .expect(201);

      expect(response.body.lastName).toBe(contactData.lastName);
    });

    it('deve criar contato com empresa associada', async () => {
      const contactData = {
        firstName: 'Pedro',
        lastName: 'Costa',
        companyId: company1.id,
      };

      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(contactData)
        .expect(201);

      expect(response.body.companyId).toBe(company1.id);
      expect(response.body.company).toBeTruthy();
      expect(response.body.company.name).toBe(company1.name);
    });

    it('deve retornar 400 se firstName e lastName não forem fornecidos', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('firstName ou lastName');
    });

    it('deve retornar 400 se email for inválido', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Teste',
          emails: [
            {
              email: 'invalid-email',
              type: 'WORK',
              isPrimary: true,
            },
          ],
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 400 se telefone for inválido', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Teste',
          phones: [
            {
              phone: '123',
              type: 'MOBILE',
              isPrimary: true,
            },
          ],
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 404 se tagId não existir', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Teste',
          tagIds: ['non-existent-id'],
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('deve isolar contatos por tenant', async () => {
      // Criar contato no tenant1
      const contactData = {
        firstName: 'Contato Tenant 1',
      };

      const response1 = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(contactData)
        .expect(201);

      // Tentar buscar no tenant2 (não deve encontrar)
      const response2 = await request(app)
        .get(`/api/contacts/${response1.body.id}`)
        .set('X-Tenant-Slug', tenant2.slug)
        .set('Authorization', `Bearer ${adminToken2}`)
        .expect(404);

      expect(response2.body.error).toBeDefined();
    });
  });

  describe('GET /api/contacts - Listar contatos', () => {
    beforeAll(async () => {
      // Criar alguns contatos para testes
      await Promise.all([
        prisma.contact.create({
          data: {
            tenantId: tenant1.id,
            firstName: 'Contato A',
            lastName: 'Silva',
            status: 'ACTIVE',
          },
        }),
        prisma.contact.create({
          data: {
            tenantId: tenant1.id,
            firstName: 'Contato B',
            lastName: 'Santos',
            status: 'ACTIVE',
            companyId: company1.id,
          },
        }),
        prisma.contact.create({
          data: {
            tenantId: tenant1.id,
            firstName: 'Contato C',
            lastName: 'Costa',
            status: 'INACTIVE',
          },
        }),
      ]);
    });

    it('deve listar contatos do tenant atual', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verificar que todos os contatos pertencem ao tenant1
      response.body.data.forEach((contact: any) => {
        expect(contact.tenantId).toBe(tenant1.id);
      });
    });

    it('deve filtrar por companyId', async () => {
      const response = await request(app)
        .get(`/api/contacts?companyId=${company1.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((contact: any) => {
        expect(contact.companyId).toBe(company1.id);
      });
    });

    it('deve filtrar por status', async () => {
      const response = await request(app)
        .get('/api/contacts?status=ACTIVE')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((contact: any) => {
        expect(contact.status).toBe('ACTIVE');
      });
    });

    it('deve ordenar por firstName', async () => {
      const response = await request(app)
        .get('/api/contacts?orderBy=firstName&order=asc')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const firstNames = response.body.data.map((c: any) => c.firstName);
      const sortedFirstNames = [...firstNames].sort();
      expect(firstNames).toEqual(sortedFirstNames);
    });

    it('deve paginar resultados', async () => {
      const response = await request(app)
        .get('/api/contacts?limit=2&offset=0')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('não deve retornar contatos soft deleted', async () => {
      // Criar contato e soft delete
      const contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Contato Deletado',
          status: 'ACTIVE',
        },
      });

      await prisma.contact.update({
        where: { id: contact.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const found = response.body.data.find((c: any) => c.id === contact.id);
      expect(found).toBeUndefined();
    });
  });

  describe('GET /api/contacts/:id - Buscar contato por ID', () => {
    let contactId: string;

    beforeAll(async () => {
      const contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Contato para Get',
          lastName: 'Teste',
          title: 'Desenvolvedor',
          status: 'ACTIVE',
        },
      });
      contactId = contact.id;
    });

    it('deve retornar contato específico', async () => {
      const response = await request(app)
        .get(`/api/contacts/${contactId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.id).toBe(contactId);
      expect(response.body.firstName).toBe('Contato para Get');
      expect(response.body).toHaveProperty('emails');
      expect(response.body).toHaveProperty('phones');
      expect(response.body).toHaveProperty('tags');
      expect(response.body).toHaveProperty('company');
    });

    it('deve retornar 404 se contato não existir', async () => {
      const response = await request(app)
        .get('/api/contacts/non-existent-id')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(404);

      expect(response.body.error).toBe('Contato não encontrado');
    });

    it('deve retornar 404 se contato pertence a outro tenant', async () => {
      const contact = await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Contato Tenant 2',
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .get(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(404);

      expect(response.body.error).toBe('Contato não encontrado');
    });
  });

  describe('PUT /api/contacts/:id - Atualizar contato', () => {
    let contactId: string;

    beforeEach(async () => {
      const contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Contato para Update',
          lastName: 'Antigo',
          title: 'Analista',
          status: 'ACTIVE',
        },
      });
      contactId = contact.id;
    });

    it('deve atualizar contato com dados válidos', async () => {
      // Buscar dados originais do contato para comparar
      const originalContact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      const updateData = {
        firstName: 'Contato Atualizado',
        lastName: 'Novo',
        title: 'Desenvolvedor Senior',
        status: 'INACTIVE',
      };

      const response = await request(app)
        .put(`/api/contacts/${contactId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe(updateData.firstName);
      expect(response.body.lastName).toBe(updateData.lastName);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.status).toBe(updateData.status);

      // Verificar auditoria - aguardar log aparecer
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Contact',
        entityId: contactId,
        action: 'update',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);

      // Validar estrutura completa de changes com old/new values
      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Contact',
        entityId: contactId,
        action: 'update',
        userId: adminUser1.id,
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('update');
      expect(auditLogs[0].changes).toBeDefined();
      expect(auditLogs[0].changes).not.toBeNull();

      // Validar que changes contém apenas campos alterados
      const changes = auditLogs[0].changes as any;
      expect(changes).toHaveProperty('firstName');
      expect(changes).toHaveProperty('lastName');
      expect(changes).toHaveProperty('title');
      expect(changes).toHaveProperty('status');

      // Validar estrutura de changes: { field: { old: value, new: value } }
      expect(changes.firstName).toEqual({
        old: originalContact?.firstName,
        new: updateData.firstName,
      });
      expect(changes.lastName).toEqual({
        old: originalContact?.lastName,
        new: updateData.lastName,
      });
      expect(changes.title).toEqual({
        old: originalContact?.title,
        new: updateData.title,
      });
      expect(changes.status).toEqual({
        old: originalContact?.status,
        new: updateData.status,
      });

      // Validar que campos técnicos NÃO estão em changes
      expect(changes).not.toHaveProperty('id');
      expect(changes).not.toHaveProperty('tenantId');
      expect(changes).not.toHaveProperty('createdAt');
      expect(changes).not.toHaveProperty('updatedAt');
      expect(changes).not.toHaveProperty('deletedAt');
    });

    it('deve gerar log de auditoria com changes contendo apenas campos alterados', async () => {
      // Criar contato com dados iniciais
      const contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João',
          lastName: 'Silva',
          title: 'Analista',
          status: 'ACTIVE',
        },
      });

      // Atualizar apenas firstName
      const updateData = {
        firstName: 'Maria',
      };

      await request(app)
        .put(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(updateData)
        .expect(200);

      // Aguardar log de auditoria
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Contact',
        entityId: contact.id,
        action: 'update',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);

      // Buscar log de auditoria
      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Contact',
        entityId: contact.id,
        action: 'update',
        userId: adminUser1.id,
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].changes).toBeDefined();
      const changes = auditLogs[0].changes as any;

      // Verificar: changes contém apenas firstName
      expect(changes).toHaveProperty('firstName');
      expect(changes.firstName).toEqual({
        old: 'João',
        new: 'Maria',
      });

      // Verificar: campos não alterados NÃO estão em changes
      expect(changes).not.toHaveProperty('lastName');
      expect(changes).not.toHaveProperty('title');
      expect(changes).not.toHaveProperty('status');
    });

    it('deve atualizar emails (substituição completa)', async () => {
      // Criar contato com email
      const contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Teste Email',
          status: 'ACTIVE',
        },
      });

      await prisma.contactEmail.create({
        data: {
          tenantId: tenant1.id,
          contactId: contact.id,
          email: 'old@example.com',
          type: 'WORK',
          isPrimary: true,
        },
      });

      const updateData = {
        emails: [
          {
            email: 'new@example.com',
            type: 'WORK',
            isPrimary: true,
          },
        ],
      };

      const response = await request(app)
        .put(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(updateData)
        .expect(200);

      expect(response.body.emails).toHaveLength(1);
      expect(response.body.emails[0].email).toBe('new@example.com');
    });

    it('deve atualizar tags (substituição completa)', async () => {
      // Criar contato com tag
      const contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Teste Tags',
          status: 'ACTIVE',
        },
      });

      await prisma.contactTag.create({
        data: {
          contactId: contact.id,
          tagId: tag1.id,
        },
      });

      const updateData = {
        tagIds: [tag2.id],
      };

      const response = await request(app)
        .put(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(updateData)
        .expect(200);

      expect(response.body.tags).toHaveLength(1);
      expect(response.body.tags[0].id).toBe(tag2.id);
    });

    it('deve retornar 404 se contato não existir', async () => {
      const response = await request(app)
        .put('/api/contacts/non-existent-id')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ firstName: 'Teste' })
        .expect(404);

      expect(response.body.error).toBe('Contato não encontrado');
    });

    it('deve retornar 404 se contato pertence a outro tenant', async () => {
      const contact = await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Contato Tenant 2',
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .put(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ firstName: 'Teste' })
        .expect(404);

      expect(response.body.error).toBe('Contato não encontrado');
    });
  });

  describe('DELETE /api/contacts/:id - Deletar contato', () => {
    let contactId: string;

    beforeEach(async () => {
      const contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Contato para Delete',
          status: 'ACTIVE',
        },
      });
      contactId = contact.id;
    });

    it('deve fazer soft delete do contato', async () => {
      const response = await request(app)
        .delete(`/api/contacts/${contactId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.message).toBeDefined();

      // Verificar que contato foi soft deleted
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      expect(contact).toBeTruthy();
      expect(contact?.deletedAt).toBeTruthy();

      // Verificar auditoria - aguardar log aparecer
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Contact',
        entityId: contactId,
        action: 'delete',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);

      // Validar estrutura completa do log de auditoria
      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Contact',
        entityId: contactId,
        action: 'delete',
        userId: adminUser1.id,
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('delete');
      expect(auditLogs[0].changes).toBeNull(); // Delete não tem changes
      expect(auditLogs[0].userId).toBe(adminUser1.id);
      expect(auditLogs[0].tenantId).toBe(tenant1.id);
      expect(auditLogs[0].entityType).toBe('Contact');
      expect(auditLogs[0].entityId).toBe(contactId);

      // Verificar que não aparece mais na listagem
      const listResponse = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const found = listResponse.body.data.find((c: any) => c.id === contactId);
      expect(found).toBeUndefined();
    });

    it('deve retornar 404 se contato não existir', async () => {
      const response = await request(app)
        .delete('/api/contacts/non-existent-id')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(404);

      expect(response.body.error).toBe('Contato não encontrado');
    });

    it('deve retornar 404 se contato pertence a outro tenant', async () => {
      const contact = await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Contato Tenant 2',
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .delete(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(404);

      expect(response.body.error).toBe('Contato não encontrado');
    });
  });

  describe('GET /api/contacts - Busca com parâmetro q', () => {
    beforeAll(async () => {
      // Criar contatos para testes de busca
      await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João',
          lastName: 'Silva',
          title: 'Gerente',
          status: 'ACTIVE',
          emails: {
            create: {
              tenantId: tenant1.id,
              email: 'joao.silva@example.com',
              type: 'WORK',
              isPrimary: true,
            },
          },
          phones: {
            create: {
              tenantId: tenant1.id,
              phone: '+55 11 99999-9999',
              type: 'MOBILE',
              isPrimary: true,
            },
          },
        },
      });

      await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Maria',
          lastName: 'Santos',
          status: 'ACTIVE',
        },
      });

      await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Pedro',
          lastName: 'Silva',
          status: 'INACTIVE',
        },
      });
    });

    it('deve filtrar por nome com parâmetro q', async () => {
      const response = await request(app)
        .get('/api/contacts?q=joão')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      
      // Verificar que só contatos com "joão" no nome retornaram
      if (response.body.data.length > 0) {
        const hasJoao = response.body.data.some((c: any) =>
          c.firstName.toLowerCase().includes('joão') ||
          c.lastName?.toLowerCase().includes('joão')
        );
        expect(hasJoao).toBe(true);
      }
    });

    it('deve filtrar por email com parâmetro q', async () => {
      const response = await request(app)
        .get('/api/contacts?q=joao@example.com')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      // Verificar que contatos com email correspondente retornaram
      if (response.body.data.length > 0) {
        const hasEmail = response.body.data.some((c: any) =>
          c.emails.some((e: any) => e.email.includes('joao@example.com'))
        );
        expect(hasEmail).toBe(true);
      }
    });

    it('deve ser case-insensitive', async () => {
      const response1 = await request(app)
        .get('/api/contacts?q=JOÃO')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const response2 = await request(app)
        .get('/api/contacts?q=joão')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.length).toBe(response2.body.data.length);
    });

    it('deve combinar busca com filtros existentes', async () => {
      const response = await request(app)
        .get('/api/contacts?q=silva&status=ACTIVE')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      if (response.body.data.length > 0) {
        // Verificar que todos têm status ACTIVE
        expect(response.body.data.every((c: any) => c.status === 'ACTIVE')).toBe(true);
        // Verificar que todos têm "silva" no nome
        expect(
          response.body.data.some((c: any) =>
            c.firstName.toLowerCase().includes('silva') ||
            c.lastName?.toLowerCase().includes('silva')
          )
        ).toBe(true);
      }
    });

    it('deve retornar 400 para query muito longa', async () => {
      const longQuery = 'a'.repeat(501);
      const response = await request(app)
        .get(`/api/contacts?q=${encodeURIComponent(longQuery)}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(400);

      expect(response.body.error).toBeTruthy();
      expect(response.body.message).toContain('não pode exceder');
    });

    it('deve funcionar sem parâmetro q (listagem completa)', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('deve respeitar isolamento multi-tenant na busca', async () => {
      // Criar contato no tenant2
      await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Carlos',
          lastName: 'Silva',
          status: 'ACTIVE',
        },
      });

      // Buscar como usuário do tenant1
      const response = await request(app)
        .get('/api/contacts?q=silva')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      // Não deve retornar contato do tenant2
      const hasCarlos = response.body.data.some(
        (c: any) => c.firstName === 'Carlos' && c.tenantId === tenant2.id
      );
      expect(hasCarlos).toBe(false);
    });
  });
});

