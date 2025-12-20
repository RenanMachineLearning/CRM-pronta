/**
 * Testes unitários para verificação de permissões ACL
 * 
 * Testa as funções checkPermission e getUserPermissions isoladamente.
 * Usa mocks do Prisma para testes rápidos sem banco de dados.
 */

import { checkPermission, getUserPermissions } from '../../src/utils/permissions';
import { cleanDatabase, createTestTenant, createTestUser, createTestRole, createTestPermission, assignRoleToUser, closeDatabase } from '../helpers/db';

// Para testes unitários, vamos usar banco de dados real mas isolado
// Alternativa seria mockar Prisma, mas isso seria mais complexo e menos confiável

describe('Permissions Utils', () => {
  let tenant: { id: string };
  let adminUser: { id: string };
  let regularUser: { id: string };
  let adminRole: { id: string };
  let regularRole: { id: string };
  let userReadPermission: { id: string };
  let userCreatePermission: { id: string };
  let userFieldPermission: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Permissions Test Tenant',
      slug: 'permissions-test-tenant',
    });
    tenant = { id: tenantObj.id };

    // Criar permissões
    userReadPermission = await createTestPermission({
      tenantId: tenant.id,
      entity: 'User',
      action: 'read',
    });

    userCreatePermission = await createTestPermission({
      tenantId: tenant.id,
      entity: 'User',
      action: 'create',
    });

    userFieldPermission = await createTestPermission({
      tenantId: tenant.id,
      entity: 'User',
      action: 'read',
      field: 'email',
    });

    // Criar role Admin
    adminRole = await createTestRole({
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Admin role',
      permissionIds: [], // Admin não precisa de permissões explícitas
    });

    // Criar role Regular com permissões específicas
    regularRole = await createTestRole({
      tenantId: tenant.id,
      name: 'Regular',
      description: 'Regular role',
      permissionIds: [userReadPermission.id, userCreatePermission.id, userFieldPermission.id],
    });

    // Criar usuário Admin
    const adminUserObj = await createTestUser({
      email: 'admin@permissions.test',
      password: 'AdminPass123',
      name: 'Admin User',
      tenantId: tenant.id,
    });
    adminUser = { id: adminUserObj.id };
    await assignRoleToUser(adminUser.id, adminRole.id);

    // Criar usuário Regular
    const regularUserObj = await createTestUser({
      email: 'regular@permissions.test',
      password: 'RegularPass123',
      name: 'Regular User',
      tenantId: tenant.id,
    });
    regularUser = { id: regularUserObj.id };
    await assignRoleToUser(regularUser.id, regularRole.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('checkPermission', () => {
    it('Admin tem todas as permissões (retorna true para qualquer entity/action)', async () => {
      const hasPermission = await checkPermission(adminUser.id, tenant.id, 'User', 'create');
      expect(hasPermission).toBe(true);

      const hasPermission2 = await checkPermission(adminUser.id, tenant.id, 'User', 'delete');
      expect(hasPermission2).toBe(true);

      const hasPermission3 = await checkPermission(adminUser.id, tenant.id, 'Role', 'update');
      expect(hasPermission3).toBe(true);
    });

    it('Usuário com role específica tem permissão quando role tem permissão associada', async () => {
      const hasReadPermission = await checkPermission(regularUser.id, tenant.id, 'User', 'read');
      expect(hasReadPermission).toBe(true);

      const hasCreatePermission = await checkPermission(regularUser.id, tenant.id, 'User', 'create');
      expect(hasCreatePermission).toBe(true);
    });

    it('Usuário sem permissão retorna false', async () => {
      const hasDeletePermission = await checkPermission(regularUser.id, tenant.id, 'User', 'delete');
      expect(hasDeletePermission).toBe(false);

      const hasUpdatePermission = await checkPermission(regularUser.id, tenant.id, 'User', 'update');
      expect(hasUpdatePermission).toBe(false);
    });

    it('Permissão de campo específico funciona (entity.action.field)', async () => {
      const hasFieldPermission = await checkPermission(regularUser.id, tenant.id, 'User', 'read', 'email');
      expect(hasFieldPermission).toBe(true);
    });

    it('Permissão de entidade cobre campo quando não há permissão específica', async () => {
      // Regular user tem User.read, então deve ter acesso a qualquer campo em read
      const hasFieldPermission = await checkPermission(regularUser.id, tenant.id, 'User', 'read', 'name');
      expect(hasFieldPermission).toBe(true);
    });

    it('Usuário de outro tenant não tem permissão (isolamento)', async () => {
      // Criar outro tenant
      const otherTenant = await createTestTenant({
        name: 'Other Tenant',
        slug: 'other-tenant',
      });

      const hasPermission = await checkPermission(adminUser.id, otherTenant.id, 'User', 'create');
      expect(hasPermission).toBe(false);
    });

    it('Usuário inexistente retorna false', async () => {
      const hasPermission = await checkPermission('non-existent-user-id', tenant.id, 'User', 'read');
      expect(hasPermission).toBe(false);
    });

    it('Role inativa não concede permissões', async () => {
      // Criar role inativa
      const inactiveRole = await createTestRole({
        tenantId: tenant.id,
        name: 'Inactive Role',
        description: 'Inactive role',
        permissionIds: [userReadPermission.id],
      });

      // Marcar role como inativa
      const { prisma } = await import('../helpers/db');
      await prisma.role.update({
        where: { id: inactiveRole.id },
        data: { isActive: false },
      });

      // Criar usuário com role inativa
      const userWithInactiveRole = await createTestUser({
        email: 'inactive@permissions.test',
        password: 'InactivePass123',
        name: 'Inactive User',
        tenantId: tenant.id,
      });
      await assignRoleToUser(userWithInactiveRole.id, inactiveRole.id);

      // Usuário não deve ter permissão (role está inativa)
      const hasPermission = await checkPermission(userWithInactiveRole.id, tenant.id, 'User', 'read');
      expect(hasPermission).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('Retorna todas as permissões do usuário', async () => {
      const permissions = await getUserPermissions(regularUser.id, tenant.id);
      
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some(p => p.entity === 'User' && p.action === 'read')).toBe(true);
      expect(permissions.some(p => p.entity === 'User' && p.action === 'create')).toBe(true);
      expect(permissions.some(p => p.entity === 'User' && p.action === 'read' && p.field === 'email')).toBe(true);
    });

    it('Admin retorna array vazio por design; frontend trata Admin como bypass total de permissões (decisão arquitetural)', async () => {
      const permissions = await getUserPermissions(adminUser.id, tenant.id);
      
      expect(permissions).toEqual([]);
    });

    it('Remove duplicatas de permissões', async () => {
      // Criar role adicional com permissões duplicadas
      const duplicateRole = await createTestRole({
        tenantId: tenant.id,
        name: 'Duplicate Role',
        description: 'Role with duplicate permissions',
        permissionIds: [userReadPermission.id, userCreatePermission.id],
      });

      // Criar usuário com duas roles que têm permissões duplicadas
      const userWithDuplicates = await createTestUser({
        email: 'duplicate@permissions.test',
        password: 'DuplicatePass123',
        name: 'Duplicate User',
        tenantId: tenant.id,
      });
      await assignRoleToUser(userWithDuplicates.id, regularRole.id);
      await assignRoleToUser(userWithDuplicates.id, duplicateRole.id);

      const permissions = await getUserPermissions(userWithDuplicates.id, tenant.id);
      
      // Verificar que não há duplicatas
      const permissionKeys = permissions.map(p => `${p.entity}.${p.action}${p.field ? `.${p.field}` : ''}`);
      const uniqueKeys = new Set(permissionKeys);
      expect(permissionKeys.length).toBe(uniqueKeys.size);
    });

    it('Retorna array vazio para usuário de outro tenant', async () => {
      // Criar outro tenant
      const otherTenant = await createTestTenant({
        name: 'Other Tenant 2',
        slug: 'other-tenant-2',
      });

      const permissions = await getUserPermissions(adminUser.id, otherTenant.id);
      expect(permissions).toEqual([]);
    });

    it('Retorna array vazio para usuário inexistente', async () => {
      const permissions = await getUserPermissions('non-existent-user-id', tenant.id);
      expect(permissions).toEqual([]);
    });
  });
});

