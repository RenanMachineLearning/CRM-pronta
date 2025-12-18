/**
 * Serviço para reset de senha
 * 
 * Lógica de negócio para geração, validação e uso de tokens de reset de senha.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export class PasswordResetService {
  /**
   * Gera um token de reset de senha para um usuário
   * 
   * @param userId - ID do usuário
   * @param tenantId - ID do tenant (obrigatório para isolamento multi-tenant)
   * @returns Token gerado (UUID)
   * 
   * @remarks
   * - Gera UUID único para token
   * - Token expira em 1 hora
   * - Invalida tokens anteriores do mesmo usuário (opcional)
   * - Isolamento multi-tenant garantido
   */
  static async generateResetToken(
    userId: string,
    tenantId: string
  ): Promise<string> {
    try {
      // Gerar UUID único para token
      const token = randomUUID();

      // Calcular expiração (1 hora a partir de agora)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Invalidar tokens anteriores do mesmo usuário (opcional, mas recomendado)
      await this.invalidateUserTokens(userId, tenantId);

      // Salvar token no banco
      await prisma.passwordResetToken.create({
        data: {
          token,
          userId,
          tenantId,
          expiresAt,
          usedAt: null,
        },
      });

      return token;
    } catch (error) {
      console.error('Erro ao gerar token de reset:', error);
      throw new Error('Falha ao gerar token de reset');
    }
  }

  /**
   * Valida um token de reset de senha
   * 
   * @param token - Token a ser validado
   * @param tenantId - ID do tenant (obrigatório para isolamento multi-tenant)
   * @returns Objeto com userId se válido, null caso contrário
   * 
   * @remarks
   * - Valida que token existe
   * - Valida que token não expirou
   * - Valida que token não foi usado
   * - Isolamento multi-tenant garantido
   */
  static async validateResetToken(
    token: string,
    tenantId: string
  ): Promise<{ userId: string } | null> {
    try {
      // Buscar token no banco (com tenantId para isolamento)
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: {
          token,
        },
      });

      // Validar que token existe
      if (!resetToken) {
        return null;
      }

      // Validar isolamento multi-tenant
      if (resetToken.tenantId !== tenantId) {
        return null;
      }

      // Validar que token não expirou
      const now = new Date();
      if (resetToken.expiresAt < now) {
        return null;
      }

      // Validar que token não foi usado
      if (resetToken.usedAt !== null) {
        return null;
      }

      // Token válido
      return { userId: resetToken.userId };
    } catch (error) {
      console.error('Erro ao validar token de reset:', error);
      return null;
    }
  }

  /**
   * Marca um token de reset como usado
   * 
   * @param token - Token a ser marcado como usado
   * @param tenantId - ID do tenant (obrigatório para isolamento multi-tenant)
   * 
   * @remarks
   * - Marca token como usado (usedAt = now())
   * - Previne reutilização do token
   * - Isolamento multi-tenant garantido
   */
  static async useResetToken(
    token: string,
    tenantId: string
  ): Promise<void> {
    try {
      // Marcar token como usado
      await prisma.passwordResetToken.updateMany({
        where: {
          token,
          tenantId, // Isolamento multi-tenant
          usedAt: null, // Apenas tokens não usados
        },
        data: {
          usedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Erro ao marcar token como usado:', error);
      // Não lançar erro - token pode já ter sido usado
    }
  }

  /**
   * Invalida todos os tokens ativos de um usuário
   * 
   * @param userId - ID do usuário
   * @param tenantId - ID do tenant (obrigatório para isolamento multi-tenant)
   * 
   * @remarks
   * - Marca todos os tokens não usados como usados
   * - Útil ao gerar novo token (invalida tokens anteriores)
   * - Isolamento multi-tenant garantido
   */
  static async invalidateUserTokens(
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      // Invalidar todos os tokens não usados do usuário
      await prisma.passwordResetToken.updateMany({
        where: {
          userId,
          tenantId, // Isolamento multi-tenant
          usedAt: null, // Apenas tokens não usados
        },
        data: {
          usedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Erro ao invalidar tokens do usuário:', error);
      // Não lançar erro - pode não haver tokens para invalidar
    }
  }
}

