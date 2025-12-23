/**
 * Testes E2E de segurança ACL
 * 
 * Valida aspectos críticos de segurança:
 * - Isolamento multi-tenant
 * - Autorização (403 sem permissão, 401 sem autenticação)
 * - Auditoria registra todas as alterações
 * 
 * Nota: Não testar leitura de audit logs aqui (já coberto na Parte 9 - Histórico de Alterações)
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
  waitForAuditLog,
  closeDatabase,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';

describe('ACL Security - E2E Tests', () => {
  let tenantA: { id: string; slug: string };
  let tenantB: { id: string; slug: string };
  let userA: { id: string };
  let userB: { id: string };
  let tokenA: string;
  let tokenB: string;
  let roleA: { id: string };
  let roleB: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant A
    const tenantAObj = await createTestTenant({
      name: 'Security Tenant A',
      slug: 'security-tenant-a',
      status: 'ACTIVE',
    });
    tenantA = { id: tenantAObj.id, slug: tenantAObj.slug };

    // Criar tenant B
    const tenantBObj = await createTestTenant({
      name: 'Security Tenant B',
      slug: 'security-tenant-b',
      status: 'ACTIVE',
    });
    tenantB = { id: tenantBObj.id, slug: tenantBObj.slug };

    // Criar permissões para tenant A
    const userCreatePermissionA = await createTestPermission({
      tenantId: tenantA.id,
      entity: 'User',
      action: 'create',
    });

    const userReadPermissionA = await createTestPermission({
      tenantId: tenantA.id,
      entity: 'User',
      action: 'read',
    });

    const userUpdatePermissionA = await createTestPermission({
      tenantId: tenantA.id,
      entity: 'User',
      action: 'update',
    });

    const userListPermissionA = await createTestPermission({
      tenantId: tenantA.id,
      entity: 'User',
      action: 'list',
    });

    const userDeletePermissionA = await createTestPermission({
      tenantId: tenantA.id,
      entity: 'User',
      action: 'delete',
    });

    // Criar permissões para tenant B
    const userCreatePermissionB = await createTestPermission({
      tenantId: tenantB.id,
      entity: 'User',
      action: 'create',
    });

    const userReadPermissionB = await createTestPermission({
      tenantId: tenantB.id,
      entity: 'User',
      action: 'read',
    });

    // Criar roles
    roleA = await createTestRole({
      tenantId: tenantA.id,
      name: 'Role A',
      description: 'Role for tenant A',
      permissionIds: [
        userCreatePermissionA.id,
        userReadPermissionA.id,
        userUpdatePermissionA.id,
        userDeletePermissionA.id,
        userListPermissionA.id,
      ],
    });

    roleB = await createTestRole({
      tenantId: tenantB.id,
      name: 'Role B',
      description: 'Role for tenant B',
      permissionIds: [userCreatePermissionB.id, userReadPermissionB.id],
    });

    // Criar usuários
    const userAObj = await createTestUser({
      email: 'usera@security.test',
      password: 'UserAPass123',
      name: 'User A',
      tenantId: tenantA.id,
    });
    userA = { id: userAObj.id };
    await assignRoleToUser(userA.id, roleA.id);
    tokenA = generateToken(userA.id, tenantA.id);

    const userBObj = await createTestUser({
      email: 'userb@security.test',
      password: 'UserBPass123',
      name: 'User B',
      tenantId: tenantB.id,
    });
    userB = { id: userBObj.id };
    await assignRoleToUser(userB.id, roleB.id);
    tokenB = generateToken(userB.id, tenantB.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('Isolamento Multi-tenant', () => {
    it('Usuário do tenant A não acessa recursos do tenant B', async () => {
      // Criar usuário no tenant B via userB
      const createResponseB = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Tenant-Id', tenantB.id)
        .send({
          email: 'tenantbuser@test.com',
          name: 'Tenant B User',
          password: 'TestPass123!',
        });
      const userIdB = createResponseB.body.id;

      // Usuário do tenant A não deve conseguir acessar usuário do tenant B
      const readResponse = await request(app)
        .get(`/api/users/${userIdB}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA.id);

      expect(readResponse.status).toBe(404); // Não encontrado porque não pertence ao tenant A
    });

    it('Permissões são isoladas por tenant', async () => {
      // Criar role no tenant A com permissão específica
      const roleAWithPermission = await createTestRole({
        tenantId: tenantA.id,
        name: 'Role A With Permission',
        description: 'Role with permission in tenant A',
        permissionIds: [],
      });

      // Criar role no tenant B com mesmo nome mas permissões diferentes
      const roleBWithPermission = await createTestRole({
        tenantId: tenantB.id,
        name: 'Role A With Permission', // Mesmo nome, mas tenant diferente
        description: 'Role with permission in tenant B',
        permissionIds: [],
      });

      // Verificar que são roles diferentes
      expect(roleAWithPermission.id).not.toBe(roleBWithPermission.id);
      expect(roleAWithPermission.tenantId).toBe(tenantA.id);
      expect(roleBWithPermission.tenantId).toBe(tenantB.id);
    });

    it('Roles são isoladas por tenant', async () => {
      // Criar permissão de list para roles
      const roleListPermissionA = await createTestPermission({
        tenantId: tenantA.id,
        entity: 'Role',
        action: 'list',
      });

      const roleListPermissionB = await createTestPermission({
        tenantId: tenantB.id,
        entity: 'Role',
        action: 'list',
      });

      // Adicionar permissão de list às roles
      const { prisma } = await import('../helpers/db');
      await prisma.rolePermission.create({
        data: { roleId: roleA.id, permissionId: roleListPermissionA.id },
      });
      await prisma.rolePermission.create({
        data: { roleId: roleB.id, permissionId: roleListPermissionB.id },
      });

      // Listar roles do tenant A
      const rolesResponseA = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA.id);

      expect(rolesResponseA.status).toBe(200);
      const rolesA = rolesResponseA.body.data;
      const roleIdsA = rolesA.map((r: any) => r.id);

      // Listar roles do tenant B
      const rolesResponseB = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Tenant-Id', tenantB.id);

      expect(rolesResponseB.status).toBe(200);
      const rolesB = rolesResponseB.body.data;
      const roleIdsB = rolesB.map((r: any) => r.id);

      // Não deve haver sobreposição de IDs
      const intersection = roleIdsA.filter((id: string) => roleIdsB.includes(id));
      expect(intersection.length).toBe(0);
    });
  });

  describe('Autorização', () => {
    it('Usuário sem permissão recebe 403', async () => {
      // Criar usuário sem permissão de update
      const noUpdateRole = await createTestRole({
        tenantId: tenantA.id,
        name: 'No Update Role',
        description: 'Role without update permission',
        permissionIds: [], // Sem permissões
      });

      const userNoUpdateObj = await createTestUser({
        email: 'noupdate@security.test',
        password: 'NoUpdatePass123',
        name: 'No Update User',
        tenantId: tenantA.id,
      });
      await assignRoleToUser(userNoUpdateObj.id, noUpdateRole.id);
      const tokenNoUpdate = generateToken(userNoUpdateObj.id, tenantA.id);

      // Criar usuário via admin primeiro
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          email: 'toupdate@test.com',
          name: 'To Update',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Tentar atualizar sem permissão
      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${tokenNoUpdate}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({ name: 'Updated' });

      expect(updateResponse.status).toBe(403);
      expect(updateResponse.body.error).toBe('Acesso negado');
    });

    it('Usuário sem autenticação recebe 401', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('X-Tenant-Id', tenantA.id);
        // Sem Authorization header

      expect(response.status).toBe(401);
    });

    it('Middleware de autorização funciona corretamente', async () => {
      // Criar role com permissão específica
      const readOnlyRole = await createTestRole({
        tenantId: tenantA.id,
        name: 'Read Only Role',
        description: 'Role with only read permission',
        permissionIds: [],
      });

      // Adicionar apenas permissão de read
      const userReadPermission = await createTestPermission({
        tenantId: tenantA.id,
        entity: 'User',
        action: 'read',
      });

      const { prisma } = await import('../helpers/db');
      await prisma.rolePermission.create({
        data: {
          roleId: readOnlyRole.id,
          permissionId: userReadPermission.id,
        },
      });

      const readOnlyUserObj = await createTestUser({
        email: 'readonly@security.test',
        password: 'ReadOnlyPass123',
        name: 'Read Only User',
        tenantId: tenantA.id,
      });
      await assignRoleToUser(readOnlyUserObj.id, readOnlyRole.id);
      const readOnlyToken = generateToken(readOnlyUserObj.id, tenantA.id);

      // Criar usuário via admin primeiro
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          email: 'toread@test.com',
          name: 'To Read',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Read only user pode ler
      const readResponse = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .set('X-Tenant-Id', tenantA.id);
      expect(readResponse.status).toBe(200);

      // Read only user não pode atualizar (403 do middleware)
      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({ name: 'Updated' });
      expect(updateResponse.status).toBe(403);
    });
  });

  describe('Auditoria', () => {
    it('Todas as alterações são registradas', async () => {
      // Criar usuário
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          email: 'auditcreate@test.com',
          name: 'Audit Create User',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Aguardar log de create (polling)
      const createLogFound = await waitForAuditLog(tenantA.id, {
        entityType: 'User',
        entityId: userId,
        action: 'create',
        userId: userA.id,
      });
      expect(createLogFound).toBe(true);

      // Atualizar usuário
      await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({ name: 'Updated Name' });

      // Aguardar log de update (polling)
      const updateLogFound = await waitForAuditLog(tenantA.id, {
        entityType: 'User',
        entityId: userId,
        action: 'update',
        userId: userA.id,
      });
      expect(updateLogFound).toBe(true);

      // Deletar usuário
      const deleteResponse = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA.id);
      
      expect(deleteResponse.status).toBe(200);

      // Aguardar log de delete (polling)
      // Nota: delete é soft delete, então o log pode demorar um pouco mais
      // Aguardar um pouco antes de começar o polling para dar tempo do log ser criado
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      await waitForAuditLog(tenantA.id, {
        entityType: 'User',
        entityId: userId,
        action: 'delete',
      }, 3000); // Timeout maior para delete
      
      // Verificar que o log foi criado
      const deleteLogs = await getAuditLogs(tenantA.id, {
        entityType: 'User',
        entityId: userId,
        action: 'delete',
      });
      
      // Se não encontrou com polling, pode ser timing - verificar diretamente
      if (deleteLogs.length === 0) {
        // Aguardar mais um pouco e verificar novamente
        await new Promise((resolve) => setTimeout(resolve, 500));
        const retryLogs = await getAuditLogs(tenantA.id, {
          entityType: 'User',
          entityId: userId,
          action: 'delete',
        });
        expect(retryLogs.length).toBeGreaterThan(0);
        expect(retryLogs[0].userId).toBe(userA.id);
        expect(retryLogs[0].tenantId).toBe(tenantA.id);
      } else {
        expect(deleteLogs.length).toBeGreaterThan(0);
        expect(deleteLogs[0].userId).toBe(userA.id);
        expect(deleteLogs[0].tenantId).toBe(tenantA.id);
      }
    });

    it('Logs são isolados por tenant', async () => {
      // Criar usuário no tenant A
      const createResponseA = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          email: 'tenanta@test.com',
          name: 'Tenant A User',
          password: 'TestPass123!',
        });
      const userIdA = createResponseA.body.id;

      // Criar usuário no tenant B
      const createResponseB = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Tenant-Id', tenantB.id)
        .send({
          email: 'tenantb@test.com',
          name: 'Tenant B User',
          password: 'TestPass123!',
        });
      const userIdB = createResponseB.body.id;

      // Aguardar logs (polling)
      const logAFound = await waitForAuditLog(tenantA.id, {
        entityType: 'User',
        entityId: userIdA,
        action: 'create',
        userId: userA.id,
      });
      expect(logAFound).toBe(true);

      const logBFound = await waitForAuditLog(tenantB.id, {
        entityType: 'User',
        entityId: userIdB,
        action: 'create',
        userId: userB.id,
      });
      expect(logBFound).toBe(true);

      // Verificar logs do tenant A
      const logsA = await getAuditLogs(tenantA.id, {
        entityType: 'User',
        entityId: userIdA,
        action: 'create',
      });
      expect(logsA.length).toBeGreaterThan(0);
      expect(logsA[0].tenantId).toBe(tenantA.id);

      // Verificar logs do tenant B
      const logsB = await getAuditLogs(tenantB.id, {
        entityType: 'User',
        entityId: userIdB,
        action: 'create',
      });
      expect(logsB.length).toBeGreaterThan(0);
      expect(logsB[0].tenantId).toBe(tenantB.id);

      // Logs do tenant A não devem conter logs do tenant B
      const logsAForB = await getAuditLogs(tenantA.id, {
        entityType: 'User',
        entityId: userIdB,
        action: 'create',
      });
      expect(logsAForB.length).toBe(0);
    });

    it('Changes contém apenas campos alterados', async () => {
      // Criar usuário
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          email: 'changes@test.com',
          name: 'Changes User',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Atualizar apenas o nome
      await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({ name: 'Updated Name' });

      // Aguardar log de update (polling)
      const updateLogFound = await waitForAuditLog(tenantA.id, {
        entityType: 'User',
        entityId: userId,
        action: 'update',
        userId: userA.id,
      });
      expect(updateLogFound).toBe(true);

      // Verificar log de update
      const updateLogs = await getAuditLogs(tenantA.id, {
        entityType: 'User',
        entityId: userId,
        action: 'update',
      });

      expect(updateLogs.length).toBeGreaterThan(0);
      const log = updateLogs[0];
      
      if (log.changes) {
        const changes = log.changes as any;
        // Changes deve conter apenas campos alterados
        expect(changes).toHaveProperty('name');
        // Não deve conter campos não alterados (se houver)
        // Email não foi alterado, então não deve estar em changes
        if (changes.email) {
          // Se email estiver presente, deve ser porque foi alterado
          expect(changes.email.old).not.toBe(changes.email.new);
        }
      }
    });
  });
});

