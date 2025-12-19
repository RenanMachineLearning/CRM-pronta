/**
 * Serviço para gestão de usuários
 * 
 * Lógica de negócio para operações CRUD de usuários.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { PrismaClient, UserStatus } from '@prisma/client';
import { hashPassword, validatePasswordPolicy } from '../utils/password';
import { filterFieldsByPermission, validateFieldPermissionsForUpdate } from '../utils/fieldPermissions';
import { logAudit } from '../utils/auditLog';

const prisma = new PrismaClient();

// Interface para filtros de listagem
export interface UserFilters {
  status?: UserStatus;
  roleId?: string;
}

// Interface para paginação
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// Interface para criação de usuário
export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  roleIds?: string[];
}

// Interface para atualização de usuário
export interface UpdateUserData {
  name?: string;
  email?: string;
  status?: UserStatus;
  roleIds?: string[];
}

// Interface para resposta de usuário (sem passwordHash)
export interface UserResponse {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  status: UserStatus;
  roles: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  /**
   * Lista usuários com filtros e paginação
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param filters - Filtros opcionais (status, roleId)
   * @param pagination - Parâmetros de paginação (limit, offset)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Objeto com lista de usuários e informações de paginação
   */
  static async listUsers(
    tenantId: string,
    filters?: UserFilters,
    pagination?: PaginationParams,
    userId?: string
  ): Promise<{
    data: UserResponse[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }> {
    // Valores padrão para paginação
    const limit = Math.min(pagination?.limit || 20, 100); // Máximo 100
    const offset = pagination?.offset || 0;

    // Construir condições de filtro
    const where: any = {
      tenantId, // Isolamento multi-tenant obrigatório
    };

    // Adicionar filtro de status se fornecido
    if (filters?.status) {
      where.status = filters.status;
    }

    // Adicionar filtro de role se fornecido
    if (filters?.roleId) {
      where.userRoles = {
        some: {
          roleId: filters.roleId,
          role: {
            tenantId, // Garantir que role pertence ao tenant
            isActive: true,
          },
        },
      };
    }

    // Buscar usuários com roles
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          userRoles: {
            where: {
              role: {
                isActive: true,
                tenantId,
              },
            },
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Formatar resposta (remover passwordHash e estruturar roles)
    let data: UserResponse[] = users.map((user) => ({
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      status: user.status,
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    // Filtrar campos baseado em permissões do usuário
    if (userId) {
      data = (await filterFieldsByPermission(
        data,
        userId,
        tenantId,
        'User',
        'read'
      )) as UserResponse[];
    }

    return {
      data,
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }

  /**
   * Busca usuário por ID (com validação de tenant)
   * 
   * @param userId - ID do usuário a ser buscado
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Usuário encontrado ou null
   */
  static async getUserById(
    userId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<UserResponse | null> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        userRoles: {
          where: {
            role: {
              isActive: true,
              tenantId,
            },
          },
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Formatar resposta (remover passwordHash)
    let userResponse: UserResponse = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      status: user.status,
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Filtrar campos baseado em permissões do usuário
    if (requestingUserId) {
      userResponse = (await filterFieldsByPermission(
        userResponse,
        requestingUserId,
        tenantId,
        'User',
        'read'
      )) as UserResponse;
    }

    return userResponse;
  }

  /**
   * Cria usuário e associa roles
   * 
   * @param data - Dados do usuário (email, name, password, roleIds)
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Usuário criado
   * @throws Error se email já existe ou roles inválidas
   */
  static async createUser(
    data: CreateUserData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<UserResponse> {
    // Validar email único no tenant
    const existingUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: data.email.trim().toLowerCase(),
        },
      },
    });

    if (existingUser) {
      throw new Error('Email já está em uso neste tenant');
    }

    // Validar senha
    const passwordValidation = validatePasswordPolicy(data.password, false);
    if (!passwordValidation.isValid) {
      throw new Error(`Senha inválida: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash da senha
    const passwordHash = await hashPassword(data.password);

    // Validar roles se fornecidas
    if (data.roleIds && data.roleIds.length > 0) {
      const roles = await prisma.role.findMany({
        where: {
          id: { in: data.roleIds },
          tenantId, // Garantir que roles pertencem ao tenant
          isActive: true,
        },
      });

      if (roles.length !== data.roleIds.length) {
        throw new Error('Uma ou mais roles não foram encontradas ou não pertencem ao tenant');
      }
    }

    // Criar usuário e associar roles em uma transação
    const user = await prisma.$transaction(async (tx) => {
      // Criar usuário
      const newUser = await tx.user.create({
        data: {
          email: data.email.trim().toLowerCase(),
          name: data.name.trim(),
          passwordHash,
          tenantId,
          status: 'ACTIVE',
        },
      });

      // Associar roles se fornecidas
      if (data.roleIds && data.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: data.roleIds.map((roleId) => ({
            userId: newUser.id,
            roleId,
          })),
          skipDuplicates: true,
        });
      }

      // Buscar usuário criado com roles
      return await tx.user.findUnique({
        where: { id: newUser.id },
        include: {
          userRoles: {
            where: {
              role: {
                isActive: true,
                tenantId,
              },
            },
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      });
    });

    if (!user) {
      throw new Error('Erro ao criar usuário');
    }

    // Formatar resposta
    const userResponse: UserResponse = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      status: user.status,
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Registrar auditoria (após commit bem-sucedido)
    // Se requestingUserId não for fornecido (ex: criação via seed), não registrar auditoria
    if (requestingUserId) {
      // Não aguardar auditoria para não bloquear resposta
      logAudit('User', user.id, 'create', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return userResponse;
  }

  /**
   * Atualiza usuário e roles
   * 
   * @param userId - ID do usuário a ser atualizado
   * @param data - Dados para atualização (name, email, status, roleIds)
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (para validar permissões de campo)
   * @returns Usuário atualizado
   * @throws Error se usuário não encontrado, email já existe ou campos proibidos
   */
  static async updateUser(
    userId: string,
    data: UpdateUserData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<UserResponse> {
    // Verificar se usuário existe e pertence ao tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!existingUser) {
      throw new Error('Usuário não encontrado');
    }

    // Capturar dados antigos para auditoria (antes de atualizar)
    const oldData = {
      name: existingUser.name,
      email: existingUser.email,
      status: existingUser.status,
    };

    // Validar permissões de campo antes de atualizar
    if (requestingUserId) {
      // Preparar objeto com apenas campos primitivos (excluir roleIds que é relacionamento)
      const primitiveFields: Record<string, any> = {};
      if (data.name !== undefined) primitiveFields.name = data.name;
      if (data.email !== undefined) primitiveFields.email = data.email;
      if (data.status !== undefined) primitiveFields.status = data.status;

      const validation = await validateFieldPermissionsForUpdate(
        primitiveFields,
        requestingUserId,
        tenantId,
        'User'
      );

      if (!validation.allowed) {
        throw new Error(
          `Você não tem permissão para atualizar os seguintes campos: ${validation.forbiddenFields.join(', ')}`
        );
      }
    }

    // Validar email único se estiver sendo alterado
    if (data.email && data.email.trim().toLowerCase() !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email: data.email.trim().toLowerCase(),
          },
        },
      });

      if (emailInUse) {
        throw new Error('Email já está em uso neste tenant');
      }
    }

    // Validar roles se fornecidas
    if (data.roleIds !== undefined) {
      if (data.roleIds.length > 0) {
        const roles = await prisma.role.findMany({
          where: {
            id: { in: data.roleIds },
            tenantId, // Garantir que roles pertencem ao tenant
            isActive: true,
          },
        });

        if (roles.length !== data.roleIds.length) {
          throw new Error('Uma ou mais roles não foram encontradas ou não pertencem ao tenant');
        }
      }
    }

    // Atualizar usuário e roles em uma transação
    const user = await prisma.$transaction(async (tx) => {
      // Preparar dados de atualização
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
      if (data.status !== undefined) updateData.status = data.status;

      // Atualizar usuário
      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Atualizar roles se roleIds foi fornecido
      // Comportamento: substitui completamente as roles atuais
      if (data.roleIds !== undefined) {
        // Remover todas as roles atuais
        await tx.userRole.deleteMany({
          where: { userId },
        });

        // Adicionar novas roles se fornecidas
        if (data.roleIds.length > 0) {
          await tx.userRole.createMany({
            data: data.roleIds.map((roleId) => ({
              userId,
              roleId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Buscar usuário atualizado com roles
      return await tx.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            where: {
              role: {
                isActive: true,
                tenantId,
              },
            },
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      });
    });

    if (!user) {
      throw new Error('Erro ao atualizar usuário');
    }

    // Comparar campos alterados para auditoria (após commit bem-sucedido)
    const changes: Record<string, { old: any; new: any }> = {};
    
    // Comparar apenas campos que foram fornecidos para atualização
    // Nota: Campos técnicos (updatedAt, createdAt) e sensíveis (passwordHash) são ignorados automaticamente
    if (data.name !== undefined && data.name.trim() !== oldData.name) {
      changes.name = { old: oldData.name, new: data.name.trim() };
    }
    if (data.email !== undefined && data.email.trim().toLowerCase() !== oldData.email) {
      changes.email = { old: oldData.email, new: data.email.trim().toLowerCase() };
    }
    if (data.status !== undefined && data.status !== oldData.status) {
      changes.status = { old: oldData.status, new: data.status };
    }

    // Registrar auditoria (após commit bem-sucedido)
    // Se requestingUserId não for fornecido, não registrar auditoria
    if (requestingUserId && Object.keys(changes).length > 0) {
      // Não aguardar auditoria para não bloquear resposta
      logAudit('User', userId, 'update', requestingUserId, tenantId, changes).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    // Formatar resposta
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      status: user.status,
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Soft delete (marca como INACTIVE)
   * 
   * @param userId - ID do usuário
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns true se deletado, false se já estava inativo
   * @throws Error se usuário não encontrado
   */
  static async deleteUser(
    userId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<boolean> {
    // Verificar se usuário existe e pertence ao tenant
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Se já estiver inativo, retornar true (idempotência)
    if (user.status === 'INACTIVE') {
      return true;
    }

    // Marcar como inativo (soft delete)
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
    });

    // Registrar auditoria (após commit bem-sucedido)
    // Se requestingUserId não for fornecido, não registrar auditoria
    if (requestingUserId) {
      // Não aguardar auditoria para não bloquear resposta
      logAudit('User', userId, 'delete', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return true;
  }
}

