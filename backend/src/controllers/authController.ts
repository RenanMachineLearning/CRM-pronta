/**
 * Controller de autenticação
 * 
 * Handlers para rotas de autenticação (login, logout, refresh)
 * Orquestra chamadas ao AuthService e gera tokens JWT
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { TenantService } from '../services/tenantService';
import { generateToken } from '../utils/jwt';

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

