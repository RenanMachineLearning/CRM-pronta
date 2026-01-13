/**
 * Testes E2E para CRUD completo de empresas via API
 * 
 * Valida criação, leitura, atualização e deleção de empresas.
 * Testa isolamento multi-tenant, validações, auditoria, permissões ACL,
 * cascade delete, erro 409 quando há contatos associados e formatos de resposta.
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

describe('Company CRUD - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };
  let tag1: { id: string; name: string };
  let tag2: { id: string; name: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Company CRUD Test Tenant 1',
      slug: 'company-crud-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Company CRUD Test Tenant 2',
      slug: 'company-crud-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Company (se não existirem)
    const companyPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'list' }),
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
        ...companyPermissions1.map((perm) => ({
          roleId: adminRole1.id,
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
      email: 'admin1@companycrud.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@companycrud.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Gerar tokens JWT
    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);

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

  describe('POST /api/companies - Criar empresa', () => {
    it('deve criar empresa com dados válidos', async () => {
      const companyData = {
        name: 'Empresa Teste 1',
        website: 'https://example.com',
        industry: 'Tecnologia',
        size: 'MEDIUM',
        status: 'ACTIVE',
        addresses: [
          {
            street: 'Rua Teste 123',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil',
            type: 'BILLING',
          },
        ],
        tagIds: [tag1.id],
      };

      const response = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(companyData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(companyData.name);
      expect(response.body.website).toBe(companyData.website);
      expect(response.body.industry).toBe(companyData.industry);
      expect(response.body.size).toBe(companyData.size);
      expect(response.body.status).toBe(companyData.status);
      expect(response.body.addresses).toHaveLength(1);
      expect(response.body.addresses[0].street).toBe(companyData.addresses[0].street);
      expect(response.body.tags).toHaveLength(1);
      expect(response.body.tags[0].id).toBe(tag1.id);

      // Verificar que empresa foi criada no banco
      const company = await prisma.company.findUnique({
        where: { id: response.body.id },
        include: { addresses: true, tags: { include: { tag: true } } },
      });

      expect(company).toBeTruthy();
      expect(company?.tenantId).toBe(tenant1.id);
      expect(company?.addresses).toHaveLength(1);
      expect(company?.tags).toHaveLength(1);

      // Verificar auditoria
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Company',
        entityId: response.body.id,
        action: 'create',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);
    });

    it('deve criar empresa sem campos opcionais', async () => {
      const companyData = {
        name: 'Empresa Teste 2',
      };

      const response = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(companyData)
        .expect(201);

      expect(response.body.name).toBe(companyData.name);
      expect(response.body.status).toBe('ACTIVE'); // Default
      expect(response.body.addresses).toHaveLength(0);
      expect(response.body.tags).toHaveLength(0);
    });

    it('deve retornar 400 se name não for fornecido', async () => {
      const response = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 400 se website for inválido', async () => {
      const response = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Empresa Teste',
          website: 'invalid-url',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 404 se tagId não existir', async () => {
      const response = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Empresa Teste',
          tagIds: ['non-existent-id'],
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('deve isolar empresas por tenant', async () => {
      // Criar empresa no tenant1
      const companyData = {
        name: 'Empresa Tenant 1',
      };

      const response1 = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(companyData)
        .expect(201);

      // Tentar buscar no tenant2 (não deve encontrar)
      const response2 = await request(app)
        .get(`/api/companies/${response1.body.id}`)
        .set('X-Tenant-Slug', tenant2.slug)
        .set('Authorization', `Bearer ${adminToken2}`)
        .expect(404);

      expect(response2.body.error).toBeDefined();
    });
  });

  describe('GET /api/companies - Listar empresas', () => {
    beforeAll(async () => {
      // Criar algumas empresas para testes
      await Promise.all([
        prisma.company.create({
          data: {
            tenantId: tenant1.id,
            name: 'Empresa A',
            industry: 'Tecnologia',
            size: 'SMALL',
            status: 'ACTIVE',
          },
        }),
        prisma.company.create({
          data: {
            tenantId: tenant1.id,
            name: 'Empresa B',
            industry: 'Financeiro',
            size: 'LARGE',
            status: 'ACTIVE',
          },
        }),
        prisma.company.create({
          data: {
            tenantId: tenant1.id,
            name: 'Empresa C',
            industry: 'Tecnologia',
            size: 'MEDIUM',
            status: 'INACTIVE',
          },
        }),
      ]);
    });

    it('deve listar empresas do tenant atual', async () => {
      const response = await request(app)
        .get('/api/companies')
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

      // Verificar que todas as empresas pertencem ao tenant1
      response.body.data.forEach((company: any) => {
        expect(company.tenantId).toBe(tenant1.id);
        expect(company).toHaveProperty('contactsCount');
      });
    });

    it('deve filtrar por industry', async () => {
      const response = await request(app)
        .get('/api/companies?industry=Tecnologia')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((company: any) => {
        expect(company.industry).toContain('Tecnologia');
      });
    });

    it('deve filtrar por size', async () => {
      const response = await request(app)
        .get('/api/companies?size=SMALL')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((company: any) => {
        expect(company.size).toBe('SMALL');
      });
    });

    it('deve ordenar por name', async () => {
      const response = await request(app)
        .get('/api/companies?orderBy=name&order=asc')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const names = response.body.data.map((c: any) => c.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('deve paginar resultados', async () => {
      const response = await request(app)
        .get('/api/companies?limit=2&offset=0')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('não deve retornar empresas soft deleted', async () => {
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
        .get('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const found = response.body.data.find((c: any) => c.id === company.id);
      expect(found).toBeUndefined();
    });
  });

  describe('GET /api/companies/:id - Buscar empresa por ID', () => {
    let companyId: string;

    beforeAll(async () => {
      const company = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa para Get',
          website: 'https://example.com',
          industry: 'Tecnologia',
          size: 'MEDIUM',
          status: 'ACTIVE',
        },
      });
      companyId = company.id;
    });

    it('deve retornar empresa específica', async () => {
      const response = await request(app)
        .get(`/api/companies/${companyId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.id).toBe(companyId);
      expect(response.body.name).toBe('Empresa para Get');
      expect(response.body).toHaveProperty('addresses');
      expect(response.body).toHaveProperty('contacts');
      expect(response.body).toHaveProperty('tags');
    });

    it('deve retornar 404 se empresa não existir', async () => {
      const response = await request(app)
        .get('/api/companies/non-existent-id')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(404);

      expect(response.body.error).toBe('Empresa não encontrada');
    });

    it('deve retornar 404 se empresa pertence a outro tenant', async () => {
      const company = await prisma.company.create({
        data: {
          tenantId: tenant2.id,
          name: 'Empresa Tenant 2',
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(404);

      expect(response.body.error).toBe('Empresa não encontrada');
    });
  });

  describe('PUT /api/companies/:id - Atualizar empresa', () => {
    let companyId: string;

    beforeEach(async () => {
      const company = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa para Update',
          website: 'https://old.com',
          industry: 'Tecnologia',
          size: 'SMALL',
          status: 'ACTIVE',
        },
      });
      companyId = company.id;
    });

    it('deve atualizar empresa com dados válidos', async () => {
      // Buscar dados originais da empresa para comparar
      const originalCompany = await prisma.company.findUnique({
        where: { id: companyId },
      });

      const updateData = {
        name: 'Empresa Atualizada',
        website: 'https://new.com',
        industry: 'Financeiro',
        size: 'LARGE',
        status: 'INACTIVE',
      };

      const response = await request(app)
        .put(`/api/companies/${companyId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.website).toBe(updateData.website);
      expect(response.body.industry).toBe(updateData.industry);
      expect(response.body.size).toBe(updateData.size);
      expect(response.body.status).toBe(updateData.status);

      // Verificar auditoria - aguardar log aparecer
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Company',
        entityId: companyId,
        action: 'update',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);

      // Validar estrutura completa de changes com old/new values
      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Company',
        entityId: companyId,
        action: 'update',
        userId: adminUser1.id,
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('update');
      expect(auditLogs[0].changes).toBeDefined();
      expect(auditLogs[0].changes).not.toBeNull();

      // Validar que changes contém apenas campos alterados
      const changes = auditLogs[0].changes as any;
      expect(changes).toHaveProperty('name');
      expect(changes).toHaveProperty('website');
      expect(changes).toHaveProperty('industry');
      expect(changes).toHaveProperty('size');
      expect(changes).toHaveProperty('status');

      // Validar estrutura de changes: { field: { old: value, new: value } }
      expect(changes.name).toEqual({
        old: originalCompany?.name,
        new: updateData.name,
      });
      expect(changes.website).toEqual({
        old: originalCompany?.website,
        new: updateData.website,
      });
      expect(changes.industry).toEqual({
        old: originalCompany?.industry,
        new: updateData.industry,
      });
      expect(changes.size).toEqual({
        old: originalCompany?.size,
        new: updateData.size,
      });
      expect(changes.status).toEqual({
        old: originalCompany?.status,
        new: updateData.status,
      });

      // Validar que campos técnicos NÃO estão em changes
      expect(changes).not.toHaveProperty('id');
      expect(changes).not.toHaveProperty('tenantId');
      expect(changes).not.toHaveProperty('createdAt');
      expect(changes).not.toHaveProperty('updatedAt');
      expect(changes).not.toHaveProperty('deletedAt');
    });

    it('deve atualizar endereços (substituir completamente)', async () => {
      // Criar endereço inicial
      await prisma.address.create({
        data: {
          tenantId: tenant1.id,
          companyId: companyId,
          street: 'Rua Antiga',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          country: 'Brasil',
          type: 'BILLING',
        },
      });

      const updateData = {
        addresses: [
          {
            street: 'Rua Nova',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zipCode: '20000-000',
            country: 'Brasil',
            type: 'SHIPPING',
          },
        ],
      };

      const response = await request(app)
        .put(`/api/companies/${companyId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(updateData)
        .expect(200);

      expect(response.body.addresses).toHaveLength(1);
      expect(response.body.addresses[0].street).toBe('Rua Nova');

      // Verificar no banco que endereço antigo foi deletado
      const addresses = await prisma.address.findMany({
        where: { companyId: companyId },
      });
      expect(addresses).toHaveLength(1);
      expect(addresses[0].street).toBe('Rua Nova');
    });

    it('deve atualizar tags (substituir completamente)', async () => {
      // Criar associação inicial
      await prisma.companyTag.create({
        data: {
          companyId: companyId,
          tagId: tag1.id,
        },
      });

      const updateData = {
        tagIds: [tag2.id],
      };

      const response = await request(app)
        .put(`/api/companies/${companyId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send(updateData)
        .expect(200);

      expect(response.body.tags).toHaveLength(1);
      expect(response.body.tags[0].id).toBe(tag2.id);

      // Verificar no banco que tag antiga foi removida
      const tags = await prisma.companyTag.findMany({
        where: { companyId: companyId },
      });
      expect(tags).toHaveLength(1);
      expect(tags[0].tagId).toBe(tag2.id);
    });

    it('deve retornar 404 se empresa não existir', async () => {
      const response = await request(app)
        .put('/api/companies/non-existent-id')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ name: 'Teste' })
        .expect(404);

      expect(response.body.error).toBe('Empresa não encontrada');
    });
  });

  describe('DELETE /api/companies/:id - Deletar empresa', () => {
    it('deve deletar empresa sem contatos associados (soft delete)', async () => {
      const company = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa para Deletar',
          status: 'ACTIVE',
        },
      });

      // Criar endereço e tag associados
      await prisma.address.create({
        data: {
          tenantId: tenant1.id,
          companyId: company.id,
          street: 'Rua Teste',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          country: 'Brasil',
          type: 'OTHER',
        },
      });

      await prisma.companyTag.create({
        data: {
          companyId: company.id,
          tagId: tag1.id,
        },
      });

      const response = await request(app)
        .delete(`/api/companies/${company.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Empresa deletada com sucesso');
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(company.id);

      // Verificar que deletedAt foi preenchido
      const deletedCompany = await prisma.company.findUnique({
        where: { id: company.id },
      });
      expect(deletedCompany?.deletedAt).toBeTruthy();

      // Verificar que empresa não aparece em listagens
      const listResponse = await request(app)
        .get('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const found = listResponse.body.data.find((c: any) => c.id === company.id);
      expect(found).toBeUndefined();

      // Verificar cascade delete: Address e CompanyTag foram deletados
      const addresses = await prisma.address.findMany({
        where: { companyId: company.id },
      });
      expect(addresses).toHaveLength(0);

      const tags = await prisma.companyTag.findMany({
        where: { companyId: company.id },
      });
      expect(tags).toHaveLength(0);

      // Verificar auditoria
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Company',
        entityId: company.id,
        action: 'delete',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);
    });

    it('deve retornar 409 se empresa possui contatos associados', async () => {
      const company = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa com Contatos',
          status: 'ACTIVE',
        },
      });

      // Criar contato associado
      await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João',
          lastName: 'Silva',
          status: 'ACTIVE',
          companyId: company.id,
        },
      });

      const response = await request(app)
        .delete(`/api/companies/${company.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(409);

      expect(response.body.error).toBe('Não é possível deletar empresa');
      expect(response.body.message).toContain('contato(s) associado(s)');

      // Verificar que empresa não foi deletada
      const companyStillExists = await prisma.company.findUnique({
        where: { id: company.id },
      });
      expect(companyStillExists).toBeTruthy();
      expect(companyStillExists?.deletedAt).toBeNull();
    });

    it('deve retornar 404 se empresa não existir', async () => {
      const response = await request(app)
        .delete('/api/companies/non-existent-id')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(404);

      expect(response.body.error).toBe('Empresa não encontrada');
    });

    it('deve retornar 404 se empresa pertence a outro tenant', async () => {
      const company = await prisma.company.create({
        data: {
          tenantId: tenant2.id,
          name: 'Empresa Tenant 2',
          status: 'ACTIVE',
        },
      });

      const response = await request(app)
        .delete(`/api/companies/${company.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(404);

      expect(response.body.error).toBe('Empresa não encontrada');
    });
  });

  describe('Integração com contatos', () => {
    it('deve incluir contagem de contatos em listCompanies', async () => {
      const company = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa com Contatos',
          status: 'ACTIVE',
        },
      });

      // Criar 2 contatos associados
      await prisma.contact.createMany({
        data: [
          {
            tenantId: tenant1.id,
            firstName: 'Contato 1',
            status: 'ACTIVE',
            companyId: company.id,
          },
          {
            tenantId: tenant1.id,
            firstName: 'Contato 2',
            status: 'ACTIVE',
            companyId: company.id,
          },
        ],
      });

      const response = await request(app)
        .get('/api/companies')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const foundCompany = response.body.data.find((c: any) => c.id === company.id);
      expect(foundCompany).toBeDefined();
      expect(foundCompany.contactsCount).toBe(2);
    });

    it('deve incluir lista completa de contatos em getCompanyById', async () => {
      const company = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa para Contatos',
          status: 'ACTIVE',
        },
      });

      await prisma.contact.createMany({
        data: [
          {
            tenantId: tenant1.id,
            firstName: 'Contato A',
            lastName: 'Silva',
            title: 'Gerente',
            status: 'ACTIVE',
            companyId: company.id,
          },
          {
            tenantId: tenant1.id,
            firstName: 'Contato B',
            status: 'ACTIVE',
            companyId: company.id,
          },
        ],
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.contacts).toHaveLength(2);
      expect(response.body.contacts[0]).toHaveProperty('id');
      expect(response.body.contacts[0]).toHaveProperty('firstName');
      expect(response.body.contacts[0]).toHaveProperty('lastName');
      expect(response.body.contacts[0]).toHaveProperty('title');
    });
  });
});

