/**
 * Controller de campos (metadados)
 * 
 * Handlers para rotas de gestão de campos (CRUD).
 * Orquestra chamadas ao FieldService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { FieldService, CreateFieldData, UpdateFieldData } from '../services/fieldService';
import { logAudit } from '../utils/auditLog';

/**
 * Lista campos de uma entidade ordenados por order
 * 
 * @param req - Request (tenantId já validado pelo middleware, entityId nos params)
 * @param res - Response para retornar lista de campos
 */
export async function listFields(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair entityId dos params
    const entityId = req.params.entityId;
    if (!entityId) {
      res.status(400).json({
        error: 'ID da entidade não fornecido',
        message: 'Forneça o ID da entidade',
      });
      return;
    }

    // Extrair query param includeDeletedFields
    const includeDeleted = req.query.includeDeletedFields === 'true';

    // Buscar campos
    const fields = await FieldService.listFields(tenantId, entityId, includeDeleted);

    res.status(200).json(fields);
  } catch (error: any) {
    if (error.message === 'Entidade não encontrada') {
      res.status(404).json({
        error: 'Entidade não encontrada',
        message: 'Entidade não encontrada ou não pertence ao tenant',
      });
      return;
    }

    console.error('Erro ao listar campos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar campos',
    });
  }
}

/**
 * Obtém campo por ID
 * 
 * @param req - Request com fieldId nos params
 * @param res - Response para retornar campo
 */
export async function getField(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair ID dos params
    const fieldId = req.params.id;
    if (!fieldId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do campo',
      });
      return;
    }

    // Buscar campo
    const field = await FieldService.getFieldById(tenantId, fieldId);

    res.status(200).json(field);
  } catch (error: any) {
    if (error.message === 'Campo não encontrado') {
      res.status(404).json({
        error: 'Campo não encontrado',
        message: 'Campo não encontrado ou não pertence ao tenant',
      });
      return;
    }

    console.error('Erro ao buscar campo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar campo',
    });
  }
}

/**
 * Cria novo campo customizado
 * 
 * @param req - Request com entityId nos params e dados do campo no body
 * @param res - Response para retornar campo criado
 */
export async function createField(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair entityId dos params
    const entityId = req.params.entityId;
    if (!entityId) {
      res.status(400).json({
        error: 'ID da entidade não fornecido',
        message: 'Forneça o ID da entidade',
      });
      return;
    }

    // Extrair dados do body
    const { name, label, type, required, unique, defaultValue, options, order } = req.body;

    // Validar campos obrigatórios
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        error: 'Nome é obrigatório',
        message: 'Forneça um nome válido para o campo',
      });
      return;
    }

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      res.status(400).json({
        error: 'Label é obrigatório',
        message: 'Forneça um label válido para o campo',
      });
      return;
    }

    if (!type || typeof type !== 'string') {
      res.status(400).json({
        error: 'Tipo é obrigatório',
        message: 'Forneça um tipo válido para o campo',
      });
      return;
    }

    // Criar campo
    const data: CreateFieldData = {
      name: name.trim(),
      label: label.trim(),
      type: type.trim() as any,
      required: required === true,
      unique: unique === true,
      defaultValue: defaultValue !== undefined ? defaultValue : undefined,
      options: options !== undefined ? options : undefined,
      order: order !== undefined ? Number(order) : undefined,
    };

    const field = await FieldService.createField(tenantId, entityId, data);

    // Registrar auditoria (não bloqueia se falhar)
    await logAudit('Field', field.id, 'create', userId, tenantId);

    res.status(201).json(field);
  } catch (error: any) {
    if (error.message === 'Nome do campo já existe nesta entidade') {
      res.status(409).json({
        error: 'Nome duplicado',
        message: 'Já existe um campo com este nome nesta entidade',
      });
      return;
    }

    if (error.message === 'Entidade não encontrada') {
      res.status(404).json({
        error: 'Entidade não encontrada',
        message: 'Entidade não encontrada ou não pertence ao tenant',
      });
      return;
    }

    if (error.message.includes('Tipo de campo inválido') || 
        error.message.includes('Nome do campo deve começar') ||
        error.message.includes('Campos do tipo select') ||
        error.message.includes('Opções devem ter')) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao criar campo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao criar campo',
    });
  }
}

