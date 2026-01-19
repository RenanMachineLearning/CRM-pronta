/**
 * Controller de notas
 * 
 * Handlers para rotas de gestão de notas (CRUD).
 * Orquestra chamadas ao NoteService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { NoteService, NoteFilters, PaginationParams, CreateNoteData, UpdateNoteData } from '../services/noteService';
import { NoteType } from '@prisma/client';
import { logAudit } from '../utils/auditLog';
import { FieldValidationError } from '../utils/fieldValueValidator';
import { UniqueFieldValidationError } from '../utils/uniqueFieldValidator';

/**
 * Lista notas com paginação e filtros
 * 
 * @param req - Request com query params (limit, offset, type, relatedEntityType, relatedEntityId, orderBy, order)
 * @param res - Response para retornar lista de notas
 */
export async function listNotes(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair query params
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    const type = req.query.type as string | undefined;
    const relatedEntityType = req.query.relatedEntityType as string | undefined;
    const relatedEntityId = req.query.relatedEntityId as string | undefined;
    const orderBy = req.query.orderBy as string | undefined;
    const order = req.query.order as string | undefined;

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

    // Validar type
    if (type && !['NOTE', 'COMMENT', 'ANNOTATION'].includes(type)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'type deve ser NOTE, COMMENT ou ANNOTATION',
      });
      return;
    }

    // Validar relatedEntityType
    if (relatedEntityType && !['Contact', 'Company', 'Lead', 'Opportunity', 'Task'].includes(relatedEntityType)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'relatedEntityType deve ser Contact, Company, Lead, Opportunity ou Task',
      });
      return;
    }

    // Validar UUID se relatedEntityId fornecido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (relatedEntityId && !uuidRegex.test(relatedEntityId)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'relatedEntityId deve ser um UUID válido',
      });
      return;
    }

    // Validar que relatedEntityType e relatedEntityId são fornecidos juntos
    if ((relatedEntityType && !relatedEntityId) || (!relatedEntityType && relatedEntityId)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'relatedEntityType e relatedEntityId devem ser fornecidos juntos',
      });
      return;
    }

    // Validar orderBy (apenas createdAt permitido)
    if (orderBy && orderBy !== 'createdAt') {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'orderBy deve ser createdAt',
      });
      return;
    }

    // Validar order
    if (order && !['asc', 'desc'].includes(order)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'order deve ser asc ou desc',
      });
      return;
    }

    // Montar filtros
    const filters: NoteFilters = {};
    if (type) filters.type = type as NoteType;
    if (relatedEntityType) filters.relatedEntityType = relatedEntityType as 'Contact' | 'Company' | 'Lead' | 'Opportunity' | 'Task';
    if (relatedEntityId) filters.relatedEntityId = relatedEntityId;

    // Montar paginação
    const pagination: PaginationParams = {
      limit,
      offset,
      orderBy: orderBy as 'createdAt' | undefined || 'createdAt',
      order: order as 'asc' | 'desc' | undefined || 'desc',
    };

    // Chamar service
    const result = await NoteService.listNotes(tenantId, filters, pagination, userId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao listar notas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar notas',
    });
  }
}

/**
 * Obtém nota por ID
 * 
 * @param req - Request com noteId nos params
 * @param res - Response para retornar nota
 */
export async function getNote(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const noteId = req.params.id;
    if (!noteId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da nota',
      });
      return;
    }

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(noteId)) {
      res.status(400).json({
        error: 'ID inválido',
        message: 'ID deve ser um UUID válido',
      });
      return;
    }

    // Buscar nota
    const note = await NoteService.getNoteById(noteId, tenantId, userId);

    res.status(200).json(note);
  } catch (error: any) {
    if (
      error.message?.includes('não encontrada') ||
      error.message?.includes('não encontrado') ||
      error.message?.includes('não encontradas') ||
      error.message?.includes('não encontrados') ||
      error.message?.includes('não pertence') ||
      error.message?.includes('foi deletada') ||
      error.message?.includes('foi deletado')
    ) {
      res.status(404).json({
        error: 'Nota não encontrada',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao buscar nota:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar nota',
    });
  }
}

