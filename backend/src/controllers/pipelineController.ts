/**
 * Controller de pipelines
 * 
 * Handlers para rotas de gestão de pipelines (CRUD).
 * Orquestra chamadas ao PipelineService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { PipelineService } from '../services/pipelineService';
import { validateHexColor, validateProbability } from '../utils/validators';

/**
 * Lista todos os pipelines do tenant
 * 
 * @param req - Request com tenantId do middleware
 * @param res - Response para retornar lista de pipelines
 */
export async function listPipelines(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    const result = await PipelineService.listPipelines(tenantId, userId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao listar pipelines:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível listar pipelines',
    });
  }
}

/**
 * Obtém um pipeline específico por ID
 * 
 * @param req - Request com id nos params
 * @param res - Response para retornar pipeline
 */
export async function getPipeline(req: Request, res: Response): Promise<void> {
  try {
    const pipelineId = req.params.id;
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Validar formato UUID
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        pipelineId
      )
    ) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'ID deve ser um UUID válido',
      });
      return;
    }

    const pipeline = await PipelineService.getPipelineById(
      pipelineId,
      tenantId,
      userId
    );

    if (!pipeline) {
      res.status(404).json({
        error: 'Pipeline não encontrado',
        message: 'Pipeline não existe ou não pertence ao tenant atual',
      });
      return;
    }

    res.status(200).json(pipeline);
  } catch (error: any) {
    console.error('Erro ao obter pipeline:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível obter pipeline',
    });
  }
}

/**
 * Cria um novo pipeline com estágios
 * 
 * @param req - Request com dados do pipeline no body
 * @param res - Response para retornar pipeline criado
 */
export async function createPipeline(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Validar que id não foi fornecido
    if (req.body.id) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'ID não deve ser fornecido na criação',
      });
      return;
    }

    // Extrair dados do body
    const { name, isDefault, stages } = req.body;

    // Validar name obrigatório
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'Nome do pipeline é obrigatório',
      });
      return;
    }

    // Validar stages obrigatório
    if (!stages || !Array.isArray(stages) || stages.length === 0) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: 'Pipeline deve ter pelo menos um estágio',
      });
      return;
    }

    // Validar cada estágio
    const orders = new Set<number>();
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];

      // Validar name
      if (!stage.name || typeof stage.name !== 'string' || !stage.name.trim()) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: `Estágio ${i + 1}: nome é obrigatório`,
        });
        return;
      }

      // Validar order
      if (
        stage.order === undefined ||
        !Number.isInteger(stage.order) ||
        stage.order < 1
      ) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: `Estágio ${i + 1}: order deve ser um número inteiro positivo (>= 1)`,
        });
        return;
      }

      // Validar que order é único
      if (orders.has(stage.order)) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: `Order ${stage.order} está duplicado. Cada estágio deve ter uma ordem única.`,
        });
        return;
      }
      orders.add(stage.order);

      // Validar probability se fornecido
      if (stage.probability !== undefined && stage.probability !== null) {
        if (
          typeof stage.probability !== 'number' ||
          isNaN(stage.probability) ||
          stage.probability < 0 ||
          stage.probability > 100
        ) {
          res.status(400).json({
            error: 'Dados inválidos',
            message: `Estágio ${i + 1}: probability deve estar entre 0 e 100`,
          });
          return;
        }
      }

      // Validar color se fornecido
      if (stage.color !== undefined && stage.color !== null) {
        if (typeof stage.color !== 'string' || !validateHexColor(stage.color)) {
          res.status(400).json({
            error: 'Dados inválidos',
            message: `Estágio ${i + 1}: color deve ser uma cor hexadecimal válida (ex: #FF0000)`,
          });
          return;
        }
      }
    }

    // Chamar service
    const pipeline = await PipelineService.createPipeline(
      {
        name: name.trim(),
        isDefault: isDefault || false,
        stages: stages.map((s: any) => ({
          name: s.name.trim(),
          order: s.order,
          probability: s.probability,
          color: s.color,
        })),
      },
      tenantId,
      userId
    );

    res.status(201).json(pipeline);
  } catch (error: any) {
    console.error('Erro ao criar pipeline:', error);
    
    // Tratar erros específicos
    if (error.message && error.message.includes('obrigatório')) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível criar pipeline',
    });
  }
}

/**
 * Atualiza um pipeline existente
 * 
 * @param req - Request com id nos params e dados no body
 * @param res - Response para retornar pipeline atualizado
 */
