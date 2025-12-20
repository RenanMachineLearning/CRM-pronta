/**
 * Testes E2E para roles padrão (Admin, Vendedor, Visualizador)
 * 
 * Valida que cada role tem as permissões corretas conforme especificação:
 * - Admin: acesso total (create, read, update, delete, list)
 * - Vendedor: pode criar e atualizar, mas não deletar
 * - Visualizador: apenas read e list
 */

import request from 'supertest';
import { app } from '../../src/index';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  assignRoleToUser,
  createStandardRoles,
  closeDatabase,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';

describe('ACL Roles - E2E Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string; email: string; password: string };
  let vendedorUser: { id: string; email: string; password: string };
  let visualizadorUser: { id: string; email: string; password: string };
  let adminToken: string;
  let vendedorToken: string;
  let visualizadorToken: string;
  let adminRole: { id: string };
  let vendedorRole: { id: string };
  let visualizadorRole: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'ACL Roles Test Tenant',
      slug: 'acl-roles-test-tenant',
      status: 'ACTIVE',
    });
    tenant = { id: tenantObj.id, slug: tenantObj.slug };

    // Criar roles padrão
    const roles = await createStandardRoles(tenant.id);
    adminRole = roles.admin;
    vendedorRole = roles.vendedor;
    visualizadorRole = roles.visualizador;

    // Criar usuário Admin
    const adminUserObj = await createTestUser({
      email: 'admin@aclroles.test',
      password: 'AdminPass123',
      name: 'Admin User',
      tenantId: tenant.id,
    });
    adminUser = { ...adminUserObj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser.id, adminRole.id);
    adminToken = generateToken(adminUser.id, tenant.id);

    // Criar usuário Vendedor
    const vendedorUserObj = await createTestUser({
      email: 'vendedor@aclroles.test',
      password: 'VendedorPass123',
      name: 'Vendedor User',
      tenantId: tenant.id,
    });
    vendedorUser = { ...vendedorUserObj, password: 'VendedorPass123' };
    await assignRoleToUser(vendedorUser.id, vendedorRole.id);
    vendedorToken = generateToken(vendedorUser.id, tenant.id);

    // Criar usuário Visualizador
    const visualizadorUserObj = await createTestUser({
      email: 'visualizador@aclroles.test',
      password: 'VisualizadorPass123',
      name: 'Visualizador User',
      tenantId: tenant.id,
    });
    visualizadorUser = { ...visualizadorUserObj, password: 'VisualizadorPass123' };
    await assignRoleToUser(visualizadorUser.id, visualizadorRole.id);
    visualizadorToken = generateToken(visualizadorUser.id, tenant.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('Role Admin', () => {
    it('Tem acesso total (create, read, update, delete, list) em todas as entidades', async () => {
      // Testar User CRUD
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'newuser@admin.test',
          name: 'New User',
          password: 'NewPass123!',
        });
      expect(createResponse.status).toBe(201);
      const createdUserId = createResponse.body.id;

      const readResponse = await request(app)
        .get(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(readResponse.status).toBe(200);

      const updateResponse = await request(app)
        .put(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ name: 'Updated Name' });
      expect(updateResponse.status).toBe(200);

      const deleteResponse = await request(app)
        .delete(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(deleteResponse.status).toBe(200);

      const listResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(listResponse.status).toBe(200);
    });

    it('Pode criar, atualizar e deletar usuários', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'adminuser@test.com',
          name: 'Admin Created User',
          password: 'AdminPass123!',
        });
      expect(createResponse.status).toBe(201);

      const userId = createResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ name: 'Updated by Admin' });
      expect(updateResponse.status).toBe(200);

      const deleteResponse = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(deleteResponse.status).toBe(200);
    });

    it('Pode criar, atualizar e deletar roles', async () => {
      const createResponse = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          name: 'Admin Created Role',
          description: 'Role created by admin',
        });
      expect(createResponse.status).toBe(201);

      const roleId = createResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ description: 'Updated by Admin' });
      expect(updateResponse.status).toBe(200);

      const deleteResponse = await request(app)
        .delete(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(deleteResponse.status).toBe(200);
    });

    it('Não recebe 403 em nenhuma operação', async () => {
      // Testar várias operações que deveriam funcionar
      const getUsersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(getUsersResponse.status).not.toBe(403);

      const getRolesResponse = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(getRolesResponse.status).not.toBe(403);

      const postUserResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ email: 'test@admin.com', name: 'Test', password: 'TestPass123!' });
      expect(postUserResponse.status).not.toBe(403);

      const postRoleResponse = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ name: 'Test Role', description: 'Test' });
      expect(postRoleResponse.status).not.toBe(403);
    });
  });

  describe('Role Vendedor', () => {
    it('Pode apenas ler e listar usuários e roles (read/list)', async () => {
      // Criar usuário via admin primeiro
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'vendedorview@test.com',
          name: 'Vendedor View User',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Vendedor pode listar usuários
      const listUsersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(listUsersResponse.status).toBe(200);
      expect(Array.isArray(listUsersResponse.body.data)).toBe(true);

      // Vendedor pode ler usuário específico
      const readUserResponse = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(readUserResponse.status).toBe(200);

      // Vendedor pode listar roles
      const listRolesResponse = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(listRolesResponse.status).toBe(200);
      expect(listRolesResponse.body.data).toBeDefined();

      // Vendedor pode ler role específica
      const readRoleResponse = await request(app)
        .get(`/api/roles/${adminRole.id}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(readRoleResponse.status).toBe(200);
    });

    it('Recebe 403 ao tentar criar, atualizar ou deletar usuários', async () => {
      // Criar usuário via admin primeiro
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'todelete@test.com',
          name: 'To Delete',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Vendedor não pode criar
      const createUserResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'vendedorcreate@test.com',
          name: 'Vendedor Create',
          password: 'TestPass123!',
        });
      expect(createUserResponse.status).toBe(403);

      // Vendedor não pode atualizar
      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ name: 'Updated by Vendedor' });
      expect(updateResponse.status).toBe(403);

      // Vendedor não pode deletar
      const deleteResponse = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(deleteResponse.status).toBe(403);
    });

    it('Recebe 403 ao tentar criar, atualizar ou deletar roles', async () => {
      // Criar role via admin primeiro
      const createResponse = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          name: 'Test Role For Vendedor',
          description: 'Test role',
        });
      const roleId = createResponse.body.id;

      // Vendedor não pode criar
      const createRoleResponse = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          name: 'Vendedor Created Role',
          description: 'Role created by vendedor',
        });
      expect(createRoleResponse.status).toBe(403);

      // Vendedor não pode atualizar
      const updateResponse = await request(app)
        .put(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ description: 'Updated by Vendedor' });
      expect(updateResponse.status).toBe(403);

      // Vendedor não pode deletar
      const deleteResponse = await request(app)
        .delete(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(deleteResponse.status).toBe(403);
    });
  });

  describe('Role Visualizador', () => {
    it('Pode apenas ler e listar (read, list)', async () => {
      // Criar um usuário via admin primeiro
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'toview@test.com',
          name: 'To View',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Visualizador pode listar
      const listResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${visualizadorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(listResponse.status).toBe(200);

      // Visualizador pode ler
      const readResponse = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${visualizadorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(readResponse.status).toBe(200);
    });

    it('Recebe 403 em create, update, delete', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${visualizadorToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'visualizadorcreate@test.com',
          name: 'Should Fail',
          password: 'TestPass123!',
        });
      expect(createResponse.status).toBe(403);

      // Criar usuário via admin para testar update e delete
      const adminCreateResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'toupdate@test.com',
          name: 'To Update',
          password: 'TestPass123!',
        });
      const userId = adminCreateResponse.body.id;

      // Update
      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${visualizadorToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ name: 'Updated' });
      expect(updateResponse.status).toBe(403);

      // Delete
      const deleteResponse = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${visualizadorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(deleteResponse.status).toBe(403);
    });

    it('Pode listar usuários e roles', async () => {
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${visualizadorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(usersResponse.status).toBe(200);
      expect(Array.isArray(usersResponse.body.data)).toBe(true);

      const rolesResponse = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${visualizadorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(rolesResponse.status).toBe(200);
      expect(rolesResponse.body.data).toBeDefined();
      expect(Array.isArray(rolesResponse.body.data)).toBe(true);
    });

    it('Pode ler usuário e role específicos', async () => {
      // Criar usuário via admin
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'toread@test.com',
          name: 'To Read',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Visualizador pode ler
      const readUserResponse = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${visualizadorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(readUserResponse.status).toBe(200);

      // Visualizador pode ler role
      const readRoleResponse = await request(app)
        .get(`/api/roles/${adminRole.id}`)
        .set('Authorization', `Bearer ${visualizadorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(readRoleResponse.status).toBe(200);
    });

    it('Não pode criar, atualizar ou deletar', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${visualizadorToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'shouldfail@test.com',
          name: 'Should Fail',
          password: 'TestPass123!',
        });
      expect(createResponse.status).toBe(403);

      // Criar via admin para testar update/delete
      const adminCreateResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'testupdate@test.com',
          name: 'Test',
          password: 'TestPass123!',
        });
      const userId = adminCreateResponse.body.id;

      // Update
      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${visualizadorToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ name: 'Updated' });
      expect(updateResponse.status).toBe(403);

      // Delete
      const deleteResponse = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${visualizadorToken}`)
        .set('X-Tenant-Id', tenant.id);
      expect(deleteResponse.status).toBe(403);
    });
  });
});

