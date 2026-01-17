/**
 * Script de seed para popular o banco de dados com dados iniciais
 * 
 * Cria um tenant de demonstração que será usado para testes e desenvolvimento.
 * Este script é idempotente - pode ser executado múltiplas vezes sem criar duplicados.
 * 
 * Etapa 3 (ACL): Cria roles padrão, permissões padrão e suas associações.
 * Etapa 4 (Modelo de Dados): Cria entidades core e campos padrão.
 */

import { PrismaClient, Permission, Role } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// Constantes para criação de permissões
// ============================================================================

// Entidades que terão permissões ACL
const ENTITIES = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task', 'Note', 'User', 'Role', 'AuditLog', 'Entity', 'Field', 'Relationship'];

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

/**
 * Cria as entidades core do sistema e seus campos padrão
 * 
 * Etapa 4 (Modelo de Dados): Cria Contact, Company, Lead, Opportunity, Task, Note
 * com isSystem: true e seus campos padrão.
 * 
 * @param tenantId - ID do tenant
 */
async function createCoreEntities(tenantId: string): Promise<void> {
  console.log('📦 Criando entidades core do sistema...');

  // Definir entidades core
  const coreEntities = [
    { name: 'Contact', label: 'Contato' },
    { name: 'Company', label: 'Empresa' },
    { name: 'Lead', label: 'Lead' },
    { name: 'Opportunity', label: 'Oportunidade' },
    { name: 'Task', label: 'Tarefa' },
    { name: 'Note', label: 'Nota' },
  ];

  // Criar ou obter entidades
  const entitiesMap = new Map<string, string>(); // name -> id

  for (const entityDef of coreEntities) {
    const existing = await prisma.entity.findFirst({
      where: {
        tenantId,
        name: entityDef.name,
      },
    });

    if (existing) {
      // Atualizar isSystem se necessário
      if (!existing.isSystem) {
        await prisma.entity.update({
          where: { id: existing.id },
          data: { isSystem: true },
        });
      }
      entitiesMap.set(entityDef.name, existing.id);
      console.log(`   ✅ Entidade ${entityDef.name} já existe`);
    } else {
      const entity = await prisma.entity.create({
        data: {
          name: entityDef.name,
          label: entityDef.label,
          tenantId,
          isSystem: true,
        },
      });
      entitiesMap.set(entityDef.name, entity.id);
      console.log(`   ✅ Entidade ${entityDef.name} criada`);
    }
  }

  console.log('');

  // Criar campos para cada entidade
  await createContactFields(entitiesMap.get('Contact')!, tenantId);
  await createCompanyFields(entitiesMap.get('Company')!, tenantId);
  await createLeadFields(entitiesMap.get('Lead')!, tenantId);
  await createOpportunityFields(entitiesMap.get('Opportunity')!, tenantId);
  await createTaskFields(entitiesMap.get('Task')!, tenantId);
  await createNoteFields(entitiesMap.get('Note')!, tenantId);

  console.log('✅ Entidades core e campos criados com sucesso!\n');
}

/**
 * Cria campos padrão para Contact
 */
async function createContactFields(entityId: string, tenantId: string): Promise<void> {
  const fields = [
    { name: 'firstName', label: 'Nome', type: 'text', required: true, unique: false, order: 1 },
    { name: 'lastName', label: 'Sobrenome', type: 'text', required: true, unique: false, order: 2 },
    { name: 'email', label: 'Email', type: 'text', required: false, unique: true, order: 3 },
    { name: 'phone', label: 'Telefone', type: 'text', required: false, unique: false, order: 4 },
    { name: 'title', label: 'Cargo', type: 'text', required: false, unique: false, order: 5 },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: false,
      unique: false,
      order: 6,
      options: [
        { value: 'active', label: 'Ativo' },
        { value: 'inactive', label: 'Inativo' },
        { value: 'archived', label: 'Arquivado' },
      ],
    },
  ];

  await createFieldsForEntity(entityId, tenantId, fields, 'Contact');
}

/**
 * Cria campos padrão para Company
 */
