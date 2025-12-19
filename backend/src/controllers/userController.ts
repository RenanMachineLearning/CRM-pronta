/**
 * Controller de usuários
 * 
 * Handlers para rotas de gestão de usuários (CRUD).
 * Orquestra chamadas ao UserService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { UserService } from '../services/userService';

/**
 * Lista usuários com paginação e filtros
 * 
 * @param req - Request com query params (limit, offset, status, roleId)
 * @param res - Response para retornar lista de usuários
 */
export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair query params
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    const status = req.query.status as string | undefined;
    const roleId = req.query.roleId as string | undefined;

    // Validar limit
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'limit deve ser um número entre 1 e 100',
      });
      return;
    }

    // Validar offset
    if (offset !== undefined && (isNaN(offset) || offset < 0)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'offset deve ser um número maior ou igual a 0',
      });
      return;
    }

    // Validar status
    if (status && !['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(status)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'status deve ser ACTIVE, INACTIVE ou BLOCKED',
      });
      return;
    }

    // userId já validado pelo middleware
    const userId = req.userId!;

    // Buscar usuários
    const result = await UserService.listUsers(
      tenantId,
      {
        status: status as any,
        roleId,
      },
      {
        limit,
        offset,
      },
      userId
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar usuários',
    });
  }
}

/**
 * Obtém usuário por ID
 * 
 * @param req - Request com userId nos params
 * @param res - Response para retornar usuário
 */
export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const targetUserId = req.params.id;
    if (!targetUserId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do usuário',
      });
      return;
    }

    // Buscar usuário
    const user = await UserService.getUserById(targetUserId, tenantId, userId);

    if (!user) {
      res.status(404).json({
        error: 'Usuário não encontrado',
        message: 'Usuário não encontrado ou não pertence ao tenant',
      });
      return;
    }

    res.status(200).json(user);
  } catch (error: any) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar usuário',
    });
  }
}

/**
 * Cria novo usuário
 * 
 * @param req - Request com dados do usuário no body
 * @param res - Response para retornar usuário criado
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair dados do body
    const { email, name, password, roleIds } = req.body;

    // Validar campos obrigatórios
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      res.status(400).json({
        error: 'Email é obrigatório',
        message: 'Forneça um email válido',
      });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        error: 'Nome é obrigatório',
        message: 'Forneça um nome válido',
      });
      return;
    }

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      res.status(400).json({
        error: 'Senha é obrigatória',
        message: 'Forneça uma senha',
      });
      return;
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: 'Email inválido',
        message: 'Forneça um email válido',
      });
      return;
    }

    // Validar roleIds se fornecido
    if (roleIds !== undefined && !Array.isArray(roleIds)) {
      res.status(400).json({
        error: 'roleIds inválido',
        message: 'roleIds deve ser um array',
      });
      return;
    }

    // Criar usuário
    const user = await UserService.createUser(
      {
        email,
        name,
        password,
        roleIds,
      },
      tenantId
    );

    res.status(201).json(user);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (error.message.includes('já está em uso')) {
      res.status(409).json({
        error: 'Email já está em uso',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('Senha inválida')) {
      res.status(400).json({
        error: 'Senha inválida',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('roles não foram encontradas')) {
      res.status(400).json({
        error: 'Roles inválidas',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao criar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao criar usuário',
    });
  }
}

/**
 * Atualiza usuário existente
 * 
 * @param req - Request com userId nos params e dados no body
 * @param res - Response para retornar usuário atualizado
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const targetUserId = req.params.id;
    if (!targetUserId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do usuário',
      });
      return;
    }

    // Extrair dados do body
    const { name, email, status, roleIds } = req.body;

    // Validar campos se fornecidos
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({
        error: 'Nome inválido',
        message: 'Nome deve ser uma string não vazia',
      });
      return;
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || email.trim().length === 0) {
        res.status(400).json({
          error: 'Email inválido',
          message: 'Email deve ser uma string não vazia',
        });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          error: 'Email inválido',
          message: 'Forneça um email válido',
        });
        return;
      }
    }

    if (status !== undefined && !['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(status)) {
      res.status(400).json({
        error: 'Status inválido',
        message: 'Status deve ser ACTIVE, INACTIVE ou BLOCKED',
      });
      return;
    }

    // Validar roleIds se fornecido
    if (roleIds !== undefined && !Array.isArray(roleIds)) {
      res.status(400).json({
        error: 'roleIds inválido',
        message: 'roleIds deve ser um array',
      });
      return;
    }

    // Atualizar usuário
    const user = await UserService.updateUser(
      targetUserId,
      {
        name,
        email,
        status,
        roleIds,
      },
      tenantId,
      userId
    );

    res.status(200).json(user);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (error.message.includes('não encontrado')) {
      res.status(404).json({
        error: 'Usuário não encontrado',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('já está em uso')) {
      res.status(409).json({
        error: 'Email já está em uso',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('roles não foram encontradas')) {
      res.status(400).json({
        error: 'Roles inválidas',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('não tem permissão para atualizar os seguintes campos')) {
      res.status(403).json({
        error: 'Acesso negado',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar usuário',
    });
  }
}

/**
 * Deleta usuário (soft delete)
 * 
 * @param req - Request com userId nos params
 * @param res - Response para retornar sucesso
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair ID dos params
    const targetUserId = req.params.id;
    if (!targetUserId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do usuário',
      });
      return;
    }

    // Deletar usuário (soft delete)
    await UserService.deleteUser(targetUserId, tenantId);

    res.status(200).json({
      message: 'Usuário deletado com sucesso',
    });
  } catch (error: any) {
    // Tratar erros específicos do service
    if (error.message.includes('não encontrado')) {
      res.status(404).json({
        error: 'Usuário não encontrado',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar usuário',
    });
  }
}

