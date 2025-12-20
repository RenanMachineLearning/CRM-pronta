/**
 * Helpers para permissões por campo
 * 
 * Funções para filtrar campos em respostas GET e validar permissões em updates,
 * garantindo que usuários sem permissão não vejam nem atualizem campos restritos.
 * 
 * Regras:
 * - Permissão específica de campo: entity.action.field (ex: Opportunity.read.value)
 * - Permissão de entidade: entity.action (field = null) cobre todos os campos
 * - Admin sempre tem acesso total (verificado em checkPermission)
 * - Campos sempre permitidos: id, tenantId, createdAt, updatedAt
 */

import { checkPermission } from './permissions';

/**
 * Campos que sempre são permitidos (metadados básicos)
 * Não são filtrados mesmo sem permissão específica
 */
const ALWAYS_ALLOWED_FIELDS = new Set(['id', 'tenantId', 'createdAt', 'updatedAt']);

/**
 * Verifica se um valor é um campo primitivo (não relacionamento)
 * 
 * @param value - Valor a ser verificado
 * @returns true se for campo primitivo, false caso contrário
 */
function isPrimitiveField(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  );
}

/**
 * Filtra campos de um objeto baseado em permissões do usuário
 * 
 * @param obj - Objeto a ser filtrado
 * @param userId - ID do usuário
 * @param tenantId - ID do tenant
 * @param entity - Nome da entidade (ex: "User", "Role", "Opportunity")
 * @param action - Ação (ex: "read", "update")
 * @returns Objeto com campos filtrados
 */
async function filterObjectFields<T extends Record<string, any>>(
  obj: T,
  userId: string,
  tenantId: string,
  entity: string,
  action: 'read' | 'update'
): Promise<T> {
  // Verificar se usuário é Admin (tem todas as permissões)
  const isAdmin = await checkPermission(userId, tenantId, entity, action);
  if (isAdmin) {
    // Admin sempre vê todos os campos
    return obj;
  }

  // Criar cópia do objeto para não modificar o original
  const filtered: any = {};

  // Iterar sobre todos os campos do objeto
  for (const [key, value] of Object.entries(obj)) {
    // Campos sempre permitidos são mantidos
    if (ALWAYS_ALLOWED_FIELDS.has(key)) {
      filtered[key] = value;
      continue;
    }

    // Ignorar campos de relacionamento (arrays, objetos complexos)
    if (!isPrimitiveField(value)) {
      // Manter campos de relacionamento sem filtro (por enquanto)
      filtered[key] = value;
      continue;
    }

    // Verificar permissão específica do campo
    const hasFieldPermission = await checkPermission(
      userId,
      tenantId,
      entity,
      action,
      key
    );

    if (hasFieldPermission) {
      // Tem permissão específica do campo
      filtered[key] = value;
      continue;
    }

    // Verificar permissão de entidade (field = null)
    const hasEntityPermission = await checkPermission(
      userId,
      tenantId,
      entity,
      action,
      null
    );

    if (hasEntityPermission) {
      // Tem permissão de entidade (cobre todos os campos)
      filtered[key] = value;
      continue;
    }

    // Sem permissão - campo é removido (não adicionado ao filtered)
  }

  return filtered as T;
}

/**
 * Filtra campos de dados baseado em permissões do usuário
 * 
 * Remove campos que o usuário não tem permissão de ler/atualizar.
 * 
 * @param data - Dados a serem filtrados (objeto ou array de objetos)
 * @param userId - ID do usuário
 * @param tenantId - ID do tenant
 * @param entity - Nome da entidade (ex: "User", "Role", "Opportunity")
 * @param action - Ação (ex: "read", "update")
 * @returns Dados filtrados (mesmo tipo do input)
 * 
 * @example
 * const user = await UserService.getUserById(userId, tenantId);
 * const filteredUser = await filterFieldsByPermission(
 *   user,
 *   req.userId!,
 *   tenantId,
 *   'User',
 *   'read'
 * );
 */
export async function filterFieldsByPermission<T extends Record<string, any>>(
  data: T | T[],
  userId: string,
  tenantId: string,
  entity: string,
  action: 'read' | 'update'
): Promise<T | T[]> {
  // Se for array, aplicar filtro em cada item
  if (Array.isArray(data)) {
    const filtered = await Promise.all(
      data.map((item) => filterObjectFields(item, userId, tenantId, entity, action))
    );
    return filtered as T[];
  }

  // Se for objeto, aplicar filtro no objeto
  return filterObjectFields(data, userId, tenantId, entity, action);
}

/**
 * Valida se usuário pode atualizar campos específicos
 * 
 * Verifica cada campo do objeto e retorna lista de campos proibidos.
 * 
 * @param fields - Objeto com campos a serem atualizados
 * @param userId - ID do usuário
 * @param tenantId - ID do tenant
 * @param entity - Nome da entidade (ex: "User", "Role", "Opportunity")
 * @returns Objeto com allowed (boolean) e forbiddenFields (string[])
 * 
 * @example
 * const validation = await validateFieldPermissionsForUpdate(
 *   req.body,
 *   req.userId!,
 *   tenantId,
 *   'User'
 * );
 * if (!validation.allowed) {
 *   return res.status(403).json({
 *     error: 'Acesso negado',
 *     message: `Você não tem permissão para atualizar os seguintes campos: ${validation.forbiddenFields.join(', ')}`
 *   });
 * }
 */
export async function validateFieldPermissionsForUpdate(
  fields: Record<string, any>,
  userId: string,
  tenantId: string,
  entity: string
): Promise<{ allowed: boolean; forbiddenFields: string[] }> {
  // Verificar se usuário é Admin (tem todas as permissões)
  const isAdmin = await checkPermission(userId, tenantId, entity, 'update');
  if (isAdmin) {
    // Admin sempre pode atualizar todos os campos
    return {
      allowed: true,
      forbiddenFields: [],
    };
  }

  const forbiddenFields: string[] = [];

  // Iterar sobre todos os campos do objeto
  for (const [key, value] of Object.entries(fields)) {
    // Campos sempre permitidos não precisam verificação
    if (ALWAYS_ALLOWED_FIELDS.has(key)) {
      continue;
    }

    // Ignorar campos de relacionamento (arrays, objetos complexos)
    // Por enquanto, não validamos permissões de relacionamento
    if (!isPrimitiveField(value)) {
      continue;
    }

    // Verificar permissão específica do campo
    const hasFieldPermission = await checkPermission(
      userId,
      tenantId,
      entity,
      'update',
      key
    );

    if (hasFieldPermission) {
      // Tem permissão específica do campo
      continue;
    }

    // Verificar permissão de entidade (field = null)
    const hasEntityPermission = await checkPermission(
      userId,
      tenantId,
      entity,
      'update',
      null
    );

    if (hasEntityPermission) {
      // Tem permissão de entidade (cobre todos os campos)
      continue;
    }

    // Sem permissão - adicionar à lista de campos proibidos
    forbiddenFields.push(key);
  }

  return {
    allowed: forbiddenFields.length === 0,
    forbiddenFields,
  };
}