async function createCompanyFields(entityId: string, tenantId: string): Promise<void> {
  const fields = [
    { name: 'name', label: 'Nome', type: 'text', required: true, unique: true, order: 1 },
    { name: 'website', label: 'Website', type: 'text', required: false, unique: false, order: 2 },
    { name: 'industry', label: 'Indústria', type: 'text', required: false, unique: false, order: 3 },
    {
      name: 'size',
      label: 'Tamanho',
      type: 'select',
      required: false,
      unique: false,
      order: 4,
      options: [
        { value: 'small', label: 'Pequena' },
        { value: 'medium', label: 'Média' },
        { value: 'large', label: 'Grande' },
        { value: 'enterprise', label: 'Empresarial' },
      ],
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: false,
      unique: false,
      order: 5,
      options: [
        { value: 'active', label: 'Ativo' },
        { value: 'inactive', label: 'Inativo' },
        { value: 'archived', label: 'Arquivado' },
      ],
    },
  ];

  await createFieldsForEntity(entityId, tenantId, fields, 'Company');
}

/**
 * Cria campos padrão para Lead
 */
async function createLeadFields(entityId: string, tenantId: string): Promise<void> {
  const fields = [
    { name: 'firstName', label: 'Nome', type: 'text', required: true, unique: false, order: 1 },
    { name: 'lastName', label: 'Sobrenome', type: 'text', required: true, unique: false, order: 2 },
    { name: 'email', label: 'Email', type: 'text', required: false, unique: false, order: 3 },
    { name: 'phone', label: 'Telefone', type: 'text', required: false, unique: false, order: 4 },
    { name: 'company', label: 'Empresa', type: 'text', required: false, unique: false, order: 5 },
    {
      name: 'source',
      label: 'Origem',
      type: 'select',
      required: false,
      unique: false,
      order: 6,
      options: [
        { value: 'website', label: 'Website' },
        { value: 'referral', label: 'Indicação' },
        { value: 'social', label: 'Redes Sociais' },
        { value: 'email', label: 'Email' },
        { value: 'other', label: 'Outro' },
      ],
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: false,
      unique: false,
      order: 7,
      options: [
        { value: 'new', label: 'Novo' },
        { value: 'qualified', label: 'Qualificado' },
        { value: 'converted', label: 'Convertido' },
        { value: 'lost', label: 'Perdido' },
      ],
    },
    { name: 'converted', label: 'Convertido', type: 'boolean', required: false, unique: false, order: 8 },
    { name: 'convertedAt', label: 'Data de Conversão', type: 'date', required: false, unique: false, order: 9 },
  ];

  await createFieldsForEntity(entityId, tenantId, fields, 'Lead');
}

/**
 * Cria campos padrão para Opportunity
 */
async function createOpportunityFields(entityId: string, tenantId: string): Promise<void> {
  const fields = [
    { name: 'name', label: 'Nome', type: 'text', required: true, unique: false, order: 1 },
    { name: 'value', label: 'Valor', type: 'number', required: true, unique: false, order: 2 },
    {
      name: 'currency',
      label: 'Moeda',
      type: 'select',
      required: false,
      unique: false,
      order: 3,
      options: [
        { value: 'BRL', label: 'BRL (Real)' },
        { value: 'USD', label: 'USD (Dólar)' },
        { value: 'EUR', label: 'EUR (Euro)' },
      ],
    },
    {
      name: 'stage',
      label: 'Estágio',
      type: 'select',
      required: false,
      unique: false,
      order: 4,
      options: [
        { value: 'qualification', label: 'Qualificação' },
        { value: 'proposal', label: 'Proposta' },
        { value: 'negotiation', label: 'Negociação' },
        { value: 'closing', label: 'Fechamento' },
      ],
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: false,
      unique: false,
      order: 5,
      options: [
        { value: 'open', label: 'Aberto' },
        { value: 'won', label: 'Ganho' },
        { value: 'lost', label: 'Perdido' },
        { value: 'archived', label: 'Arquivado' },
      ],
    },
    { name: 'closeDate', label: 'Data de Fechamento', type: 'date', required: false, unique: false, order: 6 },
    { name: 'probability', label: 'Probabilidade', type: 'number', required: false, unique: false, order: 7 },
  ];

  await createFieldsForEntity(entityId, tenantId, fields, 'Opportunity');
}

/**
 * Cria campos padrão para Task
 */
async function createTaskFields(entityId: string, tenantId: string): Promise<void> {
  const fields = [
    { name: 'title', label: 'Título', type: 'text', required: true, unique: false, order: 1 },
    { name: 'description', label: 'Descrição', type: 'text', required: false, unique: false, order: 2 },
    { name: 'dueDate', label: 'Data de Vencimento', type: 'date', required: false, unique: false, order: 3 },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: false,
      unique: false,
      order: 4,
      options: [
        { value: 'pending', label: 'Pendente' },
        { value: 'in_progress', label: 'Em Progresso' },
        { value: 'completed', label: 'Concluída' },
        { value: 'cancelled', label: 'Cancelada' },
      ],
    },
    {
      name: 'priority',
      label: 'Prioridade',
      type: 'select',
      required: false,
      unique: false,
      order: 5,
      options: [
        { value: 'low', label: 'Baixa' },
        { value: 'medium', label: 'Média' },
        { value: 'high', label: 'Alta' },
        { value: 'urgent', label: 'Urgente' },
      ],
    },
  ];

  await createFieldsForEntity(entityId, tenantId, fields, 'Task');
}

