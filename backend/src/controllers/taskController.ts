/**
 * Controller de tarefas
 * 
 * Handlers para rotas de gestão de tarefas (CRUD).
 * Orquestra chamadas ao TaskService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { TaskService, TaskFilters, PaginationParams, CreateTaskData, UpdateTaskData } from '../services/taskService';
import { TaskType, TaskStatus, TaskPriority } from '@prisma/client';
import { isValidDateNotPast } from '../utils/validators';
import { logAudit } from '../utils/auditLog';
import { FieldValidationError } from '../utils/fieldValueValidator';
import { UniqueFieldValidationError } from '../utils/uniqueFieldValidator';
import { Filter, FilterError } from '../types/filter.types';
import { processOrderByParams, OrderByError } from '../utils/orderByHelpers';

/**
 * Lista tarefas com paginação e filtros
 * 
 * @param req - Request com query params (limit, offset, status, type, assignedToId, relatedEntityType, relatedEntityId, dueDateFrom, dueDateTo, overdue, completed, orderBy, order, filters)
 * @param res - Response para retornar lista de tarefas
 * 
 * Query params:
 * - filters: JSON (opcional) - Filtros avançados
 */
export async function listTasks(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair query params
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const assignedToId = req.query.assignedToId as string | undefined;
    const relatedEntityType = req.query.relatedEntityType as string | undefined;
    const relatedEntityId = req.query.relatedEntityId as string | undefined;
    const dueDateFrom = req.query.dueDateFrom as string | undefined;
    const dueDateTo = req.query.dueDateTo as string | undefined;
    const overdue = req.query.overdue as string | undefined;
    const completed = req.query.completed as string | undefined;

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
    if (status && !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'status deve ser PENDING, IN_PROGRESS, COMPLETED ou CANCELLED',
      });
      return;
    }

    // Validar type
    if (type && !['CALL', 'EMAIL', 'MEETING', 'OTHER'].includes(type)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'type deve ser CALL, EMAIL, MEETING ou OTHER',
      });
      return;
    }

    // Validar relatedEntityType
    if (relatedEntityType && !['Contact', 'Company', 'Lead', 'Opportunity'].includes(relatedEntityType)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'relatedEntityType deve ser Contact, Company, Lead ou Opportunity',
      });
      return;
    }

    // Validar UUIDs se fornecidos
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (assignedToId && !uuidRegex.test(assignedToId)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'assignedToId deve ser um UUID válido',
      });
      return;
    }

    if (relatedEntityId && !uuidRegex.test(relatedEntityId)) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'relatedEntityId deve ser um UUID válido',
      });
      return;
    }

    // Processar e validar parâmetros de ordenação usando helper centralizado
    try {
      processOrderByParams(req.query, 'task');
    } catch (error: any) {
      if (error instanceof OrderByError) {
        res.status(error.statusCode).json({
          error: 'Parâmetro inválido',
          message: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }

    // Validar e converter datas
    let dueDateFromDate: Date | undefined;
    let dueDateToDate: Date | undefined;

    if (dueDateFrom) {
      dueDateFromDate = new Date(dueDateFrom);
      if (isNaN(dueDateFromDate.getTime())) {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: 'dueDateFrom deve ser uma data ISO válida',
        });
        return;
      }
    }

    if (dueDateTo) {
      dueDateToDate = new Date(dueDateTo);
      if (isNaN(dueDateToDate.getTime())) {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: 'dueDateTo deve ser uma data ISO válida',
        });
        return;
      }
    }

    // Validar e converter booleanos
    let overdueBool: boolean | undefined = undefined;
    if (overdue !== undefined) {
      if (overdue === 'true') {
        overdueBool = true;
      } else if (overdue === 'false') {
        overdueBool = false;
      } else {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: 'overdue deve ser true ou false',
        });
        return;
      }
    }

    let completedBool: boolean | undefined = undefined;
    if (completed !== undefined) {
      if (completed === 'true') {
        completedBool = true;
      } else if (completed === 'false') {
        completedBool = false;
      } else {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: 'completed deve ser true ou false',
        });
        return;
      }
    }

    // Parsear filtros avançados
    let advancedFilters: Filter[] | undefined;
    const filtersParam = req.query.filters as string | undefined;

    if (filtersParam) {
      try {
        advancedFilters = JSON.parse(filtersParam);

        if (!Array.isArray(advancedFilters)) {
          res.status(400).json({
            error: 'Parâmetro inválido',
            message: 'filters deve ser um array JSON',
          });
          return;
        }
      } catch (error) {
        res.status(400).json({
          error: 'Parâmetro inválido',
          message: 'filters deve ser um JSON válido',
        });
        return;
      }
    }

    // Montar filtros
    const filters: TaskFilters = {
      status: status as TaskStatus | undefined,
      type: type as TaskType | undefined,
      assignedToId,
      relatedEntityType: relatedEntityType as 'Contact' | 'Company' | 'Lead' | 'Opportunity' | undefined,
      relatedEntityId,
      dueDateFrom: dueDateFromDate,
      dueDateTo: dueDateToDate,
      overdue: overdueBool,
      completed: completedBool,
      advancedFilters, // NOVO: Filtros avançados
    };

    // Montar paginação
    const pagination: PaginationParams = {
      limit,
      offset,
      // Passar parâmetros de ordenação do query string para o service
      sortBy: req.query.sortBy as string | string[] | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | ('asc' | 'desc')[] | undefined,
      orderBy: req.query.orderBy as string | string[] | undefined, // Legado
      order: req.query.order as 'asc' | 'desc' | ('asc' | 'desc')[] | undefined, // Legado
    };

    // Chamar service
    try {
      const result = await TaskService.listTasks(tenantId, filters, pagination, userId);

      res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof FilterError) {
        res.status(error.statusCode).json({
          error: 'Filtro inválido',
          code: error.code,
          details: error.details,
          message: error.message,
        });
        return;
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Erro ao listar tarefas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao listar tarefas',
    });
  }
}