/**
 * Atualiza campo (tipo não pode ser alterado)
 * 
 * @param req - Request com fieldId nos params e dados no body
 * @param res - Response para retornar campo atualizado
 */
export async function updateField(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const fieldId = req.params.id;
    if (!fieldId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do campo',
      });
      return;
    }

    // Extrair dados do body
    const { label, required, unique, defaultValue, options, order } = req.body;

    // Validar que type não está sendo alterado
    if (req.body.type !== undefined) {
      res.status(400).json({
        error: 'Tipo não pode ser alterado',
        message: 'O tipo do campo não pode ser alterado após a criação',
      });
      return;
    }

    // Buscar campo atual para auditoria
    const existing = await FieldService.getFieldById(tenantId, fieldId);
    const changes: any = {};

    // Preparar dados para atualização
    const data: UpdateFieldData = {};
    if (label !== undefined) {
      if (typeof label !== 'string' || label.trim().length === 0) {
        res.status(400).json({
          error: 'Label inválido',
          message: 'Forneça um label válido para o campo',
        });
        return;
      }
      data.label = label.trim();
      changes.label = { old: existing.label, new: data.label };
    }
    if (required !== undefined) {
      data.required = required === true;
      changes.required = { old: existing.required, new: data.required };
    }
    if (unique !== undefined) {
      data.unique = unique === true;
      changes.unique = { old: existing.unique, new: data.unique };
    }
    if (defaultValue !== undefined) {
      data.defaultValue = defaultValue;
      changes.defaultValue = { old: existing.defaultValue, new: defaultValue };
    }
    if (options !== undefined) {
      data.options = options;
      changes.options = { old: existing.options, new: options };
    }
    if (order !== undefined) {
      data.order = Number(order);
      changes.order = { old: existing.order, new: data.order };
    }

    // Atualizar campo
    const field = await FieldService.updateField(tenantId, fieldId, data);

    // Registrar auditoria com changes
    await logAudit('Field', field.id, 'update', userId, tenantId, changes);

    res.status(200).json(field);
  } catch (error: any) {
    if (error.message === 'Campo não encontrado') {
      res.status(404).json({
        error: 'Campo não encontrado',
        message: 'Campo não encontrado ou não pertence ao tenant',
      });
      return;
    }

    if (error.message === 'Campos de entidades do sistema não podem ser alterados') {
      res.status(400).json({
        error: 'Operação não permitida',
        message: 'Campos de entidades do sistema não podem ser alterados',
      });
      return;
    }

    if (error.message.includes('Campos do tipo select') ||
        error.message.includes('Opções devem ter') ||
        error.message.includes('Valor duplicado nas opções')) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao atualizar campo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar campo',
    });
  }
}

/**
 * Soft delete do campo (marca isDeleted: true)
 * 
 * @param req - Request com fieldId nos params
 * @param res - Response para confirmar deleção
 */
export async function deleteField(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const fieldId = req.params.id;
    if (!fieldId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do campo',
      });
      return;
    }

    // Deletar campo (soft delete)
    await FieldService.deleteField(tenantId, fieldId);

    // Registrar auditoria (não bloqueia se falhar)
    await logAudit('Field', fieldId, 'delete', userId, tenantId);

    res.status(200).json({
      message: 'Campo deletado com sucesso',
    });
  } catch (error: any) {
    if (error.message === 'Campo não encontrado') {
      res.status(404).json({
        error: 'Campo não encontrado',
        message: 'Campo não encontrado ou não pertence ao tenant',
      });
      return;
    }

    if (error.message === 'Campos de entidades do sistema não podem ser deletados') {
      res.status(400).json({
        error: 'Operação não permitida',
        message: 'Campos de entidades do sistema não podem ser deletados',
      });
      return;
    }

    console.error('Erro ao deletar campo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar campo',
    });
  }
}

