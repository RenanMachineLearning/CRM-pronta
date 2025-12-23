/**
 * Controller de relacionamentos entre entidades
 * 
 * Handlers para rotas de gestão de relacionamentos (CRUD).
 * Orquestra chamadas ao RelationshipService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import {
  RelationshipService,
  CreateRelationshipData,
} from '../services/relationshipService';

/**
 * Lista relacionamentos de uma entidade específica
 * 
 * @param req - Request com entityId nos params
 * @param res - Response para retornar lista de relacionamentos
 */
export async function listEntityRelationships(
  req: Request,
  res: Response
): Promise<void> {
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

    // Buscar relacionamentos
    const relationships = await RelationshipService.listRelationshipsByEntity(
      tenantId,
      entityId
    );

    res.status(200).json(relationships);
  } catch (error: any) {
    if (error.message === 'Entidade não encontrada') {
      res.status(404).json({
        error: 'Entidade não encontrada',
        message: 'Entidade não encontrada ou não pertence ao tenant',
      });
      return;
    }

    console.error('Erro ao listar relacionamentos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar relacionamentos',
    });
  }
}

/**
 * Cria novo relacionamento entre entidades
 * 
 * @param req - Request com dados do relacionamento no body
 * @param res - Response para retornar relacionamento criado
 */
export async function createRelationship(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair dados do body
    const { sourceEntityId, targetEntityId, type, name } = req.body;

    // Validar campos obrigatórios
    if (!sourceEntityId || typeof sourceEntityId !== 'string') {
      res.status(400).json({
        error: 'sourceEntityId é obrigatório',
        message: 'Forneça o ID da entidade origem',
      });
      return;
    }

    if (!targetEntityId || typeof targetEntityId !== 'string') {
      res.status(400).json({
        error: 'targetEntityId é obrigatório',
        message: 'Forneça o ID da entidade destino',
      });
      return;
    }

    if (!type || typeof type !== 'string') {
      res.status(400).json({
        error: 'type é obrigatório',
        message: 'Forneça o tipo do relacionamento (oneToMany ou manyToMany)',
      });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        error: 'name é obrigatório',
        message: 'Forneça um nome para o relacionamento',
      });
      return;
    }

    // Validar tipo
    if (type !== 'oneToMany' && type !== 'manyToMany') {
      res.status(400).json({
        error: 'Tipo inválido',
        message: 'Tipo deve ser "oneToMany" ou "manyToMany"',
      });
      return;
    }

    // Preparar dados
    const relationshipData: CreateRelationshipData = {
      sourceEntityId,
      targetEntityId,
      type: type as 'oneToMany' | 'manyToMany',
      name: name.trim(),
    };

    // Criar relacionamento
    const relationship = await RelationshipService.createRelationship(
      tenantId,
      relationshipData,
      userId
    );

    res.status(201).json(relationship);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrada') ||
      error.message.includes('não encontrado')
    ) {
      res.status(404).json({
        error: 'Entidade não encontrada',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('Já existe um relacionamento')) {
      res.status(409).json({
        error: 'Relacionamento duplicado',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('Tipo de relacionamento')) {
      res.status(400).json({
        error: 'Tipo inválido',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('tenantId') || error.message.includes('tenant')) {
      res.status(400).json({
        error: 'Validação de tenant falhou',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao criar relacionamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao criar relacionamento',
    });
  }
}

/**
 * Deleta relacionamento
 * 
 * @param req - Request com relationshipId nos params
 * @param res - Response para retornar sucesso
 */
export async function deleteRelationship(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const relationshipId = req.params.id;
    if (!relationshipId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do relacionamento',
      });
      return;
    }

    // Deletar relacionamento
    await RelationshipService.deleteRelationship(relationshipId, tenantId, userId);

    res.status(200).json({
      message: 'Relacionamento deletado com sucesso',
    });
  } catch (error: any) {
    // Tratar erros específicos do service
    if (error.message === 'Relacionamento não encontrado') {
      res.status(404).json({
        error: 'Relacionamento não encontrado',
        message: 'Relacionamento não encontrado ou não pertence ao tenant',
      });
      return;
    }

    console.error('Erro ao deletar relacionamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar relacionamento',
    });
  }
}

