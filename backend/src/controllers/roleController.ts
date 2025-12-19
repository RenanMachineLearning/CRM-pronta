/**
 * Controller de roles
 * 
 * Handlers para rotas de gestão de roles (CRUD).
 * Orquestra chamadas ao RoleService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { RoleService } from '../services/roleService';

/**
 * Lista roles do tenant atual
 * 
 * @param req - Request
 * @param res - Response para retornar lista de roles
 */
export async function listRoles(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Buscar roles
    const roles = await RoleService.listRoles(tenantId, userId);

    res.status(200).json({
      data: roles,
    });
  } catch (error: any) {
    console.error('Erro ao listar roles:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar roles',
    });
  }
}

/**
 * Obtém role por ID
 * 
 * @param req - Request com roleId nos params
 * @param res - Response para retornar role
 */
export async function getRole(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const roleId = req.params.id;
    if (!roleId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da role',
      });
      return;
    }

    // Buscar role
    const role = await RoleService.getRoleById(roleId, tenantId, userId);

    if (!role) {
      res.status(404).json({
        error: 'Role não encontrada',
        message: 'Role não encontrada ou não pertence ao tenant',
      });
      return;
    }

    res.status(200).json(role);
  } catch (error: any) {
    console.error('Erro ao buscar role:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar role',
    });
  }
}

/**
 * Cria nova role
 * 
 * @param req - Request com dados da role no body
 * @param res - Response para retornar role criada
 */
export async function createRole(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair dados do body
    const { name, description, permissionIds } = req.body;

    // Validar campos obrigatórios
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        error: 'Nome é obrigatório',
        message: 'Forneça um nome válido',
      });
      return;
    }

    // Validar description se fornecido
    if (description !== undefined && typeof description !== 'string') {
      res.status(400).json({
        error: 'Description inválida',
        message: 'Description deve ser uma string',
      });
      return;
    }

    // Validar permissionIds se fornecido
    if (permissionIds !== undefined && !Array.isArray(permissionIds)) {
      res.status(400).json({
        error: 'permissionIds inválido',
        message: 'permissionIds deve ser um array',
      });
      return;
    }

    // Validar que permissionIds são strings (UUIDs)
    if (permissionIds && permissionIds.some((id: any) => typeof id !== 'string')) {
      res.status(400).json({
        error: 'permissionIds inválido',
        message: 'Todos os IDs de permissões devem ser strings',
      });
      return;
    }

    // Criar role
    const role = await RoleService.createRole(
      {
        name,
        description,
        permissionIds,
      },
      tenantId,
      req.userId!
    );

    res.status(201).json(role);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (error.message.includes('já está em uso')) {
      res.status(409).json({
        error: 'Nome já está em uso',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('permissões não foram encontradas')) {
      res.status(400).json({
        error: 'Permissões inválidas',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao criar role:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao criar role',
    });
  }
}

/**
 * Atualiza role existente
 * 
 * @param req - Request com roleId nos params e dados no body
 * @param res - Response para retornar role atualizada
 */
export async function updateRole(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const roleId = req.params.id;
    if (!roleId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da role',
      });
      return;
    }

    // Extrair dados do body
    const { name, description, permissionIds } = req.body;

    // Validar campos se fornecidos
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({
        error: 'Nome inválido',
        message: 'Nome deve ser uma string não vazia',
      });
      return;
    }

    if (description !== undefined && typeof description !== 'string') {
      res.status(400).json({
        error: 'Description inválida',
        message: 'Description deve ser uma string',
      });
      return;
    }

    // Validar permissionIds se fornecido
    if (permissionIds !== undefined && !Array.isArray(permissionIds)) {
      res.status(400).json({
        error: 'permissionIds inválido',
        message: 'permissionIds deve ser um array',
      });
      return;
    }

    // Validar que permissionIds são strings (UUIDs)
    if (permissionIds && permissionIds.some((id: any) => typeof id !== 'string')) {
      res.status(400).json({
        error: 'permissionIds inválido',
        message: 'Todos os IDs de permissões devem ser strings',
      });
      return;
    }

    // Atualizar role
    const role = await RoleService.updateRole(
      roleId,
      {
        name,
        description,
        permissionIds,
      },
      tenantId,
      userId
    );

    res.status(200).json(role);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (error.message.includes('não encontrada')) {
      res.status(404).json({
        error: 'Role não encontrada',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('já está em uso')) {
      res.status(409).json({
        error: 'Nome já está em uso',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('permissões não foram encontradas')) {
      res.status(400).json({
        error: 'Permissões inválidas',
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

    console.error('Erro ao atualizar role:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar role',
    });
  }
}

/**
 * Deleta role (soft delete)
 * 
 * @param req - Request com roleId nos params
 * @param res - Response para retornar sucesso
 */
export async function deleteRole(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair ID dos params
    const roleId = req.params.id;
    if (!roleId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da role',
      });
      return;
    }

    // Deletar role (soft delete)
    await RoleService.deleteRole(roleId, tenantId, req.userId!);

    res.status(200).json({
      message: 'Role deletada com sucesso',
    });
  } catch (error: any) {
    // Tratar erros específicos do service
    if (error.message.includes('não encontrada')) {
      res.status(404).json({
        error: 'Role não encontrada',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('está em uso')) {
      res.status(409).json({
        error: 'Role em uso',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao deletar role:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar role',
    });
  }
}

