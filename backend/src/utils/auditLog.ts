/**
 * Helper para auditoria de alterações
 * 
 * Registra todas as alterações (create, update, delete) em entidades do sistema
 * na tabela AuditLog, garantindo rastreabilidade completa.
 * 
 * IMPORTANTE: Falhas na auditoria não devem impedir a operação principal.
 * Esta função nunca lança erros que interrompam o fluxo.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Tipos para auditoria
 * 
 * Garantem type-safety e evitam typos em entityType e action
 */
export type AuditEntity = 'User' | 'Role' | 'Entity' | 'Field' | 'Relationship' | 'Contact' | 'Company' | 'ContactEmail' | 'ContactPhone' | 'Address' | 'Tag';
export type AuditAction = 'create' | 'update' | 'delete';

/**
 * Registra alteração na tabela AuditLog
 * 
 * IMPORTANTE: Esta função nunca deve lançar erros que impeçam
 * a operação principal. Falhas na auditoria são silenciosamente
 * registradas no console, mas não interrompem o fluxo.
 * 
 * @param entityType - Tipo de entidade (tipado: AuditEntity)
 * @param entityId - ID do registro alterado
 * @param action - Ação realizada (tipado: AuditAction)
 * @param userId - ID do usuário que fez a alteração
 * @param tenantId - ID do tenant (isolamento multi-tenant)
 * @param changes - Objeto com campos alterados no formato { field: { old, new } }
 * 
 * @remarks
 * - Try-catch interno garante que erros não propaguem
 * - Log de erro no console se falhar, mas não lança exceção
 * - Valida parâmetros obrigatórios antes de tentar inserir
 * - Auditoria é assíncrona e não bloqueia operações principais
 * 
 * @example
 * // Criar usuário
 * await logAudit('User', userId, 'create', requestingUserId, tenantId);
 * 
 * // Atualizar usuário
 * await logAudit('User', userId, 'update', requestingUserId, tenantId, {
 *   name: { old: 'João', new: 'João Silva' },
 *   email: { old: 'joao@example.com', new: 'joao.silva@example.com' }
 * });
 * 
 * // Deletar usuário
 * await logAudit('User', userId, 'delete', requestingUserId, tenantId);
 */
export async function logAudit(
  entityType: AuditEntity,
  entityId: string,
  action: AuditAction,
  userId: string,
  tenantId: string,
  changes?: Record<string, { old?: any; new?: any }>
): Promise<void> {
  try {
    // Validar parâmetros obrigatórios
    if (!entityType || !entityId || !action || !userId || !tenantId) {
      console.error('logAudit: Parâmetros obrigatórios não fornecidos', {
        entityType,
        entityId,
        action,
        userId,
        tenantId,
      });
      return;
    }

    // Preparar dados para inserção
    // Prisma Json aceita null, undefined ou objeto JSON válido
    const auditData: any = {
      entityType,
      entityId,
      action,
      userId,
      tenantId,
      timestamp: new Date(),
    };

    // Adicionar changes apenas se fornecido e não vazio
    if (changes && Object.keys(changes).length > 0) {
      auditData.changes = changes;
    }

    // Inserir log de auditoria
    await prisma.auditLog.create({
      data: auditData,
    });
  } catch (error) {
    // IMPORTANTE: Não lançar erro - apenas registrar no console
    // Falhas na auditoria não devem impedir a operação principal
    console.error('Erro ao registrar auditoria (não crítico):', error, {
      entityType,
      entityId,
      action,
      userId,
      tenantId,
    });
  }
}

