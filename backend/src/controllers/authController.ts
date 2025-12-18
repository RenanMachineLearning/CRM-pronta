/**
 * Controller de autenticação
 * 
 * Handlers para rotas de autenticação (login, logout, refresh)
 * Orquestra chamadas ao AuthService e gera tokens JWT
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/authService';
import { TenantService } from '../services/tenantService';
import { PasswordResetService } from '../services/passwordResetService';
import { EmailService } from '../services/emailService';
import { generateToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/password';
import { validatePasswordStrength } from '../utils/password';

const prisma = new PrismaClient();

/**
 * Realiza login de usuário
 * 
 * @param req - Request com email, password no body e tenant no header
 * @param res - Response para retornar token ou erro
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    // Extrair email e password do body
    const { email, password } = req.body;

    // Validar que email foi fornecido
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      res.status(400).json({
        error: 'Email é obrigatório',
        message: 'Forneça um email válido',
      });
      return;
    }

    // Validar que password foi fornecido
    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      res.status(400).json({
        error: 'Senha é obrigatória',
        message: 'Forneça uma senha',
      });
      return;
    }

    // Obter tenantId a partir do header (X-Tenant-Id ou X-Tenant-Slug)
    // IMPORTANTE: Não usar req.tenantId (middleware global não deve rodar no login)
    const tenantId = req.headers['x-tenant-id'] as string;
    const tenantSlug = req.headers['x-tenant-slug'] as string;

    // Resolver tenant manualmente no login (sem depender do middleware global)
    let tenant;
    if (tenantId) {
      tenant = await TenantService.validateById(tenantId);
    } else if (tenantSlug) {
      tenant = await TenantService.validateBySlug(tenantSlug);
    } else {
      // Se nenhum identificador de tenant foi fornecido
      res.status(400).json({
        error: 'Tenant não identificado',
        message: 'Forneça X-Tenant-Id ou X-Tenant-Slug no header',
      });
      return;
    }

    // Se tenant inválido ou inativo, retornar 403 (antes de tentar autenticar)
    if (!tenant) {
      res.status(403).json({
        error: 'Acesso negado',
        message: 'Tenant inválido ou inativo',
      });
      return;
    }

    // Chamar AuthService para autenticar usuário
    const user = await AuthService.authenticateUser(
      email.trim(),
      password,
      tenant.id
    );

    // Se credenciais inválidas, retornar erro genérico (não revelar se email existe)
    if (!user) {
      res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Email ou senha incorretos',
      });
      return;
    }

    // Credenciais válidas - gerar token JWT
    const token = generateToken(user.id, tenant.id);

    // Retornar token
    res.status(200).json({
      token: token,
    });
  } catch (error) {
    // Tratamento de erros inesperados
    console.error('Erro no login:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao processar login',
    });
  }
}

/**
 * Realiza logout de usuário
 * 
 * Para JWT stateless (V1): apenas retorna sucesso.
 * Cliente é responsável por remover token do storage.
 * 
 * @param req - Request
 * @param res - Response para retornar sucesso
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  // Para JWT stateless (V1): apenas retornar sucesso
  // Cliente remove token do storage
  // Não implementar blacklist na V1
  
  res.status(200).json({
    message: 'Logout realizado com sucesso',
  });
}

/**
 * Atualiza token JWT (refresh)
 * 
 * NOTA: Refresh token é opcional na V1 e será implementado na V2.
 * Esta função não será implementada na V1.
 * 
 * @param req - Request com token atual
 * @param res - Response para retornar novo token ou erro
 */
export async function refresh(_req: Request, res: Response): Promise<void> {
  // Refresh token não implementado na V1
  // Será implementado na V2 quando necessário
  
  res.status(501).json({
    error: 'Não implementado',
    message: 'Refresh token será implementado na V2',
  });
}

