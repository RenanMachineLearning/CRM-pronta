/**
 * Serviço para gestão de dados customizados (EntityData)
 * 
 * Gerencia armazenamento e recuperação de valores de campos customizados
 * para entidades do sistema (Contact, Company) e customizadas.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EntityDataResponse {
  id: string;
  entityId: string;
  recordId: string;
  tenantId: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class EntityDataService {
  /**
   * Busca dados customizados de um registro específico
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param entityId - ID da entidade (ex: Contact, Company)
   * @param recordId - ID do registro (ex: Contact.id, Company.id)
   * @returns Dados customizados ou null se não existir
   */
  static async getEntityDataByRecord(
    tenantId: string,
    entityId: string,
    recordId: string
  ): Promise<EntityDataResponse | null> {
    const entityData = await prisma.entityData.findFirst({
      where: {
        tenantId,
        entityId,
        recordId,
      },
    });

    if (!entityData) {
      return null;
    }

    return {
      id: entityData.id,
      entityId: entityData.entityId,
      recordId: entityData.recordId,
      tenantId: entityData.tenantId,
      data: entityData.data as Record<string, any>,
      createdAt: entityData.createdAt,
      updatedAt: entityData.updatedAt,
    };
  }

  /**
   * Busca dados customizados de múltiplos registros (batch)
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param entityId - ID da entidade
   * @param recordIds - Array de IDs dos registros
   * @returns Map de recordId -> EntityDataResponse
   */
  static async getEntityDataByRecords(
    tenantId: string,
    entityId: string,
    recordIds: string[]
  ): Promise<Map<string, EntityDataResponse>> {
    if (recordIds.length === 0) {
      return new Map();
    }

    const entityDataList = await prisma.entityData.findMany({
      where: {
        tenantId,
        entityId,
        recordId: {
          in: recordIds,
        },
      },
    });

    const map = new Map<string, EntityDataResponse>();
    for (const entityData of entityDataList) {
      map.set(entityData.recordId, {
        id: entityData.id,
        entityId: entityData.entityId,
        recordId: entityData.recordId,
        tenantId: entityData.tenantId,
        data: entityData.data as Record<string, any>,
        createdAt: entityData.createdAt,
        updatedAt: entityData.updatedAt,
      });
    }

    return map;
  }

  /**
   * Salva ou atualiza dados customizados de um registro
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param entityId - ID da entidade
   * @param recordId - ID do registro
   * @param data - Dados customizados (objeto com valores dos campos)
   * @returns Dados customizados salvos
   */
  static async saveEntityData(
    tenantId: string,
    entityId: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<EntityDataResponse> {
    const entityData = await prisma.entityData.upsert({
      where: {
        tenantId_entityId_recordId: {
          tenantId,
          entityId,
          recordId,
        },
      },
      update: {
        data,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        entityId,
        recordId,
        data,
      },
    });

    return {
      id: entityData.id,
      entityId: entityData.entityId,
      recordId: entityData.recordId,
      tenantId: entityData.tenantId,
      data: entityData.data as Record<string, any>,
      createdAt: entityData.createdAt,
      updatedAt: entityData.updatedAt,
    };
  }

  /**
   * Deleta dados customizados de um registro
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param entityId - ID da entidade
   * @param recordId - ID do registro
   */
  static async deleteEntityData(
    tenantId: string,
    entityId: string,
    recordId: string
  ): Promise<void> {
    await prisma.entityData.deleteMany({
      where: {
        tenantId,
        entityId,
        recordId,
      },
    });
  }
}

