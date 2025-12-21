/**
 * Controller de entidades (metadados)
 * 
 * Handlers para rotas de gestão de entidades (CRUD).
 * Orquestra chamadas ao EntityService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { EntityService, CreateEntityData, UpdateEntityData } from '../services/entityService';
import { logAudit } from '../utils/auditLog';

/**
 * Lista entidades do tenant com contagem de campos
 * 
 * @param req - Request (tenantId já validado pelo middleware)
 * @param res - Response para retornar lista de entidades
 */
export async function listEntities(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Buscar entidades
    const entities = await EntityService.listEntities(tenantId);

    res.status(200).json(entities);
  } catch (error: any) {
    console.error('Erro ao listar entidades:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar entidades',
    });
  }
}

/**
 * Obtém entidade por ID com campos e relacionamentos
 * 
 * @param req - Request com entityId nos params
 * @param res - Response para retornar entidade
 */
export async function getEntity(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair ID dos params
    const entityId = req.params.id;
    if (!entityId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da entidade',
      });
      return;
    }

    // Buscar entidade
    const entity = await EntityService.getEntityById(tenantId, entityId);

    res.status(200).json(entity);
  } catch (error: any) {
    if (error.message === 'Entidade não encontrada') {
      res.status(404).json({
        error: 'Entidade não encontrada',
        message: 'Entidade não encontrada ou não pertence ao tenant',
      });
      return;
    }

    console.error('Erro ao buscar entidade:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar entidade',
    });
  }
}

/**
 * Cria nova entidade customizada
 * 
 * @param req - Request com dados da entidade no body
 * @param res - Response para retornar entidade criada
 */
export async function createEntity(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair dados do body
    const { name, label } = req.body;

    // Validar campos obrigatórios
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        error: 'Nome é obrigatório',
        message: 'Forneça um nome válido para a entidade',
      });
      return;
    }

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      res.status(400).json({
        error: 'Label é obrigatório',
        message: 'Forneça um label válido para a entidade',
      });
      return;
    }

    // Criar entidade
    const data: CreateEntityData = { name: name.trim(), label: label.trim() };
    const entity = await EntityService.createEntity(tenantId, data);

    // Registrar auditoria (não bloqueia se falhar)
    await logAudit('Entity', entity.id, 'create', userId, tenantId);

    res.status(201).json(entity);
  } catch (error: any) {
    if (error.message === 'Nome da entidade já existe neste tenant') {
      res.status(409).json({
        error: 'Nome duplicado',
        message: 'Já existe uma entidade com este nome neste tenant',
      });
      return;
    }

    if (error.message.includes('Nome da entidade deve começar')) {
      res.status(400).json({
        error: 'Nome inválido',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao criar entidade:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao criar entidade',
    });
  }
}

/**
 * Atualiza entidade (apenas label, name não pode ser alterado)
 * 
 * @param req - Request com entityId nos params e dados no body
 * @param res - Response para retornar entidade atualizada
 */
export async function updateEntity(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const entityId = req.params.id;
    if (!entityId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da entidade',
      });
      return;
    }

    // Extrair dados do body
    const { label } = req.body;

    // Validar campo obrigatório
    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      res.status(400).json({
        error: 'Label é obrigatório',
        message: 'Forneça um label válido para a entidade',
      });
      return;
    }

    // Buscar entidade atual para auditoria
    const existing = await EntityService.getEntityById(tenantId, entityId);
    const oldLabel = existing.label;

    // Atualizar entidade
    const data: UpdateEntityData = { label: label.trim() };
    const entity = await EntityService.updateEntity(tenantId, entityId, data);

    // Registrar auditoria com changes
    await logAudit('Entity', entity.id, 'update', userId, tenantId, {
      label: {
        old: oldLabel,
        new: entity.label,
      },
    });

    res.status(200).json(entity);
  } catch (error: any) {
    if (error.message === 'Entidade não encontrada') {
      res.status(404).json({
        error: 'Entidade não encontrada',
        message: 'Entidade não encontrada ou não pertence ao tenant',
      });
      return;
    }

    if (error.message === 'Entidades do sistema não podem ser alteradas') {
      res.status(400).json({
        error: 'Operação não permitida',
        message: 'Entidades do sistema não podem ser alteradas',
      });
      return;
    }

    console.error('Erro ao atualizar entidade:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar entidade',
    });
  }
}

/**
 * Deleta entidade customizada
 * 
 * @param req - Request com entityId nos params
 * @param res - Response para confirmar deleção
 */
export async function deleteEntity(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const entityId = req.params.id;
    if (!entityId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da entidade',
      });
      return;
    }

    // Deletar entidade
    await EntityService.deleteEntity(tenantId, entityId);

    // Registrar auditoria (não bloqueia se falhar)
    await logAudit('Entity', entityId, 'delete', userId, tenantId);

    res.status(200).json({
      message: 'Entidade deletada com sucesso',
    });
  } catch (error: any) {
    if (error.message === 'Entidade não encontrada') {
      res.status(404).json({
        error: 'Entidade não encontrada',
        message: 'Entidade não encontrada ou não pertence ao tenant',
      });
      return;
    }

    if (error.message === 'Entidades do sistema não podem ser deletadas') {
      res.status(400).json({
        error: 'Operação não permitida',
        message: 'Entidades do sistema não podem ser deletadas',
      });
      return;
    }

    if (error.message.includes('campos associados')) {
      res.status(400).json({
        error: 'Operação não permitida',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao deletar entidade:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar entidade',
    });
  }
}

