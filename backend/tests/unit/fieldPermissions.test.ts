/**
 * Testes unitários para filtro de campos por permissão
 * 
 * Testa as funções filterFieldsByPermission e validateFieldPermissionsForUpdate isoladamente.
 */

import { filterFieldsByPermission, validateFieldPermissionsForUpdate } from '../../src/utils/fieldPermissions';
import { cleanDatabase, createTestTenant, createTestUser, createTestRole, createTestPermission, assignRoleToUser, closeDatabase } from '../helpers/db';

describe('Field Permissions Utils', () => {
  let tenant: { id: string };
  let adminUser: { id: string };
  let regularUser: { id: string };
  let userWithoutPermission: { id: string };
  let adminRole: { id: string };
  let regularRole: { id: string };
  let noPermissionRole: { id: string };
  let userReadPermission: { id: string };
  let userUpdatePermission: { id: string };
  let userReadEmailPermission: { id: string };
  let userUpdateEmailPermission: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Field Permissions Test Tenant',
      slug: 'field-permissions-test-tenant',
    });
    tenant = { id: tenantObj.id };

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

    // Criar role Admin
    adminRole = await createTestRole({
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Admin role',
      permissionIds: [],
    });

    // Criar role Regular com permissões específicas
    regularRole = await createTestRole({
      tenantId: tenant.id,
      name: 'Regular',
      description: 'Regular role',
      permissionIds: [userReadPermission.id, userReadEmailPermission.id, userUpdateEmailPermission.id],
    });

    // Criar role sem permissões
    noPermissionRole = await createTestRole({
      tenantId: tenant.id,
      name: 'No Permission',
      description: 'Role without permissions',
      permissionIds: [],
    });

    // Criar usuário Admin
    const adminUserObj = await createTestUser({
      email: 'admin@fieldpermissions.test',
      password: 'AdminPass123',
      name: 'Admin User',
      tenantId: tenant.id,
    });
    adminUser = { id: adminUserObj.id };
    await assignRoleToUser(adminUser.id, adminRole.id);

    // Criar usuário Regular
    const regularUserObj = await createTestUser({
      email: 'regular@fieldpermissions.test',
      password: 'RegularPass123',
      name: 'Regular User',
      tenantId: tenant.id,
    });
    regularUser = { id: regularUserObj.id };
    await assignRoleToUser(regularUser.id, regularRole.id);

    // Criar usuário sem permissões
    const userWithoutPermissionObj = await createTestUser({
      email: 'noperm@fieldpermissions.test',
      password: 'NoPermPass123',
      name: 'No Permission User',
      tenantId: tenant.id,
    });
    userWithoutPermission = { id: userWithoutPermissionObj.id };
    await assignRoleToUser(userWithoutPermission.id, noPermissionRole.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('filterFieldsByPermission', () => {
    it('Admin vê todos os campos (não filtra nada)', async () => {
      const data = {
        id: 'user-123',
        tenantId: tenant.id,
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const filtered = await filterFieldsByPermission(data, adminUser.id, tenant.id, 'User', 'read');
      
      expect(filtered).toEqual(data);
      expect(filtered).toHaveProperty('email');
      expect(filtered).toHaveProperty('name');
      expect(filtered).toHaveProperty('passwordHash');
    });

    it('Campos sempre permitidos (id, tenantId, createdAt, updatedAt) são mantidos', async () => {
      const data = {
        id: 'user-123',
        tenantId: tenant.id,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const filtered = await filterFieldsByPermission(data, userWithoutPermission.id, tenant.id, 'User', 'read');
      
      expect(filtered).toHaveProperty('id');
      expect(filtered).toHaveProperty('tenantId');
      expect(filtered).toHaveProperty('createdAt');
      expect(filtered).toHaveProperty('updatedAt');
      expect(filtered).not.toHaveProperty('email');
      expect(filtered).not.toHaveProperty('name');
    });

    it('Campo com permissão específica é mantido', async () => {
      const data = {
        id: 'user-123',
        tenantId: tenant.id,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const filtered = await filterFieldsByPermission(data, regularUser.id, tenant.id, 'User', 'read');
      
      expect(filtered).toHaveProperty('email'); // Tem permissão específica para email
      expect(filtered).toHaveProperty('name'); // Tem permissão de entidade (User.read)
    });

    it('Campo sem permissão é removido', async () => {
      const data = {
        id: 'user-123',
        tenantId: tenant.id,
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const filtered = await filterFieldsByPermission(data, userWithoutPermission.id, tenant.id, 'User', 'read');
      
      expect(filtered).not.toHaveProperty('email');
      expect(filtered).not.toHaveProperty('name');
      expect(filtered).not.toHaveProperty('passwordHash');
    });

    it('Permissão de entidade cobre todos os campos', async () => {
      const data = {
        id: 'user-123',
        tenantId: tenant.id,
        email: 'test@example.com',
        name: 'Test User',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Regular user tem User.read (permissão de entidade)
      const filtered = await filterFieldsByPermission(data, regularUser.id, tenant.id, 'User', 'read');
      
      expect(filtered).toHaveProperty('email');
      expect(filtered).toHaveProperty('name');
      expect(filtered).toHaveProperty('status');
    });

    it('Funciona com array de objetos', async () => {
      const data = [
        {
          id: 'user-1',
          tenantId: tenant.id,
          email: 'user1@example.com',
          name: 'User 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user-2',
          tenantId: tenant.id,
          email: 'user2@example.com',
          name: 'User 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const filtered = await filterFieldsByPermission(data, regularUser.id, tenant.id, 'User', 'read');
      
      expect(Array.isArray(filtered)).toBe(true);
      const filteredArray = filtered as typeof data;
      expect(filteredArray.length).toBe(2);
      expect(filteredArray[0]).toHaveProperty('email');
      expect(filteredArray[1]).toHaveProperty('email');
    });

    it('Funciona com objeto único', async () => {
      const data = {
        id: 'user-123',
        tenantId: tenant.id,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const filtered = await filterFieldsByPermission(data, regularUser.id, tenant.id, 'User', 'read');
      
      expect(typeof filtered).toBe('object');
      expect(Array.isArray(filtered)).toBe(false);
      expect(filtered).toHaveProperty('email');
    });
  });

  describe('validateFieldPermissionsForUpdate', () => {
    it('Admin pode atualizar todos os campos', async () => {
      const fields = {
        email: 'newemail@example.com',
        name: 'New Name',
        status: 'INACTIVE',
      };

      const validation = await validateFieldPermissionsForUpdate(fields, adminUser.id, tenant.id, 'User');
      
      expect(validation.allowed).toBe(true);
      expect(validation.forbiddenFields).toEqual([]);
    });

    it('Campo com permissão específica é permitido', async () => {
      const fields = {
        email: 'newemail@example.com',
      };

      const validation = await validateFieldPermissionsForUpdate(fields, regularUser.id, tenant.id, 'User');
      
      expect(validation.allowed).toBe(true);
      expect(validation.forbiddenFields).toEqual([]);
    });

    it('Campo sem permissão é proibido', async () => {
      const fields = {
        email: 'newemail@example.com',
        name: 'New Name',
      };

      const validation = await validateFieldPermissionsForUpdate(fields, userWithoutPermission.id, tenant.id, 'User');
      
      expect(validation.allowed).toBe(false);
      expect(validation.forbiddenFields).toContain('email');
      expect(validation.forbiddenFields).toContain('name');
    });

    it('Permissão de entidade cobre todos os campos', async () => {
      // Criar role com permissão de entidade (User.update)
      const entityUpdateRole = await createTestRole({
        tenantId: tenant.id,
        name: 'Entity Update Role',
        description: 'Role with entity update permission',
        permissionIds: [userUpdatePermission.id],
      });

      const userWithEntityPermission = await createTestUser({
        email: 'entity@fieldpermissions.test',
        password: 'EntityPass123',
        name: 'Entity User',
        tenantId: tenant.id,
      });
      await assignRoleToUser(userWithEntityPermission.id, entityUpdateRole.id);

      const fields = {
        email: 'newemail@example.com',
        name: 'New Name',
        status: 'INACTIVE',
      };

      const validation = await validateFieldPermissionsForUpdate(fields, userWithEntityPermission.id, tenant.id, 'User');
      
      expect(validation.allowed).toBe(true);
      expect(validation.forbiddenFields).toEqual([]);
    });

    it('Campos sempre permitidos são permitidos', async () => {
      const fields = {
        id: 'new-id', // Campo sempre permitido (mas não deveria estar em update)
        tenantId: tenant.id, // Campo sempre permitido
        createdAt: new Date(), // Campo sempre permitido
        updatedAt: new Date(), // Campo sempre permitido
      };

      const validation = await validateFieldPermissionsForUpdate(fields, userWithoutPermission.id, tenant.id, 'User');
      
      expect(validation.allowed).toBe(true);
      expect(validation.forbiddenFields).toEqual([]);
    });

    it('Retorna lista de campos proibidos', async () => {
      const fields = {
        email: 'newemail@example.com',
        name: 'New Name',
        status: 'INACTIVE',
      };

      const validation = await validateFieldPermissionsForUpdate(fields, userWithoutPermission.id, tenant.id, 'User');
      
      expect(validation.allowed).toBe(false);
      expect(validation.forbiddenFields.length).toBeGreaterThan(0);
      expect(Array.isArray(validation.forbiddenFields)).toBe(true);
    });
  });
});

