/**
 * Testes de contrato para o modelo User
 * Valida garantias estruturais do modelo e constraints do banco de dados
 */

import { PrismaClient } from '@prisma/client';
import { cleanDatabase, createTestTenant, closeDatabase } from '../helpers/db';

const prisma = new PrismaClient();

describe('User Model - Contract Tests', () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('Email único por tenant', () => {
    it('deve falhar ao tentar criar dois usuários com mesmo email no mesmo tenant', async () => {
      const tenant = await createTestTenant({ name: 'Tenant A', slug: 'tenant-a', status: 'ACTIVE' });
      const email = 'test@example.com';

      // Criar primeiro usuário
      await prisma.user.create({
        data: {
          email,
          passwordHash: 'hashed_password',
          name: 'User 1',
          tenantId: tenant.id,
        },
      });

      // Tentar criar segundo usuário com mesmo email no mesmo tenant
      await expect(
        prisma.user.create({
          data: {
            email,
            passwordHash: 'hashed_password_2',
            name: 'User 2',
            tenantId: tenant.id,
          },
        })
      ).rejects.toThrow();
    });

    it('deve permitir mesmo email em tenants diferentes', async () => {
      const tenantA = await createTestTenant({ name: 'Tenant A', slug: 'tenant-a-2', status: 'ACTIVE' });
      const tenantB = await createTestTenant({ name: 'Tenant B', slug: 'tenant-b-2', status: 'ACTIVE' });
      const email = 'shared@example.com';

      // Criar usuário no Tenant A
      const userA = await prisma.user.create({
        data: {
          email,
          passwordHash: 'hashed_password_a',
          name: 'User A',
          tenantId: tenantA.id,
        },
      });

      // Criar usuário com mesmo email no Tenant B (deve funcionar)
      const userB = await prisma.user.create({
        data: {
          email,
          passwordHash: 'hashed_password_b',
          name: 'User B',
          tenantId: tenantB.id,
        },
      });

      expect(userA.email).toBe(email);
      expect(userB.email).toBe(email);
      expect(userA.tenantId).not.toBe(userB.tenantId);
    });
  });

  describe('tenantId obrigatório', () => {
    it('deve falhar ao tentar criar usuário sem tenantId', async () => {
      await expect(
        prisma.user.create({
          data: {
            email: 'test@example.com',
            passwordHash: 'hashed_password',
            name: 'User Without Tenant',
            // tenantId ausente
          } as any, // TypeScript não permite, mas testamos a constraint do banco
        })
      ).rejects.toThrow();
    });
  });

  describe('Status default é ACTIVE', () => {
    it('deve criar usuário com status ACTIVE quando não especificado', async () => {
      const tenant = await createTestTenant({ name: 'Default Status Tenant', slug: 'default-status', status: 'ACTIVE' });

      const user = await prisma.user.create({
        data: {
          email: 'default@example.com',
          passwordHash: 'hashed_password',
          name: 'Default Status User',
          tenantId: tenant.id,
          // status não especificado
        },
      });

      expect(user.status).toBe('ACTIVE');
    });
  });

  describe('Relacionamento com Tenant', () => {
    it('deve criar usuário vinculado a tenant existente', async () => {
      const tenant = await createTestTenant({ name: 'Valid Tenant', slug: 'valid-tenant', status: 'ACTIVE' });

      const user = await prisma.user.create({
        data: {
          email: 'valid@example.com',
          passwordHash: 'hashed_password',
          name: 'Valid User',
          tenantId: tenant.id,
        },
      });

      expect(user.tenantId).toBe(tenant.id);

      // Verificar relacionamento via Prisma
      const userWithTenant = await prisma.user.findUnique({
        where: { id: user.id },
        include: { tenant: true },
      });

      expect(userWithTenant?.tenant).toBeDefined();
      expect(userWithTenant?.tenant.id).toBe(tenant.id);
    });

    it('deve falhar ao tentar criar usuário com tenantId inexistente', async () => {
      const fakeTenantId = '00000000-0000-0000-0000-000000000000';

      await expect(
        prisma.user.create({
          data: {
            email: 'invalid@example.com',
            passwordHash: 'hashed_password',
            name: 'Invalid User',
            tenantId: fakeTenantId,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Cascade delete', () => {
    it('deve deletar usuários automaticamente quando tenant é deletado', async () => {
      const tenant = await createTestTenant({ name: 'Cascade Tenant', slug: 'cascade-tenant', status: 'ACTIVE' });

      const user = await prisma.user.create({
        data: {
          email: 'cascade@example.com',
          passwordHash: 'hashed_password',
          name: 'Cascade User',
          tenantId: tenant.id,
        },
      });

      // Verificar que usuário existe
      const userBefore = await prisma.user.findUnique({ where: { id: user.id } });
      expect(userBefore).toBeDefined();

      // Deletar tenant
      await prisma.tenant.delete({ where: { id: tenant.id } });

      // Verificar que usuário foi deletado automaticamente
      const userAfter = await prisma.user.findUnique({ where: { id: user.id } });
      expect(userAfter).toBeNull();
    });
  });

  describe('Campos obrigatórios', () => {
    let tenant: { id: string };

    beforeAll(async () => {
      tenant = await createTestTenant({ name: 'Required Fields Tenant', slug: 'required-fields', status: 'ACTIVE' });
    });

    it('deve falhar ao criar usuário sem email', async () => {
      await expect(
        prisma.user.create({
          data: {
            // email ausente
            passwordHash: 'hashed_password',
            name: 'User Without Email',
            tenantId: tenant.id,
          } as any,
        })
      ).rejects.toThrow();
    });

    it('deve falhar ao criar usuário sem passwordHash', async () => {
      await expect(
        prisma.user.create({
          data: {
            email: 'nopassword@example.com',
            // passwordHash ausente
            name: 'User Without Password',
            tenantId: tenant.id,
          } as any,
        })
      ).rejects.toThrow();
    });

    it('deve falhar ao criar usuário sem name', async () => {
      await expect(
        prisma.user.create({
          data: {
            email: 'noname@example.com',
            passwordHash: 'hashed_password',
            // name ausente
            tenantId: tenant.id,
          } as any,
        })
      ).rejects.toThrow();
    });
  });
});

