/**
 * Testes E2E para validação de auditoria de alterações
 * 
 * Valida que operações CRUD (create, update, delete) em User e Role
 * geram logs de auditoria apropriados na tabela AuditLog.
 */

import request from 'supertest';
import { app } from '../../src/index';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  createTestRole,
  createTestPermission,
  assignRoleToUser,
  getAuditLogs,
  closeDatabase,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';

describe('Audit Log - E2E Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string; email: string; password: string };
  let adminToken: string;
  let adminRole: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant de teste
    const tenantObj = await createTestTenant({
      name: 'Audit Test Tenant',
      slug: 'audit-test-tenant',
      status: 'ACTIVE',
    });
    tenant = { id: tenantObj.id, slug: tenantObj.slug };

    // Criar permissões básicas para User e Role
    const userPermissions = await Promise.all([
      createTestPermission({ tenantId: tenant.id, entity: 'User', action: 'create' }),
      createTestPermission({ tenantId: tenant.id, entity: 'User', action: 'read' }),
      createTestPermission({ tenantId: tenant.id, entity: 'User', action: 'update' }),
      createTestPermission({ tenantId: tenant.id, entity: 'User', action: 'delete' }),
      createTestPermission({ tenantId: tenant.id, entity: 'User', action: 'list' }),
    ]);

    const rolePermissions = await Promise.all([
      createTestPermission({ tenantId: tenant.id, entity: 'Role', action: 'create' }),
      createTestPermission({ tenantId: tenant.id, entity: 'Role', action: 'read' }),
      createTestPermission({ tenantId: tenant.id, entity: 'Role', action: 'update' }),
      createTestPermission({ tenantId: tenant.id, entity: 'Role', action: 'delete' }),
      createTestPermission({ tenantId: tenant.id, entity: 'Role', action: 'list' }),
    ]);

    // Criar role Admin com todas as permissões
    const allPermissions = [...userPermissions, ...rolePermissions];
    const adminRoleObj = await createTestRole({
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Administrador com acesso total',
      permissionIds: allPermissions.map((p) => p.id),
    });
    adminRole = { id: adminRoleObj.id };

    // Criar usuário admin
    const adminUserObj = await createTestUser({
      email: 'admin@audit-test.com',
      password: 'AdminPassword123',
      name: 'Admin User',
      tenantId: tenant.id,
      status: 'ACTIVE',
    });

    // Associar role Admin ao usuário
    await assignRoleToUser(adminUserObj.id, adminRole.id);

    adminUser = {
      id: adminUserObj.id,
      email: adminUserObj.email,
      password: 'AdminPassword123',
    };

    // Obter token JWT do admin
    adminToken = generateToken(adminUser.id, tenant.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('User CRUD - Auditoria', () => {
    it('deve gerar log de auditoria ao criar usuário', async () => {
      // Contar logs antes
      const logsBefore = await getAuditLogs(tenant.id, { entityType: 'User', action: 'create' });
      const countBefore = logsBefore.length;

      // Criar usuário
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'newuser@test.com',
          name: 'New User',
          password: 'Password123',
        });

      expect(response.status).toBe(201);
      const createdUserId = response.body.id;

      // Aguardar pequeno delay para garantir que auditoria foi processada
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar log de auditoria
      const logsAfter = await getAuditLogs(tenant.id, { entityType: 'User', action: 'create' });
      expect(logsAfter.length).toBe(countBefore + 1);

      const auditLog = logsAfter[0]; // Mais recente primeiro
      expect(auditLog).toMatchObject({
        entityType: 'User',
        action: 'create',
        entityId: createdUserId,
        userId: adminUser.id,
        tenantId: tenant.id,
      });
      expect(auditLog.changes).toBeNull();
      expect(auditLog.timestamp).toBeInstanceOf(Date);

      // Verificar que timestamp é recente (últimos 5 segundos)
      const now = new Date();
      const timeDiff = now.getTime() - auditLog.timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000);
    });

    it('deve gerar log de auditoria com changes ao atualizar usuário', async () => {
      // Criar usuário inicial
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'updateuser@test.com',
          name: 'Original Name',
          password: 'Password123',
        });

      expect(createResponse.status).toBe(201);
      const userId = createResponse.body.id;

      // Aguardar auditoria de criação
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Contar logs antes
      const logsBefore = await getAuditLogs(tenant.id, { entityType: 'User', action: 'update' });
      const countBefore = logsBefore.length;

      // Atualizar usuário
      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          name: 'Updated Name',
          email: 'updated@test.com',
        });

      expect(updateResponse.status).toBe(200);

      // Aguardar auditoria de atualização
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar log de auditoria
      const logsAfter = await getAuditLogs(tenant.id, { entityType: 'User', action: 'update' });
      expect(logsAfter.length).toBe(countBefore + 1);

      const auditLog = logsAfter[0]; // Mais recente primeiro
      expect(auditLog).toMatchObject({
        entityType: 'User',
        action: 'update',
        entityId: userId,
        userId: adminUser.id,
        tenantId: tenant.id,
      });

      // Verificar que changes existe e contém apenas campos alterados
      expect(auditLog.changes).not.toBeNull();
      const changes = auditLog.changes as any;
      expect(changes).toHaveProperty('name');
      expect(changes).toHaveProperty('email');
      expect(changes.name).toMatchObject({
        old: 'Original Name',
        new: 'Updated Name',
      });
      expect(changes.email).toMatchObject({
        old: 'updateuser@test.com',
        new: 'updated@test.com',
      });

      // Verificar que changes não contém campos técnicos ou sensíveis
      expect(changes).not.toHaveProperty('updatedAt');
      expect(changes).not.toHaveProperty('createdAt');
      expect(changes).not.toHaveProperty('passwordHash');

      // Verificar timestamp recente
      const now = new Date();
      const timeDiff = now.getTime() - auditLog.timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000);
    });

    it('deve gerar log de auditoria ao deletar usuário', async () => {
      // Criar usuário inicial
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'deleteuser@test.com',
          name: 'User To Delete',
          password: 'Password123',
        });

      expect(createResponse.status).toBe(201);
      const userId = createResponse.body.id;

      // Aguardar auditoria de criação
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Contar logs antes
      const logsBefore = await getAuditLogs(tenant.id, { entityType: 'User', action: 'delete' });
      const countBefore = logsBefore.length;

      // Deletar usuário (soft delete)
      const deleteResponse = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(deleteResponse.status).toBe(200);

      // Aguardar auditoria de deleção
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar log de auditoria
      const logsAfter = await getAuditLogs(tenant.id, { entityType: 'User', action: 'delete' });
      expect(logsAfter.length).toBe(countBefore + 1);

      const auditLog = logsAfter[0]; // Mais recente primeiro
      expect(auditLog).toMatchObject({
        entityType: 'User',
        action: 'delete',
        entityId: userId,
        userId: adminUser.id,
        tenantId: tenant.id,
      });
      expect(auditLog.changes).toBeNull();

      // Verificar timestamp recente
      const now = new Date();
      const timeDiff = now.getTime() - auditLog.timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000);
    });
  });

  describe('Role CRUD - Auditoria', () => {
    it('deve gerar log de auditoria ao criar role', async () => {
      // Contar logs antes
      const logsBefore = await getAuditLogs(tenant.id, { entityType: 'Role', action: 'create' });
      const countBefore = logsBefore.length;

      // Criar role
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          name: 'Test Role',
          description: 'Role for testing',
        });

      expect(response.status).toBe(201);
      const createdRoleId = response.body.id;

      // Aguardar auditoria
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar log de auditoria
      const logsAfter = await getAuditLogs(tenant.id, { entityType: 'Role', action: 'create' });
      expect(logsAfter.length).toBe(countBefore + 1);

      const auditLog = logsAfter[0]; // Mais recente primeiro
      expect(auditLog).toMatchObject({
        entityType: 'Role',
        action: 'create',
        entityId: createdRoleId,
        userId: adminUser.id,
        tenantId: tenant.id,
      });
      expect(auditLog.changes).toBeNull();

      // Verificar timestamp recente
      const now = new Date();
      const timeDiff = now.getTime() - auditLog.timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000);
    });

    it('deve gerar log de auditoria com changes ao atualizar role', async () => {
      // Criar role inicial
      const createResponse = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          name: 'Original Role',
          description: 'Original Description',
        });

      expect(createResponse.status).toBe(201);
      const roleId = createResponse.body.id;

      // Aguardar auditoria de criação
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Contar logs antes
      const logsBefore = await getAuditLogs(tenant.id, { entityType: 'Role', action: 'update' });
      const countBefore = logsBefore.length;

      // Atualizar role
      const updateResponse = await request(app)
        .put(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          name: 'Updated Role',
          description: 'Updated Description',
        });

      expect(updateResponse.status).toBe(200);

      // Aguardar auditoria de atualização
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar log de auditoria
      const logsAfter = await getAuditLogs(tenant.id, { entityType: 'Role', action: 'update' });
      expect(logsAfter.length).toBe(countBefore + 1);

      const auditLog = logsAfter[0]; // Mais recente primeiro
      expect(auditLog).toMatchObject({
        entityType: 'Role',
        action: 'update',
        entityId: roleId,
        userId: adminUser.id,
        tenantId: tenant.id,
      });

      // Verificar que changes existe e contém apenas campos alterados
      expect(auditLog.changes).not.toBeNull();
      const changes = auditLog.changes as any;
      expect(changes).toHaveProperty('name');
      expect(changes).toHaveProperty('description');
      expect(changes.name).toMatchObject({
        old: 'Original Role',
        new: 'Updated Role',
      });
      expect(changes.description).toMatchObject({
        old: 'Original Description',
        new: 'Updated Description',
      });

      // Verificar que changes não contém campos técnicos
      expect(changes).not.toHaveProperty('updatedAt');
      expect(changes).not.toHaveProperty('createdAt');

      // Verificar timestamp recente
      const now = new Date();
      const timeDiff = now.getTime() - auditLog.timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000);
    });

    it('deve gerar log de auditoria ao deletar role', async () => {
      // Criar role inicial (sem usuários associados)
      const createResponse = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          name: 'Role To Delete',
          description: 'Will be deleted',
        });

      expect(createResponse.status).toBe(201);
      const roleId = createResponse.body.id;

      // Aguardar auditoria de criação
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Contar logs antes
      const logsBefore = await getAuditLogs(tenant.id, { entityType: 'Role', action: 'delete' });
      const countBefore = logsBefore.length;

      // Deletar role (soft delete)
      const deleteResponse = await request(app)
        .delete(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(deleteResponse.status).toBe(200);

      // Aguardar auditoria de deleção
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar log de auditoria
      const logsAfter = await getAuditLogs(tenant.id, { entityType: 'Role', action: 'delete' });
      expect(logsAfter.length).toBe(countBefore + 1);

      const auditLog = logsAfter[0]; // Mais recente primeiro
      expect(auditLog).toMatchObject({
        entityType: 'Role',
        action: 'delete',
        entityId: roleId,
        userId: adminUser.id,
        tenantId: tenant.id,
      });
      expect(auditLog.changes).toBeNull();

      // Verificar timestamp recente
      const now = new Date();
      const timeDiff = now.getTime() - auditLog.timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000);
    });
  });

  describe('Isolamento Multi-tenant', () => {
    it('deve isolar logs de auditoria por tenant', async () => {
      // Criar tenant B
      const tenantB = await createTestTenant({
        name: 'Audit Test Tenant B',
        slug: 'audit-test-tenant-b',
        status: 'ACTIVE',
      });

      // Criar permissões e role Admin para tenant B
      const userPermissionsB = await Promise.all([
        createTestPermission({ tenantId: tenantB.id, entity: 'User', action: 'create' }),
        createTestPermission({ tenantId: tenantB.id, entity: 'User', action: 'read' }),
        createTestPermission({ tenantId: tenantB.id, entity: 'User', action: 'update' }),
        createTestPermission({ tenantId: tenantB.id, entity: 'User', action: 'delete' }),
        createTestPermission({ tenantId: tenantB.id, entity: 'User', action: 'list' }),
      ]);

      const adminRoleB = await createTestRole({
        tenantId: tenantB.id,
        name: 'Admin',
        permissionIds: userPermissionsB.map((p) => p.id),
      });

      // Criar usuário admin no tenant B
      const adminUserB = await createTestUser({
        email: 'admin-b@test.com',
        password: 'Password123',
        name: 'Admin B',
        tenantId: tenantB.id,
      });

      await assignRoleToUser(adminUserB.id, adminRoleB.id);
      const tokenB = generateToken(adminUserB.id, tenantB.id);

      // Criar usuário no tenant A
      const userA = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'usera@test.com',
          name: 'User A',
          password: 'Password123',
        });

      expect(userA.status).toBe(201);

      // Aguardar auditoria
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Criar usuário no tenant B
      const userB = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Tenant-Id', tenantB.id)
        .send({
          email: 'userb@test.com',
          name: 'User B',
          password: 'Password123',
        });

      expect(userB.status).toBe(201);

      // Aguardar auditoria
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar isolamento: logs do tenant A não aparecem em queries do tenant B
      const logsTenantA = await getAuditLogs(tenant.id);
      const logsTenantB = await getAuditLogs(tenantB.id);

      // Todos os logs do tenant A devem ter tenantId correto
      logsTenantA.forEach((log) => {
        expect(log.tenantId).toBe(tenant.id);
      });

      // Todos os logs do tenant B devem ter tenantId correto
      logsTenantB.forEach((log) => {
        expect(log.tenantId).toBe(tenantB.id);
      });

      // Logs não devem vazar entre tenants
      const tenantALogsInB = logsTenantB.filter((log) => log.tenantId === tenant.id);
      const tenantBLogsInA = logsTenantA.filter((log) => log.tenantId === tenantB.id);

      expect(tenantALogsInB.length).toBe(0);
      expect(tenantBLogsInA.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('não deve gerar log ao atualizar sem mudanças reais', async () => {
      // Criar usuário
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'nochange@test.com',
          name: 'No Change User',
          password: 'Password123',
        });

      expect(createResponse.status).toBe(201);
      const userId = createResponse.body.id;

      // Aguardar auditoria de criação
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Contar logs de update antes
      const logsBefore = await getAuditLogs(tenant.id, { entityType: 'User', action: 'update' });
      const countBefore = logsBefore.length;

      // Atualizar com os mesmos valores (sem mudanças)
      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          name: 'No Change User', // Mesmo valor
          email: 'nochange@test.com', // Mesmo valor
        });

      expect(updateResponse.status).toBe(200);

      // Aguardar possível auditoria
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar que NÃO foi criado log de auditoria
      const logsAfter = await getAuditLogs(tenant.id, { entityType: 'User', action: 'update' });
      expect(logsAfter.length).toBe(countBefore); // Contador permanece o mesmo
    });
  });
});