/**
 * Cria campos padrão para Note
 */
async function createNoteFields(entityId: string, tenantId: string): Promise<void> {
  const fields = [
    { name: 'content', label: 'Conteúdo', type: 'text', required: true, unique: false, order: 1 },
    {
      name: 'type',
      label: 'Tipo',
      type: 'select',
      required: false,
      unique: false,
      order: 2,
      options: [
        { value: 'general', label: 'Geral' },
        { value: 'call', label: 'Chamada' },
        { value: 'meeting', label: 'Reunião' },
        { value: 'email', label: 'Email' },
        { value: 'other', label: 'Outro' },
      ],
    },
  ];

  await createFieldsForEntity(entityId, tenantId, fields, 'Note');
}

/**
 * Helper para criar campos de uma entidade (idempotente)
 */
async function createFieldsForEntity(
  entityId: string,
  tenantId: string,
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    unique: boolean;
    order: number;
    options?: Array<{ value: string; label: string }>;
  }>,
  entityName: string
): Promise<void> {
  const fieldsToCreate = fields.map((field) => {
    const fieldData: any = {
      entityId,
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
      unique: field.unique,
      tenantId,
      order: field.order,
    };

    // Adicionar options se for campo select
    if (field.type === 'select' && field.options) {
      fieldData.options = field.options;
    }

    return fieldData;
  });

  // Criar campos usando createMany com skipDuplicates
  // Mas primeiro verificar quais já existem para evitar erros
  for (const fieldData of fieldsToCreate) {
    const existing = await prisma.field.findFirst({
      where: {
        entityId,
        name: fieldData.name,
      },
    });

    if (!existing) {
      await prisma.field.create({
        data: fieldData,
      });
    }
  }

  console.log(`   ✅ Campos de ${entityName} criados/verificados`);
}

/**
 * Cria pipeline padrão "Pipeline de Vendas" com estágios padrão
 * 
 * Etapa 6 (Leads/Oportunidades): Cria pipeline padrão com 4 estágios:
 * - Qualificação (order: 1, probability: 10%)
 * - Proposta (order: 2, probability: 30%)
 * - Negociação (order: 3, probability: 60%)
 * - Fechamento (order: 4, probability: 90%)
 * 
 * A função é idempotente - verifica se pipeline padrão já existe antes de criar.
 * 
 * @param tenantId - ID do tenant
 */
