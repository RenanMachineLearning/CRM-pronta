/**
 * Helper para verificação de permissões ACL
 * 
 * Verifica se um usuário tem permissão para realizar uma ação em uma entidade.
 * Este helper será usado pelo middleware de autorização (Parte 5) e também
 * diretamente nos controllers quando necessário.
 * 
 * Nota de performance:
 * Em fases futuras, checkPermission poderá ser otimizado com cache por request
 * (ex: permissões carregadas uma vez no req.context) ou memoização no middleware
 * de autorização (Parte 5). Isso evitará múltiplas queries em endpoints como
 * listUsers que verificam permissões para cada item.
 */

import { prisma } from './prisma';


/**
 * Verifica se um usuário tem permissão para realizar uma ação em uma entidade
 * 
 * @param userId - ID do usuário
 * @param tenantId - ID do tenant (obrigatório para isolamento)
 * @param entity - Nome da entidade (ex: "User", "Contact", "Role")
 * @param action - Ação a ser verificada (ex: "create", "read", "update", "delete", "list")
 * @param field - Campo opcional para permissões por campo (ex: "value")
 * @returns Promise<boolean> - true se tem permissão, false caso contrário
 * 
 * @remarks
 * - Busca roles do usuário via UserRole
 * - Busca permissões das roles via RolePermission
 * - Verifica se existe permissão para entity.action (e field se fornecido)
 * - Otimiza query com includes do Prisma para evitar N+1 queries
 * - Admin tem todas as permissões (verificado via seed)
 * 
 * @example
 * const hasPermission = await checkPermission(userId, tenantId, 'User', 'create');
 * if (!hasPermission) {
 *   return res.status(403).json({ error: 'Acesso negado' });
 * }
 */
export async function checkPermission(
  userId: string,
  tenantId: string,
  entity: string,
  action: string,
  field?: string | null
): Promise<boolean> {
  try {
    // Buscar usuário com suas roles e permissões em uma única query
    // Otimização: usar includes para evitar N+1 queries
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        userRoles: {
          where: {
            role: {
              isActive: true, // Apenas roles ativas
              tenantId: tenantId, // Isolamento multi-tenant
            },
          },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Se usuário não encontrado, não tem permissão
    if (!user) {
      return false;
    }

    // Validar que usuário pertence ao tenant
    if (user.tenantId !== tenantId) {
      return false;
    }

    // Coletar todas as permissões das roles do usuário
    const permissions = new Set<string>();

    for (const userRole of user.userRoles) {
      const role = userRole.role;

      // Verificar se role tem nome "Admin" (acesso total)
      if (role.name === 'Admin') {
        // Admin tem todas as permissões - retornar true imediatamente
        return true;
      }

      // Adicionar permissões da role ao conjunto
      for (const rolePermission of role.rolePermissions) {
        const permission = rolePermission.permission;

        // Criar chave única para a permissão: entity.action.field
        const permissionKey = `${permission.entity}.${permission.action}${permission.field ? `.${permission.field}` : ''}`;
        permissions.add(permissionKey);
      }
    }

    // Verificar se usuário tem a permissão específica
    const requestedPermission = `${entity}.${action}${field ? `.${field}` : ''}`;
    
    // Verificar permissão exata
    if (permissions.has(requestedPermission)) {
      return true;
    }

    // Se não encontrou permissão exata e field foi fornecido,
    // verificar se tem permissão de entidade (field = null)
    if (field) {
      const entityPermission = `${entity}.${action}`;
      if (permissions.has(entityPermission)) {
        return true;
      }
    }

    // Não tem permissão
    return false;
  } catch (error) {
    // Em caso de erro, retornar false (segurança por falha fechada)
    console.error('Erro ao verificar permissão:', error);
    return false;
  }
}

/**
 * Interface para permissão do usuário
 */
export interface UserPermission {
  entity: string;
  action: string;
  field?: string | null;
}

/**
 * Retorna todas as permissões de um usuário
 * 
 * Busca todas as permissões associadas às roles do usuário e retorna
 * em formato estruturado para facilitar uso no frontend.
 * 
 * @param userId - ID do usuário
 * @param tenantId - ID do tenant (obrigatório para isolamento)
 * @returns Promise<UserPermission[]> - Array de permissões do usuário
 * 
 * @remarks
 * - Busca roles do usuário via UserRole
 * - Busca permissões das roles via RolePermission
 * - Retorna todas as permissões no formato { entity, action, field? }
 * - Otimiza query com includes do Prisma para evitar N+1 queries
 * - Admin tem todas as permissões (verificado via seed), mas retorna lista vazia
 *   pois frontend pode verificar role "Admin" diretamente
 * 
 * @example
 * const permissions = await getUserPermissions(userId, tenantId);
 * // [{ entity: "User", action: "read" }, { entity: "Opportunity", action: "update", field: "value" }]
 */
export async function getUserPermissions(
  userId: string,
  tenantId: string
): Promise<UserPermission[]> {
  try {
    // Buscar usuário com suas roles e permissões em uma única query
    // Otimização: usar includes para evitar N+1 queries
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        userRoles: {
          where: {
            role: {
              isActive: true, // Apenas roles ativas
              tenantId: tenantId, // Isolamento multi-tenant
            },
          },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Se usuário não encontrado, retornar array vazio
    if (!user) {
      return [];
    }

    // Validar que usuário pertence ao tenant
    if (user.tenantId !== tenantId) {
      return [];
    }

    // Verificar se usuário tem role Admin
    // Admin tem todas as permissões, mas retornamos lista vazia
    // pois frontend pode verificar role "Admin" diretamente
    const hasAdminRole = user.userRoles.some((ur) => ur.role.name === 'Admin');
    if (hasAdminRole) {
      // Retornar array vazio - frontend deve verificar role "Admin" para acesso total
      return [];
    }

    // Coletar todas as permissões das roles do usuário
    const permissionsMap = new Map<string, UserPermission>();

    for (const userRole of user.userRoles) {
      const role = userRole.role;

      // Adicionar permissões da role ao mapa (evita duplicatas)
      for (const rolePermission of role.rolePermissions) {
        const permission = rolePermission.permission;

        // Criar chave única para a permissão: entity.action.field
        const permissionKey = `${permission.entity}.${permission.action}${permission.field ? `.${permission.field}` : ''}`;

        // Adicionar ao mapa apenas se ainda não existe
        if (!permissionsMap.has(permissionKey)) {
          permissionsMap.set(permissionKey, {
            entity: permission.entity,
            action: permission.action,
            field: permission.field || undefined,
          });
        }
      }
    }

    // Converter mapa para array
    return Array.from(permissionsMap.values());
  } catch (error) {
    // Em caso de erro, retornar array vazio
    console.error('Erro ao buscar permissões do usuário:', error);
    return [];
  }
}

