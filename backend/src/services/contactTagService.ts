/**
 * Serviço para gestão de associações de tags com contatos
 * 
 * Lógica de negócio para associar/desassociar tags de contatos.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { PrismaClient } from '@prisma/client';
import { ContactService, ContactResponse } from './contactService';

const prisma = new PrismaClient();

export class ContactTagService {
  /**
   * Adiciona tag a um contato
   * 
   * @param contactId - ID do contato
   * @param tagId - ID da tag
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @returns Contato atualizado com tags
   * @throws Error se validações falharem
   */
  static async addTagToContact(
    contactId: string,
    tagId: string,
    tenantId: string
  ): Promise<ContactResponse> {
    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId)) {
      throw new Error('contactId deve ser um UUID válido');
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagId)) {
      throw new Error('tagId deve ser um UUID válido');
    }

    // Verificar se contato existe e pertence ao tenant
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId, // Garantir isolamento multi-tenant
        deletedAt: null, // Contato não pode estar soft deleted
      },
    });

    if (!contact) {
      throw new Error('Contato não encontrado, não pertence ao seu tenant ou foi deletado');
    }

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

    // Verificar se associação já existe
    const existingAssociation = await prisma.contactTag.findUnique({
      where: {
        contactId_tagId: {
          contactId,
          tagId,
        },
      },
    });

    if (existingAssociation) {
      throw new Error('Tag já está associada a este contato');
    }

    // Criar associação
    await prisma.contactTag.create({
      data: {
        contactId,
        tagId,
      },
    });

    // Retornar contato atualizado com tags
    const updatedContact = await ContactService.getContactById(contactId, tenantId);
    if (!updatedContact) {
      throw new Error('Erro ao buscar contato atualizado');
    }

    return updatedContact;
  }

  /**
   * Remove tag de um contato
   * 
   * @param contactId - ID do contato
   * @param tagId - ID da tag
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @throws Error se validações falharem ou associação não existir
   */
  static async removeTagFromContact(
    contactId: string,
    tagId: string,
    tenantId: string
  ): Promise<void> {
    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId)) {
      throw new Error('contactId deve ser um UUID válido');
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagId)) {
      throw new Error('tagId deve ser um UUID válido');
    }

    // Verificar se contato existe e pertence ao tenant
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId, // Garantir isolamento multi-tenant
        deletedAt: null, // Contato não pode estar soft deleted
      },
    });

    if (!contact) {
      throw new Error('Contato não encontrado, não pertence ao seu tenant ou foi deletado');
    }

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

    // Verificar se associação existe
    const existingAssociation = await prisma.contactTag.findUnique({
      where: {
        contactId_tagId: {
          contactId,
          tagId,
        },
      },
    });

    if (!existingAssociation) {
      throw new Error('Tag não está associada a este contato');
    }

    // Remover associação
    await prisma.contactTag.delete({
      where: {
        contactId_tagId: {
          contactId,
          tagId,
        },
      },
    });
  }
}

