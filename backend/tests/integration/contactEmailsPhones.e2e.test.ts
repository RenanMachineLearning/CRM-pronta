/**
 * Testes E2E para múltiplos meios de contato (emails e telefones)
 * 
 * Valida criação, atualização e deleção de emails e telefones de contatos,
 * incluindo validações, regras de primary, isolamento multi-tenant e permissões.
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

describe('Contact Emails and Phones - E2E Tests', () => {
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
      name: 'Contact Emails Phones Test Tenant 1',
      slug: 'contact-emails-phones-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Contact Emails Phones Test Tenant 2',
      slug: 'contact-emails-phones-test-tenant-2',
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
      email: 'admin1@emailsphones.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@emailsphones.test',
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

  describe('POST /api/contacts/:id/emails - Adicionar email', () => {
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

    it('deve adicionar email a um contato', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/emails`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'joao@example.com',
          type: 'WORK',
        })
        .expect(201);

      expect(response.body.email).toBe('joao@example.com');
      expect(response.body.type).toBe('WORK');
      expect(response.body.isPrimary).toBe(true); // Deve ser marcado como primary automaticamente se for o primeiro

      // Verificar auditoria
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'ContactEmail',
        entityId: response.body.id,
        action: 'create',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);
    });

    it('deve marcar email como primary automaticamente se for o primeiro', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/emails`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'primeiro@example.com',
          type: 'WORK',
        })
        .expect(201);

      expect(response.body.isPrimary).toBe(true);
    });

    it('deve retornar 400 se email for inválido', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/emails`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'email-invalido',
          type: 'WORK',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('inválido');
    });

    it('deve retornar 400 se tipo for inválido', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/emails`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'joao@example.com',
          type: 'INVALID',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 404 se contato não existir', async () => {
      const response = await request(app)
        .post('/api/contacts/00000000-0000-0000-0000-000000000000/emails')
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'joao@example.com',
          type: 'WORK',
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 400 se email já existir para o contato', async () => {
      // Adicionar primeiro email
      await request(app)
        .post(`/api/contacts/${contact.id}/emails`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'joao@example.com',
          type: 'WORK',
        })
        .expect(201);

      // Tentar adicionar email duplicado
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/emails`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'joao@example.com',
          type: 'HOME',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('já existe');
    });
  });

  describe('Teste obrigatório: adicionar múltiplos emails funciona', () => {
    let contact: { id: string };

    beforeEach(async () => {
      contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Maria',
          lastName: 'Santos',
          status: 'ACTIVE',
        },
      });
    });

    it('deve adicionar múltiplos emails e garantir apenas um primary', async () => {
      // Adicionar primeiro email (deve ser marcado como primary automaticamente)
      const email1Response = await request(app)
        .post(`/api/contacts/${contact.id}/emails`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'maria@example.com',
          type: 'WORK',
        })
        .expect(201);

      expect(email1Response.body.isPrimary).toBe(true);

      // Adicionar segundo email (não-primary)
      const email2Response = await request(app)
        .post(`/api/contacts/${contact.id}/emails`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'maria.pessoal@example.com',
          type: 'HOME',
          isPrimary: false,
        })
        .expect(201);

      expect(email2Response.body.isPrimary).toBe(false);

      // Adicionar terceiro email (não-primary)
      const email3Response = await request(app)
        .post(`/api/contacts/${contact.id}/emails`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'maria.outro@example.com',
          type: 'OTHER',
        })
        .expect(201);

      expect(email3Response.body.isPrimary).toBe(false);

      // Verificar que apenas um email é primary
      const contactResponse = await request(app)
        .get(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const primaryEmails = contactResponse.body.emails.filter((e: any) => e.isPrimary);
      expect(primaryEmails.length).toBe(1);
      expect(primaryEmails[0].email).toBe('maria@example.com');
    });
  });

  describe('Teste obrigatório: marcar email como primary funciona', () => {
    let contact: { id: string };
    let email1Id: string;
    let email2Id: string;

    beforeEach(async () => {
      contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Pedro',
          lastName: 'Oliveira',
          status: 'ACTIVE',
        },
      });

      // Criar dois emails (primeiro é primary)
      const email1 = await prisma.contactEmail.create({
        data: {
          tenantId: tenant1.id,
          contactId: contact.id,
          email: 'pedro@example.com',
          type: 'WORK',
          isPrimary: true,
        },
      });
      email1Id = email1.id;

      const email2 = await prisma.contactEmail.create({
        data: {
          tenantId: tenant1.id,
          contactId: contact.id,
          email: 'pedro.pessoal@example.com',
          type: 'HOME',
          isPrimary: false,
        },
      });
      email2Id = email2.id;
    });

    it('deve marcar email como primary e desmarcar o anterior', async () => {
      // Atualizar segundo email para primary
      const response = await request(app)
        .put(`/api/contacts/${contact.id}/emails/${email2Id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          isPrimary: true,
        })
        .expect(200);

      expect(response.body.isPrimary).toBe(true);

      // Verificar que o primeiro email foi desmarcado
      const contactResponse = await request(app)
        .get(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const email1 = contactResponse.body.emails.find((e: any) => e.id === email1Id);
      const email2 = contactResponse.body.emails.find((e: any) => e.id === email2Id);

      expect(email1.isPrimary).toBe(false);
      expect(email2.isPrimary).toBe(true);
    });
  });

  describe('PUT /api/contacts/:id/emails/:emailId - Atualizar email', () => {
    let contact: { id: string };
    let email: { id: string };

    beforeEach(async () => {
      contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Ana',
          lastName: 'Costa',
          status: 'ACTIVE',
        },
      });

      const emailObj = await prisma.contactEmail.create({
        data: {
          tenantId: tenant1.id,
          contactId: contact.id,
          email: 'ana@example.com',
          type: 'WORK',
          isPrimary: true,
        },
      });
      email = { id: emailObj.id };
    });

    it('deve atualizar email', async () => {
      const response = await request(app)
        .put(`/api/contacts/${contact.id}/emails/${email.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'ana.nova@example.com',
          type: 'HOME',
        })
        .expect(200);

      expect(response.body.email).toBe('ana.nova@example.com');
      expect(response.body.type).toBe('HOME');
    });

    it('deve retornar 409 se tentar remover único primary', async () => {
      const response = await request(app)
        .put(`/api/contacts/${contact.id}/emails/${email.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          isPrimary: false,
        })
        .expect(409);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('único email primary');
    });
  });

  describe('DELETE /api/contacts/:id/emails/:emailId - Deletar email', () => {
    let contact: { id: string };
    let email1: { id: string };
    let email2: { id: string };

    beforeEach(async () => {
      contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Carlos',
          lastName: 'Lima',
          status: 'ACTIVE',
        },
      });

      email1 = await prisma.contactEmail.create({
        data: {
          tenantId: tenant1.id,
          contactId: contact.id,
          email: 'carlos@example.com',
          type: 'WORK',
          isPrimary: true,
        },
      });

      email2 = await prisma.contactEmail.create({
        data: {
          tenantId: tenant1.id,
          contactId: contact.id,
          email: 'carlos.pessoal@example.com',
          type: 'HOME',
          isPrimary: false,
        },
      });
    });

    it('deve deletar email não-primary', async () => {
      const response = await request(app)
        .delete(`/api/contacts/${contact.id}/emails/${email2.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(response.body.message).toContain('deletado com sucesso');

      // Verificar que email foi deletado
      const contactResponse = await request(app)
        .get(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const found = contactResponse.body.emails.find((e: any) => e.id === email2.id);
      expect(found).toBeUndefined();
    });

    it('deve marcar outro email como primary ao deletar primary', async () => {
      await request(app)
        .delete(`/api/contacts/${contact.id}/emails/${email1.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      // Verificar que email2 foi marcado como primary
      const contactResponse = await request(app)
        .get(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      const email2Updated = contactResponse.body.emails.find((e: any) => e.id === email2.id);
      expect(email2Updated.isPrimary).toBe(true);
    });

    it('deve retornar 409 ao tentar deletar último email', async () => {
      // Deletar primeiro email
      await request(app)
        .delete(`/api/contacts/${contact.id}/emails/${email2.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      // Tentar deletar último email
      const response = await request(app)
        .delete(`/api/contacts/${contact.id}/emails/${email1.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(409);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('último email');
    });
  });

  describe('POST /api/contacts/:id/phones - Adicionar telefone', () => {
    let contact: { id: string };

    beforeEach(async () => {
      contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Roberto',
          lastName: 'Silva',
          status: 'ACTIVE',
        },
      });
    });

    it('deve adicionar telefone a um contato', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/phones`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          phone: '+55 11 99999-9999',
          type: 'MOBILE',
        })
        .expect(201);

      expect(response.body.phone).toBe('+55 11 99999-9999');
      expect(response.body.type).toBe('MOBILE');

      // Verificar auditoria
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'ContactPhone',
        entityId: response.body.id,
        action: 'create',
        userId: adminUser1.id,
      });
      expect(auditFound).toBe(true);
    });

    it('deve retornar 400 se telefone for inválido', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/phones`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          phone: '123',
          type: 'MOBILE',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('inválido');
    });
  });

  describe('Teste obrigatório: adicionar múltiplos telefones funciona', () => {
    let contact: { id: string };

    beforeEach(async () => {
      contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Fernanda',
          lastName: 'Alves',
          status: 'ACTIVE',
        },
      });
    });

    it('deve adicionar múltiplos telefones', async () => {
      // Adicionar primeiro telefone
      await request(app)
        .post(`/api/contacts/${contact.id}/phones`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          phone: '+55 11 99999-9999',
          type: 'MOBILE',
        })
        .expect(201);

      // Adicionar segundo telefone
      await request(app)
        .post(`/api/contacts/${contact.id}/phones`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          phone: '+55 11 88888-8888',
          type: 'WORK',
        })
        .expect(201);

      // Adicionar terceiro telefone
      await request(app)
        .post(`/api/contacts/${contact.id}/phones`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          phone: '+55 11 77777-7777',
          type: 'HOME',
        })
        .expect(201);

      // Verificar que todos foram criados
      const contactResponse = await request(app)
        .get(`/api/contacts/${contact.id}`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .expect(200);

      expect(contactResponse.body.phones.length).toBe(3);
    });
  });

  describe('Teste obrigatório: validar formato de email/telefone funciona', () => {
    let contact: { id: string };

    beforeEach(async () => {
      contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Teste',
          lastName: 'Validação',
          status: 'ACTIVE',
        },
      });
    });

    it('deve rejeitar email inválido', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/emails`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'email-invalido',
          type: 'WORK',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('deve aceitar email válido', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/emails`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'valido@example.com',
          type: 'WORK',
        })
        .expect(201);

      expect(response.body.email).toBe('valido@example.com');
    });

    it('deve rejeitar telefone inválido', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/phones`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          phone: '123',
          type: 'MOBILE',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('deve aceitar telefone válido', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/phones`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          phone: '+55 11 99999-9999',
          type: 'MOBILE',
        })
        .expect(201);

      expect(response.body.phone).toBe('+55 11 99999-9999');
    });
  });

  describe('Isolamento multi-tenant', () => {
    let contact1: { id: string };

    beforeEach(async () => {
      // Criar contatos em tenants diferentes
      contact1 = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Tenant1',
          status: 'ACTIVE',
        },
      });

      await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Tenant2',
          status: 'ACTIVE',
        },
      });

      await prisma.contactEmail.create({
        data: {
          tenantId: tenant1.id,
          contactId: contact1.id,
          email: 'tenant1@example.com',
          type: 'WORK',
          isPrimary: true,
        },
      });
    });

    it('deve retornar 404 ao tentar acessar email de outro tenant', async () => {
      const response = await request(app)
        .get(`/api/contacts/${contact1.id}`)
        .set('X-Tenant-Slug', tenant2.slug)
        .set('Authorization', `Bearer ${adminToken2}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Validação de permissões', () => {
    let contact: { id: string };
    let viewerUser: { id: string; email: string; password: string };
    let viewerToken: string;
    let viewerRole: { id: string };

    beforeAll(async () => {
      contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Permissão',
          status: 'ACTIVE',
        },
      });

      // Criar role sem permissão Contact.update
      viewerRole = await prisma.role.create({
        data: {
          tenantId: tenant1.id,
          name: 'Visualizador Test',
          description: 'Apenas leitura',
          isActive: true,
        },
      });

      const readPermission = await createTestPermission({
        tenantId: tenant1.id,
        entity: 'Contact',
        action: 'read',
      });

      await prisma.rolePermission.create({
        data: {
          roleId: viewerRole.id,
          permissionId: readPermission.id,
        },
      });

      const viewerUserObj = await createTestUser({
        email: 'viewer@emailsphones.test',
        password: 'ViewerPass123',
        name: 'Viewer User',
        tenantId: tenant1.id,
      });
      viewerUser = { ...viewerUserObj, password: 'ViewerPass123' };
      await assignRoleToUser(viewerUser.id, viewerRole.id);

      viewerToken = generateToken(viewerUser.id, tenant1.id);
    });

    it('deve retornar 403 se usuário não tem permissão Contact.update', async () => {
      const response = await request(app)
        .post(`/api/contacts/${contact.id}/emails`)
        .set('X-Tenant-Slug', tenant1.slug)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          email: 'teste@example.com',
          type: 'WORK',
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });
});

