/**
 * Controller de tags
 * 
 * Handlers para rotas de gestão de tags (CRUD).
 * Orquestra chamadas ao TagService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { TagService } from '../services/tagService';
import { validateHexColor } from '../utils/validators';

/**
 * Lista tags com paginação e ordenação
 * 
 * @param req - Request com query params (limit, offset, orderBy, order)
 * @param res - Response para retornar lista de tags
 */
export async function listTags(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair query params
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    const orderBy = req.query.orderBy as 'name' | 'createdAt' | undefined;
    const order = req.query.order as 'asc' | 'desc' | undefined;

    // Validar parâmetros se fornecidos
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 1000)) {
      res.status(400).json({
        error: 'limit inválido',
        message: 'limit deve ser um número entre 1 e 1000',
      });
      return;
    }

    if (offset !== undefined && (isNaN(offset) || offset < 0)) {
      res.status(400).json({
        error: 'offset inválido',
        message: 'offset deve ser um número maior ou igual a 0',
      });
      return;
    }

    if (orderBy !== undefined && !['name', 'createdAt'].includes(orderBy)) {
      res.status(400).json({
        error: 'orderBy inválido',
        message: 'orderBy deve ser "name" ou "createdAt"',
      });
      return;
    }

    if (order !== undefined && !['asc', 'desc'].includes(order)) {
      res.status(400).json({
        error: 'order inválido',
        message: 'order deve ser "asc" ou "desc"',
      });
      return;
    }

    // Listar tags
    const tags = await TagService.listTags(tenantId, {
      limit,
      offset,
      orderBy,
      order,
    });

    res.status(200).json(tags);
  } catch (error: any) {
    console.error('Erro ao listar tags:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar tags',
    });
  }
}

/**
 * Cria nova tag
 * 
 * @param req - Request com dados da tag no body
 * @param res - Response para retornar tag criada
 */
export async function createTag(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair dados do body
    const { name, color } = req.body;

    // Validar campos obrigatórios
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        error: 'name inválido',
        message: 'name é obrigatório e deve ser uma string não vazia',
      });
      return;
    }

    // Validar cor se fornecido
    if (color !== undefined && color !== null) {
      if (typeof color !== 'string') {
        res.status(400).json({
          error: 'color inválido',
          message: 'color deve ser uma string',
        });
        return;
      }

      if (!validateHexColor(color)) {
        res.status(400).json({
          error: 'color inválido',
          message: 'color deve ser um formato hexadecimal válido (#RRGGBB ou #RRGGBBAA)',
        });
        return;
      }
    }

    // Criar tag
    const tag = await TagService.createTag(
      {
        name,
        color,
      },
      tenantId,
      userId
    );

    res.status(201).json(tag);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrada') ||
      error.message.includes('não pertence')
    ) {
      res.status(404).json({
        error: 'Tag não encontrada',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('inválido') ||
      error.message.includes('obrigatório') ||
      error.message.includes('duplicado') ||
      error.message.includes('Já existe')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    // Tratar erro de constraint único (nome duplicado)
    if (error.code === 'P2002') {
      res.status(409).json({
        error: 'Conflito',
        message: 'Já existe uma tag com este nome no seu tenant',
      });
      return;
    }

    console.error('Erro ao criar tag:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao criar tag',
    });
  }
}

/**
 * Atualiza tag existente
 * 
 * @param req - Request com tagId nos params e dados no body
 * @param res - Response para retornar tag atualizada
 */
export async function updateTag(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair tagId dos params
    const tagId = req.params.id;

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagId)) {
      res.status(400).json({
        error: 'tagId inválido',
        message: 'tagId deve ser um UUID válido',
      });
      return;
    }

    // Extrair dados do body
    const { name, color } = req.body;

    // Validar campos se fornecidos
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          error: 'name inválido',
          message: 'name deve ser uma string não vazia',
        });
        return;
      }
    }

    if (color !== undefined && color !== null) {
      if (typeof color !== 'string') {
        res.status(400).json({
          error: 'color inválido',
          message: 'color deve ser uma string',
        });
        return;
      }

      if (!validateHexColor(color)) {
        res.status(400).json({
          error: 'color inválido',
          message: 'color deve ser um formato hexadecimal válido (#RRGGBB ou #RRGGBBAA)',
        });
        return;
      }
    }

    // Atualizar tag
    const tag = await TagService.updateTag(
      tagId,
      {
        name,
        color,
      },
      tenantId,
      userId
    );

    res.status(200).json(tag);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrada') ||
      error.message.includes('não pertence')
    ) {
      res.status(404).json({
        error: 'Tag não encontrada',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('inválido') ||
      error.message.includes('obrigatório') ||
      error.message.includes('duplicado') ||
      error.message.includes('Já existe')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    // Tratar erro de constraint único (nome duplicado)
    if (error.code === 'P2002') {
      res.status(409).json({
        error: 'Conflito',
        message: 'Já existe uma tag com este nome no seu tenant',
      });
      return;
    }

    console.error('Erro ao atualizar tag:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar tag',
    });
  }
}

/**
 * Deleta tag
 * 
 * @param req - Request com tagId nos params
 * @param res - Response para retornar sucesso
 */
export async function deleteTag(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair tagId dos params
    const tagId = req.params.id;

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagId)) {
      res.status(400).json({
        error: 'tagId inválido',
        message: 'tagId deve ser um UUID válido',
      });
      return;
    }

    // Deletar tag
    await TagService.deleteTag(tagId, tenantId, userId);

    res.status(200).json({
      message: 'Tag deletada com sucesso',
    });
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrada') ||
      error.message.includes('não pertence')
    ) {
      res.status(404).json({
        error: 'Tag não encontrada',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao deletar tag:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar tag',
    });
  }
}

