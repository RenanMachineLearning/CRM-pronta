/**
 * Script de seed para popular o banco de dados com dados iniciais
 * 
 * Cria um tenant de demonstração que será usado para testes e desenvolvimento.
 * Este script é idempotente - pode ser executado múltiplas vezes sem criar duplicados.
 * 
 * Etapa 3 (ACL): Cria roles padrão, permissões padrão e suas associações.
 */

import { PrismaClient, Permission, Role } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// Constantes para criação de permissões
// ============================================================================

// Entidades que terão permissões ACL
const ENTITIES = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task', 'Note', 'User', 'Role', 'AuditLog'];

// Ações padrão para cada entidade
const ACTIONS = ['create', 'read', 'update', 'delete', 'list'];

// Permissões por campo (campo field preenchido)
// Exemplo: Opportunity.value - read/write (campo sensível de valor financeiro)
const FIELD_PERMISSIONS = [
  { entity: 'Opportunity', action: 'read', field: 'value' },
  { entity: 'Opportunity', action: 'update', field: 'value' },
];

// ============================================================================
// Funções Helpers
// ============================================================================

/**
 * Cria todas as permissões padrão para um tenant
 * 
 * Cria permissões por entidade e ação (field = null) e permissões por campo.
 * Usa findFirst + create para evitar duplicatas (não pode usar upsert com field null).
 * 
 * @param tenantId - ID do tenant
 * @returns Array de permissões criadas
 */
async function createPermissions(tenantId: string): Promise<Permission[]> {
  console.log('📋 Criando permissões padrão...');
  const permissions: Permission[] = [];

  // Criar permissões por entidade e ação (field = null)
  for (const entity of ENTITIES) {
    for (const action of ACTIONS) {
      // Verificar se permissão já existe
      const existing = await prisma.permission.findFirst({
        where: {
          tenantId,
          entity,
          action,
          field: null,
        },
      });

      if (!existing) {
        const permission = await prisma.permission.create({
          data: {
            tenantId,
            entity,
            action,
            field: null,
          },
        });
        permissions.push(permission);
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
      const permission = await prisma.permission.create({
        data: {
          tenantId,
          entity: fieldPerm.entity,
          action: fieldPerm.action,
          field: fieldPerm.field,
        },
      });
      permissions.push(permission);
    } else {
      permissions.push(existing);
    }
  }

  console.log(`   ✅ ${permissions.length} permissões criadas/encontradas`);
  return permissions;
}

/**
 * Cria as 3 roles padrão para um tenant
 * 
 * @param tenantId - ID do tenant
 * @returns Objeto com as 3 roles criadas
 */
async function createRoles(tenantId: string): Promise<{ admin: Role; vendedor: Role; visualizador: Role }> {
  console.log('👥 Criando roles padrão...');

  // Criar role Admin
  const admin = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId,
        name: 'Admin',
      },
    },
    update: {},
    create: {
      name: 'Admin',
      tenantId,
      description: 'Administrador com acesso total ao sistema',
      isActive: true,
    },
  });

  // Criar role Vendedor
  const vendedor = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId,
        name: 'Vendedor',
      },
    },
    update: {},
    create: {
      name: 'Vendedor',
      tenantId,
      description: 'Pode criar/editar contatos, leads e oportunidades; pode visualizar relatórios',
      isActive: true,
    },
  });

  // Criar role Visualizador
  const visualizador = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId,
        name: 'Visualizador',
      },
    },
    update: {},
    create: {
      name: 'Visualizador',
      tenantId,
      description: 'Apenas leitura (read, list) em todas as entidades',
      isActive: true,
    },
  });

  console.log(`   ✅ Role Admin criada/encontrada: ${admin.id}`);
  console.log(`   ✅ Role Vendedor criada/encontrada: ${vendedor.id}`);
  console.log(`   ✅ Role Visualizador criada/encontrada: ${visualizador.id}`);

  return { admin, vendedor, visualizador };
}

/**
 * Associa permissões às roles conforme especificação
 * 
 * - Admin: todas as permissões (acesso total)
 * - Vendedor: permissões específicas (sem delete em entidades principais)
 * - Visualizador: apenas read e list
 * 
 * @param roles - Objeto com as 3 roles
 * @param permissions - Array de todas as permissões
 */