/**
 * Obtém tarefa por ID
 * 
 * @param req - Request com taskId nos params
 * @param res - Response para retornar tarefa
 */
export async function getTask(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const taskId = req.params.id;
    if (!taskId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da tarefa',
      });
      return;
    }

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      res.status(400).json({
        error: 'ID inválido',
        message: 'ID deve ser um UUID válido',
      });
      return;
    }

    // Buscar tarefa
    const task = await TaskService.getTaskById(taskId, tenantId, userId);

    if (!task) {
      res.status(404).json({
        error: 'Tarefa não encontrada',
        message: 'A tarefa especificada não existe ou não pertence ao seu tenant',
      });
      return;
    }

    res.status(200).json(task);
  } catch (error: any) {
    if (
      error.message?.includes('não encontrada') ||
      error.message?.includes('não encontrado') ||
      error.message?.includes('não pertence') ||
      error.message?.includes('foi deletada') ||
      error.message?.includes('foi deletado')
    ) {
      res.status(404).json({
        error: 'Tarefa não encontrada',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao buscar tarefa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar tarefa',
    });
  }
}

/**
 * Cria nova tarefa
 * 
 * @param req - Request com dados da tarefa no body
 * @param res - Response para retornar tarefa criada
 */
export async function createTask(req: Request, res: Response): Promise<void> {
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
    const {
      title,
      description,
      type,
      status,
      dueDate,
      priority,
      assignedToId,
      relatedEntityType,
      relatedEntityId,
    } = req.body;

    // Validar title obrigatório
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({
        error: 'Campo obrigatório inválido',
        message: 'title é obrigatório e deve ser uma string não vazia',
      });
      return;
    }

    // Validar description se fornecido
    if (description !== undefined && typeof description !== 'string') {
      res.status(400).json({
        error: 'description inválido',
        message: 'description deve ser uma string',
      });
      return;
    }

    // Validar enums se fornecidos
    if (type && !['CALL', 'EMAIL', 'MEETING', 'OTHER'].includes(type)) {
      res.status(400).json({
        error: 'type inválido',
        message: 'type deve ser CALL, EMAIL, MEETING ou OTHER',
      });
      return;
    }

    if (status && !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      res.status(400).json({
        error: 'status inválido',
        message: 'status deve ser PENDING, IN_PROGRESS, COMPLETED ou CANCELLED',
      });
      return;
    }

    if (priority && !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
      res.status(400).json({
        error: 'priority inválido',
        message: 'priority deve ser LOW, MEDIUM ou HIGH',
      });
      return;
    }

    // Validar dueDate se fornecido
    let dueDateObj: Date | undefined = undefined;
    if (dueDate !== undefined && dueDate !== null) {
      if (typeof dueDate !== 'string' && !(dueDate instanceof Date)) {
        res.status(400).json({
          error: 'dueDate inválido',
          message: 'dueDate deve ser uma string ISO ou Date',
        });
        return;
      }

      dueDateObj = dueDate instanceof Date ? dueDate : new Date(dueDate);
      if (isNaN(dueDateObj.getTime())) {
        res.status(400).json({
          error: 'dueDate inválido',
          message: 'dueDate deve ser uma data válida',
        });
        return;
      }

      if (!isValidDateNotPast(dueDateObj)) {
        res.status(400).json({
          error: 'dueDate inválido',
          message: 'Data de vencimento não pode ser passada',
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

    if (!['Contact', 'Company', 'Lead', 'Opportunity'].includes(relatedEntityType)) {
      res.status(400).json({
        error: 'relatedEntityType inválido',
        message: 'relatedEntityType deve ser Contact, Company, Lead ou Opportunity',
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

    // Validar assignedToId se fornecido
    if (assignedToId !== undefined && assignedToId !== null) {
      if (typeof assignedToId !== 'string') {
        res.status(400).json({
          error: 'assignedToId inválido',
          message: 'assignedToId deve ser uma string',
        });
        return;
      }

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignedToId)) {
        res.status(400).json({
          error: 'assignedToId inválido',
          message: 'assignedToId deve ser um UUID válido',
        });
        return;
      }
    }

    // Montar dados de criação
    const data: CreateTaskData = {
      title: title.trim(),
      description: description || undefined,
      type: type as TaskType | undefined,
      status: status as TaskStatus | undefined,
      dueDate: dueDateObj,
      priority: priority as TaskPriority | undefined,
      assignedToId: assignedToId || undefined,
      relatedEntityType: relatedEntityType as 'Contact' | 'Company' | 'Lead' | 'Opportunity',
      relatedEntityId,
    };

    // Criar tarefa
    const task = await TaskService.createTask(data, tenantId, userId);

    // Registrar auditoria
    try {
      await logAudit('Task', task.id, 'create', userId, tenantId);
    } catch (auditError) {
      // Não bloquear resposta se auditoria falhar
      console.error('Erro ao registrar auditoria:', auditError);
    }

    res.status(201).json(task);
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
      error.message?.includes('formato')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao criar tarefa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao criar tarefa',
    });
  }
}

/**
 * Atualiza tarefa existente
 * 
 * @param req - Request com taskId nos params e dados no body
 * @param res - Response para retornar tarefa atualizada
 */
export async function updateTask(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const taskId = req.params.id;
    if (!taskId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da tarefa',
      });
      return;
    }

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
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

    // Buscar task atual para capturar estado anterior (para auditoria)
    const taskBefore = await TaskService.getTaskById(taskId, tenantId, userId);
    if (!taskBefore) {
      res.status(404).json({
        error: 'Tarefa não encontrada',
        message: 'A tarefa especificada não existe ou não pertence ao seu tenant',
      });
      return;
    }

    // Extrair dados do body
    const {
      title,
      description,
      type,
      status,
      dueDate,
      priority,
      assignedToId,
      relatedEntityType,
      relatedEntityId,
    } = req.body;

    // Validar title se fornecido
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({
          error: 'title inválido',
          message: 'title deve ser uma string não vazia',
        });
        return;
      }
    }

    // Validar enums se fornecidos
    if (type && !['CALL', 'EMAIL', 'MEETING', 'OTHER'].includes(type)) {
      res.status(400).json({
        error: 'type inválido',
        message: 'type deve ser CALL, EMAIL, MEETING ou OTHER',
      });
      return;
    }

    if (status && !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      res.status(400).json({
        error: 'status inválido',
        message: 'status deve ser PENDING, IN_PROGRESS, COMPLETED ou CANCELLED',
      });
      return;
    }

    if (priority && !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
      res.status(400).json({
        error: 'priority inválido',
        message: 'priority deve ser LOW, MEDIUM ou HIGH',
      });
      return;
    }

    // Validar dueDate se fornecido
    let dueDateObj: Date | null | undefined = undefined;
    if (dueDate !== undefined) {
      if (dueDate === null) {
        // Permitir null para remover dueDate
        dueDateObj = null;
      } else {
        if (typeof dueDate !== 'string' && !(dueDate instanceof Date)) {
          res.status(400).json({
            error: 'dueDate inválido',
            message: 'dueDate deve ser uma string ISO, Date ou null',
          });
          return;
        }

        dueDateObj = dueDate instanceof Date ? dueDate : new Date(dueDate);
        if (isNaN(dueDateObj.getTime())) {
          res.status(400).json({
            error: 'dueDate inválido',
            message: 'dueDate deve ser uma data válida',
          });
          return;
        }

        if (!isValidDateNotPast(dueDateObj)) {
          res.status(400).json({
            error: 'dueDate inválido',
            message: 'Data de vencimento não pode ser passada',
          });
          return;
        }
      }
    }

    // Validar assignedToId se fornecido
    let assignedToIdValue: string | null | undefined = undefined;
    if (assignedToId !== undefined) {
      if (assignedToId === null) {
        // Permitir null para remover atribuição
        assignedToIdValue = null;
      } else {
        if (typeof assignedToId !== 'string') {
          res.status(400).json({
            error: 'assignedToId inválido',
            message: 'assignedToId deve ser uma string ou null',
          });
          return;
        }

        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignedToId)) {
          res.status(400).json({
            error: 'assignedToId inválido',
            message: 'assignedToId deve ser um UUID válido',
          });
          return;
        }
        assignedToIdValue = assignedToId;
      }
    }

    // Validar relatedEntityType e relatedEntityId se fornecidos (devem ser fornecidos juntos)
    if (relatedEntityType !== undefined || relatedEntityId !== undefined) {
      if (!relatedEntityType || !relatedEntityId) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: 'relatedEntityType e relatedEntityId devem ser fornecidos juntos',
        });
        return;
      }

      if (!['Contact', 'Company', 'Lead', 'Opportunity'].includes(relatedEntityType)) {
        res.status(400).json({
          error: 'relatedEntityType inválido',
          message: 'relatedEntityType deve ser Contact, Company, Lead ou Opportunity',
        });
        return;
      }

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(relatedEntityId)) {
        res.status(400).json({
          error: 'relatedEntityId inválido',
          message: 'relatedEntityId deve ser um UUID válido',
        });
        return;
      }
    }

    // Montar dados de atualização (apenas campos fornecidos)
    const data: UpdateTaskData = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description || null;
    if (type !== undefined) data.type = type as TaskType;
    if (status !== undefined) data.status = status as TaskStatus;
    if (dueDate !== undefined) data.dueDate = dueDateObj;
    if (priority !== undefined) data.priority = priority as TaskPriority;
    if (assignedToId !== undefined) data.assignedToId = assignedToIdValue;
    if (relatedEntityType !== undefined && relatedEntityId !== undefined) {
      data.relatedEntityType = relatedEntityType as 'Contact' | 'Company' | 'Lead' | 'Opportunity';
      data.relatedEntityId = relatedEntityId;
    }

    // Atualizar tarefa
    const taskAfter = await TaskService.updateTask(taskId, data, tenantId, userId);

    // Capturar changes para auditoria
    const changes: Record<string, { old: any; new: any }> = {};
    if (title !== undefined && taskBefore.title !== taskAfter.title) {
      changes.title = { old: taskBefore.title, new: taskAfter.title };
    }
    if (description !== undefined && taskBefore.description !== taskAfter.description) {
      changes.description = { old: taskBefore.description, new: taskAfter.description };
    }
    if (type !== undefined && taskBefore.type !== taskAfter.type) {
      changes.type = { old: taskBefore.type, new: taskAfter.type };
    }
    if (status !== undefined && taskBefore.status !== taskAfter.status) {
      changes.status = { old: taskBefore.status, new: taskAfter.status };
    }
    if (dueDate !== undefined) {
      const oldDueDate = taskBefore.dueDate ? new Date(taskBefore.dueDate).toISOString() : null;
      const newDueDate = taskAfter.dueDate ? new Date(taskAfter.dueDate).toISOString() : null;
      if (oldDueDate !== newDueDate) {
        changes.dueDate = { old: oldDueDate, new: newDueDate };
      }
    }
    if (priority !== undefined && taskBefore.priority !== taskAfter.priority) {
      changes.priority = { old: taskBefore.priority, new: taskAfter.priority };
    }
    if (assignedToId !== undefined) {
      const oldAssignedToId = taskBefore.assignedToId || null;
      const newAssignedToId = taskAfter.assignedToId || null;
      if (oldAssignedToId !== newAssignedToId) {
        changes.assignedToId = { old: oldAssignedToId, new: newAssignedToId };
      }
    }
    if (relatedEntityType !== undefined && relatedEntityId !== undefined) {
      const oldRelatedEntityType = taskBefore.relatedEntityType;
      const oldRelatedEntityId = taskBefore.relatedEntityId;
      const newRelatedEntityType = taskAfter.relatedEntityType;
      const newRelatedEntityId = taskAfter.relatedEntityId;
      if (oldRelatedEntityType !== newRelatedEntityType || oldRelatedEntityId !== newRelatedEntityId) {
        changes.relatedEntityType = { old: oldRelatedEntityType, new: newRelatedEntityType };
        changes.relatedEntityId = { old: oldRelatedEntityId, new: newRelatedEntityId };
      }
    }

    // Registrar auditoria
    try {
      await logAudit('Task', taskId, 'update', userId, tenantId, Object.keys(changes).length > 0 ? changes : undefined);
    } catch (auditError) {
      // Não bloquear resposta se auditoria falhar
      console.error('Erro ao registrar auditoria:', auditError);
    }

    res.status(200).json(taskAfter);
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
      error.message?.includes('não pertence') ||
      error.message?.includes('foi deletada') ||
      error.message?.includes('foi deletado')
    ) {
      res.status(404).json({
        error: 'Tarefa não encontrada',
        message: error.message,
      });
      return;
    }

    if (error.message?.includes('não tem permissão para atualizar')) {
      res.status(403).json({
        error: 'Acesso negado',
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

    console.error('Erro ao atualizar tarefa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message || 'Falha ao atualizar tarefa',
    });
  }
}