/**
 * Cria nova nota
 * 
 * @param req - Request com dados da nota no body
 * @param res - Response para retornar nota criada
 */
export async function createNote(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Validar que id não foi fornecido (gerado automaticamente)
    if (req.body.id !== undefined) {
      res.status(400).json({
        error: 'Campo id não permitido',
        message: 'O ID é gerado automaticamente e não pode ser fornecido',
      });
      return;
    }

    // Extrair dados do body
    const { content, type, relatedEntityType, relatedEntityId } = req.body;

    // Validar content obrigatório
    if (!content || typeof content !== 'string') {
      res.status(400).json({
        error: 'Campo obrigatório inválido',
        message: 'content é obrigatório e deve ser uma string',
      });
      return;
    }

    const contentTrimmed = content.trim();
    if (contentTrimmed.length === 0) {
      res.status(400).json({
        error: 'Campo obrigatório inválido',
        message: 'content não pode ser vazio após trim',
      });
      return;
    }

    // Validar limite de tamanho (10.000 caracteres)
    if (contentTrimmed.length > 10000) {
      res.status(400).json({
        error: 'Campo inválido',
        message: 'Conteúdo da nota não pode exceder 10.000 caracteres',
      });
      return;
    }

    // Validar enum type se fornecido
    if (type !== undefined) {
      if (typeof type !== 'string') {
        res.status(400).json({
          error: 'type inválido',
          message: 'type deve ser uma string',
        });
        return;
      }

      if (!['NOTE', 'COMMENT', 'ANNOTATION'].includes(type)) {
        res.status(400).json({
          error: 'type inválido',
          message: 'type deve ser NOTE, COMMENT ou ANNOTATION',
        });
        return;
      }
    }

    // Validar relatedEntityType obrigatório
    if (!relatedEntityType || typeof relatedEntityType !== 'string') {
      res.status(400).json({
        error: 'Campo obrigatório inválido',
        message: 'relatedEntityType é obrigatório',
      });
      return;
    }

    if (!['Contact', 'Company', 'Lead', 'Opportunity', 'Task'].includes(relatedEntityType)) {
      res.status(400).json({
        error: 'relatedEntityType inválido',
        message: 'relatedEntityType deve ser Contact, Company, Lead, Opportunity ou Task',
      });
      return;
    }

    // Validar relatedEntityId obrigatório
    if (!relatedEntityId || typeof relatedEntityId !== 'string') {
      res.status(400).json({
        error: 'Campo obrigatório inválido',
        message: 'relatedEntityId é obrigatório',
      });
      return;
    }

    // Validar formato UUID de relatedEntityId
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(relatedEntityId)) {
      res.status(400).json({
        error: 'relatedEntityId inválido',
        message: 'relatedEntityId deve ser um UUID válido',
      });
      return;
    }

    // Montar dados de criação
    const data: CreateNoteData = {
      content: contentTrimmed,
      type: type as NoteType | undefined,
      relatedEntityType: relatedEntityType as 'Contact' | 'Company' | 'Lead' | 'Opportunity' | 'Task',
      relatedEntityId,
    };

    // Criar nota
    const note = await NoteService.createNote(data, tenantId, userId);

    // Registrar auditoria
    try {
      await logAudit('Note', note.id, 'create', userId, tenantId);
    } catch (auditError) {
      // Não bloquear resposta se auditoria falhar
      console.error('Erro ao registrar auditoria:', auditError);
    }

    res.status(201).json(note);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (error instanceof FieldValidationError || error instanceof UniqueFieldValidationError) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    if (
      error.message?.includes('não encontrada') ||
      error.message?.includes('não encontrado') ||
      error.message?.includes('não encontradas') ||
      error.message?.includes('não encontrados') ||
      error.message?.includes('não pertence') ||
      error.message?.includes('foi deletada') ||
      error.message?.includes('foi deletado')
    ) {
      res.status(404).json({
        error: 'Recurso não encontrado',
        message: error.message,
      });
      return;
    }

    if (
      error.message?.includes('inválido') ||
      error.message?.includes('obrigatório') ||
      error.message?.includes('UUID') ||
      error.message?.includes('formato') ||
      error.message?.includes('exceder') ||
      error.message?.includes('não pode ser vazio') ||
      error.message?.includes('não pode exceder')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao criar nota:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao criar nota',
    });
  }
}

