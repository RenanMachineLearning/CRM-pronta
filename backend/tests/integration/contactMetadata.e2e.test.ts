/**
 * Testes E2E para metadados do contato
 * 
 * Valida criação e atualização de metadados (title, gender, birthDate, status, notes),
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

describe('Contact Metadata - E2E Tests', () => {
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
      name: 'Contact Metadata Test Tenant 1',
      slug: 'contact-metadata-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Contact Metadata Test Tenant 2',
      slug: 'contact-metadata-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Contact
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
      email: 'admin1@metadata.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@metadata.test',
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

  describe('Teste: Salvar metadados funciona (Obrigatório - Especificação)', () => {
    it('deve criar contato com todos os metadados', async () => {
      const pastDate = new Date('1990-01-15');
      pastDate.setFullYear(pastDate.getFullYear() - 10); // Garantir que é passado

      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          title: 'Gerente de Vendas',
          gender: 'MALE',
          birthDate: pastDate.toISOString(),
          status: 'ACTIVE',
          notes: 'Cliente importante, sempre pontual nos pagamentos',
        })
        .expect(201);

      expect(response.body.title).toBe('Gerente de Vendas');
      expect(response.body.gender).toBe('MALE');
      expect(response.body.birthDate).toBeDefined();
      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.notes).toBe('Cliente importante, sempre pontual nos pagamentos');

      // Verificar que GET /api/contacts/:id retorna todos os metadados
      const getResponse = await request(app)
        .get(`/api/contacts/${response.body.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(getResponse.body.title).toBe('Gerente de Vendas');
      expect(getResponse.body.gender).toBe('MALE');
      expect(getResponse.body.birthDate).toBeDefined();
      expect(getResponse.body.status).toBe('ACTIVE');
      expect(getResponse.body.notes).toBe('Cliente importante, sempre pontual nos pagamentos');
    });

    it('deve criar contato com metadados opcionais', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Maria',
          title: 'Diretora',
          gender: 'FEMALE',
          status: 'ACTIVE',
        })
        .expect(201);

      expect(response.body.title).toBe('Diretora');
      expect(response.body.gender).toBe('FEMALE');
      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.birthDate).toBeNull();
      expect(response.body.notes).toBeNull();
    });
  });

  describe('Teste: Validar valores de status funciona (Obrigatório - Especificação)', () => {
    it('deve retornar 400 ao criar contato com status inválido', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          status: 'INVALID',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('Status');
    });

    it('deve retornar 400 ao atualizar contato com status inválido', async () => {
      // Criar contato primeiro
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          status: 'ACTIVE',
        })
        .expect(201);

      const contactId = createResponse.body.id;

      // Tentar atualizar com status inválido
      const updateResponse = await request(app)
        .put(`/api/contacts/${contactId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'INVALID',
        })
        .expect(400);

      expect(updateResponse.body.error).toBeDefined();
      expect(updateResponse.body.message).toContain('Status');
    });

    it('deve aceitar todos os valores válidos de status', async () => {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

      for (const status of validStatuses) {
        const response = await request(app)
          .post('/api/contacts')
          .set('X-Tenant-Slug', tenant1.slug)
          .set('Authorization', `Bearer ${adminToken1}`)
          .send({
            firstName: `João ${status}`,
            status,
          })
          .expect(201);

        expect(response.body.status).toBe(status);
      }
    });
  });

  describe('Teste: Validar birthDate não pode ser futura (Robustez)', () => {
    it('deve retornar 400 ao criar contato com birthDate futura', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          birthDate: futureDate.toISOString(),
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('não pode ser futura');
    });

    it('deve retornar 400 ao atualizar contato com birthDate futura', async () => {
      // Criar contato primeiro
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
        })
        .expect(201);

      const contactId = createResponse.body.id;

      // Tentar atualizar com birthDate futura
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const updateResponse = await request(app)
        .put(`/api/contacts/${contactId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          birthDate: futureDate.toISOString(),
        })
        .expect(400);

      expect(updateResponse.body.error).toBeDefined();
      expect(updateResponse.body.message).toContain('não pode ser futura');
    });

    it('deve aceitar birthDate válida (passada)', async () => {
      const pastDate = new Date('1990-01-15');
      pastDate.setFullYear(pastDate.getFullYear() - 10); // Garantir que é passado

      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          birthDate: pastDate.toISOString(),
        })
        .expect(201);

      expect(response.body.birthDate).toBeDefined();
    });
  });

  describe('Teste: Validar gender deve ser valor permitido (Robustez)', () => {
    it('deve retornar 400 ao criar contato com gender inválido', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          gender: 'INVALID',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('gender');
    });

    it('deve retornar 400 ao atualizar contato com gender inválido', async () => {
      // Criar contato primeiro
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
        })
        .expect(201);

      const contactId = createResponse.body.id;

      // Tentar atualizar com gender inválido
      const updateResponse = await request(app)
        .put(`/api/contacts/${contactId}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          gender: 'INVALID',
        })
        .expect(400);

      expect(updateResponse.body.error).toBeDefined();
      expect(updateResponse.body.message).toContain('gender');
    });

    it('deve aceitar todos os valores válidos de gender', async () => {
      const validGenders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

      for (const gender of validGenders) {
        const response = await request(app)
          .post('/api/contacts')
          .set('X-Tenant-Slug', tenant1.slug)
          .set('Authorization', `Bearer ${adminToken1}`)
          .send({
            firstName: `João ${gender}`,
            gender,
          })
          .expect(201);

        expect(response.body.gender).toBe(gender);
      }
    });

    it('deve normalizar gender para uppercase', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          gender: 'male', // lowercase
        })
        .expect(201);

      expect(response.body.gender).toBe('MALE'); // Normalizado para uppercase
    });

    it('deve aceitar gender como null ou undefined (opcional)', async () => {
      // Teste com null
      const response1 = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          gender: null,
        })
        .expect(201);

      expect(response1.body.gender).toBeNull();

      // Teste sem gender (undefined)
      const response2 = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Maria',
        })
        .expect(201);

      expect(response2.body.gender).toBeNull();
    });
  });

  describe('Teste: Atualizar metadados individualmente (Robustez)', () => {
    let contact: { id: string };

    beforeEach(async () => {
      // Criar contato sem metadados
      const contactObj = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João',
          status: 'ACTIVE',
        },
      });
      contact = { id: contactObj.id };
    });

    it('deve atualizar apenas title', async () => {
      const response = await request(app)
        .put(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          title: 'Gerente',
        })
        .expect(200);

      expect(response.body.title).toBe('Gerente');
    });

    it('deve atualizar apenas gender', async () => {
      const response = await request(app)
        .put(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          gender: 'FEMALE',
        })
        .expect(200);

      expect(response.body.gender).toBe('FEMALE');
    });

    it('deve atualizar apenas birthDate', async () => {
      const pastDate = new Date('1990-01-15');
      pastDate.setFullYear(pastDate.getFullYear() - 10);

      const response = await request(app)
        .put(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          birthDate: pastDate.toISOString(),
        })
        .expect(200);

      expect(response.body.birthDate).toBeDefined();
    });

    it('deve atualizar apenas status', async () => {
      const response = await request(app)
        .put(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'INACTIVE',
        })
        .expect(200);

      expect(response.body.status).toBe('INACTIVE');
    });

    it('deve atualizar apenas notes', async () => {
      const response = await request(app)
        .put(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          notes: 'Notas importantes sobre o contato',
        })
        .expect(200);

      expect(response.body.notes).toBe('Notas importantes sobre o contato');
    });
  });

  describe('Teste: Isolamento multi-tenant (Robustez)', () => {
    let contact1: { id: string };

    beforeEach(async () => {
      // Criar contato com metadados no tenant1
      const contact1Obj = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'João Tenant1',
          title: 'Gerente',
          gender: 'MALE',
          status: 'ACTIVE',
        },
      });
      contact1 = { id: contact1Obj.id };
    });

    it('deve retornar 404 ao tentar acessar metadados do tenant2', async () => {
      const response = await request(app)
        .get(`/api/contacts/${contact1.id}`)
        .set('X-Tenant-Slug', tenant2.slug) // Tentando acessar com tenant2
        .set('Authorization', `Bearer ${adminToken2}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 404 ao tentar atualizar metadados do tenant2', async () => {
      const response = await request(app)
        .put(`/api/contacts/${contact1.id}`)
        .set('X-Tenant-Slug', tenant2.slug)
        .set('Authorization', `Bearer ${adminToken2}`)
        .send({
          title: 'Novo Título',
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });
});

