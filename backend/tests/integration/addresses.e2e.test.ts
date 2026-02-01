/**
 * Testes E2E para gestão de endereços
 * 
 * Valida criação, atualização e deleção de endereços de contatos e empresas,
 * incluindo validações, isolamento multi-tenant, permissões e auditoria.
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

describe('Addresses - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };
  let limitedUser1: { id: string; email: string; password: string };
  let limitedToken1: string;
  let limitedRole1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Addresses Test Tenant 1',
      slug: 'addresses-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Addresses Test Tenant 2',
      slug: 'addresses-test-tenant-2',
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
      email: 'admin1@addresses.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@addresses.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Criar usuário limitado (sem permissão de update)
    limitedRole1 = await prisma.role.create({
      data: {
        tenantId: tenant1.id,
        name: 'Limited Role',
        description: 'Role sem permissão de update',
      },
    });

    const limitedUser1Obj = await createTestUser({
      email: 'limited@addresses.test',
      password: 'LimitedPass123',
      name: 'Limited User',
      tenantId: tenant1.id,
    });
    limitedUser1 = { ...limitedUser1Obj, password: 'LimitedPass123' };
    await assignRoleToUser(limitedUser1.id, limitedRole1.id);

    // Associar apenas permissões de read
    await prisma.rolePermission.createMany({
      data: [
        {
          roleId: limitedRole1.id,
          permissionId: contactPermissions1.find((p) => p.action === 'read')!.id,
        },
        {
          roleId: limitedRole1.id,
          permissionId: companyPermissions1.find((p) => p.action === 'read')!.id,
        },
      ],
    });

    // Gerar tokens JWT
    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);
    limitedToken1 = generateToken(limitedUser1.id, tenant1.id);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /api/contacts/:id/addresses - Adicionar endereço a contato', () => {
    let contact: { id: string };

    beforeEach(async () => {
      // Criar contato para testes
      const contactObj = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João',
          lastName: 'Silva',
          status: 'ACTIVE',
        },
      });
      contact = { id: contactObj.id };
    });

    it('deve adicionar endereço a contato funciona', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          country: 'Brasil',
          type: 'BILLING',
        })
        .expect(201);

      expect(response.body.street).toBe('Rua das Flores, 123');
      expect(response.body.city).toBe('São Paulo');
      expect(response.body.state).toBe('SP');
      expect(response.body.zipCode).toBe('01234567'); // Normalizado (sem hífen)
      expect(response.body.country).toBe('Brasil');
      expect(response.body.type).toBe('BILLING');
      expect(response.body.contactId).toBe(contact.id);
      expect(response.body.companyId).toBeNull();

      // Verificar que endereço aparece em GET /api/contacts/:id
      const getResponse = await request(app)
        .get(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(getResponse.body.addresses).toBeDefined();
      expect(getResponse.body.addresses.length).toBe(1);
      expect(getResponse.body.addresses[0].id).toBe(response.body.id);

      // Verificar auditoria
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Address',
        entityId: response.body.id,
        action: 'create',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);
    });

    it('deve retornar 400 se CEP for inválido', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '123', // CEP inválido
          country: 'Brasil',
          type: 'BILLING',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('CEP inválido');
    });

    it('deve retornar 400 se país for inválido', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          country: 'País Inexistente',
          type: 'BILLING',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('País inválido');
    });

    it('deve retornar 400 se campos obrigatórios faltarem', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Rua das Flores, 123',
          // city faltando
          state: 'SP',
          zipCode: '01234-567',
          type: 'BILLING',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('deve aceitar CEP com ou sem hífen', async () => {
      const response1 = await request(app)
        .post(`/api/contacts/${contact.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Rua A',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567', // Com hífen
          type: 'BILLING',
        })
        .expect(201);

      expect(response1.body.zipCode).toBe('01234567'); // Normalizado

      // Criar outro contato para testar sem hífen
      const contact2 = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Maria',
          status: 'ACTIVE',
        },
      });

      const response2 = await request(app)
        .post(`/api/contacts/${contact2.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Rua B',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234567', // Sem hífen
          type: 'BILLING',
        })
        .expect(201);

      expect(response2.body.zipCode).toBe('01234567'); // Normalizado
    });

    it('deve usar "Brasil" como país padrão se não fornecido', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          // country não fornecido
          type: 'BILLING',
        })
        .expect(201);

      expect(response.body.country).toBe('Brasil');
    });

    it('deve retornar 403 se usuário não tiver permissão Contact.update', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${limitedToken1}`)
        .send({
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          type: 'BILLING',
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 404 se contato não existir', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/contacts/${fakeId}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          type: 'BILLING',
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/companies/:id/addresses - Adicionar endereço a empresa', () => {
    let company: { id: string };

    beforeEach(async () => {
      // Criar empresa para testes
      const companyObj = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa Teste',
          status: 'ACTIVE',
        },
      });
      company = { id: companyObj.id };
    });

    it('deve adicionar endereço a empresa funciona', async () => {
      const response = await request(app)
        .post(`/api/companies/${company.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Avenida Paulista, 1000',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          country: 'Brasil',
          type: 'SHIPPING',
        })
        .expect(201);

      expect(response.body.street).toBe('Avenida Paulista, 1000');
      expect(response.body.city).toBe('São Paulo');
      expect(response.body.state).toBe('SP');
      expect(response.body.zipCode).toBe('01310100'); // Normalizado
      expect(response.body.country).toBe('Brasil');
      expect(response.body.type).toBe('SHIPPING');
      expect(response.body.companyId).toBe(company.id);
      expect(response.body.contactId).toBeNull();

      // Verificar que endereço aparece em GET /api/companies/:id
      const getResponse = await request(app)
        .get(`/api/companies/${company.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(getResponse.body.addresses).toBeDefined();
      expect(getResponse.body.addresses.length).toBe(1);
      expect(getResponse.body.addresses[0].id).toBe(response.body.id);

      // Verificar auditoria
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Address',
        entityId: response.body.id,
        action: 'create',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);
    });

    it('deve retornar 403 se usuário não tiver permissão Company.update', async () => {
      const response = await request(app)
        .post(`/api/companies/${company.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${limitedToken1}`)
        .send({
          street: 'Avenida Paulista, 1000',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          type: 'SHIPPING',
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/addresses/:id - Atualizar endereço', () => {
    let contact: { id: string };
    let address: { id: string };

    beforeEach(async () => {
      // Criar contato e endereço para testes
      const contactObj = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João',
          status: 'ACTIVE',
        },
      });
      contact = { id: contactObj.id };

      const addressObj = await prisma.address.create({
        data: {
          tenantId: tenant1.id,
          contactId: contact.id,
          street: 'Rua Antiga',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234567',
          country: 'Brasil',
          type: 'BILLING',
        },
      });
      address = { id: addressObj.id };
    });

    it('deve atualizar endereço', async () => {
      const response = await request(app)
        .put(`/api/addresses/${address.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Rua Nova',
          city: 'Rio de Janeiro',
          state: 'RJ',
        })
        .expect(200);

      expect(response.body.street).toBe('Rua Nova');
      expect(response.body.city).toBe('Rio de Janeiro');
      expect(response.body.state).toBe('RJ');
      expect(response.body.zipCode).toBe('01234567'); // Não alterado

      // Verificar auditoria
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Address',
        entityId: address.id,
        action: 'update',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);
    });

    it('deve retornar 403 se usuário não tiver permissão Contact.update (endereço de contato)', async () => {
      const response = await request(app)
        .put(`/api/addresses/${address.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${limitedToken1}`)
        .send({
          street: 'Rua Nova',
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 403 se usuário não tiver permissão Company.update (endereço de empresa)', async () => {
      // Criar empresa e endereço
      const company = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa Teste',
          status: 'ACTIVE',
        },
      });

      const companyAddress = await prisma.address.create({
        data: {
          tenantId: tenant1.id,
          companyId: company.id,
          street: 'Rua Empresa',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234567',
          country: 'Brasil',
          type: 'BILLING',
        },
      });

      const response = await request(app)
        .put(`/api/addresses/${companyAddress.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${limitedToken1}`)
        .send({
          street: 'Rua Nova',
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/addresses/:id - Deletar endereço', () => {
    let contact: { id: string };
    let address: { id: string };

    beforeEach(async () => {
      // Criar contato e endereço para testes
      const contactObj = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João',
          status: 'ACTIVE',
        },
      });
      contact = { id: contactObj.id };

      const addressObj = await prisma.address.create({
        data: {
          tenantId: tenant1.id,
          contactId: contact.id,
          street: 'Rua para Deletar',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234567',
          country: 'Brasil',
          type: 'BILLING',
        },
      });
      address = { id: addressObj.id };
    });

    it('deve deletar endereço', async () => {
      const response = await request(app)
        .delete(`/api/addresses/${address.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.message).toContain('deletado com sucesso');
      expect(response.body.id).toBe(address.id);

      // Verificar que endereço foi deletado
      const addressFound = await prisma.address.findUnique({
        where: { id: address.id },
      });
      expect(addressFound).toBeNull();

      // Verificar auditoria
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Address',
        entityId: address.id,
        action: 'delete',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);
    });

    it('deve retornar 403 se usuário não tiver permissão', async () => {
      const response = await request(app)
        .delete(`/api/addresses/${address.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${limitedToken1}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Isolamento multi-tenant', () => {
    let contact1: { id: string };
    let address1: { id: string };

    beforeEach(async () => {
      // Criar contatos em tenants diferentes
      const contact1Obj = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João Tenant1',
          status: 'ACTIVE',
        },
      });
      contact1 = { id: contact1Obj.id };

      // Criar endereço no tenant1
      const address1Obj = await prisma.address.create({
        data: {
          tenantId: tenant1.id,
          contactId: contact1.id,
          street: 'Rua Tenant1',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234567',
          country: 'Brasil',
          type: 'BILLING',
        },
      });
      address1 = { id: address1Obj.id };
    });

    it('deve retornar 404 ao tentar atualizar endereço de outro tenant', async () => {
      const response = await request(app)
        .put(`/api/addresses/${address1.id}`)
        .set('X-Tenant-Slug', tenant2.slug)
        .set('Authorization', `Bearer ${adminToken2}`)
        .send({
          street: 'Rua Nova',
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 404 ao tentar deletar endereço de outro tenant', async () => {
      const response = await request(app)
        .delete(`/api/addresses/${address1.id}`)
        .set('X-Tenant-Slug', tenant2.slug)
        .set('Authorization', `Bearer ${adminToken2}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Múltiplos endereços', () => {
    let contact: { id: string };

    beforeEach(async () => {
      const contactObj = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João',
          status: 'ACTIVE',
        },
      });
      contact = { id: contactObj.id };
    });

    it('deve permitir adicionar múltiplos endereços', async () => {
      const address1 = await request(app)
        .post(`/api/contacts/${contact.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Rua 1',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          type: 'BILLING',
        })
        .expect(201);

      const address2 = await request(app)
        .post(`/api/contacts/${contact.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Rua 2',
          city: 'Rio de Janeiro',
          state: 'RJ',
          zipCode: '20000-000',
          type: 'SHIPPING',
        })
        .expect(201);

      const address3 = await request(app)
        .post(`/api/contacts/${contact.id}/addresses`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          street: 'Rua 3',
          city: 'Belo Horizonte',
          state: 'MG',
          zipCode: '30000-000',
          type: 'OTHER',
        })
        .expect(201);

      // Verificar que todos foram criados
      const getResponse = await request(app)
        .get(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(getResponse.body.addresses.length).toBe(3);
      expect(getResponse.body.addresses.map((a: any) => a.id)).toContain(address1.body.id);
      expect(getResponse.body.addresses.map((a: any) => a.id)).toContain(address2.body.id);
      expect(getResponse.body.addresses.map((a: any) => a.id)).toContain(address3.body.id);
    });
  });
});

