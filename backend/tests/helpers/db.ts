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
 * Cria uma role de teste
 * 
 * @param tenantId - ID do tenant
 * @param name - Nome da role
 * @param description - Descrição opcional
 * @param permissionIds - IDs de permissões para associar (opcional)
 * @returns Role criada
 */
export async function createTestRole(data: {
  tenantId: string;
  name: string;
  description?: string;
  permissionIds?: string[];
}) {
  const role = await prisma.role.create({
    data: {
      name: data.name,
      description: data.description || null,
      tenantId: data.tenantId,
      isActive: true,
    },
  });

  // Associar permissões se fornecidas
  if (data.permissionIds && data.permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: data.permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }

  return role;
}

/**
 * Cria uma permissão de teste
 * 
 * @param tenantId - ID do tenant
 * @param entity - Nome da entidade
 * @param action - Ação (create, read, update, delete, list)
 * @param field - Campo opcional para permissões por campo
 * @returns Permission criada
 */
export async function createTestPermission(data: {
  tenantId: string;
  entity: string;
  action: string;
  field?: string | null;
}) {
  return prisma.permission.create({
    data: {
      entity: data.entity,
      action: data.action,
      field: data.field || null,
      tenantId: data.tenantId,
    },
  });
}

/**
 * Associa uma role a um usuário
 * 
 * @param userId - ID do usuário
 * @param roleId - ID da role
 */
export async function assignRoleToUser(userId: string, roleId: string) {
  await prisma.userRole.create({
    data: {
      userId,
      roleId,
    },
  });
}

/**
 * Busca logs de auditoria de um tenant
 * 
 * @param tenantId - ID do tenant
 * @param filters - Filtros opcionais (entityType, entityId, action, userId)
 * @returns Array de logs de auditoria
 */
export async function getAuditLogs(
  tenantId: string,
  filters?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
  }
) {
  const where: any = { tenantId };

  if (filters?.entityType) {
    where.entityType = filters.entityType;
  }
  if (filters?.entityId) {
    where.entityId = filters.entityId;
  }
  if (filters?.action) {
    where.action = filters.action;
  }
  if (filters?.userId) {
    where.userId = filters.userId;
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: {
      timestamp: 'desc',
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