/**
 * Deleta tarefa (soft delete)
 * 
 * @param req - Request com taskId nos params
 * @param res - Response para retornar sucesso
 */
export async function deleteTask(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair ID dos params
    const taskId = req.params.id;
    if (!taskId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da tarefa',
      });
      return;
    }

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      res.status(400).json({
        error: 'ID inválido',
        message: 'ID deve ser um UUID válido',
      });
      return;
    }

    // Deletar tarefa
    await TaskService.deleteTask(taskId, tenantId, userId);

    // Registrar auditoria
    try {
      await logAudit('Task', taskId, 'delete', userId, tenantId);
    } catch (auditError) {
      // Não bloquear resposta se auditoria falhar
      console.error('Erro ao registrar auditoria:', auditError);
    }

    res.status(200).json({
      message: 'Tarefa deletada com sucesso',
      id: taskId,
    });
  } catch (error: any) {
    if (
      error.message?.includes('não encontrada') ||
      error.message?.includes('não encontrado') ||
      error.message?.includes('não pertence') ||
      error.message?.includes('foi deletada') ||
      error.message?.includes('foi deletado')
    ) {
      res.status(404).json({
        error: 'Tarefa não encontrada',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao deletar tarefa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message || 'Falha ao deletar tarefa',
    });
  }
}
