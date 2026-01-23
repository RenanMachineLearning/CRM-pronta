/**
 * Serviço para gestão de pipelines e estágios
 * 
 * Lógica de negócio para operações CRUD de pipelines e seus estágios.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { prisma } from '../utils/prisma';
import { filterFieldsByPermission, validateFieldPermissionsForUpdate } from '../utils/fieldPermissions';
import { logAudit } from '../utils/auditLog';
import { validateHexColor, validateProbability } from '../utils/validators';


// Interface para dados de estágio (usado em create e update)
export interface StageData {
  id?: string; // Opcional - se fornecido no update, indica estágio existente a atualizar
  name: string;
  order: number;
  probability?: number | null; // 0-100, opcional
  color?: string | null; // Hex color, opcional
}

// Interface para dados de criação de pipeline
export interface CreatePipelineData {
  name: string;
  isDefault?: boolean; // Default: false
  stages: StageData[]; // Array de estágios (mínimo 1)
}

// Interface para dados de atualização de pipeline
export interface UpdatePipelineData {
  name?: string;
  isDefault?: boolean;
  stages?: StageData[]; // Se fornecido, substitui completamente os estágios existentes
}

// Interface para resposta de PipelineStage
export interface PipelineStageResponse {
  id: string;
  pipelineId: string;
  tenantId: string;
  name: string;
  order: number;
  probability: number | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Interface para resposta de Pipeline
export interface PipelineResponse {
  id: string;
  tenantId: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  stages: PipelineStageResponse[]; // Estágios ordenados por order
  // Contagem de oportunidades usando este pipeline (opcional, para listagem)
  opportunitiesCount?: number;
}

export class PipelineService {
  /**
   * Lista todos os pipelines do tenant com seus estágios
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Lista de pipelines com estágios ordenados e contagem de oportunidades
   */
  static async listPipelines(
    tenantId: string,
    userId?: string
  ): Promise<{
    data: PipelineResponse[];
  }> {
    // Buscar todos os pipelines do tenant com estágios ordenados
    const pipelines = await prisma.pipeline.findMany({
      where: { tenantId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Para cada pipeline, contar oportunidades usando estágios deste pipeline
    const pipelinesWithCounts = await Promise.all(
      pipelines.map(async (pipeline) => {
        const stageIds = pipeline.stages.map((s) => s.id);
        const opportunitiesCount =
          stageIds.length > 0
            ? await prisma.opportunity.count({
                where: {
                  tenantId,
                  stageId: { in: stageIds },
                  deletedAt: null,
                },
              })
            : 0;

        return {
          ...pipeline,
          opportunitiesCount,
        };
      })
    );

    // Formatar resposta
    const formattedPipelines: PipelineResponse[] = pipelinesWithCounts.map(
      (pipeline) => ({
        id: pipeline.id,
        tenantId: pipeline.tenantId,
        name: pipeline.name,
        isDefault: pipeline.isDefault,
        createdAt: pipeline.createdAt,
        updatedAt: pipeline.updatedAt,
        stages: pipeline.stages.map((stage) => ({
          id: stage.id,
          pipelineId: stage.pipelineId,
          tenantId: stage.tenantId,
          name: stage.name,
          order: stage.order,
          probability: stage.probability,
          color: stage.color,
          createdAt: stage.createdAt,
          updatedAt: stage.updatedAt,
        })),
        opportunitiesCount: pipeline.opportunitiesCount,
      })
    );

    // Filtrar campos por permissão se userId fornecido
    if (userId) {
      const filteredPipelines = await Promise.all(
        formattedPipelines.map(async (pipeline) => {
          return (await filterFieldsByPermission(
            pipeline,
            userId,
            pipeline.tenantId,
            'Pipeline',
            'read'
          )) as PipelineResponse;
        })
      );
      return { data: filteredPipelines };
    }

    return { data: formattedPipelines };
  }

  /**
   * Obtém um pipeline específico por ID
   * 
   * @param pipelineId - ID do pipeline
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param userId - ID do usuário que está fazendo a requisição (para filtrar campos por permissão)
   * @returns Pipeline com estágios ordenados ou null se não encontrado
   */
  static async getPipelineById(
    pipelineId: string,
    tenantId: string,
    userId?: string
  ): Promise<PipelineResponse | null> {
    // Buscar pipeline com estágios ordenados
    const pipeline = await prisma.pipeline.findFirst({
      where: {
        id: pipelineId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!pipeline) {
      return null;
    }

    // Formatar resposta
    const formattedPipeline: PipelineResponse = {
      id: pipeline.id,
      tenantId: pipeline.tenantId,
      name: pipeline.name,
      isDefault: pipeline.isDefault,
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
      stages: pipeline.stages.map((stage) => ({
        id: stage.id,
        pipelineId: stage.pipelineId,
        tenantId: stage.tenantId,
        name: stage.name,
        order: stage.order,
        probability: stage.probability,
        color: stage.color,
        createdAt: stage.createdAt,
        updatedAt: stage.updatedAt,
      })),
    };

    // Filtrar campos por permissão se userId fornecido
    if (userId) {
      return (await filterFieldsByPermission(
        formattedPipeline,
        userId,
        formattedPipeline.tenantId,
        'Pipeline',
        'read'
      )) as PipelineResponse;
    }

    return formattedPipeline;
  }

  /**
   * Cria um novo pipeline com seus estágios
   * 
   * @param data - Dados do pipeline e estágios
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está criando (para auditoria)
   * @returns Pipeline criado com estágios
   */
  static async createPipeline(
    data: CreatePipelineData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<PipelineResponse> {
    // Validações de dados obrigatórios
    if (!data.name || !data.name.trim()) {
      throw new Error('Nome do pipeline é obrigatório');
    }

    if (!data.stages || data.stages.length === 0) {
      throw new Error('Pipeline deve ter pelo menos um estágio');
    }

    // Validar estágios
    this.validateStages(data.stages);

    // Se isDefault = true, desmarcar outros pipelines como padrão
    if (data.isDefault) {
      await prisma.pipeline.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Criar pipeline e estágios em transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar pipeline
      const pipeline = await tx.pipeline.create({
        data: {
          tenantId,
          name: data.name.trim(),
          isDefault: data.isDefault || false,
        },
      });

      // Ordenar estágios por order antes de criar
      const sortedStages = [...data.stages].sort((a, b) => a.order - b.order);

      // Criar estágios
      const stages = await Promise.all(
        sortedStages.map((stage) =>
          tx.pipelineStage.create({
            data: {
              pipelineId: pipeline.id,
              tenantId,
              name: stage.name.trim(),
              order: stage.order,
              probability: stage.probability ?? null,
              color: stage.color ?? null,
            },
          })
        )
      );

      return { pipeline, stages };
    });

    // Registrar auditoria
    if (requestingUserId) {
      try {
        await logAudit(
          'Pipeline',
          result.pipeline.id,
          'create',
          requestingUserId,
          tenantId
        );
      } catch (error) {
        // Não interromper operação se auditoria falhar
        console.error('Erro ao registrar auditoria:', error);
      }
    }

    // Retornar pipeline criado
    return {
      id: result.pipeline.id,
      tenantId: result.pipeline.tenantId,
      name: result.pipeline.name,
      isDefault: result.pipeline.isDefault,
      createdAt: result.pipeline.createdAt,
      updatedAt: result.pipeline.updatedAt,
      stages: result.stages.map((stage) => ({
        id: stage.id,
        pipelineId: stage.pipelineId,
        tenantId: stage.tenantId,
        name: stage.name,
        order: stage.order,
        probability: stage.probability,
        color: stage.color,
        createdAt: stage.createdAt,
        updatedAt: stage.updatedAt,
      })),
    };
  }

  /**
   * Atualiza um pipeline existente
   * 
   * @param pipelineId - ID do pipeline
   * @param data - Dados a atualizar
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está atualizando (para auditoria e permissões)
   * @returns Pipeline atualizado com estágios
   */
  static async updatePipeline(
    pipelineId: string,
    data: UpdatePipelineData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<PipelineResponse> {
    // Verificar que pipeline existe e pertence ao tenant
    const existingPipeline = await prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId },
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    if (!existingPipeline) {
      throw new Error('Pipeline não encontrado');
    }

    // Capturar dados antigos para auditoria
    const oldData = {
      name: existingPipeline.name,
      isDefault: existingPipeline.isDefault,
      stages: existingPipeline.stages.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        probability: s.probability,
        color: s.color,
      })),
    };

    // Validar permissões por campo se userId fornecido
    // Extrair apenas campos primitivos (excluir stages que é array complexo)
    if (requestingUserId && data) {
      const primitiveFields: Record<string, any> = {};
      if (data.name !== undefined) {
        primitiveFields.name = data.name;
      }
      if (data.isDefault !== undefined) {
        primitiveFields.isDefault = data.isDefault;
      }

      if (Object.keys(primitiveFields).length > 0) {
        const validation = await validateFieldPermissionsForUpdate(
          primitiveFields,
          requestingUserId,
          tenantId,
          'Pipeline'
        );

        if (!validation.allowed) {
          throw new Error(
            `Você não tem permissão para atualizar os seguintes campos: ${validation.forbiddenFields.join(', ')}`
          );
        }
      }
    }

    // Se isDefault = true e pipeline atual não é padrão, desmarcar outros pipelines como padrão
    if (data.isDefault && !existingPipeline.isDefault) {
      await prisma.pipeline.updateMany({
        where: { tenantId, isDefault: true, id: { not: pipelineId } },
        data: { isDefault: false },
      });
    }

    // Atualizar pipeline e estágios em transação
    const result = await prisma.$transaction(async (tx) => {
      // Atualizar pipeline
      if (data.name !== undefined || data.isDefault !== undefined) {
        await tx.pipeline.update({
          where: { id: pipelineId },
          data: {
            ...(data.name !== undefined && { name: data.name.trim() }),
            ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
          },
        });
      }

      // Atualizar estágios se fornecido
      if (data.stages) {
        await this.updateStagesInTransaction(
          tx,
          pipelineId,
          tenantId,
          data.stages,
          existingPipeline.stages
        );
      }

      // Buscar pipeline atualizado
      const updatedPipeline = await tx.pipeline.findUnique({
        where: { id: pipelineId },
        include: {
          stages: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!updatedPipeline) {
        throw new Error('Erro ao buscar pipeline atualizado');
      }

      return updatedPipeline;
    });

    // Comparar campos alterados para auditoria
    const changes: Record<string, any> = {};
    if (data.name !== undefined && data.name.trim() !== oldData.name) {
      changes.name = { old: oldData.name, new: data.name.trim() };
    }
    if (
      data.isDefault !== undefined &&
      data.isDefault !== oldData.isDefault
    ) {
      changes.isDefault = { old: oldData.isDefault, new: data.isDefault };
    }
    if (data.stages !== undefined) {
      changes.stages = {
        old: oldData.stages,
        new: data.stages.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          probability: s.probability,
          color: s.color,
        })),
      };
    }

    // Registrar auditoria
    if (requestingUserId && Object.keys(changes).length > 0) {
      try {
        await logAudit(
          'Pipeline',
          pipelineId,
          'update',
          requestingUserId,
          tenantId,
          changes
        );
      } catch (error) {
        // Não interromper operação se auditoria falhar
        console.error('Erro ao registrar auditoria:', error);
      }
    }

    // Retornar pipeline atualizado
    return {
      id: result.id,
      tenantId: result.tenantId,
      name: result.name,
      isDefault: result.isDefault,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      stages: result.stages.map((stage) => ({
        id: stage.id,
        pipelineId: stage.pipelineId,
        tenantId: stage.tenantId,
        name: stage.name,
        order: stage.order,
        probability: stage.probability,
        color: stage.color,
        createdAt: stage.createdAt,
        updatedAt: stage.updatedAt,
      })),
    };
  }

  /**
   * Deleta um pipeline
   * 
   * @param pipelineId - ID do pipeline
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está deletando (para auditoria)
   * @returns ID do pipeline deletado
   */
  static async deletePipeline(
    pipelineId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<string> {
    // Verificar que pipeline existe e pertence ao tenant
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId },
      include: { stages: true },
    });

    if (!pipeline) {
      throw new Error('Pipeline não encontrado');
    }

    // Não permitir deletar pipeline padrão
    if (pipeline.isDefault) {
      throw new Error('Não é possível deletar o pipeline padrão');
    }

    // Verificar se há oportunidades usando estágios deste pipeline
    const stageIds = pipeline.stages.map((s) => s.id);
    if (stageIds.length > 0) {
      const opportunitiesCount = await prisma.opportunity.count({
        where: {
          tenantId,
          stageId: { in: stageIds },
          deletedAt: null,
        },
      });

      if (opportunitiesCount > 0) {
        throw new Error(
          `Não é possível deletar pipeline com ${opportunitiesCount} oportunidade(s) associada(s)`
        );
      }
    }

    // Deletar pipeline (hard delete - estágios serão deletados via cascade)
    await prisma.pipeline.delete({
      where: { id: pipelineId },
    });

    // Registrar auditoria
    if (requestingUserId) {
      try {
        await logAudit(
          'Pipeline',
          pipelineId,
          'delete',
          requestingUserId,
          tenantId
        );
      } catch (error) {
        // Não interromper operação se auditoria falhar
        console.error('Erro ao registrar auditoria:', error);
      }
    }

    return pipelineId;
  }

  /**
   * Valida array de estágios
   * 
   * @param stages - Array de estágios a validar
   */
  private static validateStages(stages: StageData[]): void {
    // Validar que há pelo menos um estágio
    if (!stages || stages.length === 0) {
      throw new Error('Pipeline deve ter pelo menos um estágio');
    }

    // Validar cada estágio
    const orders = new Set<number>();
    for (const stage of stages) {
      // Validar nome
      if (!stage.name || !stage.name.trim()) {
        throw new Error('Nome do estágio é obrigatório');
      }

      // Validar order
      if (!Number.isInteger(stage.order) || stage.order < 1) {
        throw new Error('Order deve ser um número inteiro positivo (>= 1)');
      }

      // Validar que order é único
      if (orders.has(stage.order)) {
        throw new Error(
          `Order ${stage.order} está duplicado. Cada estágio deve ter uma ordem única.`
        );
      }
      orders.add(stage.order);

      // Validar probability se fornecido
      if (stage.probability !== undefined && stage.probability !== null) {
        validateProbability(stage.probability);
      }

      // Validar color se fornecido
      if (stage.color !== undefined && stage.color !== null) {
        if (!validateHexColor(stage.color)) {
          throw new Error(
            `Cor inválida: ${stage.color}. Deve ser uma cor hexadecimal válida (ex: #FF0000).`
          );
        }
      }
    }
  }

  /**
   * Atualiza estágios de um pipeline em transação
   * 
   * @param tx - Transação do Prisma
   * @param pipelineId - ID do pipeline
   * @param tenantId - ID do tenant
   * @param newStages - Novos estágios fornecidos
   * @param existingStages - Estágios existentes no banco
   */
  private static async updateStagesInTransaction(
    tx: any,
    pipelineId: string,
    tenantId: string,
    newStages: StageData[],
    existingStages: Array<{
      id: string;
      name: string;
      order: number;
      probability: number | null;
      color: string | null;
    }>
  ): Promise<void> {
    // Validar estágios fornecidos
    this.validateStages(newStages);

    // Verificar quais estágios existentes estão em uso
    const existingStageIds = existingStages.map((s) => s.id);
    const stagesInUse = await tx.opportunity.findMany({
      where: {
        tenantId,
        stageId: { in: existingStageIds },
        deletedAt: null,
      },
      select: { stageId: true },
    });
    // Extrair stageIds únicos
    const inUseStageIds = new Set(stagesInUse.map((o: any) => o.stageId));

    // Identificar estágios fornecidos com ID
    const providedStageIds = new Set(
      newStages.map((s) => s.id).filter(Boolean) as string[]
    );

    // Identificar estágios a deletar (existem no banco mas não foram fornecidos)
    const stagesToDelete = existingStages.filter(
      (s) => !providedStageIds.has(s.id) && !inUseStageIds.has(s.id)
    );

    // Validar que não está tentando deletar estágios em uso
    const stagesToDeleteInUse = existingStages.filter(
      (s) => !providedStageIds.has(s.id) && inUseStageIds.has(s.id)
    );
    if (stagesToDeleteInUse.length > 0) {
      throw new Error(
        `Não é possível deletar estágios em uso: ${stagesToDeleteInUse.map((s) => s.name).join(', ')}`
      );
    }

    // Identificar estágios a criar (fornecidos sem ID)
    const stagesToCreate = newStages.filter((s) => !s.id);

    // Identificar estágios a atualizar (fornecidos com ID existente)
    const stagesToUpdate = newStages.filter(
      (s) => s.id && existingStages.some((es) => es.id === s.id)
    );

    // Validar que IDs fornecidos pertencem ao pipeline
    for (const stage of stagesToUpdate) {
      const existingStage = existingStages.find((es) => es.id === stage.id);
      if (!existingStage) {
        throw new Error(
          `Estágio com ID ${stage.id} não pertence a este pipeline`
        );
      }
    }

    // Deletar estágios não utilizados
    if (stagesToDelete.length > 0) {
      await tx.pipelineStage.deleteMany({
        where: {
          id: { in: stagesToDelete.map((s) => s.id) },
          tenantId,
        },
      });
    }

    // Criar novos estágios
    for (const stage of stagesToCreate) {
      await tx.pipelineStage.create({
        data: {
          pipelineId,
          tenantId,
          name: stage.name.trim(),
          order: stage.order,
          probability: stage.probability ?? null,
          color: stage.color ?? null,
        },
      });
    }

    // Atualizar estágios existentes
    for (const stage of stagesToUpdate) {
      await tx.pipelineStage.update({
        where: { id: stage.id! },
        data: {
          name: stage.name.trim(),
          order: stage.order,
          probability: stage.probability ?? null,
          color: stage.color ?? null,
        },
      });
    }
  }
}