async function createDefaultPipeline(tenantId: string): Promise<void> {
  console.log('📊 Criando pipeline padrão...');

  // Verificar se já existe pipeline padrão para este tenant
  const existingPipeline = await prisma.pipeline.findFirst({
    where: {
      tenantId,
      isDefault: true,
    },
    include: {
      stages: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  // Configuração dos estágios padrão (centralizada para reutilização)
  const defaultStagesConfig = [
    { name: 'Qualificação', order: 1, probability: 10, color: '#3B82F6' }, // Azul
    { name: 'Proposta', order: 2, probability: 30, color: '#10B981' }, // Verde
    { name: 'Negociação', order: 3, probability: 60, color: '#F59E0B' }, // Amarelo/Laranja
    { name: 'Fechamento', order: 4, probability: 90, color: '#8B5CF6' }, // Roxo
  ];

  if (existingPipeline) {
    console.log(`   ✅ Pipeline padrão já existe: ${existingPipeline.name}`);
    console.log(`   ✅ Estágios existentes: ${existingPipeline.stages.length}`);
    
    // Verificar se todos os estágios padrão existem
    const requiredStageNames = defaultStagesConfig.map(s => s.name);
    const existingStageNames = existingPipeline.stages.map(s => s.name);
    const missingStages = requiredStageNames.filter(name => !existingStageNames.includes(name));
    
    if (missingStages.length > 0) {
      console.log(`   ⚠️  Estágios faltando: ${missingStages.join(', ')}`);
      console.log(`   ℹ️  Criando estágios faltantes...`);
      
      // Criar apenas estágios faltantes
      for (const config of defaultStagesConfig) {
        if (missingStages.includes(config.name)) {
          // Verificar se estágio já existe (por nome) para evitar duplicatas
          const existingStage = await prisma.pipelineStage.findFirst({
            where: {
              pipelineId: existingPipeline.id,
              tenantId,
              name: config.name,
            },
          });

          if (!existingStage) {
            await prisma.pipelineStage.create({
              data: {
                pipelineId: existingPipeline.id,
                tenantId,
                name: config.name,
                order: config.order,
                probability: config.probability,
                color: config.color,
              },
            });
            console.log(`   ✅ Estágio "${config.name}" criado (order: ${config.order}, probability: ${config.probability}%)`);
          } else {
            console.log(`   ℹ️  Estágio "${config.name}" já existe`);
          }
        }
      }
    } else {
      console.log(`   ✅ Todos os estágios padrão já existem`);
    }
    
    return;
  }

  // Verificar se há múltiplos pipelines padrão (caso de inconsistência)
  const allDefaultPipelines = await prisma.pipeline.findMany({
    where: {
      tenantId,
      isDefault: true,
    },
  });

  if (allDefaultPipelines.length > 0) {
    console.log(`   ⚠️  Encontrados ${allDefaultPipelines.length} pipelines marcados como padrão`);
    console.log(`   ℹ️  Usando o primeiro pipeline encontrado`);
    // Usar o primeiro pipeline encontrado
    const firstPipeline = await prisma.pipeline.findFirst({
      where: {
        tenantId,
        isDefault: true,
      },
      include: {
        stages: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
    
    if (firstPipeline) {
      // Verificar e criar estágios faltantes
      const requiredStageNames = defaultStagesConfig.map(s => s.name);
      const existingStageNames = firstPipeline.stages.map(s => s.name);
      const missingStages = requiredStageNames.filter(name => !existingStageNames.includes(name));
      
      if (missingStages.length > 0) {
        for (const config of defaultStagesConfig) {
          if (missingStages.includes(config.name)) {
            await prisma.pipelineStage.create({
              data: {
                pipelineId: firstPipeline.id,
                tenantId,
                name: config.name,
                order: config.order,
                probability: config.probability,
                color: config.color,
              },
            });
            console.log(`   ✅ Estágio "${config.name}" criado`);
          }
        }
      }
    }
    return;
  }

  // Criar pipeline padrão
  const pipeline = await prisma.pipeline.create({
    data: {
      tenantId,
      name: 'Pipeline de Vendas',
      isDefault: true,
    },
  });

  console.log(`   ✅ Pipeline "${pipeline.name}" criado: ${pipeline.id}`);

  // Criar estágios padrão
  for (const stageConfig of defaultStagesConfig) {
    await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline.id,
        tenantId,
        name: stageConfig.name,
        order: stageConfig.order,
        probability: stageConfig.probability,
        color: stageConfig.color,
      },
    });
    console.log(`   ✅ Estágio "${stageConfig.name}" criado (order: ${stageConfig.order}, probability: ${stageConfig.probability}%)`);
  }

  console.log('✅ Pipeline padrão e estágios criados com sucesso!\n');
}

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // ============================================================================
  // Ordem obrigatória de execução:
  // 1. Criar ou obter tenant
  // 2. Criar permissões (depende do tenant)
  // 3. Criar roles (depende do tenant)
  // 4. Associar permissões às roles (depende de permissões e roles)
  // 5. Criar entidades core e campos (depende do tenant) - Etapa 4
  // 6. Criar pipeline padrão e estágios (depende do tenant) - Etapa 6
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

  // 5. Criar entidades core e campos (Etapa 4)
  await createCoreEntities(demoTenant.id);

  // 6. Criar pipeline padrão e estágios (Etapa 6)
  await createDefaultPipeline(demoTenant.id);

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
  
  // Verificar pipeline padrão criado
  const defaultPipeline = await prisma.pipeline.findFirst({
    where: {
      tenantId: demoTenant.id,
      isDefault: true,
    },
    include: {
      stages: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  });
  
  if (defaultPipeline) {
    console.log(`   - Pipeline padrão: "${defaultPipeline.name}" com ${defaultPipeline.stages.length} estágios`);
    const stagesList = defaultPipeline.stages.map(s => `${s.name} (${s.probability}%)`).join(', ');
    console.log(`     Estágios: ${stagesList}`);
  } else {
    console.log(`   ⚠️  Pipeline padrão não encontrado`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

