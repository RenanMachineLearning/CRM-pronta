/**
 * Controller para gestão de perfil do usuário
 * 
 * Permite ao usuário autenticado visualizar e atualizar seus próprios dados,
 * incluindo alteração de senha.
 */

import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { UserService } from '../services/userService';
import { getUserPermissions } from '../utils/permissions';
import { comparePassword, hashPassword, validatePasswordPolicy } from '../utils/password';


/**
 * Campos que devem ser excluídos da resposta do perfil
 * 
 * Lista explícita de campos sensíveis que nunca devem ser retornados
 * ao usuário, mesmo em seu próprio perfil. Isso evita vazamento futuro
 * se novos campos sensíveis surgirem e previne esquecimento em refactors.
 */
const EXCLUDED_FIELDS = ['passwordHash'];

/**
 * Interface para resposta do perfil do usuário
 * 
 * Inclui dados do usuário, roles e permissões para facilitar
 * controle de acesso no frontend.
 */
export interface ProfileResponse {
  id: string;
  email: string;
  name: string;
  status: string;
  roles: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
  permissions: Array<{
    entity: string;
    action: string;
    field?: string | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Busca perfil do usuário autenticado
 * 
 * Retorna dados completos do usuário (exceto campos sensíveis),
 * incluindo roles e permissões. Permissões por campo NÃO se aplicam
 * em GET /api/auth/me (regra especial de perfil próprio).
 * 
 * @param req - Request com userId e tenantId dos middlewares
 * @param res - Response para retornar perfil ou erro
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    // Obter userId e tenantId dos middlewares
    const userId = req.userId;
    const tenantId = req.tenantId;

    // Validar que userId e tenantId estão disponíveis (middlewares rodaram)
    if (!userId) {
      res.status(401).json({
        error: 'Não autenticado',
        message: 'Token de autenticação necessário',
      });
      return;
    }

    if (!tenantId) {
      res.status(400).json({
        error: 'Contexto de tenant ausente',
        message: 'Tenant context deve ser processado antes da autenticação',
      });
      return;
    }

    // Buscar dados do usuário
    // NOTA: Não passamos requestingUserId para getUserById, pois queremos
    // retornar todos os campos (exceto sensíveis) sem aplicar filtros de permissão
    const user = await UserService.getUserById(userId, tenantId);

    if (!user) {
      res.status(404).json({
        error: 'Usuário não encontrado',
        message: 'Perfil não encontrado',
      });
      return;
    }

    // Buscar permissões do usuário
    const permissions = await getUserPermissions(userId, tenantId);

    // Montar resposta do perfil
    // Excluir campos sensíveis explicitamente
    const profileResponse: ProfileResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      roles: user.roles,
      permissions: permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Garantir que campos sensíveis não sejam incluídos (defensivo)
    for (const field of EXCLUDED_FIELDS) {
      delete (profileResponse as any)[field];
    }

    // Retornar perfil
    res.status(200).json(profileResponse);
  } catch (error) {
    // Tratamento de erros inesperados
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao processar solicitação',
    });
  }
}

