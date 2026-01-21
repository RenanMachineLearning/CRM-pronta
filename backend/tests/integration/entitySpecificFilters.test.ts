/**
 * Testes E2E para filtros específicos por entidade
 *
 * Valida filtros específicos (hasEmail, hasPhone para Contacts; hasContacts para Companies).
 * Testa combinações com filtros existentes, busca textual e filtros avançados.
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

describe('Entity Specific Filters - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminRole1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenant1Obj = await createTestTenant({
      name: 'Entity Specific Filters Test Tenant',
      slug: 'entity-specific-filters-test-tenant',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    // Criar roles padrão
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    // Criar permissões
    const entities = ['Contact', 'Company'];
    const actions = ['list', 'read', 'create', 'update', 'delete'];

    for (const entity of entities) {
      for (const action of actions) {
        await createTestPermission({
          tenantId: tenant1.id,
          entity,
          action,
        });
      }
    }

    // Associar permissões ao Admin
    const permissions = await prisma.permission.findMany({
      where: { tenantId: tenant1.id },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((perm) => ({
        roleId: adminRole1.id,
        permissionId: perm.id,
      })),
      skipDuplicates: true,
    });

    // Criar usuário Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin@entityfilters.test',
      password: 'AdminPass123',
      name: 'Admin User',
      tenantId: tenant1.id,
    });
    
    // Associar role ao usuário
    await assignRoleToUser(adminUser1Obj.id, adminRole1.id);
    
    adminUser1 = {
      id: adminUser1Obj.id,
      email: adminUser1Obj.email,
      password: 'AdminPass123',
    };

    adminToken1 = generateToken(adminUser1.id, tenant1.id);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Contact - hasEmail filter', () => {
    let contactWithEmail: { id: string };
    let contactWithoutEmail: { id: string };

    beforeAll(async () => {
      // Criar contato com email
      contactWithEmail = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Com Email',
          lastName: 'Test',
          status: 'ACTIVE',
          emails: {
            create: {
              tenantId: tenant1.id,
              email: 'teste@example.com',
              type: 'WORK',
              isPrimary: true,
            },
          },
        },
      });

      // Criar contato sem email
      contactWithoutEmail = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Sem Email',
          lastName: 'Test',
          status: 'ACTIVE',
        },
      });
    });

    it('deve filtrar contatos com email (hasEmail=true)', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasEmail: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.data.some((c: any) => c.id === contactWithEmail.id)).toBe(true);
      expect(response.body.data.some((c: any) => c.id === contactWithoutEmail.id)).toBe(false);
    });

    it('deve filtrar contatos sem email (hasEmail=false)', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasEmail: 'false' });

      expect(response.status).toBe(200);
      expect(response.body.data.some((c: any) => c.id === contactWithoutEmail.id)).toBe(true);
      expect(response.body.data.some((c: any) => c.id === contactWithEmail.id)).toBe(false);
    });

    it('deve combinar hasEmail com status', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasEmail: 'true', status: 'ACTIVE' });

      expect(response.status).toBe(200);
      expect(response.body.data.every((c: any) => c.status === 'ACTIVE')).toBe(true);
      expect(response.body.data.some((c: any) => c.id === contactWithEmail.id)).toBe(true);
    });

    it('deve combinar hasEmail com busca textual (q)', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasEmail: 'true', q: 'Com Email' });

      expect(response.status).toBe(200);
      expect(response.body.data.some((c: any) => c.id === contactWithEmail.id)).toBe(true);
    });
  });

  describe('Contact - hasPhone filter', () => {
    let contactWithPhone: { id: string };
    let contactWithoutPhone: { id: string };

    beforeAll(async () => {
      // Criar contato com telefone
      contactWithPhone = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Com Telefone',
          lastName: 'Test',
          status: 'ACTIVE',
          phones: {
            create: {
              tenantId: tenant1.id,
              phone: '+5511999999999',
              type: 'MOBILE',
              isPrimary: true,
            },
          },
        },
      });

      // Criar contato sem telefone
      contactWithoutPhone = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Sem Telefone',
          lastName: 'Test',
          status: 'ACTIVE',
        },
      });
    });

    it('deve filtrar contatos com telefone (hasPhone=true)', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasPhone: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.data.some((c: any) => c.id === contactWithPhone.id)).toBe(true);
      expect(response.body.data.some((c: any) => c.id === contactWithoutPhone.id)).toBe(false);
    });

    it('deve filtrar contatos sem telefone (hasPhone=false)', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasPhone: 'false' });

      expect(response.status).toBe(200);
      expect(response.body.data.some((c: any) => c.id === contactWithoutPhone.id)).toBe(true);
      expect(response.body.data.some((c: any) => c.id === contactWithPhone.id)).toBe(false);
    });

    it('deve combinar hasPhone com hasEmail', async () => {
      // Criar contato com ambos
      const contactWithBoth = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Com Ambos',
          lastName: 'Test',
          status: 'ACTIVE',
          emails: {
            create: {
              tenantId: tenant1.id,
              email: 'ambos@example.com',
              type: 'WORK',
              isPrimary: true,
            },
          },
          phones: {
            create: {
              tenantId: tenant1.id,
              phone: '+5511888888888',
              type: 'MOBILE',
              isPrimary: true,
            },
          },
        },
      });

      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasEmail: 'true', hasPhone: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.data.some((c: any) => c.id === contactWithBoth.id)).toBe(true);
    });
  });

  describe('Company - hasContacts filter', () => {
    let companyWithContacts: { id: string };
    let companyWithoutContacts: { id: string };
    let contact1: { id: string };

    beforeAll(async () => {
      // Criar empresa com contatos
      companyWithContacts = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa com Contatos',
          website: 'https://comcontatos.com',
        },
      });

      contact1 = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Contato',
          lastName: 'Test',
          companyId: companyWithContacts.id,
          status: 'ACTIVE',
        },
      });

      // Criar empresa sem contatos
      companyWithoutContacts = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Empresa sem Contatos',
          website: 'https://semcontatos.com',
        },
      });
    });

    it('deve filtrar empresas com contatos (hasContacts=true)', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasContacts: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.data.some((c: any) => c.id === companyWithContacts.id)).toBe(true);
      expect(response.body.data.some((c: any) => c.id === companyWithoutContacts.id)).toBe(false);
    });

    it('deve filtrar empresas sem contatos (hasContacts=false)', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasContacts: 'false' });

      expect(response.status).toBe(200);
      expect(response.body.data.some((c: any) => c.id === companyWithoutContacts.id)).toBe(true);
      expect(response.body.data.some((c: any) => c.id === companyWithContacts.id)).toBe(false);
    });

    it('deve combinar hasContacts com industry', async () => {
      // Criar empresa de tech com contatos
      const techCompany = await prisma.company.create({
        data: {
          tenantId: tenant1.id,
          name: 'Tech Company',
          industry: 'Technology',
          contacts: {
            create: {
              tenantId: tenant1.id,
              firstName: 'Tech',
              lastName: 'Contact',
              status: 'ACTIVE',
            },
          },
        },
      });

      const response = await request(app)
        .get('/api/companies')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasContacts: 'true', industry: 'Technology' });

      expect(response.status).toBe(200);
      expect(response.body.data.some((c: any) => c.id === techCompany.id)).toBe(true);
    });

    it('deve combinar hasContacts com busca textual (q)', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasContacts: 'true', q: 'Empresa com Contatos' });

      expect(response.status).toBe(200);
      expect(response.body.data.some((c: any) => c.id === companyWithContacts.id)).toBe(true);
    });

    it('deve combinar hasContacts com filtros avançados', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: 'equals', value: 'ACTIVE' },
      ]);

      const response = await request(app)
        .get('/api/companies')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasContacts: 'true', filters });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validação de parâmetros', () => {
    it('deve aceitar hasEmail como true/false', async () => {
      const response1 = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasEmail: 'true' });

      expect(response1.status).toBe(200);

      const response2 = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasEmail: 'false' });

      expect(response2.status).toBe(200);
    });

    it('deve aceitar hasPhone como true/false', async () => {
      const response1 = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasPhone: 'true' });

      expect(response1.status).toBe(200);

      const response2 = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasPhone: 'false' });

      expect(response2.status).toBe(200);
    });

    it('deve aceitar hasContacts como true/false', async () => {
      const response1 = await request(app)
        .get('/api/companies')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasContacts: 'true' });

      expect(response1.status).toBe(200);

      const response2 = await request(app)
        .get('/api/companies')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasContacts: 'false' });

      expect(response2.status).toBe(200);
    });
  });

  describe('Compatibilidade com funcionalidades existentes', () => {
    it('deve funcionar sem novos filtros (retrocompatibilidade)', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('deve combinar novos filtros com filtros existentes', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasEmail: 'true', status: 'ACTIVE', companyId: 'some-id' });

      expect(response.status).toBe(200);
    });

    it('deve combinar novos filtros com paginação', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .query({ hasEmail: 'true', limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(0);
    });
  });
});
