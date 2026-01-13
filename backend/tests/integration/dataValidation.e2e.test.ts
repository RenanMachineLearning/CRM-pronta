/**
 * Testes E2E para Validação de Dados
 * 
 * Valida validações robustas de emails, telefones, websites e campos obrigatórios
 * conforme especificação Etapa 5.10 (linhas 448-471 de Etapa-05-Contatos-Empresas.md)
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

describe('Data Validation - E2E Tests', () => {
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
      name: 'Data Validation Test Tenant 1',
      slug: 'data-validation-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Data Validation Test Tenant 2',
      slug: 'data-validation-test-tenant-2',
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
      email: 'admin1@datavalidation.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@datavalidation.test',
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

  describe('Teste Obrigatório 1: Email inválido é rejeitado', () => {
    it('deve rejeitar contato com email inválido (sem @)', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .send({
          firstName: 'João',
          emails: [{ email: 'joaoexample.com', type: 'WORK', isPrimary: true }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('inválido');
    });

    it('deve rejeitar contato com email inválido (sem domínio)', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .send({
          firstName: 'João',
          emails: [{ email: 'joao@', type: 'WORK', isPrimary: true }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('deve rejeitar adicionar email inválido a contato existente', async () => {
      // Criar contato primeiro
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .send({
          firstName: 'Maria',
        });

      expect(createResponse.status).toBe(201);
      const contactId = createResponse.body.id;

      // Tentar adicionar email inválido
      const response = await request(app)
        .post(`/api/contacts/${contactId}/emails`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .send({
          email: 'email-invalido',
          type: 'WORK',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('deve aceitar email válido', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .send({
          firstName: 'Pedro',
          emails: [{ email: 'pedro@example.com', type: 'WORK', isPrimary: true }],
        });

      expect(response.status).toBe(201);
      expect(response.body.emails).toBeDefined();
      expect(response.body.emails.length).toBe(1);
      expect(response.body.emails[0].email).toBe('pedro@example.com');
    });
  });

  describe('Teste Obrigatório 2: Telefone inválido é rejeitado', () => {
    it('deve rejeitar contato com telefone inválido (menos de 10 dígitos)', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .send({
          firstName: 'Ana',
          phones: [{ phone: '12345', type: 'MOBILE', isPrimary: true }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('inválido');
    });

    it('deve rejeitar contato com telefone inválido (mais de 15 dígitos)', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .send({
          firstName: 'Ana',
          phones: [{ phone: '1234567890123456', type: 'MOBILE', isPrimary: true }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('deve rejeitar adicionar telefone inválido a contato existente', async () => {
      // Criar contato primeiro
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .send({
          firstName: 'Carlos',
        });

      expect(createResponse.status).toBe(201);
      const contactId = createResponse.body.id;

      // Tentar adicionar telefone inválido
      const response = await request(app)
        .post(`/api/contacts/${contactId}/phones`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .send({
          phone: '123',
          type: 'MOBILE',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('deve aceitar telefone válido', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .send({
          firstName: 'Lucas',
          phones: [{ phone: '(11) 98765-4321', type: 'MOBILE', isPrimary: true }],
        });

      expect(response.status).toBe(201);
      expect(response.body.phones).toBeDefined();
      expect(response.body.phones.length).toBe(1);
    });
  });

  describe('Teste Obrigatório 3: Campos obrigatórios são validados', () => {
    describe('Contato: pelo menos firstName ou lastName obrigatório', () => {
      it('deve rejeitar contato sem firstName e sem lastName', async () => {
        const response = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.message).toContain('firstName ou lastName');
      });

      it('deve aceitar contato apenas com firstName', async () => {
        const response = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            firstName: 'João',
          });

        expect(response.status).toBe(201);
        expect(response.body.firstName).toBe('João');
      });

      it('deve aceitar contato apenas com lastName', async () => {
        const response = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            lastName: 'Silva',
          });

        expect(response.status).toBe(201);
        expect(response.body.lastName).toBe('Silva');
      });

      it('deve aceitar contato com firstName e lastName', async () => {
        const response = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            firstName: 'Maria',
            lastName: 'Santos',
          });

        expect(response.status).toBe(201);
        expect(response.body.firstName).toBe('Maria');
        expect(response.body.lastName).toBe('Santos');
      });

      it('deve rejeitar contato com firstName vazio e sem lastName', async () => {
        const response = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            firstName: '   ',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });

      it('deve rejeitar atualizar contato removendo ambos os campos', async () => {
        // Criar contato primeiro
        const createResponse = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            firstName: 'Pedro',
            lastName: 'Oliveira',
          });

        expect(createResponse.status).toBe(201);
        const contactId = createResponse.body.id;

        // Tentar atualizar removendo ambos
        const updateResponse = await request(app)
          .put(`/api/contacts/${contactId}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            firstName: '',
            lastName: '',
          });

        expect(updateResponse.status).toBe(400);
        expect(updateResponse.body.error).toBeDefined();
      });
    });

    describe('Empresa: name obrigatório', () => {
      it('deve rejeitar empresa sem name', async () => {
        const response = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.message).toContain('name');
      });

      it('deve rejeitar empresa com name vazio', async () => {
        const response = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            name: '   ',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });

      it('deve aceitar empresa com name válido', async () => {
        const response = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            name: 'Empresa Teste',
          });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe('Empresa Teste');
      });

      it('deve rejeitar atualizar empresa com name vazio', async () => {
        // Criar empresa primeiro
        const createResponse = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            name: 'Empresa Original',
          });

        expect(createResponse.status).toBe(201);
        const companyId = createResponse.body.id;

        // Tentar atualizar com name vazio
        const updateResponse = await request(app)
          .put(`/api/companies/${companyId}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            name: '',
          });

        expect(updateResponse.status).toBe(400);
        expect(updateResponse.body.error).toBeDefined();
      });
    });
  });

  describe('Testes Adicionais de Robustez', () => {
    describe('Email: unicidade e normalização', () => {
      it('deve normalizar email para lowercase', async () => {
        const response = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            firstName: 'Teste',
            emails: [{ email: 'Test@Example.COM', type: 'WORK', isPrimary: true }],
          });

        expect(response.status).toBe(201);
        expect(response.body.emails[0].email).toBe('test@example.com');
      });

      it('deve rejeitar email duplicado no mesmo contato', async () => {
        // Criar contato primeiro
        const createResponse = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            firstName: 'Duplicado',
            emails: [{ email: 'duplicado@example.com', type: 'WORK', isPrimary: true }],
          });

        expect(createResponse.status).toBe(201);
        const contactId = createResponse.body.id;

        // Tentar adicionar mesmo email
        const response = await request(app)
          .post(`/api/contacts/${contactId}/emails`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            email: 'duplicado@example.com',
            type: 'HOME',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });

      it('deve rejeitar emails duplicados no array ao criar contato', async () => {
        const response = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            firstName: 'Teste',
            emails: [
              { email: 'teste@example.com', type: 'WORK', isPrimary: true },
              { email: 'teste@example.com', type: 'HOME', isPrimary: false },
            ],
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.message).toContain('duplicado');
      });

      it('deve permitir mesmo email em contatos diferentes (não único globalmente)', async () => {
        // Criar primeiro contato
        const response1 = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            firstName: 'Contato 1',
            emails: [{ email: 'compartilhado@example.com', type: 'WORK', isPrimary: true }],
          });

        expect(response1.status).toBe(201);

        // Criar segundo contato com mesmo email
        const response2 = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            firstName: 'Contato 2',
            emails: [{ email: 'compartilhado@example.com', type: 'WORK', isPrimary: true }],
          });

        expect(response2.status).toBe(201);
      });
    });

    describe('Website: normalização', () => {
      it('deve normalizar website sem protocolo adicionando http://', async () => {
        const response = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            name: 'Empresa Teste',
            website: 'example.com',
          });

        expect(response.status).toBe(201);
        expect(response.body.website).toBe('http://example.com');
      });

      it('deve manter website com http://', async () => {
        const response = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            name: 'Empresa Teste',
            website: 'http://example.com',
          });

        expect(response.status).toBe(201);
        expect(response.body.website).toBe('http://example.com');
      });

      it('deve manter website com https://', async () => {
        const response = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            name: 'Empresa Teste',
            website: 'https://example.com',
          });

        expect(response.status).toBe(201);
        expect(response.body.website).toBe('https://example.com');
      });

      it('deve normalizar website ao atualizar', async () => {
        // Criar empresa primeiro
        const createResponse = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            name: 'Empresa Original',
          });

        expect(createResponse.status).toBe(201);
        const companyId = createResponse.body.id;

        // Atualizar com website sem protocolo
        const updateResponse = await request(app)
          .put(`/api/companies/${companyId}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            website: 'novosite.com',
          });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.website).toBe('http://novosite.com');
      });
    });

    describe('Isolamento multi-tenant', () => {
      it('deve permitir mesmo email em contatos de tenants diferentes', async () => {
        // Criar contato no tenant1
        const response1 = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            firstName: 'Tenant1',
            emails: [{ email: 'multitenant@example.com', type: 'WORK', isPrimary: true }],
          });

        expect(response1.status).toBe(201);

        // Criar contato no tenant2 com mesmo email
        const response2 = await request(app)
          .post('/api/contacts')
          .set('Authorization', `Bearer ${adminToken2}`)
          .set('X-Tenant-Slug', tenant2.slug)
          .send({
            firstName: 'Tenant2',
            emails: [{ email: 'multitenant@example.com', type: 'WORK', isPrimary: true }],
          });

        expect(response2.status).toBe(201);
      });

      it('deve permitir mesmo website em empresas de tenants diferentes', async () => {
        // Criar empresa no tenant1
        const response1 = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Slug', tenant1.slug)
          .send({
            name: 'Empresa Tenant1',
            website: 'multitenant.com',
          });

        expect(response1.status).toBe(201);

        // Criar empresa no tenant2 com mesmo website
        const response2 = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${adminToken2}`)
          .set('X-Tenant-Slug', tenant2.slug)
          .send({
            name: 'Empresa Tenant2',
            website: 'multitenant.com',
          });

        expect(response2.status).toBe(201);
      });
    });
  });
});