/**
 * Atualiza perfil do usuário autenticado
 * 
 * Permite atualizar apenas name e email. Status e roles não podem
 * ser alterados pelo próprio usuário (apenas por admin).
 * 
 * @param req - Request com userId, tenantId e body (name?, email?)
 * @param res - Response para retornar perfil atualizado ou erro
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    // Obter userId e tenantId dos middlewares
    const userId = req.userId;
    const tenantId = req.tenantId;

    // Validar que userId e tenantId estão disponíveis (middlewares rodaram)
    if (!userId) {
      res.status(401).json({
        error: 'Não autenticado',
        message: 'Token de autenticação necessário',
      });
      return;
    }

    if (!tenantId) {
      res.status(400).json({
        error: 'Contexto de tenant ausente',
        message: 'Tenant context deve ser processado antes da autenticação',
      });
      return;
    }

    // Extrair dados do body
    const { name, email } = req.body;

    // Validar que pelo menos um campo foi fornecido
    if (name === undefined && email === undefined) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'Forneça pelo menos um campo para atualizar (name ou email)',
      });
      return;
    }

    // Validar tipos
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'Nome deve ser uma string não vazia',
      });
      return;
    }

    if (email !== undefined && (typeof email !== 'string' || email.trim().length === 0)) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'Email deve ser uma string não vazia',
      });
      return;
    }

    // Preparar dados para atualização (apenas name e email)
    const updateData: { name?: string; email?: string } = {};
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (email !== undefined) {
      updateData.email = email.trim().toLowerCase();
    }

    // Atualizar perfil usando UserService
    // NOTA: Não passamos requestingUserId para updateUser, pois queremos
    // permitir que o usuário atualize seus próprios dados básicos sem
    // validação de permissões de campo (regra especial de perfil próprio)
    const updatedUser = await UserService.updateUser(userId, updateData, tenantId);

    // Buscar permissões atualizadas
    const permissions = await getUserPermissions(userId, tenantId);

    // Montar resposta do perfil atualizado
    const profileResponse: ProfileResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      status: updatedUser.status,
      roles: updatedUser.roles,
      permissions: permissions,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    // Garantir que campos sensíveis não sejam incluídos (defensivo)
    for (const field of EXCLUDED_FIELDS) {
      delete (profileResponse as any)[field];
    }

    // Retornar perfil atualizado
    res.status(200).json(profileResponse);
  } catch (error: any) {
    // Tratamento de erros específicos
    if (error.message === 'Usuário não encontrado') {
      res.status(404).json({
        error: 'Usuário não encontrado',
        message: 'Perfil não encontrado',
      });
      return;
    }

    if (error.message === 'Email já está em uso neste tenant') {
      res.status(409).json({
        error: 'Email já está em uso',
        message: 'Este email já está sendo usado por outro usuário',
      });
      return;
    }

    // Tratamento de erros inesperados
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao processar atualização',
    });
  }
}

/**
 * Atualiza senha do usuário autenticado
 * 
 * Reutiliza toda a lógica de changePassword do authController:
 * - Valida senha atual
 * - Valida que nova senha é diferente da atual
 * - Valida complexidade da nova senha
 * - Atualiza senha no banco
 * 
 * @param req - Request com userId, tenantId e body (currentPassword, newPassword)
 * @param res - Response para retornar sucesso ou erro
 */
export async function updatePassword(req: Request, res: Response): Promise<void> {
  try {
    // Extrair currentPassword e newPassword do body
    const { currentPassword, newPassword } = req.body;

    // Validar que currentPassword foi fornecido
    if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.trim().length === 0) {
      res.status(400).json({
        error: 'Senha atual é obrigatória',
        message: 'Forneça a senha atual',
      });
      return;
    }

    // Validar que newPassword foi fornecido
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length === 0) {
      res.status(400).json({
        error: 'Nova senha é obrigatória',
        message: 'Forneça uma nova senha',
      });
      return;
    }

    // Obter userId e tenantId dos middlewares
    const userId = req.userId;
    const tenantId = req.tenantId;

    // Validar que userId e tenantId estão disponíveis (middlewares rodaram)
    if (!userId) {
      res.status(401).json({
        error: 'Não autenticado',
        message: 'Token de autenticação necessário',
      });
      return;
    }

    if (!tenantId) {
      res.status(400).json({
        error: 'Contexto de tenant ausente',
        message: 'Tenant context deve ser processado antes da autenticação',
      });
      return;
    }

    // Buscar usuário no banco (com tenantId para isolamento)
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    // Validar que usuário existe e pertence ao tenant correto
    if (!user || user.tenantId !== tenantId) {
      res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Usuário não encontrado',
      });
      return;
    }

    // Validar senha atual usando comparePassword
    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.passwordHash
    );

    // Se senha atual incorreta, retornar erro genérico (não revelar qual validação falhou)
    if (!isCurrentPasswordValid) {
      res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Credenciais inválidas',
      });
      return;
    }

    // Validar que nova senha é diferente da atual
    const isNewPasswordSame = await comparePassword(newPassword, user.passwordHash);
    if (isNewPasswordSame) {
      res.status(400).json({
        error: 'Nova senha inválida',
        message: 'Nova senha deve ser diferente da atual',
      });
      return;
    }

    // Validar complexidade da nova senha usando validatePasswordPolicy
    // Caractere especial não é exigido na V1 (padrão: false)
    const passwordValidation = validatePasswordPolicy(newPassword, false);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: 'Senha inválida',
        message: `A senha não atende aos requisitos: ${passwordValidation.errors.join(', ')}`,
        errors: passwordValidation.errors, // Detalhes para frontend
      });
      return;
    }

    // Hash da nova senha
    const passwordHash = await hashPassword(newPassword);

    // Atualizar senha do usuário no banco
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash,
      },
    });

    // Retornar sucesso
    // Nota V2: Após troca de senha, considerar invalidar refresh tokens/sessões ativas
    res.status(200).json({
      message: 'Senha alterada com sucesso',
    });
  } catch (error) {
    // Tratamento de erros inesperados
    console.error('Erro ao atualizar senha:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao processar alteração de senha',
    });
  }
}