async function associatePermissionsToRoles(
  roles: { admin: Role; vendedor: Role; visualizador: Role },
  permissions: Permission[]
): Promise<void> {
  console.log('🔗 Associando permissões às roles...');

  // Helper para encontrar permissão por entidade, ação e campo
  const findPermission = (entity: string, action: string, field: string | null = null) => {
    return permissions.find(
      (p) => p.entity === entity && p.action === action && p.field === field
    );
  };

  // ============================================================================
  // Admin: TODAS as permissões
  // ============================================================================
  const adminRolePermissions = permissions.map((p) => ({
    roleId: roles.admin.id,
    permissionId: p.id,
  }));

  await prisma.rolePermission.createMany({
    data: adminRolePermissions,
    skipDuplicates: true,
  });
  console.log(`   ✅ Admin: ${adminRolePermissions.length} permissões associadas`);

  // ============================================================================
  // Vendedor: permissões específicas
  // ============================================================================
  const vendedorPermissions: { roleId: string; permissionId: string }[] = [];

  // Entidades com create, read, update, list (não delete)
  const entitiesWithCRUD = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task', 'Note'];
  for (const entity of entitiesWithCRUD) {
    const create = findPermission(entity, 'create');
    const read = findPermission(entity, 'read');
    const update = findPermission(entity, 'update');
    const list = findPermission(entity, 'list');

    if (create) vendedorPermissions.push({ roleId: roles.vendedor.id, permissionId: create.id });
    if (read) vendedorPermissions.push({ roleId: roles.vendedor.id, permissionId: read.id });
    if (update) vendedorPermissions.push({ roleId: roles.vendedor.id, permissionId: update.id });
    if (list) vendedorPermissions.push({ roleId: roles.vendedor.id, permissionId: list.id });
  }

  // Opportunity.value: read e update (permissões por campo)
  const oppValueRead = findPermission('Opportunity', 'read', 'value');
  const oppValueUpdate = findPermission('Opportunity', 'update', 'value');
  if (oppValueRead) vendedorPermissions.push({ roleId: roles.vendedor.id, permissionId: oppValueRead.id });
  if (oppValueUpdate) vendedorPermissions.push({ roleId: roles.vendedor.id, permissionId: oppValueUpdate.id });

  // User e Role: apenas read e list (visualização)
  for (const entity of ['User', 'Role']) {
    const read = findPermission(entity, 'read');
    const list = findPermission(entity, 'list');
    if (read) vendedorPermissions.push({ roleId: roles.vendedor.id, permissionId: read.id });
    if (list) vendedorPermissions.push({ roleId: roles.vendedor.id, permissionId: list.id });
  }

  await prisma.rolePermission.createMany({
    data: vendedorPermissions,
    skipDuplicates: true,
  });
  console.log(`   ✅ Vendedor: ${vendedorPermissions.length} permissões associadas`);

  // ============================================================================
  // Visualizador: apenas read e list
  // ============================================================================
  const visualizadorPermissions: { roleId: string; permissionId: string }[] = [];

  // Todas as entidades: read e list
  for (const entity of ENTITIES) {
    const read = findPermission(entity, 'read');
    const list = findPermission(entity, 'list');
    if (read) visualizadorPermissions.push({ roleId: roles.visualizador.id, permissionId: read.id });
    if (list) visualizadorPermissions.push({ roleId: roles.visualizador.id, permissionId: list.id });
  }

  // Opportunity.value: apenas read (pode ver, mas não editar)
  const oppValueReadForViewer = findPermission('Opportunity', 'read', 'value');
  if (oppValueReadForViewer) {
    visualizadorPermissions.push({ roleId: roles.visualizador.id, permissionId: oppValueReadForViewer.id });
  }

  await prisma.rolePermission.createMany({
    data: visualizadorPermissions,
    skipDuplicates: true,
  });
  console.log(`   ✅ Visualizador: ${visualizadorPermissions.length} permissões associadas`);
}

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // ============================================================================
  // Ordem obrigatória de execução:
  // 1. Criar ou obter tenant
  // 2. Criar permissões (depende do tenant)
  // 3. Criar roles (depende do tenant)
  // 4. Associar permissões às roles (depende de permissões e roles)
  // ============================================================================

  // 1. Criar ou obter tenant demo
  const existingTenant = await prisma.tenant.findUnique({
    where: {
      slug: 'demo',
    },
  });

  const demoTenant = await prisma.tenant.upsert({
    where: {
      slug: 'demo',
    },
    update: {
      // Não atualiza se já existir - mantém dados existentes
    },
    create: {
      name: 'Demo Company',
      slug: 'demo',
      status: 'ACTIVE',
      subdomain: null, // Não utilizado nesta fase - feature desligada
    },
  });

  if (existingTenant) {
    console.log('ℹ️  Tenant de demonstração já existe no banco de dados.');
    console.log(`   ID: ${demoTenant.id}`);
    console.log(`   Nome: ${demoTenant.name}`);
    console.log(`   Slug: ${demoTenant.slug}`);
    console.log(`   Status: ${demoTenant.status}\n`);
  } else {
    console.log('✅ Tenant de demonstração criado com sucesso!');
    console.log(`   ID: ${demoTenant.id}`);
    console.log(`   Nome: ${demoTenant.name}`);
    console.log(`   Slug: ${demoTenant.slug}`);
    console.log(`   Status: ${demoTenant.status}\n`);
  }

  // 2. Criar permissões
  const permissions = await createPermissions(demoTenant.id);
  console.log('');

  // 3. Criar roles
  const roles = await createRoles(demoTenant.id);
  console.log('');

  // 4. Associar permissões às roles
  await associatePermissionsToRoles(roles, permissions);
  console.log('');

  console.log('✨ Seed concluído com sucesso!');
  console.log(`\n📊 Resumo:`);
  console.log(`   - Permissões criadas: ${permissions.length}`);
  console.log(`   - Roles criadas: 3 (Admin, Vendedor, Visualizador)`);
  console.log(`   - Admin: ${permissions.length} permissões (acesso total)`);
  
  // Contar permissões do Vendedor
  const vendedorCount = await prisma.rolePermission.count({
    where: { roleId: roles.vendedor.id },
  });
  console.log(`   - Vendedor: ${vendedorCount} permissões (sem delete)`);
  
  // Contar permissões do Visualizador
  const visualizadorCount = await prisma.rolePermission.count({
    where: { roleId: roles.visualizador.id },
  });
  console.log(`   - Visualizador: ${visualizadorCount} permissões (apenas read/list)`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

