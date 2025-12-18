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
 * Cria um usuário de teste com dados padrão
 * 
 * @param data - Dados do usuário (email, password, name, tenantId, status)
 * @returns Usuário criado
 */
export async function createTestUser(data: {
  email: string;
  password: string; // Senha em texto plano (será hasheada)
  name: string;
  tenantId: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
}) {
  // Importar hashPassword dinamicamente para evitar problemas de inicialização
  const { hashPassword } = await import('../../src/utils/password');
  
  const passwordHash = await hashPassword(data.password);
  
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash: passwordHash,
      name: data.name,
      tenantId: data.tenantId,
      status: data.status || 'ACTIVE',
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