/**
 * Solicita reset de senha
 * 
 * Gera token de reset e envia email (ou log em DEV).
 * Sempre retorna sucesso para não revelar se email existe.
 * 
 * @param req - Request com email no body e tenant no header
 * @param res - Response para retornar sucesso (sempre)
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    // Extrair email do body
    const { email } = req.body;

    // Validar que email foi fornecido
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      res.status(400).json({
        error: 'Email é obrigatório',
        message: 'Forneça um email válido',
      });
      return;
    }

    // Obter tenantId a partir do header (X-Tenant-Id ou X-Tenant-Slug)
    const tenantId = req.headers['x-tenant-id'] as string;
    const tenantSlug = req.headers['x-tenant-slug'] as string;

    // Resolver tenant manualmente
    let tenant;
    if (tenantId) {
      tenant = await TenantService.validateById(tenantId);
    } else if (tenantSlug) {
      tenant = await TenantService.validateBySlug(tenantSlug);
    } else {
      res.status(400).json({
        error: 'Tenant não identificado',
        message: 'Forneça X-Tenant-Id ou X-Tenant-Slug no header',
      });
      return;
    }

    // Se tenant inválido ou inativo
    if (!tenant) {
      res.status(403).json({
        error: 'Acesso negado',
        message: 'Tenant inválido ou inativo',
      });
      return;
    }

    // Buscar usuário por email e tenantId
    const user = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: email.trim(),
        },
      },
    });

    // Se usuário encontrado e ativo, gerar token e enviar email
    if (user && user.status === 'ACTIVE') {
      try {
        // Gerar token de reset
        const token = await PasswordResetService.generateResetToken(
          user.id,
          tenant.id
        );

        // Enviar email (ou log em DEV)
        await EmailService.sendPasswordResetEmail(
          user.email,
          token,
          tenant.id
        );
      } catch (error) {
        // Tratamento silencioso - não revelar erro
        console.error('Erro ao gerar token de reset:', error);
      }
    }

    // Sempre retornar sucesso (não revelar se email existe)
    res.status(200).json({
      message: 'Se o email existir, você receberá instruções para resetar sua senha',
    });
  } catch (error) {
    // Tratamento de erros inesperados
    console.error('Erro no forgot-password:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao processar solicitação',
    });
  }
}

/**
 * Reseta senha usando token
 * 
 * Valida token, atualiza senha e invalida token.
 * 
 * @param req - Request com token e newPassword no body e tenant no header
 * @param res - Response para retornar sucesso ou erro
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    // Extrair token e newPassword do body
    const { token, newPassword } = req.body;

    // Validar que token foi fornecido
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      res.status(400).json({
        error: 'Token é obrigatório',
        message: 'Forneça um token válido',
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

    // Obter tenantId a partir do header
    const tenantId = req.headers['x-tenant-id'] as string;
    const tenantSlug = req.headers['x-tenant-slug'] as string;

    // Resolver tenant manualmente
    let tenant;
    if (tenantId) {
      tenant = await TenantService.validateById(tenantId);
    } else if (tenantSlug) {
      tenant = await TenantService.validateBySlug(tenantSlug);
    } else {
      res.status(400).json({
        error: 'Tenant não identificado',
        message: 'Forneça X-Tenant-Id ou X-Tenant-Slug no header',
      });
      return;
    }

    // Se tenant inválido ou inativo
    if (!tenant) {
      res.status(403).json({
        error: 'Acesso negado',
        message: 'Tenant inválido ou inativo',
      });
      return;
    }

    // Validar token
    const tokenValidation = await PasswordResetService.validateResetToken(
      token.trim(),
      tenant.id
    );

    // Se token inválido, expirado ou já usado
    if (!tokenValidation) {
      res.status(400).json({
        error: 'Token inválido',
        message: 'Token expirado, inválido ou já utilizado',
      });
      return;
    }

    // Validar complexidade da senha
    if (!validatePasswordStrength(newPassword)) {
      res.status(400).json({
        error: 'Senha inválida',
        message: 'A senha deve ter no mínimo 8 caracteres',
      });
      return;
    }

    // Hash da nova senha
    const passwordHash = await hashPassword(newPassword);

    // Atualizar senha do usuário
    await prisma.user.update({
      where: {
        id: tokenValidation.userId,
      },
      data: {
        passwordHash,
      },
    });

    // Marcar token como usado
    await PasswordResetService.useResetToken(token.trim(), tenant.id);

    // Retornar sucesso
    res.status(200).json({
      message: 'Senha redefinida com sucesso',
    });
  } catch (error) {
    // Tratamento de erros inesperados
    console.error('Erro no reset-password:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao processar reset de senha',
    });
  }
}

/**
 * Altera senha do usuário autenticado
 * 
 * Requer autenticação (token JWT).
 * Valida senha atual, complexidade da nova senha e garante que nova senha seja diferente da atual.
 * 
 * @param req - Request com currentPassword e newPassword no body
 * @param res - Response para retornar sucesso ou erro
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
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

    // Validar complexidade da nova senha
    if (!validatePasswordStrength(newPassword)) {
      res.status(400).json({
        error: 'Senha inválida',
        message: 'A senha deve ter no mínimo 8 caracteres',
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
    console.error('Erro no change-password:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao processar alteração de senha',
    });
  }
}

