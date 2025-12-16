/**
 * Helpers para gerenciamento do banco de dados nos testes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Limpa todos os tenants do banco de dados
 * Útil para garantir um estado limpo entre testes
 */
export async function cleanDatabase() {
  await prisma.tenant.deleteMany({});
}

/**
 * Cria um tenant de teste com dados padrão
 */
export async function createTestTenant(data?: {
  id?: string;
  name?: string;
  slug?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
}) {
  return prisma.tenant.create({
    data: {
      id: data?.id,
      name: data?.name || 'Test Tenant',
      slug: data?.slug || 'test-tenant',
      status: data?.status || 'ACTIVE',
    },
  });
}

/**
 * Fecha a conexão com o banco de dados
 */
export async function closeDatabase() {
  await prisma.$disconnect();
}

export { prisma };