export async function updatePipeline(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const pipelineId = req.params.id;
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Validar formato UUID
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        pipelineId
      )
    ) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'ID deve ser um UUID válido',
      });
      return;
    }

    // Extrair dados do body
    const { name, isDefault, stages } = req.body;

    // Validar name se fornecido
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: 'Nome do pipeline deve ser uma string não vazia',
        });
        return;
      }
    }

    // Validar stages se fornecido
    if (stages !== undefined) {
      if (!Array.isArray(stages) || stages.length === 0) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: 'Pipeline deve ter pelo menos um estágio',
        });
        return;
      }

      // Validar cada estágio
      const orders = new Set<number>();
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];

        // Validar name
        if (
          !stage.name ||
          typeof stage.name !== 'string' ||
          !stage.name.trim()
        ) {
          res.status(400).json({
            error: 'Dados inválidos',
            message: `Estágio ${i + 1}: nome é obrigatório`,
          });
          return;
        }

        // Validar order
        if (
          stage.order === undefined ||
          !Number.isInteger(stage.order) ||
          stage.order < 1
        ) {
          res.status(400).json({
            error: 'Dados inválidos',
            message: `Estágio ${i + 1}: order deve ser um número inteiro positivo (>= 1)`,
          });
          return;
        }

        // Validar que order é único
        if (orders.has(stage.order)) {
          res.status(400).json({
            error: 'Dados inválidos',
            message: `Order ${stage.order} está duplicado. Cada estágio deve ter uma ordem única.`,
          });
          return;
        }
        orders.add(stage.order);

        // Validar probability se fornecido
        if (stage.probability !== undefined && stage.probability !== null) {
          if (
            typeof stage.probability !== 'number' ||
            isNaN(stage.probability) ||
            stage.probability < 0 ||
            stage.probability > 100
          ) {
            res.status(400).json({
              error: 'Dados inválidos',
              message: `Estágio ${i + 1}: probability deve estar entre 0 e 100`,
            });
            return;
          }
        }

        // Validar color se fornecido
        if (stage.color !== undefined && stage.color !== null) {
          if (
            typeof stage.color !== 'string' ||
            !validateHexColor(stage.color)
          ) {
            res.status(400).json({
              error: 'Dados inválidos',
              message: `Estágio ${i + 1}: color deve ser uma cor hexadecimal válida (ex: #FF0000)`,
            });
            return;
          }
        }

        // Validar ID se fornecido (deve ser UUID válido)
        if (stage.id !== undefined && stage.id !== null) {
          if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              stage.id
            )
          ) {
            res.status(400).json({
              error: 'Dados inválidos',
              message: `Estágio ${i + 1}: ID deve ser um UUID válido`,
            });
            return;
          }
        }
      }
    }

    // Chamar service
    const pipeline = await PipelineService.updatePipeline(
      pipelineId,
      {
        ...(name !== undefined && { name: name.trim() }),
        ...(isDefault !== undefined && { isDefault }),
        ...(stages !== undefined && {
          stages: stages.map((s: any) => ({
            ...(s.id && { id: s.id }),
            name: s.name.trim(),
            order: s.order,
            probability: s.probability,
            color: s.color,
          })),
        }),
      },
      tenantId,
      userId
    );

    res.status(200).json(pipeline);
  } catch (error: any) {
    console.error('Erro ao atualizar pipeline:', error);

    // Tratar erros específicos
    if (error.message && error.message.includes('não encontrado')) {
      res.status(404).json({
        error: 'Pipeline não encontrado',
        message: error.message,
      });
      return;
    }

    if (
      error.message &&
      (error.message.includes('permissão') ||
        error.message.includes('não tem permissão'))
    ) {
      res.status(403).json({
        error: 'Sem permissão',
        message: error.message,
      });
      return;
    }

    if (
      error.message &&
      (error.message.includes('em uso') ||
        error.message.includes('não é possível deletar'))
    ) {
      res.status(409).json({
        error: 'Conflito',
        message: error.message,
      });
      return;
    }

    if (error.message && error.message.includes('obrigatório')) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar pipeline',
    });
  }
}

/**
 * Deleta um pipeline
 * 
 * @param req - Request com id nos params
 * @param res - Response para retornar confirmação
 */
export async function deletePipeline(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const pipelineId = req.params.id;
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Validar formato UUID
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        pipelineId
      )
    ) {
      res.status(400).json({
        error: 'Parâmetro inválido',
        message: 'ID deve ser um UUID válido',
      });
      return;
    }

    // Chamar service
    const deletedId = await PipelineService.deletePipeline(
      pipelineId,
      tenantId,
      userId
    );

    res.status(200).json({
      message: 'Pipeline deletado com sucesso',
      id: deletedId,
    });
  } catch (error: any) {
    console.error('Erro ao deletar pipeline:', error);

    // Tratar erros específicos
    if (error.message && error.message.includes('não encontrado')) {
      res.status(404).json({
        error: 'Pipeline não encontrado',
        message: error.message,
      });
      return;
    }

    if (
      error.message &&
      (error.message.includes('padrão') ||
        error.message.includes('em uso') ||
        error.message.includes('não é possível deletar'))
    ) {
      res.status(409).json({
        error: 'Conflito',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível deletar pipeline',
    });
  }
}
