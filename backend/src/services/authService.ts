/**
 * Serviço para autenticação de usuários
 * 
 * Lógica de negócio para validação de credenciais e autenticação.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { User } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { comparePassword } from '../utils/password';


export class AuthService {
  /**
   * Autentica um usuário com email e senha
   * 
   * @param email - Email do usuário
   * @param password - Senha em texto plano
   * @param tenantId - ID do tenant (obrigatório para isolamento multi-tenant)
   * @returns User se credenciais válidas, null caso contrário
   * 
   * @remarks
   * - Sempre retorna null para credenciais inválidas (não revela se email existe)
   * - Valida que usuário está ativo (status ACTIVE)
   * - Compara senha usando hash bcrypt
   * - Tratamento silencioso de erros (segurança)
   * 
   * @example
   * const user = await AuthService.authenticateUser('user@example.com', 'password123', tenantId);
   * if (user) {
   *   // Credenciais válidas
   * }
   */
  static async authenticateUser(
    email: string,
    password: string,
    tenantId: string
  ): Promise<User | null> {
    try {
      // Buscar usuário por email e tenantId
      // Isolamento multi-tenant: sempre filtrar por tenantId
      const user = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: tenantId,
            email: email,
          },
        },
      });

      // Se usuário não encontrado, retornar null (não revelar se email existe)
      if (!user) {
        return null;
      }

      // Validar que usuário está ativo
      if (user.status !== 'ACTIVE') {
        // Retornar null mesmo para usuário inativo (não revelar status)
        return null;
      }

      // Comparar senha fornecida com hash armazenado
      const isPasswordValid = await comparePassword(password, user.passwordHash);

      // Se senha inválida, retornar null (não revelar se email existe)
      if (!isPasswordValid) {
        return null;
      }

      // Credenciais válidas - retornar usuário
      return user;
    } catch (error) {
      // Tratamento silencioso de erros
      // Não logar senhas ou detalhes sensíveis
      // Retornar null para qualquer erro (segurança)
      return null;
    }
  }
}

