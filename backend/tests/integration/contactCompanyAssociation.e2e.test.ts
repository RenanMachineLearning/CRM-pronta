/**
 * Testes E2E para associação entre Contatos e Empresas
 * 
 * Valida associação, desassociação, listagem de contatos de empresa,
 * validações robustas e isolamento multi-tenant.
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

describe('Contact-Company Association - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };
  let tag1: { id: string; name: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Contact-Company Association Test Tenant 1',
      slug: 'contact-company-assoc-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Contact-Company Association Test Tenant 2',
      slug: 'contact-company-assoc-test-tenant-2',
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
      email: 'admin1@contactcompany.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@contactcompany.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Gerar tokens JWT
    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);

    // Criar tag de teste para tenant1
    tag1 = await prisma.tag.create({
      data: {
        tenantId: tenant1.id,
        name: 'Tag Test',
        color: '#FF0000',
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /api/contacts - Associar contato a empresa', () => {
    it('deve criar contato associado a empresa', async () => {
      // Criar empresa
      const companyResponse = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Empresa para Associação',
          status: 'ACTIVE',
        })
        .expect(201);

      const companyId = companyResponse.body.id;

      // Criar contato associado
      const contactResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          companyId: companyId,
          status: 'ACTIVE',
        })
        .expect(201);

      expect(contactResponse.body.companyId).toBe(companyId);
      expect(contactResponse.body.company).toBeTruthy();
      expect(contactResponse.body.company.id).toBe(companyId);
      expect(contactResponse.body.company.name).toBe('Empresa para Associação');

      // Verificar auditoria
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Contact',
        entityId: contactResponse.body.id,
        action: 'create',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);
    });

    it('deve retornar 404 se empresa não existir', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          companyId: '00000000-0000-0000-0000-000000000000',
          status: 'ACTIVE',
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('Empresa não encontrada');
    });

    it('deve retornar 400 se companyId for UUID inválido', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          companyId: 'invalid-uuid',
          status: 'ACTIVE',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('UUID');
    });

    it('deve retornar 404 se empresa pertence a outro tenant', async () => {
      // Criar empresa no tenant2
      const companyResponse = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant2.slug)
        .set('Authorization', `Bearer ${adminToken2}`)
        .send({
          name: 'Empresa Tenant 2',
          status: 'ACTIVE',
        })
        .expect(201);

      // Tentar associar contato do tenant1 à empresa do tenant2
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          companyId: companyResponse.body.id,
          status: 'ACTIVE',
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('Empresa não encontrada');
    });

    it('deve retornar 404 se empresa está soft deleted', async () => {
      // Criar empresa e soft delete
      const company = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa Deletada',
          status: 'ACTIVE',
        },
      });

      await prisma.company.update({
        where: { id: company.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          companyId: company.id,
          status: 'ACTIVE',
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('foi deletada');
    });
  });

  describe('PUT /api/contacts/:id - Atualizar associação', () => {
    let company1: { id: string };
    let company2: { id: string };
    let contact: { id: string };

    beforeEach(async () => {
      // Criar duas empresas
      company1 = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa 1',
          status: 'ACTIVE',
        },
      });

      company2 = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa 2',
          status: 'ACTIVE',
        },
      });

      // Criar contato associado à empresa 1
      const contactObj = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Maria',
          lastName: 'Santos',
          status: 'ACTIVE',
          companyId: company1.id,
        },
      });
      contact = { id: contactObj.id };
    });

    it('deve desassociar contato de empresa (companyId: null)', async () => {
      const response = await request(app)
        .put(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          companyId: null,
        })
        .expect(200);

      expect(response.body.companyId).toBeNull();
      expect(response.body.company).toBeNull();

      // Verificar que contato não aparece mais na lista de contatos da empresa
      const companyContactsResponse = await request(app)
        .get(`/api/companies/${company1.id}/contacts`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const found = companyContactsResponse.body.data.find((c: any) => c.id === contact.id);
      expect(found).toBeUndefined();

      // Verificar auditoria
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Contact',
        entityId: contact.id,
        action: 'update',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);
    });

    it('deve trocar associação de contato (de empresa 1 para empresa 2)', async () => {
      const response = await request(app)
        .put(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          companyId: company2.id,
        })
        .expect(200);

      expect(response.body.companyId).toBe(company2.id);
      expect(response.body.company.id).toBe(company2.id);

      // Verificar que contato aparece na lista de contatos da empresa 2
      const company2ContactsResponse = await request(app)
        .get(`/api/companies/${company2.id}/contacts`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const foundInCompany2 = company2ContactsResponse.body.data.find((c: any) => c.id === contact.id);
      expect(foundInCompany2).toBeDefined();

      // Verificar que contato não aparece mais na lista de contatos da empresa 1
      const company1ContactsResponse = await request(app)
        .get(`/api/companies/${company1.id}/contacts`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const foundInCompany1 = company1ContactsResponse.body.data.find((c: any) => c.id === contact.id);
      expect(foundInCompany1).toBeUndefined();

      // Verificar auditoria
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Contact',
        entityId: contact.id,
        action: 'update',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);
    });

    it('deve retornar 404 se tentar associar a empresa inexistente', async () => {
      const response = await request(app)
        .put(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          companyId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('Empresa não encontrada');
    });
  });

  describe('GET /api/companies/:id/contacts - Listar contatos de empresa', () => {
    let company: { id: string };

    beforeEach(async () => {
      company = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa para Listagem',
          status: 'ACTIVE',
        },
      });
    });

    it('deve listar contatos de uma empresa', async () => {
      // Criar múltiplos contatos associados
      await prisma.contact.createMany({
        data: [
          {
            tenantId: tenant1.id,
            firstName: 'Contato 1',
            lastName: 'Silva',
            status: 'ACTIVE',
            companyId: company.id,
          },
          {
            tenantId: tenant1.id,
            firstName: 'Contato 2',
            lastName: 'Santos',
            status: 'ACTIVE',
            companyId: company.id,
          },
          {
            tenantId: tenant1.id,
            firstName: 'Contato 3',
            lastName: 'Oliveira',
            status: 'INACTIVE',
            companyId: company.id,
          },
        ],
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/contacts`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.data.length).toBe(3);

      // Verificar que todos os contatos pertencem à empresa
      response.body.data.forEach((contact: any) => {
        expect(contact.companyId).toBe(company.id);
        expect(contact.company).toBeTruthy();
        expect(contact.company.id).toBe(company.id);
      });
    });

    it('deve filtrar contatos por status', async () => {
      // Criar contatos com diferentes status
      await prisma.contact.createMany({
        data: [
          {
            tenantId: tenant1.id,
            firstName: 'Contato Active',
            status: 'ACTIVE',
            companyId: company.id,
          },
          {
            tenantId: tenant1.id,
            firstName: 'Contato Inactive',
            status: 'INACTIVE',
            companyId: company.id,
          },
        ],
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/contacts?status=ACTIVE`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((contact: any) => {
        expect(contact.status).toBe('ACTIVE');
      });
    });

    it('deve filtrar contatos por tagId', async () => {
      // Criar contatos com e sem tag
      const contact1 = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Contato com Tag',
          status: 'ACTIVE',
          companyId: company.id,
        },
      });

      await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Contato sem Tag',
          status: 'ACTIVE',
          companyId: company.id,
        },
      });

      // Associar tag ao contato 1
      await prisma.contactTag.create({
        data: {
          contactId: contact1.id,
          tagId: tag1.id,
        },
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/contacts?tagId=${tag1.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((contact: any) => {
        expect(contact.tags.some((t: any) => t.id === tag1.id)).toBe(true);
      });
    });

    it('deve ordenar contatos por firstName', async () => {
      await prisma.contact.createMany({
        data: [
          {
            tenantId: tenant1.id,
            firstName: 'Zebra',
            status: 'ACTIVE',
            companyId: company.id,
          },
          {
            tenantId: tenant1.id,
            firstName: 'Alpha',
            status: 'ACTIVE',
            companyId: company.id,
          },
          {
            tenantId: tenant1.id,
            firstName: 'Beta',
            status: 'ACTIVE',
            companyId: company.id,
          },
        ],
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/contacts?orderBy=firstName&order=asc`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const names = response.body.data.map((c: any) => c.firstName);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('deve paginar resultados', async () => {
      // Criar mais contatos
      await prisma.contact.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          tenantId: tenant1.id,
          firstName: `Contato ${i + 1}`,
          status: 'ACTIVE',
          companyId: company.id,
        })),
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/contacts?limit=2&offset=0`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('não deve retornar contatos soft deleted', async () => {
      // Criar contato e soft delete
      const deletedContact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Contato Deletado',
          status: 'ACTIVE',
          companyId: company.id,
        },
      });

      await prisma.contact.update({
        where: { id: deletedContact.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/contacts`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const found = response.body.data.find((c: any) => c.id === deletedContact.id);
      expect(found).toBeUndefined();
    });

    it('deve retornar 404 se empresa não existir', async () => {
      const response = await request(app)
        .get('/api/companies/00000000-0000-0000-0000-000000000000/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(404);

      expect(response.body.error).toBe('Empresa não encontrada');
    });

    it('deve retornar 404 se empresa pertence a outro tenant', async () => {
      // Criar empresa no tenant2
      const company2 = await prisma.company.create({
        data: {
          tenantId: tenant2.id,
          name: 'Empresa Tenant 2',
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .get(`/api/companies/${company2.id}/contacts`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(404);

      expect(response.body.error).toBe('Empresa não encontrada');
    });

    it('deve retornar 404 se empresa está soft deleted', async () => {
      // Criar empresa e soft delete
      const deletedCompany = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa Deletada',
          status: 'ACTIVE',
        },
      });

      await prisma.company.update({
        where: { id: deletedCompany.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(app)
        .get(`/api/companies/${deletedCompany.id}/contacts`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(404);

      expect(response.body.error).toBe('Empresa não encontrada');
    });
  });

  describe('Validação de permissões', () => {
    let company: { id: string };
    let contact: { id: string };
    let viewerUser: { id: string; email: string; password: string };
    let viewerToken: string;
    let viewerRole: { id: string };

    beforeAll(async () => {
      // Criar empresa e contato
      company = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa para Permissões',
          status: 'ACTIVE',
        },
      });

      contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Contato Teste',
          status: 'ACTIVE',
          companyId: company.id,
        },
      });

      // Criar role Visualizador (sem permissão Contact.update)
      viewerRole = await prisma.role.create({
        data: {
          tenantId: tenant1.id,
          name: 'Visualizador Test',
          description: 'Apenas leitura',
          isActive: true,
        },
      });

      // Criar permissões apenas de leitura
      const readPermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Contact',
        action: 'read',
      });

      const listPermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Contact',
        action: 'list',
      });

      await prisma.rolePermission.createMany({
        data: [
          { roleId: viewerRole.id, permissionId: readPermission.id },
          { roleId: viewerRole.id, permissionId: listPermission.id },
        ],
      });

      // Criar usuário visualizador
      const viewerUserObj = await createTestUser({
        email: 'viewer@contactcompany.test',
        password: 'ViewerPass123',
        name: 'Viewer User',
        tenantId: tenant1.id,
      });
      viewerUser = { ...viewerUserObj, password: 'ViewerPass123' };
      await assignRoleToUser(viewerUser.id, viewerRole.id);

      viewerToken = generateToken(viewerUser.id, tenant1.id);
    });

    it('deve permitir listar contatos de empresa com permissão Contact.list', async () => {
      const response = await request(app)
        .get(`/api/companies/${company.id}/contacts`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('deve retornar 403 se usuário não tem permissão Contact.list', async () => {
      // Criar role sem permissão Contact.list
      const noListRole = await prisma.role.create({
        data: {
          tenantId: tenant1.id,
          name: 'No List Role',
          description: 'Sem permissão de listar',
          isActive: true,
        },
      });

      const noListUser = await createTestUser({
        email: 'nolist@contactcompany.test',
        password: 'NoListPass123',
        name: 'No List User',
        tenantId: tenant1.id,
      });
      await assignRoleToUser(noListUser.id, noListRole.id);

      const noListToken = generateToken(noListUser.id, tenant1.id);

      const response = await request(app)
        .get(`/api/companies/${company.id}/contacts`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${noListToken}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });
});

