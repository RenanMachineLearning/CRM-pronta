/**
 * Serviço para gestão de tags
 * 
 * Lógica de negócio para operações CRUD de tags.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/auditLog';
import { validateHexColor } from '../utils/validators';


// Interface para resposta de tag
export interface TagResponse {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface para criação de tag
export interface CreateTagData {
  name: string;
  color?: string;
}

// Interface para atualização de tag
export interface UpdateTagData {
  name?: string;
  color?: string;
}

// Interface para paginação
export interface PaginationParams {
  limit?: number;
  offset?: number;
  orderBy?: 'name' | 'createdAt';
  order?: 'asc' | 'desc';
}

export class TagService {
  /**
   * Lista tags do tenant com paginação e ordenação
   * 
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param pagination - Parâmetros de paginação (limit, offset, orderBy, order)
   * @returns Array de tags
   */
  static async listTags(
    tenantId: string,
    pagination?: PaginationParams
  ): Promise<TagResponse[]> {
    const limit = pagination?.limit || 100;
    const offset = pagination?.offset || 0;
    const orderBy = pagination?.orderBy || 'name';
    const order = pagination?.order || 'asc';

    const tags = await prisma.tag.findMany({
      where: {
        tenantId,
      },
      take: limit,
      skip: offset,
      orderBy: {
        [orderBy]: order,
      },
      select: {
        id: true,
        name: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return tags;
  }

  /**
   * Cria nova tag
   * 
   * @param data - Dados da tag a ser criada
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está criando (para auditoria)
   * @returns Tag criada
   * @throws Error se validações falharem
   */
  static async createTag(
    data: CreateTagData,
    tenantId: string,
    requestingUserId: string
  ): Promise<TagResponse> {
    // Validar name obrigatório
    if (!data.name || !data.name.trim()) {
      throw new Error('Nome da tag é obrigatório');
    }

    // Normalizar name (trim)
    const normalizedName = data.name.trim();

    // Validar cor se fornecido
    let normalizedColor = '#3B82F6'; // Cor padrão
    if (data.color !== undefined && data.color !== null) {
      if (!validateHexColor(data.color)) {
        throw new Error('Cor deve ser um formato hexadecimal válido (#RRGGBB ou #RRGGBBAA)');
      }
      // Normalizar cor (adicionar # se não presente)
      normalizedColor = data.color.startsWith('#') ? data.color : `#${data.color}`;
    }

    try {
      // Criar tag
      const tag = await prisma.tag.create({
        data: {
          tenantId,
          name: normalizedName,
          color: normalizedColor,
        },
        select: {
          id: true,
          name: true,
          color: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Registrar auditoria
      await logAudit('Tag', tag.id, 'create', requestingUserId, tenantId);

      return tag;
    } catch (error: any) {
      // Tratar erro de constraint único (nome duplicado)
      if (error.code === 'P2002') {
        throw new Error('Já existe uma tag com este nome no seu tenant');
      }
      throw error;
    }
  }

  /**
   * Atualiza tag existente
   * 
   * @param tagId - ID da tag a ser atualizada
   * @param data - Dados a serem atualizados
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está atualizando (para auditoria)
   * @returns Tag atualizada
   * @throws Error se validações falharem ou tag não encontrada
   */
  static async updateTag(
    tagId: string,
    data: UpdateTagData,
    tenantId: string,
    requestingUserId: string
  ): Promise<TagResponse> {
    // Buscar tag existente
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        tenantId, // Garantir isolamento multi-tenant
      },
    });

    if (!existingTag) {
      throw new Error('Tag não encontrada ou não pertence ao seu tenant');
    }

    // Preparar dados de atualização
    const updateData: any = {};

    // Validar e normalizar name se fornecido
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new Error('Nome da tag não pode ser vazio');
      }
      updateData.name = data.name.trim();
    }

    // Validar e normalizar color se fornecido
    if (data.color !== undefined && data.color !== null) {
      if (!validateHexColor(data.color)) {
        throw new Error('Cor deve ser um formato hexadecimal válido (#RRGGBB ou #RRGGBBAA)');
      }
      // Normalizar cor (adicionar # se não presente)
      updateData.color = data.color.startsWith('#') ? data.color : `#${data.color}`;
    }

    // Preparar mudanças para auditoria
    const changes: Record<string, { old?: any; new?: any }> = {};
    if (updateData.name !== undefined && updateData.name !== existingTag.name) {
      changes.name = { old: existingTag.name, new: updateData.name };
    }
    if (updateData.color !== undefined && updateData.color !== existingTag.color) {
      changes.color = { old: existingTag.color, new: updateData.color };
    }

    try {
      // Atualizar tag
      const tag = await prisma.tag.update({
        where: {
          id: tagId,
        },
        data: updateData,
        select: {
          id: true,
          name: true,
          color: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Registrar auditoria com mudanças
      if (Object.keys(changes).length > 0) {
        await logAudit('Tag', tag.id, 'update', requestingUserId, tenantId, changes);
      }

      return tag;
    } catch (error: any) {
      // Tratar erro de constraint único (nome duplicado)
      if (error.code === 'P2002') {
        throw new Error('Já existe uma tag com este nome no seu tenant');
      }
      // Tratar erro de registro não encontrado
      if (error.code === 'P2025') {
        throw new Error('Tag não encontrada ou não pertence ao seu tenant');
      }
      throw error;
    }
  }

  /**
   * Deleta tag (hard delete)
   * 
   * @param tagId - ID da tag a ser deletada
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está deletando (para auditoria)
   * @throws Error se tag não encontrada
   */
  static async deleteTag(
    tagId: string,
    tenantId: string,
    requestingUserId: string
  ): Promise<void> {
    // Verificar se tag existe e pertence ao tenant
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        tenantId, // Garantir isolamento multi-tenant
      },
    });

    if (!tag) {
      throw new Error('Tag não encontrada ou não pertence ao seu tenant');
    }

    // Registrar auditoria antes de deletar
    await logAudit('Tag', tagId, 'delete', requestingUserId, tenantId);

    // Deletar tag (hard delete)
    // As associações (ContactTag e CompanyTag) serão removidas automaticamente via cascade
    await prisma.tag.delete({
      where: {
        id: tagId,
      },
    });
  }
}

