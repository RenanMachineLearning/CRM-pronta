/**
 * Serviço para gestão de roles
 * 
 * Lógica de negócio para operações CRUD de roles.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { PrismaClient } from '@prisma/client';
import { filterFieldsByPermission, validateFieldPermissionsForUpdate } from '../utils/fieldPermissions';
import { logAudit } from '../utils/auditLog';

const prisma = new PrismaClient();

// Interface para criação de role
export interface CreateRoleData {
  name: string;
  description?: string;
  permissionIds?: string[];
}

// Interface para atualização de role
export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

// Interface para listagem de roles (com contadores)
export interface RoleListItem {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  permissionsCount: number;
  usersCount: number;
  createdAt: Date;
}

// Interface para detalhe de role (com permissões completas)
export interface RoleDetail {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  permissions: Array<{
    id: string;
    entity: string;
    action: string;
    field?: string | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export class RoleService {
  /**
   * Lista roles do tenant atual (apenas ativas por padrão)
   * 
   * Retorna contadores calculados via agregações Prisma (_count):
   * permissionsCount e usersCount
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Array de roles com contadores
   */
  static async listRoles(tenantId: string, userId?: string): Promise<RoleListItem[]> {
    // Buscar roles com contadores via _count
    const roles = await prisma.role.findMany({
      where: {
        tenantId, // Isolamento multi-tenant obrigatório
        isActive: true, // Apenas roles ativas por padrão
      },
      include: {
        _count: {
          select: {
            rolePermissions: true,
            userRoles: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Formatar resposta com contadores
    let data: RoleListItem[] = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      isActive: role.isActive,
      permissionsCount: role._count.rolePermissions,
      usersCount: role._count.userRoles,
      createdAt: role.createdAt,
    }));

    // Filtrar campos baseado em permissões do usuário
    if (userId) {
      const filtered = await filterFieldsByPermission(
        data,
        userId,
        tenantId,
        'Role',
        'read'
      );
      // Garantir que description seja null se não existir após filtro
      data = (filtered as any[]).map((item) => ({
        ...item,
        description: item.description ?? null,
      })) as RoleListItem[];
    }

    return data;
  }

  /**
   * Busca role por ID com permissões (com validação de tenant)
   * 
   * @param roleId - ID da role a ser buscada
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Role encontrada com permissões ou null
   */
  static async getRoleById(
    roleId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<RoleDetail | null> {
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: {
                id: true,
                entity: true,
                action: true,
                field: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      return null;
    }

    // Formatar resposta com permissões
    let roleResponse: RoleDetail = {
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        entity: rp.permission.entity,
        action: rp.permission.action,
        field: rp.permission.field,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };

    // Filtrar campos baseado em permissões do usuário
    if (requestingUserId) {
      roleResponse = (await filterFieldsByPermission(
        roleResponse,
        requestingUserId,
        tenantId,
        'Role',
        'read'
      )) as RoleDetail;
    }

    return roleResponse;
  }

  /**
   * Cria role e associa permissões
   * 
   * @param data - Dados da role (name, description, permissionIds)
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Role criada
   * @throws Error se nome já existe ou permissões inválidas
   */
  static async createRole(
    data: CreateRoleData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<RoleDetail> {
    // Validar nome não vazio
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Nome é obrigatório e não pode ser vazio');
    }

    // Validar nome único no tenant
    const existingRole = await prisma.role.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: data.name.trim(),
        },
      },
    });

    if (existingRole) {
      throw new Error('Nome já está em uso neste tenant');
    }

    // Validar permissões se fornecidas
    if (data.permissionIds && data.permissionIds.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: {
          id: { in: data.permissionIds },
          tenantId, // Garantir que permissões pertencem ao tenant
        },
      });

      if (permissions.length !== data.permissionIds.length) {
        throw new Error('Uma ou mais permissões não foram encontradas ou não pertencem ao tenant');
      }
    }

    // Criar role e associar permissões em uma transação
    const role = await prisma.$transaction(async (tx) => {
      // Criar role
      const newRole = await tx.role.create({
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
          tenantId,
          isActive: true,
        },
      });

      // Associar permissões se fornecidas
      if (data.permissionIds && data.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: data.permissionIds.map((permissionId) => ({
            roleId: newRole.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      // Buscar role criada com permissões
      return await tx.role.findUnique({
        where: { id: newRole.id },
        include: {
          rolePermissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  entity: true,
                  action: true,
                  field: true,
                },
              },
            },
          },
        },
      });
    });

    if (!role) {
      throw new Error('Erro ao criar role');
    }

    // Formatar resposta
    const roleResponse = {
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        entity: rp.permission.entity,
        action: rp.permission.action,
        field: rp.permission.field,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };

    // Registrar auditoria (após commit bem-sucedido)
    // Se requestingUserId não for fornecido, não registrar auditoria
    if (requestingUserId) {
      // Não aguardar auditoria para não bloquear resposta
      logAudit('Role', role.id, 'create', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return roleResponse;
  }

  /**
   * Atualiza role e permissões
   * 
   * @param roleId - ID da role a ser atualizada
   * @param data - Dados para atualização (name, description, permissionIds)
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (para validar permissões de campo)
   * @returns Role atualizada
   * @throws Error se role não encontrada, nome já existe ou campos proibidos
   */
  static async updateRole(
    roleId: string,
    data: UpdateRoleData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<RoleDetail> {
    // Verificar se role existe e pertence ao tenant
    const existingRole = await prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!existingRole) {
      throw new Error('Role não encontrada');
    }

    // Capturar dados antigos para auditoria (antes de atualizar)
    const oldData = {
      name: existingRole.name,
      description: existingRole.description,
    };

    // Validar permissões de campo antes de atualizar
    if (requestingUserId) {
      // Preparar objeto com apenas campos primitivos (excluir permissionIds que é relacionamento)
      const primitiveFields: Record<string, any> = {};
      if (data.name !== undefined) primitiveFields.name = data.name;
      if (data.description !== undefined) primitiveFields.description = data.description;

      const validation = await validateFieldPermissionsForUpdate(
        primitiveFields,
        requestingUserId,
        tenantId,
        'Role'
      );

      if (!validation.allowed) {
        throw new Error(
          `Você não tem permissão para atualizar os seguintes campos: ${validation.forbiddenFields.join(', ')}`
        );
      }
    }

    // Validar nome único se estiver sendo alterado
    if (data.name && data.name.trim() !== existingRole.name) {
      if (data.name.trim().length === 0) {
        throw new Error('Nome não pode ser vazio');
      }

      const nameInUse = await prisma.role.findUnique({
        where: {
          tenantId_name: {
            tenantId,
            name: data.name.trim(),
          },
        },
      });

      if (nameInUse) {
        throw new Error('Nome já está em uso neste tenant');
      }
    }

    // Validar permissões se fornecidas
    if (data.permissionIds !== undefined) {
      if (data.permissionIds.length > 0) {
        const permissions = await prisma.permission.findMany({
          where: {
            id: { in: data.permissionIds },
            tenantId, // Garantir que permissões pertencem ao tenant
          },
        });

        if (permissions.length !== data.permissionIds.length) {
          throw new Error('Uma ou mais permissões não foram encontradas ou não pertencem ao tenant');
        }
      }
    }

    // Atualizar role e permissões em uma transação
    const role = await prisma.$transaction(async (tx) => {
      // Preparar dados de atualização
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.description !== undefined) updateData.description = data.description?.trim() || null;

      // Atualizar role
      await tx.role.update({
        where: { id: roleId },
        data: updateData,
      });

      // Atualizar permissões se permissionIds foi fornecido
      // Comportamento: substitui completamente as permissões atuais
      if (data.permissionIds !== undefined) {
        // Remover todas as permissões atuais
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        // Adicionar novas permissões se fornecidas
        if (data.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: data.permissionIds.map((permissionId) => ({
              roleId,
              permissionId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Buscar role atualizada com permissões
      return await tx.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  entity: true,
                  action: true,
                  field: true,
                },
              },
            },
          },
        },
      });
    });

    if (!role) {
      throw new Error('Erro ao atualizar role');
    }

    // Comparar campos alterados para auditoria (após commit bem-sucedido)
    const changes: Record<string, { old: any; new: any }> = {};
    
    // Comparar apenas campos que foram fornecidos para atualização
    if (data.name !== undefined && data.name.trim() !== oldData.name) {
      changes.name = { old: oldData.name, new: data.name.trim() };
    }
    if (data.description !== undefined) {
      const newDescription = data.description?.trim() || null;
      const oldDescription = oldData.description || null;
      // Comparar considerando null/undefined como iguais
      if (newDescription !== oldDescription) {
        changes.description = { old: oldDescription, new: newDescription };
      }
    }

    // Registrar auditoria (após commit bem-sucedido)
    // Se requestingUserId não for fornecido, não registrar auditoria
    if (requestingUserId && Object.keys(changes).length > 0) {
      // Não aguardar auditoria para não bloquear resposta
      logAudit('Role', roleId, 'update', requestingUserId, tenantId, changes).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    // Formatar resposta
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        entity: rp.permission.entity,
        action: rp.permission.action,
        field: rp.permission.field,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * Soft delete (marca isActive = false) se não estiver em uso
   * 
   * @param roleId - ID da role
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns true se deletado, false se já estava inativa
   * @throws Error se role não encontrada ou está em uso
   */
  static async deleteRole(
    roleId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<boolean> {
    // Verificar se role existe e pertence ao tenant
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!role) {
      throw new Error('Role não encontrada');
    }

    // Se já estiver inativa, retornar true (idempotência)
    if (!role.isActive) {
      return true;
    }

    // Validar que role não está em uso (verificar UserRole)
    const usersUsingRole = await prisma.userRole.count({
      where: {
        roleId,
      },
    });

    if (usersUsingRole > 0) {
      throw new Error('Role está em uso por um ou mais usuários e não pode ser deletada');
    }

    // Marcar como inativa (soft delete)
    await prisma.role.update({
      where: { id: roleId },
      data: { isActive: false },
    });

    // Registrar auditoria (após commit bem-sucedido)
    // Se requestingUserId não for fornecido, não registrar auditoria
    if (requestingUserId) {
      // Não aguardar auditoria para não bloquear resposta
      logAudit('Role', roleId, 'delete', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return true;
  }
}

