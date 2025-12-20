/**
 * Testes E2E para permissões por campo
 * 
 * Valida que o sistema de permissões por campo funciona corretamente:
 * - Campos restritos não são retornados para usuários sem permissão
 * - Campos restritos são retornados para usuários com permissão
 * - Admin vê todos os campos
 * - Validação de campos em updates
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
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';

describe('ACL Field Permissions - E2E Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string };
  let userWithEntityPermission: { id: string };
  let adminToken: string;
  let entityPermissionToken: string;
  let userListPermission: { id: string };
  let userReadPermission: { id: string };
  let userReadEmailPermission: { id: string };
  let userUpdatePermission: { id: string };
  let userUpdateEmailPermission: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'ACL Field Permissions Test Tenant',
      slug: 'acl-field-permissions-test-tenant',
      status: 'ACTIVE',
    });
    tenant = { id: tenantObj.id, slug: tenantObj.slug };

    // Criar permissões
    userReadPermission = await createTestPermission({
      tenantId: tenant.id,
      entity: 'User',
      action: 'read',
    });

    userUpdatePermission = await createTestPermission({
      tenantId: tenant.id,
      entity: 'User',
      action: 'update',
    });

    userReadEmailPermission = await createTestPermission({
      tenantId: tenant.id,
      entity: 'User',
      action: 'read',
      field: 'email',
    });

    userUpdateEmailPermission = await createTestPermission({
      tenantId: tenant.id,
      entity: 'User',
      action: 'update',
      field: 'email',
    });

    userListPermission = await createTestPermission({
      tenantId: tenant.id,
      entity: 'User',
      action: 'list',
    });

    // Criar roles
    const adminRole = await createTestRole({
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Admin role',
      permissionIds: [],
    });

    // Nota: fieldPermissionRole não é mais usado nos testes E2E
    // pois permissões por campo não liberam endpoint (precisam de permissão de entidade)

    const entityPermissionRole = await createTestRole({
      tenantId: tenant.id,
      name: 'Entity Permission Role',
      description: 'Role with entity permission',
      permissionIds: [userListPermission.id, userReadPermission.id, userUpdatePermission.id],
    });

    // Criar usuários
    const adminUserObj = await createTestUser({
      email: 'admin@fieldpermissions.test',
      password: 'AdminPass123',
      name: 'Admin User',
      tenantId: tenant.id,
    });
    adminUser = { id: adminUserObj.id };
    await assignRoleToUser(adminUser.id, adminRole.id);
    adminToken = generateToken(adminUser.id, tenant.id);


    const entityPermissionUserObj = await createTestUser({
      email: 'entity@fieldpermissions.test',
      password: 'EntityPass123',
      name: 'Entity Permission User',
      tenantId: tenant.id,
    });
    userWithEntityPermission = { id: entityPermissionUserObj.id };
    await assignRoleToUser(userWithEntityPermission.id, entityPermissionRole.id);
    entityPermissionToken = generateToken(userWithEntityPermission.id, tenant.id);

  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('GET endpoints - Permissões de entidade vs campo', () => {
    it('Usuário com permissão de entidade (User.read) consegue acessar endpoint e ver todos os campos', async () => {
      // Criar usuário via admin
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'entityread@test.com',
          name: 'Entity Read User',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Usuário com User.read (permissão de entidade) deve conseguir acessar
      const readResponse = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${entityPermissionToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(readResponse.status).toBe(200);
      // Permissão de entidade cobre todos os campos
      expect(readResponse.body).toHaveProperty('email');
      expect(readResponse.body).toHaveProperty('name');
      expect(readResponse.body).toHaveProperty('id');
      expect(readResponse.body).toHaveProperty('tenantId');
      expect(readResponse.body).toHaveProperty('createdAt');
      expect(readResponse.body).toHaveProperty('updatedAt');
    });

    it('Usuário com apenas permissão por campo (User.read.email) recebe 403 (endpoint exige permissão de entidade)', async () => {
      // Criar role com apenas permissão por campo (sem permissão de entidade)
      const fieldOnlyRole = await createTestRole({
        tenantId: tenant.id,
        name: 'Field Only Read Role',
        description: 'Role with only field read permission',
        permissionIds: [userListPermission.id, userReadEmailPermission.id], // Apenas User.read.email, não User.read
      });

      const fieldOnlyUserObj = await createTestUser({
        email: 'fieldonlyread@fieldpermissions.test',
        password: 'FieldOnlyReadPass123',
        name: 'Field Only Read User',
        tenantId: tenant.id,
      });
      await assignRoleToUser(fieldOnlyUserObj.id, fieldOnlyRole.id);
      const fieldOnlyToken = generateToken(fieldOnlyUserObj.id, tenant.id);

      // Criar usuário via admin
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'toread@test.com',
          name: 'To Read User',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Usuário com apenas User.read.email não tem User.read, então recebe 403
      const readResponse = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${fieldOnlyToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(readResponse.status).toBe(403);
      expect(readResponse.body.error).toBe('Acesso negado');
    });

    it('Admin vê todos os campos (tem todas as permissões)', async () => {
      // Criar usuário via admin
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'adminview@test.com',
          name: 'Admin View User',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Admin deve ver todos os campos
      const readResponse = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body).toHaveProperty('email');
      expect(readResponse.body).toHaveProperty('name');
      expect(readResponse.body).toHaveProperty('status');
      expect(readResponse.body).toHaveProperty('id');
      expect(readResponse.body).toHaveProperty('tenantId');
    });

    it('Campos sempre permitidos são sempre retornados quando usuário tem permissão de entidade', async () => {
      // Criar usuário via admin
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'alwaysallowed@test.com',
          name: 'Always Allowed User',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Usuário com permissão de entidade deve ver campos sempre permitidos
      const readResponse = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${entityPermissionToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body).toHaveProperty('id');
      expect(readResponse.body).toHaveProperty('tenantId');
      expect(readResponse.body).toHaveProperty('createdAt');
      expect(readResponse.body).toHaveProperty('updatedAt');
    });
  });

  describe('PUT endpoints - Permissões de entidade vs campo', () => {
    it('Usuário com permissão de entidade (User.update) consegue atualizar qualquer campo', async () => {
      // Criar usuário via admin
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'entityupdate@test.com',
          name: 'Entity Update User',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Usuário com permissão de entidade (User.update) pode atualizar qualquer campo
      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${entityPermissionToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ name: 'Updated Name', email: 'updated@test.com' });

      expect(updateResponse.status).toBe(200);
    });

    it('Usuário com apenas permissão por campo (User.update.email) recebe 403 (endpoint exige permissão de entidade)', async () => {
      // Criar role com apenas permissão por campo (sem permissão de entidade)
      const fieldOnlyUpdateRole = await createTestRole({
        tenantId: tenant.id,
        name: 'Field Only Update Role',
        description: 'Role with only field update permission',
        permissionIds: [userListPermission.id, userUpdateEmailPermission.id], // Apenas User.update.email, não User.update
      });

      const fieldOnlyUpdateUserObj = await createTestUser({
        email: 'fieldonly@fieldpermissions.test',
        password: 'FieldOnlyPass123',
        name: 'Field Only Update User',
        tenantId: tenant.id,
      });
      await assignRoleToUser(fieldOnlyUpdateUserObj.id, fieldOnlyUpdateRole.id);
      const fieldOnlyUpdateToken = generateToken(fieldOnlyUpdateUserObj.id, tenant.id);

      // Criar usuário via admin
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'toupdate@test.com',
          name: 'To Update User',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Usuário com apenas User.update.email não tem User.update, então recebe 403
      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${fieldOnlyUpdateToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ email: 'newemail@test.com' });

      expect(updateResponse.status).toBe(403);
      expect(updateResponse.body.error).toBe('Acesso negado');
    });

    it('Usuário sem permissão de update recebe 403', async () => {
      // Criar role sem permissão de update
      const noUpdateRole = await createTestRole({
        tenantId: tenant.id,
        name: 'No Update Role',
        description: 'Role without update permission',
        permissionIds: [userListPermission.id, userReadPermission.id], // Apenas list e read
      });

      const noUpdateUserObj = await createTestUser({
        email: 'noupdate@fieldpermissions.test',
        password: 'NoUpdatePass123',
        name: 'No Update User',
        tenantId: tenant.id,
      });
      await assignRoleToUser(noUpdateUserObj.id, noUpdateRole.id);
      const noUpdateToken = generateToken(noUpdateUserObj.id, tenant.id);

      // Criar usuário via admin
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'toupdate@test.com',
          name: 'To Update',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Usuário sem permissão de update não pode atualizar (403 do middleware)
      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${noUpdateToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ email: 'newemail@test.com' });

      expect(updateResponse.status).toBe(403);
      expect(updateResponse.body.error).toBe('Acesso negado');
    });

    it('Admin pode atualizar todos os campos (tem todas as permissões)', async () => {
      // Criar usuário via admin
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          email: 'adminupdate@test.com',
          name: 'Admin Update User',
          password: 'TestPass123!',
        });
      const userId = createResponse.body.id;

      // Admin pode atualizar qualquer campo
      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          name: 'Admin Updated Name',
          email: 'adminupdated@test.com',
          status: 'INACTIVE',
        });

      expect(updateResponse.status).toBe(200);
    });
  });
});

