/**
 * Helpers para ordenação de entidades
 *
 * Fornece funções utilitárias para:
 * - Validação de campos e direções de ordenação
 * - Construção de objetos orderBy para Prisma
 * - Processamento de parâmetros de query string
 * - Suporte a ordenação simples e múltipla
 */

import { ENTITY_ORDER_CONFIGS } from '../types/orderBy.types';

/**
 * Erro customizado para validação de ordenação
 */
export class OrderByError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'ORDER_BY_ERROR'
  ) {
    super(message);
    this.name = 'OrderByError';
    Object.setPrototypeOf(this, OrderByError.prototype);
  }
}

/**
 * Valida campo de ordenação para uma entidade
 *
 * @param field - Nome do campo a validar
 * @param entityType - Tipo da entidade (lowercase: 'contact', 'company', etc.)
 * @returns true se o campo é válido para ordenação
 */
export function validateOrderField(
  field: string,
  entityType: string
): boolean {
  const config = ENTITY_ORDER_CONFIGS[entityType];
  if (!config) {
    return false;
  }
  return config.fields.some((f) => f.field === field);
}

/**
 * Valida direção de ordenação
 *
 * @param direction - Direção a validar
 * @returns true se a direção é válida ('asc' ou 'desc')
 */
export function validateOrderDirection(
  direction: string
): direction is 'asc' | 'desc' {
  return direction === 'asc' || direction === 'desc';
}

/**
 * Constrói objeto orderBy para Prisma a partir de parâmetros de ordenação
 *
 * @param sortBy - Campo(s) para ordenação (string ou array de strings)
 * @param sortOrder - Direção(ões) da ordenação (string ou array de strings)
 * @param entityType - Tipo da entidade (lowercase: 'contact', 'company', etc.)
 * @returns Objeto orderBy compatível com Prisma ou array para ordenação múltipla
 *
 * @example
 * // Ordenação simples
 * buildOrderBy('firstName', 'asc', 'contact')
 * → { firstName: 'asc' }
 *
 * // Ordenação múltipla
 * buildOrderBy(['companyId', 'firstName'], ['asc', 'asc'], 'contact')
 * → [{ companyId: 'asc' }, { firstName: 'asc' }]
 */
export function buildOrderBy(
  sortBy?: string | string[],
  sortOrder?: string | string[],
  entityType?: string
): any {
  const config = entityType ? ENTITY_ORDER_CONFIGS[entityType] : undefined;

  // Se não há sortBy, retornar ordenação padrão
  if (!sortBy) {
    if (config) {
      return { [config.defaultField]: config.defaultOrder };
    }
    return { createdAt: 'desc' };
  }

  // Normalizar para arrays
  const fields = Array.isArray(sortBy) ? sortBy : [sortBy];
  const orders = Array.isArray(sortOrder) ? sortOrder : [sortOrder || 'asc'];

  // Função auxiliar para construir o resultado
  function buildResult(orders: string[], fields: string[]) {
    // Validar e construir orderBy
    const orderByItems: any[] = [];

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const order = orders[i];

      // Validar direção
      if (!validateOrderDirection(order)) {
        throw new OrderByError(
          `Direção de ordenação inválida: ${order}. Use 'asc' ou 'desc'`,
          400,
          'INVALID_ORDER_DIRECTION'
        );
      }

      // Validar campo se entityType fornecido
      if (config && entityType && !validateOrderField(field, entityType)) {
        throw new OrderByError(
          `Campo de ordenação inválido para ${entityType}: ${field}`,
          400,
          'INVALID_ORDER_FIELD'
        );
      }

      orderByItems.push({ [field]: order });
    }

    // Retornar objeto único ou array para múltipla
    return orderByItems.length === 1 ? orderByItems[0] : orderByItems;
  }

  // Se houver mais campos do que direções:
  // - Se apenas 1 direção foi especificada, usá-la para todos os campos
  // - Se múltiplas direções foram especificadas mas não suficientes, lançar erro
  if (orders.length < fields.length) {
    if (orders.length === 1) {
      // Se apenas 1 direção foi especificada, usá-la para todos os campos
      const order = orders[0];
      const filledOrders = [order];
      for (let i = 1; i < fields.length; i++) {
        filledOrders.push(order);
      }
      return buildResult(filledOrders, fields);
    } else {
      // Se múltiplas direções foram especificadas mas não suficientes, lançar erro
      throw new OrderByError(
        'sortBy e sortOrder devem ter o mesmo tamanho quando usados como arrays',
        400,
        'INVALID_ARRAY_SIZE'
      );
    }
  }

  // Se chegou até aqui, arrays têm o mesmo tamanho ou orders é maior
  return buildResult(orders, fields);
}

/**
 * Processa parâmetros de ordenação do query string
 * Suporta tanto sortBy/sortOrder (novo) quanto orderBy/order (legado)
 *
 * @param query - Query string do request
 * @param entityType - Tipo da entidade
 * @returns Objeto orderBy para Prisma
 */
export function processOrderByParams(
  query: any,
  entityType: string
): any {
  // Priorizar sortBy/sortOrder (novo padrão)
  const sortBy = query.sortBy || query.orderBy;
  const sortOrder = query.sortOrder || query.order;

  // Processar sortBy como string ou array
  let sortByValue: string | string[] | undefined;
  if (sortBy) {
    if (typeof sortBy === 'string' && sortBy.includes(',')) {
      sortByValue = sortBy.split(',').map((s) => s.trim());
    } else {
      sortByValue = sortBy;
    }
  }

  // Processar sortOrder como string ou array
  let sortOrderValue: string | string[] | undefined;
  if (sortOrder) {
    if (typeof sortOrder === 'string' && sortOrder.includes(',')) {
      sortOrderValue = sortOrder.split(',').map((s) => s.trim());
    } else {
      sortOrderValue = sortOrder;
    }
  }

  return buildOrderBy(sortByValue, sortOrderValue, entityType);
}