/**
 * Atualiza nota existente
 * 
 * @param req - Request com noteId nos params e dados no body
 * @param res - Response para retornar nota atualizada
 */
export async function updateNote(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const noteId = req.params.id;
    if (!noteId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da nota',
      });
      return;
    }

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(noteId)) {
      res.status(400).json({
        error: 'ID inválido',
        message: 'ID deve ser um UUID válido',
      });
      return;
    }

    // Validar que id não foi fornecido no body
    if (req.body.id !== undefined) {
      res.status(400).json({
        error: 'Campo id não permitido',
        message: 'O ID não pode ser alterado',
      });
      return;
    }

    // Buscar note atual para capturar estado anterior (para auditoria)
    const noteBefore = await NoteService.getNoteById(noteId, tenantId, userId);
    if (!noteBefore) {
      res.status(404).json({
        error: 'Nota não encontrada',
        message: 'A nota especificada não existe ou não pertence ao seu tenant',
      });
      return;
    }

    // Extrair dados do body
    const { content, type } = req.body;

    // Validar content se fornecido
    let contentTrimmed: string | undefined = undefined;
    if (content !== undefined) {
      if (typeof content !== 'string') {
        res.status(400).json({
          error: 'content inválido',
          message: 'content deve ser uma string',
        });
        return;
      }

      contentTrimmed = content.trim();
      if (contentTrimmed.length === 0) {
        res.status(400).json({
          error: 'content inválido',
          message: 'content não pode ser vazio após trim',
        });
        return;
      }

      if (contentTrimmed.length > 10000) {
        res.status(400).json({
          error: 'content inválido',
          message: 'Conteúdo da nota não pode exceder 10.000 caracteres',
        });
        return;
      }
    }

    // Validar enum type se fornecido
    if (type !== undefined) {
      if (typeof type !== 'string') {
        res.status(400).json({
          error: 'type inválido',
          message: 'type deve ser uma string',
        });
        return;
      }

      if (!['NOTE', 'COMMENT', 'ANNOTATION'].includes(type)) {
        res.status(400).json({
          error: 'type inválido',
          message: 'type deve ser NOTE, COMMENT ou ANNOTATION',
        });
        return;
      }
    }

    // Montar dados de atualização (apenas campos fornecidos)
    const data: UpdateNoteData = {};
    if (content !== undefined) data.content = contentTrimmed!;
    if (type !== undefined) data.type = type as NoteType;

    // Atualizar nota
    const noteAfter = await NoteService.updateNote(noteId, data, tenantId, userId);

    // Capturar changes para auditoria (comparar valores após trim)
    const changes: Record<string, { old: any; new: any }> = {};
    if (content !== undefined) {
      const oldContent = noteBefore.content.trim();
      const newContent = noteAfter.content.trim();
      if (oldContent !== newContent) {
        changes.content = { old: oldContent, new: newContent };
      }
    }
    if (type !== undefined && noteBefore.type !== noteAfter.type) {
      changes.type = { old: noteBefore.type, new: noteAfter.type };
    }

    // Registrar auditoria
    try {
      await logAudit('Note', noteId, 'update', userId, tenantId, Object.keys(changes).length > 0 ? changes : undefined);
    } catch (auditError) {
      // Não bloquear resposta se auditoria falhar
      console.error('Erro ao registrar auditoria:', auditError);
    }

    res.status(200).json(noteAfter);
  } catch (error: any) {
    // Tratar erros específicos
    if (error instanceof FieldValidationError) {
      res.status(400).json({
        error: 'Validação de campo falhou',
        message: error.message,
        field: error.fieldName,
      });
      return;
    }

    if (error instanceof UniqueFieldValidationError) {
      res.status(409).json({
        error: 'Campo único duplicado',
        message: error.message,
        field: error.fieldName,
      });
      return;
    }

    if (
      error.message?.includes('não encontrada') ||
      error.message?.includes('não encontrado') ||
      error.message?.includes('não encontradas') ||
      error.message?.includes('não encontrados') ||
      error.message?.includes('não pertence') ||
      error.message?.includes('foi deletada') ||
      error.message?.includes('foi deletado')
    ) {
      res.status(404).json({
        error: 'Nota não encontrada',
        message: error.message,
      });
      return;
    }

    if (
      error.message?.includes('não tem permissão para editar') ||
      error.message?.includes('não tem permissão para atualizar') ||
      error.message?.includes('não tem permissão para deletar') ||
      error.message?.includes('apenas o criador') ||
      error.message?.includes('apenas o criador ou um administrador') ||
      error.message?.includes('não tem permissão para atualizar os seguintes campos')
    ) {
      res.status(403).json({
        error: 'Permissão negada',
        message: error.message,
      });
      return;
    }

    if (
      error.message?.includes('inválido') ||
      error.message?.includes('obrigatório') ||
      error.message?.includes('UUID') ||
      error.message?.includes('formato') ||
      error.message?.includes('exceder') ||
      error.message?.includes('não pode ser vazio') ||
      error.message?.includes('não pode exceder')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao atualizar nota:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar nota',
    });
  }
}

