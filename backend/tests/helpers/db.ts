/**
 * Helpers para gerenciamento do banco de dados nos testes
 */

import { PrismaClient, Prisma } from '@prisma/client';

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
  // Verificar se permissão já existe (evitar duplicatas)
  const existing = await prisma.permission.findFirst({
    where: {
      tenantId: data.tenantId,
      entity: data.entity,
      action: data.action,
      field: data.field || null,
    },
  });

  if (existing) {
    return existing;
  }

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
 * Aceita duas assinaturas:
 * 1. getAuditLogs(tenantId, filters?) - nova assinatura
 * 2. getAuditLogs(entityId, tenantId) - assinatura legada (para compatibilidade)
 * 
 * @param tenantIdOrEntityId - tenantId (nova) OU entityId (legada)
 * @param filtersOrTenantId - filters (nova) OU tenantId (legada)
 * @returns Array de logs de auditoria
 */
export async function getAuditLogs(
  tenantIdOrEntityId: string,
  filtersOrTenantId?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
  } | string
) {
  let tenantId: string;
  let filters: {
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
  } = {};

  // Detectar assinatura: se o segundo arg é string, é a assinatura legada
  if (typeof filtersOrTenantId === 'string') {
    // Assinatura legada: getAuditLogs(entityId, tenantId)
    tenantId = filtersOrTenantId;
    filters = { entityId: tenantIdOrEntityId };
  } else {
    // Nova assinatura: getAuditLogs(tenantId, filters?)
    tenantId = tenantIdOrEntityId;
    filters = filtersOrTenantId || {};
  }

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
 * Cria roles padrão (Admin, Vendedor, Visualizador) com permissões conforme seed
 * 
 * @param tenantId - ID do tenant
 * @returns Objeto com as 3 roles criadas
 */
export async function createStandardRoles(tenantId: string) {
  // Criar todas as permissões padrão primeiro
  const ENTITIES = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task', 'Note', 'User', 'Role', 'AuditLog'];
  const ACTIONS = ['create', 'read', 'update', 'delete', 'list'];
  const FIELD_PERMISSIONS = [
    { entity: 'Opportunity', action: 'read', field: 'value' },
    { entity: 'Opportunity', action: 'update', field: 'value' },
  ];

  const permissions: any[] = [];

  // Criar permissões por entidade e ação
  for (const entity of ENTITIES) {
    for (const action of ACTIONS) {
      const existing = await prisma.permission.findFirst({
        where: { tenantId, entity, action, field: null },
      });
      if (!existing) {
        const perm = await prisma.permission.create({
          data: { tenantId, entity, action, field: null },
        });
        permissions.push(perm);
      } else {
        permissions.push(existing);
      }
    }
  }

  // Criar permissões por campo
  for (const fieldPerm of FIELD_PERMISSIONS) {
    const existing = await prisma.permission.findFirst({
      where: {
        tenantId,
        entity: fieldPerm.entity,
        action: fieldPerm.action,
        field: fieldPerm.field,
      },
    });
    if (!existing) {
      const perm = await prisma.permission.create({
        data: {
          tenantId,
          entity: fieldPerm.entity,
          action: fieldPerm.action,
          field: fieldPerm.field,
        },
      });
      permissions.push(perm);
    } else {
      permissions.push(existing);
    }
  }

  // Helper para encontrar permissão
  const findPermission = (entity: string, action: string, field: string | null = null) => {
    return permissions.find(
      (p) => p.entity === entity && p.action === action && p.field === field
    );
  };

  // Criar roles
  const admin = await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: 'Admin' } },
    update: {},
    create: { name: 'Admin', tenantId, description: 'Administrador com acesso total', isActive: true },
  });

  const vendedor = await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: 'Vendedor' } },
    update: {},
    create: { name: 'Vendedor', tenantId, description: 'Pode criar/editar contatos, leads e oportunidades', isActive: true },
  });

  const visualizador = await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: 'Visualizador' } },
    update: {},
    create: { name: 'Visualizador', tenantId, description: 'Apenas leitura', isActive: true },
  });

  // Admin: todas as permissões
  const adminPermissions = permissions.map((p) => ({
    roleId: admin.id,
    permissionId: p.id,
  }));
  await prisma.rolePermission.createMany({
    data: adminPermissions,
    skipDuplicates: true,
  });

  // Vendedor: permissões específicas
  const vendedorPermissions: { roleId: string; permissionId: string }[] = [];
  const entitiesWithCRUD = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task', 'Note'];
  for (const entity of entitiesWithCRUD) {
    const create = findPermission(entity, 'create');
    const read = findPermission(entity, 'read');
    const update = findPermission(entity, 'update');
    const list = findPermission(entity, 'list');
    if (create) vendedorPermissions.push({ roleId: vendedor.id, permissionId: create.id });
    if (read) vendedorPermissions.push({ roleId: vendedor.id, permissionId: read.id });
    if (update) vendedorPermissions.push({ roleId: vendedor.id, permissionId: update.id });
    if (list) vendedorPermissions.push({ roleId: vendedor.id, permissionId: list.id });
  }
  const oppValueRead = findPermission('Opportunity', 'read', 'value');
  const oppValueUpdate = findPermission('Opportunity', 'update', 'value');
  if (oppValueRead) vendedorPermissions.push({ roleId: vendedor.id, permissionId: oppValueRead.id });
  if (oppValueUpdate) vendedorPermissions.push({ roleId: vendedor.id, permissionId: oppValueUpdate.id });
  for (const entity of ['User', 'Role']) {
    const read = findPermission(entity, 'read');
    const list = findPermission(entity, 'list');
    if (read) vendedorPermissions.push({ roleId: vendedor.id, permissionId: read.id });
    if (list) vendedorPermissions.push({ roleId: vendedor.id, permissionId: list.id });
  }
  await prisma.rolePermission.createMany({
    data: vendedorPermissions,
    skipDuplicates: true,
  });

  // Visualizador: apenas read e list
  const visualizadorPermissions: { roleId: string; permissionId: string }[] = [];
  for (const entity of ENTITIES) {
    const read = findPermission(entity, 'read');
    const list = findPermission(entity, 'list');
    if (read) visualizadorPermissions.push({ roleId: visualizador.id, permissionId: read.id });
    if (list) visualizadorPermissions.push({ roleId: visualizador.id, permissionId: list.id });
  }
  const oppValueReadForViewer = findPermission('Opportunity', 'read', 'value');
  if (oppValueReadForViewer) {
    visualizadorPermissions.push({ roleId: visualizador.id, permissionId: oppValueReadForViewer.id });
  }
  await prisma.rolePermission.createMany({
    data: visualizadorPermissions,
    skipDuplicates: true,
  });

  return { admin, vendedor, visualizador, user: vendedor };
}

