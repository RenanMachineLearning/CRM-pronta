/**
 * Testes E2E para histórico de alterações (audit logs)
 * 
 * Valida que as rotas de consulta de logs de auditoria funcionam corretamente:
 * - Listar logs com paginação
 * - Filtrar logs por entidade, ação, usuário e datas
 * - Obter histórico de registro específico
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
  closeDatabase,
  prisma,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';

describe('Audit Log History - E2E Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string; email: string; password: string };
  let adminToken: string;
  let adminRole: { id: string };
  let auditLogReadPermission: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant de teste
    const tenantObj = await createTestTenant({
      name: 'Audit History Test Tenant',
      slug: 'audit-history-test-tenant',
      status: 'ACTIVE',
    });
    tenant = { id: tenantObj.id, slug: tenantObj.slug };

    // Criar permissão AuditLog.read
    auditLogReadPermission = await createTestPermission({
      tenantId: tenant.id,
      entity: 'AuditLog',
      action: 'read',
    });

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
    adminRole = await createTestRole({
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Admin role for tests',
      permissionIds: [
        ...userPermissions.map((p) => p.id),
        ...rolePermissions.map((p) => p.id),
        auditLogReadPermission.id,
      ],
    });

    // Criar usuário admin
    const adminUserObj = await createTestUser({
      email: 'admin@audithistory.test',
      password: 'AdminPass123',
      name: 'Admin User',
      tenantId: tenant.id,
    });
    adminUser = { ...adminUserObj, password: 'AdminPass123' };

    // Associar role Admin ao usuário
    await assignRoleToUser(adminUser.id, adminRole.id);

    // Gerar token
    adminToken = generateToken(adminUser.id, tenant.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('GET /api/audit-logs - Listar logs com paginação', () => {
    it('deve listar logs de auditoria com paginação padrão', async () => {
      // Criar alguns logs de auditoria
      const testUser1 = await createTestUser({
        email: 'test1@audithistory.test',
        password: 'TestPass123',
        name: 'Test User 1',
        tenantId: tenant.id,
      });

      // Criar logs via operações CRUD
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'newuser@audithistory.test',
          name: 'New User',
          password: 'NewPass123',
        });

      // Aguardar um pouco para garantir que os logs foram criados
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
      expect(response.body.pagination.limit).toBe(20); // Default
      expect(response.body.pagination.offset).toBe(0); // Default
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('deve respeitar parâmetros de paginação (limit e offset)', async () => {
      const response = await request(app)
        .get('/api/audit-logs?limit=5&offset=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.offset).toBe(0);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('deve retornar erro 400 para limit inválido', async () => {
      const response = await request(app)
        .get('/api/audit-logs?limit=200') // Acima do máximo (100)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Parâmetro inválido');
    });

    it('deve retornar erro 400 para offset negativo', async () => {
      const response = await request(app)
        .get('/api/audit-logs?offset=-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Parâmetro inválido');
    });
  });

  describe('GET /api/audit-logs - Filtrar logs', () => {
    it('deve filtrar logs por entityType', async () => {
      const response = await request(app)
        .get('/api/audit-logs?entityType=User')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        response.body.data.forEach((log: any) => {
          expect(log.entityType).toBe('User');
        });
      }
    });

    it('deve filtrar logs por action', async () => {
      const response = await request(app)
        .get('/api/audit-logs?action=create')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        response.body.data.forEach((log: any) => {
          expect(log.action).toBe('create');
        });
      }
    });

    it('deve retornar erro 400 para action inválido', async () => {
      const response = await request(app)
        .get('/api/audit-logs?action=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Parâmetro inválido');
    });

    it('deve filtrar logs por userId', async () => {
      const response = await request(app)
        .get(`/api/audit-logs?userId=${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        response.body.data.forEach((log: any) => {
          expect(log.userId).toBe(adminUser.id);
        });
      }
    });

    it('deve filtrar logs por entityId', async () => {
      // Criar um usuário para ter um entityId específico
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'filtertest@audithistory.test',
          name: 'Filter Test User',
          password: 'FilterPass123',
        });

      expect(createResponse.status).toBe(201);
      const createdUserId = createResponse.body.id;

      // Aguardar um pouco para garantir que o log foi criado
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app)
        .get(`/api/audit-logs?entityId=${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        response.body.data.forEach((log: any) => {
          expect(log.entityId).toBe(createdUserId);
        });
      }
    });

    it('deve filtrar logs por data (dateFrom e dateTo)', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get(
          `/api/audit-logs?dateFrom=${yesterday.toISOString()}&dateTo=${tomorrow.toISOString()}`
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        response.body.data.forEach((log: any) => {
          const logDate = new Date(log.timestamp);
          expect(logDate.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
          expect(logDate.getTime()).toBeLessThanOrEqual(tomorrow.getTime());
        });
      }
    });

    it('deve retornar erro 400 para dateFrom inválido', async () => {
      const response = await request(app)
        .get('/api/audit-logs?dateFrom=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Parâmetro inválido');
    });

    it('deve retornar erro 400 para entityType inválido', async () => {
      const response = await request(app)
        .get('/api/audit-logs?entityType=InvalidEntity')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Parâmetro inválido');
    });
  });

  describe('GET /api/audit-logs/:entityType/:entityId - Histórico de registro específico', () => {
    it('deve retornar histórico completo de uma entidade específica', async () => {
      // Criar um usuário
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'historytest@audithistory.test',
          name: 'History Test User',
          password: 'HistoryPass123',
        });

      expect(createResponse.status).toBe(201);
      const createdUserId = createResponse.body.id;

      // Aguardar um pouco para garantir que o log foi criado
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Atualizar o usuário para criar mais um log
      await request(app)
        .put(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          name: 'Updated History Test User',
        });

      // Aguardar um pouco para garantir que o log foi criado
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app)
        .get(`/api/audit-logs/User/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      // Verificar que todos os logs são da mesma entidade
      response.body.forEach((log: any) => {
        expect(log.entityType).toBe('User');
        expect(log.entityId).toBe(createdUserId);
      });

      // Verificar que está ordenado por timestamp DESC (mais recente primeiro)
      if (response.body.length > 1) {
        for (let i = 0; i < response.body.length - 1; i++) {
          const current = new Date(response.body[i].timestamp);
          const next = new Date(response.body[i + 1].timestamp);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('deve retornar array vazio se entidade não tiver histórico', async () => {
      // Criar um usuário sem fazer operações que gerem logs
      const testUser = await createTestUser({
        email: 'nohistory@audithistory.test',
        password: 'NoHistoryPass123',
        name: 'No History User',
        tenantId: tenant.id,
      });

      const response = await request(app)
        .get(`/api/audit-logs/User/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      // Sempre retorna 200, mesmo com array vazio
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('deve retornar erro 400 para entityType inválido', async () => {
      const response = await request(app)
        .get('/api/audit-logs/InvalidEntity/some-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Parâmetro inválido');
    });

    it('deve incluir userName nos logs (via LEFT JOIN)', async () => {
      // Criar um usuário
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'username-test@audithistory.test',
          name: 'User Name Test',
          password: 'UserNamePass123',
        });

      expect(createResponse.status).toBe(201);
      const createdUserId = createResponse.body.id;

      // Aguardar um pouco para garantir que o log foi criado
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app)
        .get(`/api/audit-logs/User/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      if (response.body.length > 0) {
        response.body.forEach((log: any) => {
          expect(log).toHaveProperty('userName');
          // userName pode ser string ou null (se usuário foi deletado)
          expect(typeof log.userName === 'string' || log.userName === null).toBe(true);
        });
      }
    });
  });

  describe('Isolamento Multi-tenant', () => {
    it('deve retornar apenas logs do tenant atual', async () => {
      // Criar outro tenant
      const tenant2 = await createTestTenant({
        name: 'Tenant 2',
        slug: 'tenant-2',
        status: 'ACTIVE',
      });

      // Criar usuário no tenant 2
      const user2 = await createTestUser({
        email: 'tenant2@audithistory.test',
        password: 'Tenant2Pass123',
        name: 'Tenant 2 User',
        tenantId: tenant2.id,
      });

      // Criar permissão AuditLog.read para tenant 2
      const auditLogReadPermission2 = await createTestPermission({
        tenantId: tenant2.id,
        entity: 'AuditLog',
        action: 'read',
      });

      // Criar role Admin para tenant 2
      const adminRole2 = await createTestRole({
        tenantId: tenant2.id,
        name: 'Admin',
        permissionIds: [auditLogReadPermission2.id],
      });

      // Associar role ao usuário
      await assignRoleToUser(user2.id, adminRole2.id);

      // Gerar token para tenant 2
      const token2 = generateToken(user2.id, tenant2.id);

      // Listar logs do tenant 1
      const response1 = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      // Listar logs do tenant 2
      const response2 = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${token2}`)
        .set('X-Tenant-Id', tenant2.id);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Verificar que os logs são diferentes (isolamento)
      const tenant1EntityIds = response1.body.data.map((log: any) => log.entityId);
      const tenant2EntityIds = response2.body.data.map((log: any) => log.entityId);

      // Não deve haver sobreposição de entityIds entre tenants
      const intersection = tenant1EntityIds.filter((id: string) =>
        tenant2EntityIds.includes(id)
      );
      expect(intersection.length).toBe(0);
    });
  });

  describe('Autorização', () => {
    it('deve retornar 403 se usuário não tiver permissão AuditLog.read', async () => {
      // Criar usuário sem permissão AuditLog.read
      const userWithoutPermission = await createTestUser({
        email: 'nopermission@audithistory.test',
        password: 'NoPermPass123',
        name: 'No Permission User',
        tenantId: tenant.id,
      });

      // Criar role sem permissão AuditLog.read
      const roleWithoutPermission = await createTestRole({
        tenantId: tenant.id,
        name: 'No Audit Log Permission',
        permissionIds: [], // Sem permissões
      });

      // Associar role ao usuário
      await assignRoleToUser(userWithoutPermission.id, roleWithoutPermission.id);

      // Gerar token
      const token = generateToken(userWithoutPermission.id, tenant.id);

      const response = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado');
    });
  });
});