/**
 * Deleta nota (soft delete)
 * 
 * @param req - Request com noteId nos params
 * @param res - Response para retornar sucesso
 */
export async function deleteNote(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const noteId = req.params.id;
    if (!noteId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da nota',
      });
      return;
    }

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(noteId)) {
      res.status(400).json({
        error: 'ID inválido',
        message: 'ID deve ser um UUID válido',
      });
      return;
    }

    // Deletar nota (soft delete)
    await NoteService.deleteNote(noteId, tenantId, userId);

    // Registrar auditoria
    try {
      await logAudit('Note', noteId, 'delete', userId, tenantId);
    } catch (auditError) {
      // Não bloquear resposta se auditoria falhar
      console.error('Erro ao registrar auditoria:', auditError);
    }

    res.status(200).json({
      message: 'Nota deletada com sucesso',
      id: noteId,
    });
  } catch (error: any) {
    if (
      error.message?.includes('não encontrada') ||
      error.message?.includes('não encontrado') ||
      error.message?.includes('não encontradas') ||
      error.message?.includes('não encontrados') ||
      error.message?.includes('não pertence') ||
      error.message?.includes('foi deletada') ||
      error.message?.includes('foi deletado')
    ) {
      res.status(404).json({
        error: 'Nota não encontrada',
        message: error.message,
      });
      return;
    }

    if (
      error.message?.includes('não tem permissão para editar') ||
      error.message?.includes('não tem permissão para atualizar') ||
      error.message?.includes('não tem permissão para deletar') ||
      error.message?.includes('apenas o criador') ||
      error.message?.includes('apenas o criador ou um administrador')
    ) {
      res.status(403).json({
        error: 'Permissão negada',
        message: error.message,
      });
      return;
    }

    if (
      error.message?.includes('inválido') ||
      error.message?.includes('obrigatório') ||
      error.message?.includes('UUID') ||
      error.message?.includes('formato')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao deletar nota:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar nota',
    });
  }
}
