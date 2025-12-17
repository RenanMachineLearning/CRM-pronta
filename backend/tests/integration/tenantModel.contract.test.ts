/**
 * Testes de contrato do modelo Tenant
 * 
 * Valida garantias estruturais do modelo Tenant que protegem a base lógica do isolamento.
 */

import { PrismaClient } from '@prisma/client';
import { cleanDatabase, createTestTenant, closeDatabase } from '../helpers/db';
import { TenantService } from '../../src/services/tenantService';

const prisma = new PrismaClient();

describe('Tenant Model - Contract Tests', () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('Slug é único', () => {
    it('deve falhar ao tentar criar dois tenants com mesmo slug', async () => {
      const slug = 'unique-slug-test';

      // Criar primeiro tenant
      await createTestTenant({
        name: 'First Tenant',
        slug: slug,
        status: 'ACTIVE',
      });

      // Tentar criar segundo tenant com mesmo slug deve falhar
      await expect(
        prisma.tenant.create({
          data: {
            name: 'Second Tenant',
            slug: slug,
            status: 'ACTIVE',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Subdomain é único (quando presente)', () => {
    it('deve falhar ao tentar criar dois tenants com mesmo subdomain não-null', async () => {
      const subdomain = 'test-subdomain';

      // Criar primeiro tenant com subdomain
      const firstTenant = await createTestTenant({
        name: 'First Tenant',
        slug: 'first-tenant',
        status: 'ACTIVE',
      });

      // Atualizar primeiro tenant com subdomain
      await prisma.tenant.update({
        where: { id: firstTenant.id },
        data: { subdomain },
      });

      // Criar segundo tenant
      await createTestTenant({
        name: 'Second Tenant',
        slug: 'second-tenant',
        status: 'ACTIVE',
      });

      // Tentar criar terceiro tenant com mesmo subdomain deve falhar
      await expect(
        prisma.tenant.create({
          data: {
            name: 'Third Tenant',
            slug: 'third-tenant',
            status: 'ACTIVE',
            subdomain: subdomain, // Mesmo subdomain do primeiro
          },
        })
      ).rejects.toThrow();
    });

    it('deve permitir múltiplos tenants com subdomain null', async () => {
      await cleanDatabase();

      // Criar múltiplos tenants sem subdomain (null)
      const tenant1 = await createTestTenant({
        name: 'Tenant 1',
        slug: 'tenant-1',
        status: 'ACTIVE',
      });

      const tenant2 = await createTestTenant({
        name: 'Tenant 2',
        slug: 'tenant-2',
        status: 'ACTIVE',
      });

      expect(tenant1.subdomain).toBeNull();
      expect(tenant2.subdomain).toBeNull();
    });
  });

  describe('Status default é ACTIVE', () => {
    it('deve criar tenant com status ACTIVE quando não especificado', async () => {
      await cleanDatabase();

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Default Status Tenant',
          slug: 'default-status',
          // status não especificado
        },
      });

      expect(tenant.status).toBe('ACTIVE');
    });
  });

  describe('Tenant inativo não passa pela validação do TenantService', () => {
    it('TenantService.validateById retorna null para tenant SUSPENDED', async () => {
      await cleanDatabase();

      const suspended = await createTestTenant({
        name: 'Suspended Tenant',
        slug: 'suspended',
        status: 'SUSPENDED',
      });

      const result = await TenantService.validateById(suspended.id);
      expect(result).toBeNull();
    });

    it('TenantService.validateBySlug retorna null para tenant SUSPENDED', async () => {
      await cleanDatabase();

      const suspended = await createTestTenant({
        name: 'Suspended Tenant',
        slug: 'suspended',
        status: 'SUSPENDED',
      });

      const result = await TenantService.validateBySlug(suspended.slug);
      expect(result).toBeNull();
    });

    it('TenantService.validateById retorna null para tenant CANCELLED', async () => {
      await cleanDatabase();

      const cancelled = await createTestTenant({
        name: 'Cancelled Tenant',
        slug: 'cancelled',
        status: 'CANCELLED',
      });

      const result = await TenantService.validateById(cancelled.id);
      expect(result).toBeNull();
    });

    it('TenantService.validateBySlug retorna null para tenant CANCELLED', async () => {
      await cleanDatabase();

      const cancelled = await createTestTenant({
        name: 'Cancelled Tenant',
        slug: 'cancelled',
        status: 'CANCELLED',
      });

      const result = await TenantService.validateBySlug(cancelled.slug);
      expect(result).toBeNull();
    });
  });

  describe('TenantService.validateById e validateBySlug funcionam corretamente', () => {
    beforeEach(async () => {
      await cleanDatabase();
    });

    it('Tenant ativo retorna objeto Tenant', async () => {
      const active = await createTestTenant({
        name: 'Active Tenant',
        slug: 'active',
        status: 'ACTIVE',
      });

      const resultById = await TenantService.validateById(active.id);
      const resultBySlug = await TenantService.validateBySlug(active.slug);

      expect(resultById).not.toBeNull();
      expect(resultById?.id).toBe(active.id);
      expect(resultById?.status).toBe('ACTIVE');

      expect(resultBySlug).not.toBeNull();
      expect(resultBySlug?.id).toBe(active.id);
      expect(resultBySlug?.status).toBe('ACTIVE');
    });

    it('Tenant inativo retorna null', async () => {
      const suspended = await createTestTenant({
        name: 'Suspended Tenant',
        slug: 'suspended',
        status: 'SUSPENDED',
      });

      const resultById = await TenantService.validateById(suspended.id);
      const resultBySlug = await TenantService.validateBySlug(suspended.slug);

      expect(resultById).toBeNull();
      expect(resultBySlug).toBeNull();
    });

    it('Tenant inexistente retorna null', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const fakeSlug = 'inexistente';

      const resultById = await TenantService.validateById(fakeId);
      const resultBySlug = await TenantService.validateBySlug(fakeSlug);

      expect(resultById).toBeNull();
      expect(resultBySlug).toBeNull();
    });
  });
});

