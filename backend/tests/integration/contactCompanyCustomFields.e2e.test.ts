/**
 * Testes E2E para campos customizados em Contact e Company
 * 
 * Valida que campos customizados funcionam corretamente:
 * - Campos customizados são validados corretamente
 * - Campos customizados aparecem nas respostas GET
 * - Campos customizados podem ser atualizados
 */

import request from 'supertest';
import { app } from '../../src/index';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  createTestRole,
  createTestPermission,
  createTestEntity,
  createTestField,
  assignRoleToUser,
  closeDatabase,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';

describe('Campos Customizados - Contact e Company - E2E Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string };
  let adminToken: string;
  let contactEntity: { id: string };
  let companyEntity: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Custom Fields Test Tenant',
      slug: 'custom-fields-test-tenant',
      status: 'ACTIVE',
    });
    tenant = { id: tenantObj.id, slug: tenantObj.slug };

    // Criar entidades Contact e Company no sistema de metadados
    contactEntity = await createTestEntity({
      tenantId: tenant.id,
      name: 'Contact',
      label: 'Contato',
      isSystem: true,
    });

    companyEntity = await createTestEntity({
      tenantId: tenant.id,
      name: 'Company',
      label: 'Empresa',
      isSystem: true,
    });

    // Criar permissões admin
    const adminPermissions = await Promise.all([
      createTestPermission({
        tenantId: tenant.id,
        entity: 'Contact',
        action: 'create',
      }),
      createTestPermission({
        tenantId: tenant.id,
        entity: 'Contact',
        action: 'read',
      }),
      createTestPermission({
        tenantId: tenant.id,
        entity: 'Contact',
        action: 'update',
      }),
      createTestPermission({
        tenantId: tenant.id,
        entity: 'Contact',
        action: 'list',
      }),
      createTestPermission({
        tenantId: tenant.id,
        entity: 'Company',
        action: 'create',
      }),
      createTestPermission({
        tenantId: tenant.id,
        entity: 'Company',
        action: 'read',
      }),
      createTestPermission({
        tenantId: tenant.id,
        entity: 'Company',
        action: 'update',
      }),
      createTestPermission({
        tenantId: tenant.id,
        entity: 'Company',
        action: 'list',
      }),
    ]);

    // Criar role admin
    const adminRole = await createTestRole({
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Admin role',
      permissionIds: adminPermissions.map(p => p.id),
    });

    // Criar usuário admin
    const adminUserObj = await createTestUser({
      email: 'admin@customfields.test',
      password: 'password123',
      name: 'Admin User',
      tenantId: tenant.id,
    });

    await assignRoleToUser(adminUserObj.id, adminRole.id);
    adminUser = { id: adminUserObj.id };
    adminToken = generateToken(adminUser.id, tenant.id);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Teste Obrigatório 1: Campo customizado é validado corretamente', () => {
    it('campo customizado obrigatório é validado ao criar contato', async () => {
      // Criar campo customizado obrigatório para Contact
      await createTestField({
        tenantId: tenant.id,
        entityId: contactEntity.id,
        name: 'customPhone',
        label: 'Telefone Customizado',
        type: 'text',
        required: true,
        order: 1,
      });

      // Tentar criar contato sem campo customizado obrigatório
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          customFields: {}, // Campo obrigatório faltando
        })
        .expect(400);

      expect(response.body.message).toContain('customPhone');
      expect(response.body.message).toContain('obrigatório');
    });

    it('campo customizado com tipo inválido é rejeitado', async () => {
      // Criar campo customizado do tipo number
      await createTestField({
        tenantId: tenant.id,
        entityId: contactEntity.id,
        name: 'customAge',
        label: 'Idade Customizada',
        type: 'number',
        required: false,
        order: 2,
      });

      // Tentar criar contato com valor inválido (string em vez de number)
      const response = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          customFields: {
            customAge: 'não é um número', // Valor inválido
          },
        })
        .expect(400);

      expect(response.body.message).toContain('customAge');
    });

    it('campo customizado único é validado ao criar empresa', async () => {
      // Criar campo customizado único para Company
      await createTestField({
        tenantId: tenant.id,
        entityId: companyEntity.id,
        name: 'customCode',
        label: 'Código Customizado',
        type: 'text',
        required: false,
        unique: true,
        order: 1,
      });

      // Criar primeira empresa com código único
      const createResponse1 = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Empresa 1',
          customFields: {
            customCode: 'CODE001',
          },
        })
        .expect(201);

      expect(createResponse1.body.customCode).toBe('CODE001');

      // Tentar criar segunda empresa com mesmo código (deve falhar)
      const createResponse2 = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Empresa 2',
          customFields: {
            customCode: 'CODE001', // Código duplicado
          },
        })
        .expect(400);

      expect(createResponse2.body.message).toContain('customCode');
    });
  });

  describe('Teste Obrigatório 2: Campo customizado aparece nas respostas GET', () => {
    it('campo customizado aparece em GET /api/contacts/:id', async () => {
      // Criar campo customizado
      await createTestField({
        tenantId: tenant.id,
        entityId: contactEntity.id,
        name: 'customNote',
        label: 'Nota Customizada',
        type: 'text',
        required: false,
        order: 3,
      });

      // Criar contato com campo customizado
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          customFields: {
            customNote: 'Nota customizada do contato',
          },
        })
        .expect(201);

      // Buscar contato
      const getResponse = await request(app)
        .get(`/api/contacts/${createResponse.body.id}`)
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verificar que campo customizado aparece
      expect(getResponse.body.customNote).toBe('Nota customizada do contato');
    });

    it('campo customizado aparece em GET /api/contacts (listagem)', async () => {
      // Criar campo customizado
      await createTestField({
        tenantId: tenant.id,
        entityId: contactEntity.id,
        name: 'customStatus',
        label: 'Status Customizado',
        type: 'text',
        required: false,
        order: 4,
      });

      // Criar contato com campo customizado
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Maria',
          lastName: 'Santos',
          customFields: {
            customStatus: 'Ativo',
          },
        })
        .expect(201);

      // Listar contatos
      const listResponse = await request(app)
        .get('/api/contacts')
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verificar que campo customizado aparece na listagem
      const contact = listResponse.body.data.find((c: any) => c.id === createResponse.body.id);
      expect(contact).toBeDefined();
      expect(contact.customStatus).toBe('Ativo');
    });

    it('campo customizado aparece em GET /api/companies/:id', async () => {
      // Criar campo customizado
      await createTestField({
        tenantId: tenant.id,
        entityId: companyEntity.id,
        name: 'customIndustry',
        label: 'Indústria Customizada',
        type: 'text',
        required: false,
        order: 2,
      });

      // Criar empresa com campo customizado
      const createResponse = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Empresa Teste',
          customFields: {
            customIndustry: 'Tecnologia',
          },
        })
        .expect(201);

      // Buscar empresa
      const getResponse = await request(app)
        .get(`/api/companies/${createResponse.body.id}`)
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verificar que campo customizado aparece
      expect(getResponse.body.customIndustry).toBe('Tecnologia');
    });
  });

  describe('Teste Obrigatório 3: Campo customizado pode ser atualizado', () => {
    it('campo customizado pode ser atualizado em PUT /api/contacts/:id', async () => {
      // Criar campo customizado
      await createTestField({
        tenantId: tenant.id,
        entityId: contactEntity.id,
        name: 'customStatus',
        label: 'Status Customizado',
        type: 'text',
        required: false,
        order: 5,
      });

      // Criar contato
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          customFields: {
            customStatus: 'Ativo',
          },
        })
        .expect(201);

      // Atualizar campo customizado
      const updateResponse = await request(app)
        .put(`/api/contacts/${createResponse.body.id}`)
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customFields: {
            customStatus: 'Inativo',
          },
        })
        .expect(200);

      // Verificar que campo foi atualizado
      expect(updateResponse.body.customStatus).toBe('Inativo');
    });

    it('campo customizado pode ser atualizado em PUT /api/companies/:id', async () => {
      // Criar campo customizado
      await createTestField({
        tenantId: tenant.id,
        entityId: companyEntity.id,
        name: 'customRating',
        label: 'Avaliação Customizada',
        type: 'number',
        required: false,
        order: 3,
      });

      // Criar empresa
      const createResponse = await request(app)
        .post('/api/companies')
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Empresa Teste',
          customFields: {
            customRating: 5,
          },
        })
        .expect(201);

      // Atualizar campo customizado
      const updateResponse = await request(app)
        .put(`/api/companies/${createResponse.body.id}`)
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customFields: {
            customRating: 10,
          },
        })
        .expect(200);

      // Verificar que campo foi atualizado
      expect(updateResponse.body.customRating).toBe(10);
    });

    it('campos customizados existentes são preservados ao atualizar parcialmente', async () => {
      // Criar dois campos customizados
      await createTestField({
        tenantId: tenant.id,
        entityId: contactEntity.id,
        name: 'customField1',
        label: 'Campo Customizado 1',
        type: 'text',
        required: false,
        order: 6,
      });

      await createTestField({
        tenantId: tenant.id,
        entityId: contactEntity.id,
        name: 'customField2',
        label: 'Campo Customizado 2',
        type: 'text',
        required: false,
        order: 7,
      });

      // Criar contato com ambos os campos
      const createResponse = await request(app)
        .post('/api/contacts')
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          customFields: {
            customField1: 'Valor 1',
            customField2: 'Valor 2',
          },
        })
        .expect(201);

      // Atualizar apenas um campo customizado
      const updateResponse = await request(app)
        .put(`/api/contacts/${createResponse.body.id}`)
        .set('X-Tenant-Slug', tenant.slug)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customFields: {
            customField1: 'Valor 1 Atualizado',
          },
        })
        .expect(200);

      // Verificar que ambos os campos estão presentes
      expect(updateResponse.body.customField1).toBe('Valor 1 Atualizado');
      expect(updateResponse.body.customField2).toBe('Valor 2'); // Preservado
    });
  });
});

