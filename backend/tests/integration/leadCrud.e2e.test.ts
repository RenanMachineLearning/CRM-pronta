/**
 * Testes E2E para CRUD completo de leads via API
 * 
 * Valida criação, leitura, atualização e deleção de leads.
 * Testa isolamento multi-tenant, validações, auditoria, permissões ACL,
 * associação com tags e informações de conversão.
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

describe('Lead CRUD - E2E Tests', () => {
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
      name: 'Lead CRUD Test Tenant 1',
      slug: 'lead-crud-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Lead CRUD Test Tenant 2',
      slug: 'lead-crud-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Lead (se não existirem)
    const leadPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'list' }),
    ]);

    const leadPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Lead', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Lead', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Lead', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Lead', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Lead', action: 'list' }),
    ]);

    // Associar permissões aos Admins
    await prisma.rolePermission.createMany({
      data: [
        ...leadPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...leadPermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin1@leadcrud.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@leadcrud.test',
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
        name: 'Hot Lead',
        color: '#FF0000',
      },
    });

    tag2 = await prisma.tag.create({
      data: {
        tenantId: tenant1.id,
        name: 'Cold Lead',
        color: '#0000FF',
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /api/leads - Criar lead', () => {
    it('deve criar lead com dados válidos', async () => {
      const response = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          email: 'joao@example.com',
          phone: '+5511999999999',
          company: 'Empresa ABC',
          source: 'website',
          status: 'NEW',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.firstName).toBe('João');
      expect(response.body.lastName).toBe('Silva');
      expect(response.body.email).toBe('joao@example.com');
      expect(response.body.phone).toBe('+5511999999999');
      expect(response.body.company).toBe('Empresa ABC');
      expect(response.body.source).toBe('website');
      expect(response.body.status).toBe('NEW');
      expect(response.body.converted).toBe(false);
    });

    it('deve criar lead apenas com firstName', async () => {
      const response = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Maria',
          email: 'maria@example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.firstName).toBe('Maria');
      expect(response.body.lastName).toBeNull();
    });

    it('deve criar lead com tags', async () => {
      const response = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Pedro',
          lastName: 'Santos',
          tagIds: [tag1.id, tag2.id],
        });

      expect(response.status).toBe(201);
      expect(response.body.tags).toHaveLength(2);
      expect(response.body.tags.map((t: any) => t.id)).toContain(tag1.id);
      expect(response.body.tags.map((t: any) => t.id)).toContain(tag2.id);
    });

    it('deve rejeitar lead sem firstName e lastName', async () => {
      const response = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar email inválido', async () => {
      const response = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Test',
          email: 'email-invalido',
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar telefone inválido', async () => {
      const response = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Test',
          phone: '123',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/leads - Listar leads', () => {
    it('deve listar leads do tenant atual', async () => {
      // Criar alguns leads primeiro
      await prisma.lead.createMany({
        data: [
          {
            tenantId: tenant1.id,
            firstName: 'Lead 1',
            lastName: 'Test',
            status: 'NEW',
            converted: false,
          },
          {
            tenantId: tenant1.id,
            firstName: 'Lead 2',
            lastName: 'Test',
            status: 'QUALIFIED',
            converted: false,
          },
        ],
      });

      const response = await request(app)
        .get('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
    });

    it('deve filtrar leads por status', async () => {
      const response = await request(app)
        .get('/api/leads?status=QUALIFIED')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((lead: any) => {
        expect(lead.status).toBe('QUALIFIED');
      });
    });

    it('deve filtrar leads por source', async () => {
      await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Lead Source',
          lastName: 'Test',
          source: 'referral',
          status: 'NEW',
          converted: false,
        },
      });

      const response = await request(app)
        .get('/api/leads?source=referral')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((lead: any) => {
        expect(lead.source).toContain('referral');
      });
    });

    it('deve filtrar leads por converted', async () => {
      await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Lead Converted',
          lastName: 'Test',
          converted: true,
          convertedAt: new Date(),
          status: 'CONVERTED',
        },
      });

      const response = await request(app)
        .get('/api/leads?converted=true')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((lead: any) => {
        expect(lead.converted).toBe(true);
      });
    });

    it('deve paginar resultados', async () => {
      const response = await request(app)
        .get('/api/leads?limit=2&offset=0')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('deve ordenar por createdAt (desc)', async () => {
      const response = await request(app)
        .get('/api/leads?orderBy=createdAt&order=desc')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      if (response.body.data.length > 1) {
        const dates = response.body.data.map((lead: any) => new Date(lead.createdAt).getTime());
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }
    });
  });

  describe('GET /api/leads/:id - Obter lead específico', () => {
    it('deve retornar lead existente', async () => {
      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Lead Get',
          lastName: 'Test',
          status: 'NEW',
          converted: false,
        },
      });

      const response = await request(app)
        .get(`/api/leads/${lead.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(lead.id);
      expect(response.body.firstName).toBe('Lead Get');
    });

    it('deve retornar 404 para lead inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/leads/${fakeId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar 404 para lead de outro tenant', async () => {
      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Lead Tenant 2',
          lastName: 'Test',
          status: 'NEW',
          converted: false,
        },
      });

      const response = await request(app)
        .get(`/api/leads/${lead.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/leads/:id - Atualizar lead', () => {
    it('deve atualizar lead existente', async () => {
      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Lead Update',
          lastName: 'Test',
          status: 'NEW',
          converted: false,
        },
      });

      const response = await request(app)
        .put(`/api/leads/${lead.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Lead Updated',
          status: 'QUALIFIED',
        });

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe('Lead Updated');
      expect(response.body.status).toBe('QUALIFIED');
    });

    it('deve atualizar tags (substituir completamente)', async () => {
      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Lead Tags',
          lastName: 'Test',
          status: 'NEW',
          converted: false,
        },
      });

      // Adicionar tag inicial
      await prisma.leadTag.create({
        data: {
          leadId: lead.id,
          tagId: tag1.id,
        },
      });

      const response = await request(app)
        .put(`/api/leads/${lead.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          tagIds: [tag2.id],
        });

      expect(response.status).toBe(200);
      expect(response.body.tags).toHaveLength(1);
      expect(response.body.tags[0].id).toBe(tag2.id);
    });

    it('deve retornar 404 para lead de outro tenant', async () => {
      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Lead Tenant 2',
          lastName: 'Test',
          status: 'NEW',
          converted: false,
        },
      });

      const response = await request(app)
        .put(`/api/leads/${lead.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Updated',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/leads/:id - Deletar lead', () => {
    it('deve fazer soft delete do lead', async () => {
      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Lead Delete',
          lastName: 'Test',
          status: 'NEW',
          converted: false,
        },
      });

      const response = await request(app)
        .delete(`/api/leads/${lead.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deletado com sucesso');

      // Verificar que lead foi soft deleted
      const deletedLead = await prisma.lead.findUnique({
        where: { id: lead.id },
      });
      expect(deletedLead).not.toBeNull();
      expect(deletedLead?.deletedAt).not.toBeNull();

      // Verificar que lead não aparece em listagem
      const listResponse = await request(app)
        .get('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      const foundLead = listResponse.body.data.find((l: any) => l.id === lead.id);
      expect(foundLead).toBeUndefined();
    });

    it('deve retornar 404 para lead de outro tenant', async () => {
      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Lead Tenant 2',
          lastName: 'Test',
          status: 'NEW',
          converted: false,
        },
      });

      const response = await request(app)
        .delete(`/api/leads/${lead.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Isolamento Multi-Tenant', () => {
    it('tenant1 não deve ver leads do tenant2', async () => {
      // Criar lead no tenant2
      await prisma.lead.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Lead Tenant 2',
          lastName: 'Isolated',
          status: 'NEW',
          converted: false,
        },
      });

      // Listar leads do tenant1
      const response = await request(app)
        .get('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      const tenant2Leads = response.body.data.filter((lead: any) => lead.firstName === 'Lead Tenant 2');
      expect(tenant2Leads).toHaveLength(0);
    });

    it('tenant2 não deve ver leads do tenant1', async () => {
      // Criar lead no tenant1
      await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Lead Tenant 1',
          lastName: 'Isolated',
          status: 'NEW',
          converted: false,
        },
      });

      // Listar leads do tenant2
      const response = await request(app)
        .get('/api/leads')
        .set('X-Tenant-Id', tenant2.id)
        .set('Authorization', `Bearer ${adminToken2}`);

      expect(response.status).toBe(200);
      const tenant1Leads = response.body.data.filter((lead: any) => lead.firstName === 'Lead Tenant 1');
      expect(tenant1Leads).toHaveLength(0);
    });
  });

  describe('Auditoria', () => {
    it('deve registrar auditoria ao criar lead', async () => {
      const response = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Lead Audit',
          lastName: 'Test',
          status: 'NEW',
        });

      expect(response.status).toBe(201);
      const leadId = response.body.id;

      // Aguardar auditoria ser registrada
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Lead',
        entityId: leadId,
        action: 'create',
      });

      expect(auditFound).toBe(true);

      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Lead',
        entityId: leadId,
        action: 'create',
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      const createLog = auditLogs[0]; // Mais recente primeiro
      expect(createLog).toBeDefined();
      expect(createLog.entityType).toBe('Lead');
      expect(createLog.entityId).toBe(leadId);
      expect(createLog.userId).toBe(adminUser1.id);
    });

    it('deve registrar auditoria ao atualizar lead', async () => {
      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Lead Audit Update',
          lastName: 'Test',
          status: 'NEW',
          converted: false,
        },
      });

      await request(app)
        .put(`/api/leads/${lead.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'QUALIFIED',
        });

      // Aguardar auditoria ser registrada
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Lead',
        entityId: lead.id,
        action: 'update',
      });

      expect(auditFound).toBe(true);

      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Lead',
        entityId: lead.id,
        action: 'update',
      });

      const updateLog = auditLogs[0];
      expect(updateLog).toBeDefined();
      expect(updateLog.changes).toBeDefined();
      if (updateLog.changes && typeof updateLog.changes === 'object' && 'status' in updateLog.changes) {
        expect(updateLog.changes.status).toBeDefined();
      }
    });

    it('deve registrar auditoria ao deletar lead', async () => {
      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Lead Audit Delete',
          lastName: 'Test',
          status: 'NEW',
          converted: false,
        },
      });

      await request(app)
        .delete(`/api/leads/${lead.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      // Aguardar auditoria ser registrada
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Lead',
        entityId: lead.id,
        action: 'delete',
      });

      expect(auditFound).toBe(true);

      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Lead',
        entityId: lead.id,
        action: 'delete',
      });

      const deleteLog = auditLogs[0];
      expect(deleteLog).toBeDefined();
    });
  });
});