/**
 * Aguarda até que um log de auditoria seja criado (polling)
 * 
 * Útil para testes E2E onde logAudit é assíncrono e não bloqueia.
 * Faz polling a cada 50ms até encontrar o log ou atingir timeout.
 * 
 * Aceita três assinaturas:
 * 1. waitForAuditLog({ tenantId, entityType, entityId, action }) - objeto único
 * 2. waitForAuditLog(tenantId, { entityType, entityId, action }, timeoutMs) - parâmetros separados
 * 3. waitForAuditLog(entityId, action, tenantId) - assinatura legada
 * 
 * @param filtersOrTenantIdOrEntityId - Filtros completos OU tenantId OU entityId
 * @param filtersOrTimeoutOrAction - Filtros OU timeout OU action
 * @param timeoutMsOrTenantId - Timeout OU tenantId
 * @returns Promise com o log encontrado ou undefined se timeout
 */
export async function waitForAuditLog(
  filtersOrTenantIdOrEntityId: string | {
    tenantId: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
  },
  filtersOrTimeoutOrAction?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
  } | number | string,
  timeoutMsOrTenantId: number | string = 2000
): Promise<{
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: any;
  timestamp: Date;
} | undefined> {
  let tenantId: string;
  let filters: {
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
  };
  let timeout: number;

  // Detectar qual assinatura está sendo usada
  if (typeof filtersOrTenantIdOrEntityId === 'object') {
    // Assinatura 1: objeto único com tudo
    tenantId = filtersOrTenantIdOrEntityId.tenantId;
    filters = {
      entityType: filtersOrTenantIdOrEntityId.entityType,
      entityId: filtersOrTenantIdOrEntityId.entityId,
      action: filtersOrTenantIdOrEntityId.action,
      userId: filtersOrTenantIdOrEntityId.userId,
    };
    timeout = typeof filtersOrTimeoutOrAction === 'number' ? filtersOrTimeoutOrAction : 2000;
  } else if (typeof filtersOrTimeoutOrAction === 'string' && typeof timeoutMsOrTenantId === 'string') {
    // Assinatura 3 legada: waitForAuditLog(entityId, action, tenantId)
    tenantId = timeoutMsOrTenantId;
    filters = {
      entityId: filtersOrTenantIdOrEntityId,
      action: filtersOrTimeoutOrAction,
    };
    timeout = 2000;
  } else {
    // Assinatura 2: parâmetros separados
    tenantId = filtersOrTenantIdOrEntityId;
    filters = typeof filtersOrTimeoutOrAction === 'object' ? filtersOrTimeoutOrAction : {};
    timeout = typeof timeoutMsOrTenantId === 'number' ? timeoutMsOrTenantId : 2000;
  }

  const startTime = Date.now();
  const pollInterval = 50; // Poll a cada 50ms

  while (Date.now() - startTime < timeout) {
    const logs = await getAuditLogs(tenantId, filters);
    if (logs.length > 0) {
      return logs[0];
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return undefined;
}

/**
 * Cria uma entidade de teste
 * 
 * @param tenantId - ID do tenant
 * @param name - Nome técnico da entidade
 * @param label - Nome amigável
 * @param isSystem - Se é entidade do sistema (default: false)
 * @returns Entidade criada
 */
export async function createTestEntity(data: {
  tenantId: string;
  name: string;
  label: string;
  isSystem?: boolean;
}) {
  return prisma.entity.create({
    data: {
      name: data.name,
      label: data.label,
      tenantId: data.tenantId,
      isSystem: data.isSystem || false,
    },
  });
}

/**
 * Cria um campo de teste
 * 
 * @param tenantId - ID do tenant
 * @param entityId - ID da entidade
 * @param name - Nome técnico do campo
 * @param label - Nome amigável
 * @param type - Tipo do campo
 * @param required - Se é obrigatório (default: false)
 * @param unique - Se é único (default: false)
 * @param order - Ordem de exibição (default: 0)
 * @returns Campo criado
 */
export async function createTestField(data: {
  tenantId: string;
  entityId: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  order?: number;
  options?: Array<{ value: string; label: string; color?: string }>;
}) {
  return prisma.field.upsert({
    where: {
      entityId_name: {
        entityId: data.entityId,
        name: data.name,
      },
    },
    update: {
      label: data.label,
      type: data.type,
      required: data.required || false,
      unique: data.unique || false,
      order: data.order || 0,
      options: data.options ? data.options : Prisma.JsonNull,
      isDeleted: false,
    },
    create: {
      name: data.name,
      label: data.label,
      type: data.type,
      required: data.required || false,
      unique: data.unique || false,
      order: data.order || 0,
      options: data.options ? data.options : Prisma.JsonNull,
      entityId: data.entityId,
      tenantId: data.tenantId,
      isDeleted: false,
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

