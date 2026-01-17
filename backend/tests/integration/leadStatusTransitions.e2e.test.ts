/**
 * Testes E2E para transições de status de leads via API
 * 
 * Valida que apenas transições válidas de status são permitidas.
 * Testa isolamento multi-tenant, validações de transição, auditoria.
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

describe('Lead Status Transitions - E2E Tests', () => {
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
      name: 'Lead Status Test Tenant 1',
      slug: 'lead-status-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Lead Status Test Tenant 2',
      slug: 'lead-status-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Lead
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
      email: 'admin1@leadstatus.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@leadstatus.test',
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

  describe('Transições válidas de status', () => {
    it('deve permitir transição NEW → QUALIFIED', async () => {
      // Criar lead com status NEW
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          status: 'NEW',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Atualizar status para QUALIFIED
      const updateResponse = await request(app)
        .put(`/api/leads/${leadId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'QUALIFIED',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.status).toBe('QUALIFIED');
    });

    it('deve permitir transição NEW → LOST', async () => {
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Maria',
          lastName: 'Santos',
          status: 'NEW',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/leads/${leadId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'LOST',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.status).toBe('LOST');
    });

    it('deve permitir transição QUALIFIED → NEW', async () => {
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Pedro',
          lastName: 'Oliveira',
          status: 'QUALIFIED',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/leads/${leadId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'NEW',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.status).toBe('NEW');
    });

    it('deve permitir transição QUALIFIED → LOST', async () => {
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Ana',
          lastName: 'Costa',
          status: 'QUALIFIED',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/leads/${leadId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'LOST',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.status).toBe('LOST');
    });

    it('deve permitir transição LOST → NEW', async () => {
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Carlos',
          lastName: 'Ferreira',
          status: 'LOST',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/leads/${leadId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'NEW',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.status).toBe('NEW');
    });

    it('deve permitir transição LOST → QUALIFIED', async () => {
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Fernanda',
          lastName: 'Alves',
          status: 'LOST',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/leads/${leadId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'QUALIFIED',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.status).toBe('QUALIFIED');
    });
  });

  describe('Transições inválidas de status', () => {
    it('deve rejeitar transição para CONVERTED manualmente', async () => {
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Teste',
          lastName: 'Convertido',
          status: 'NEW',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/leads/${leadId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'CONVERTED',
        });

      expect(updateResponse.status).toBe(400);
      expect(updateResponse.body.error).toBe('Transição de status inválida');
      expect(updateResponse.body.message).toContain('Status CONVERTED só pode ser definido automaticamente');
    });

    it('deve rejeitar transição de CONVERTED para qualquer status', async () => {
      // Criar lead e convertê-lo
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Teste',
          lastName: 'Convertido',
          status: 'NEW',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Converter lead (isso muda status para CONVERTED automaticamente)
      const convertResponse = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: true,
          createOpportunity: false,
        });

      expect(convertResponse.status).toBe(200);
      expect(convertResponse.body.lead.converted).toBe(true);

      // Tentar mudar status de CONVERTED para QUALIFIED
      const updateResponse = await request(app)
        .put(`/api/leads/${leadId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'QUALIFIED',
        });

      expect(updateResponse.status).toBe(400);
      expect(updateResponse.body.error).toBe('Transição de status inválida');
      expect(updateResponse.body.message).toContain('Lead convertido não pode ter seu status alterado');
    });

    it('deve rejeitar transição inválida NEW → CONVERTED (via update)', async () => {
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Teste',
          lastName: 'Invalid',
          status: 'NEW',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/leads/${leadId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'CONVERTED',
        });

      expect(updateResponse.status).toBe(400);
      expect(updateResponse.body.error).toBe('Transição de status inválida');
    });
  });

  describe('Auditoria de transições', () => {
    it('deve registrar auditoria quando transição válida é feita', async () => {
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Auditoria',
          lastName: 'Test',
          status: 'NEW',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Atualizar status
      const updateResponse = await request(app)
        .put(`/api/leads/${leadId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          status: 'QUALIFIED',
        });

      expect(updateResponse.status).toBe(200);

      // Aguardar auditoria ser registrada
      await waitForAuditLog(leadId, 'update', tenant1.id);

      // Verificar auditoria
      const auditLogs = await getAuditLogs(leadId, tenant1.id);
      const updateLog = auditLogs.find((log) => log.action === 'update' && log.changes);

      expect(updateLog).toBeTruthy();
      expect(updateLog?.entity).toBe('Lead');
      if (updateLog?.changes) {
        const changes = updateLog.changes as any;
        expect(changes.status).toBeTruthy();
        expect(changes.status.old).toBe('NEW');
        expect(changes.status.new).toBe('QUALIFIED');
      }
    });
  });

  describe('Isolamento multi-tenant', () => {
    it('deve respeitar isolamento multi-tenant nas transições', async () => {
      // Criar lead no tenant1
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Isolamento',
          lastName: 'Test',
          status: 'NEW',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Tentar atualizar usando tenant2
      const updateResponse = await request(app)
        .put(`/api/leads/${leadId}`)
        .set('X-Tenant-Id', tenant2.id)
        .set('Authorization', `Bearer ${adminToken2}`)
        .send({
          status: 'QUALIFIED',
        });

      expect(updateResponse.status).toBe(404);
    });
  });
});
