/**
 * Serviço para gestão de telefones de contatos
 * 
 * Lógica de negócio para operações CRUD de telefones de contatos.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/auditLog';
import { validatePhone } from '../utils/validators';


// Interface para resposta de telefone
export interface ContactPhoneResponse {
  id: string;
  tenantId: string;
  contactId: string;
  phone: string;
  type: 'WORK' | 'HOME' | 'MOBILE' | 'OTHER';
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ContactPhoneService {
  /**
   * Adiciona telefone a um contato
   * 
   * @param contactId - ID do contato
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param data - Dados do telefone
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Telefone criado
   * @throws Error se validações falharem
   */
  static async addPhone(
    contactId: string,
    tenantId: string,
    data: {
      phone: string;
      type: 'WORK' | 'HOME' | 'MOBILE' | 'OTHER';
      isPrimary?: boolean;
    },
    requestingUserId?: string
  ): Promise<ContactPhoneResponse> {
    // Validar que contato existe, pertence ao tenant e não está soft deleted
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Contato não pode estar soft deleted
      },
      select: {
        id: true,
      },
    });

    if (!contact) {
      throw new Error('Contato não encontrado, não pertence ao seu tenant ou foi deletado');
    }

    // Validar formato de telefone
    if (!validatePhone(data.phone)) {
      throw new Error(`Telefone inválido: ${data.phone}`);
    }

    // Normalizar telefone (trim)
    const normalizedPhone = data.phone.trim();

    // Criar telefone via Prisma transaction
    const phone = await prisma.$transaction(async (tx) => {
      // Se isPrimary for true, desmarcar outros telefones como primary
      if (data.isPrimary === true) {
        await tx.contactPhone.updateMany({
          where: {
            contactId,
            tenantId,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      // Criar novo telefone
      const newPhone = await tx.contactPhone.create({
        data: {
          tenantId,
          contactId,
          phone: normalizedPhone,
          type: data.type,
          isPrimary: data.isPrimary || false,
        },
      });

      return newPhone;
    });

    // Registrar auditoria
    if (requestingUserId) {
      logAudit('ContactPhone', phone.id, 'create', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return {
      id: phone.id,
      tenantId: phone.tenantId,
      contactId: phone.contactId,
      phone: phone.phone,
      type: phone.type as 'WORK' | 'HOME' | 'MOBILE' | 'OTHER',
      isPrimary: phone.isPrimary,
      createdAt: phone.createdAt,
      updatedAt: phone.updatedAt,
    };
  }

  /**
   * Atualiza telefone de um contato
   * 
   * @param phoneId - ID do telefone
   * @param contactId - ID do contato
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param data - Dados para atualização
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Telefone atualizado
   * @throws Error se validações falharem
   */
  static async updatePhone(
    phoneId: string,
    contactId: string,
    tenantId: string,
    data: {
      phone?: string;
      type?: 'WORK' | 'HOME' | 'MOBILE' | 'OTHER';
      isPrimary?: boolean;
    },
    requestingUserId?: string
  ): Promise<ContactPhoneResponse> {
    // Validar que telefone existe, pertence ao contato, pertence ao tenant
    const existingPhone = await prisma.contactPhone.findFirst({
      where: {
        id: phoneId,
        contactId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!existingPhone) {
      throw new Error('Telefone não encontrado, não pertence ao contato ou não pertence ao seu tenant');
    }

    // Validar que contato existe e não está soft deleted
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!contact) {
      throw new Error('Contato não encontrado, não pertence ao seu tenant ou foi deletado');
    }

    // Preparar dados de atualização
    const updateData: any = {};

    // Se phone fornecido, validar formato e normalizar
    if (data.phone !== undefined) {
      if (!validatePhone(data.phone)) {
        throw new Error(`Telefone inválido: ${data.phone}`);
      }
      updateData.phone = data.phone.trim();
    }

    // Se type fornecido, atualizar
    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    // Atualizar telefone via Prisma transaction
    const phone = await prisma.$transaction(async (tx) => {
      // Se isPrimary for true, desmarcar outros telefones como primary
      if (data.isPrimary === true) {
        await tx.contactPhone.updateMany({
          where: {
            contactId,
            tenantId,
            isPrimary: true,
            id: { not: phoneId }, // Excluir o próprio telefone
          },
          data: {
            isPrimary: false,
          },
        });
      }

      // Atualizar telefone
      const updatedPhone = await tx.contactPhone.update({
        where: {
          id: phoneId,
        },
        data: updateData,
      });

      return updatedPhone;
    });

    // Preparar changes para auditoria
    const changes: any = {};
    if (data.phone !== undefined && data.phone !== existingPhone.phone) {
      changes.phone = { old: existingPhone.phone, new: phone.phone };
    }
    if (data.type !== undefined && data.type !== existingPhone.type) {
      changes.type = { old: existingPhone.type, new: phone.type };
    }
    if (data.isPrimary !== undefined && data.isPrimary !== existingPhone.isPrimary) {
      changes.isPrimary = { old: existingPhone.isPrimary, new: phone.isPrimary };
    }

    // Registrar auditoria com changes
    if (requestingUserId && Object.keys(changes).length > 0) {
      logAudit('ContactPhone', phone.id, 'update', requestingUserId, tenantId, changes).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return {
      id: phone.id,
      tenantId: phone.tenantId,
      contactId: phone.contactId,
      phone: phone.phone,
      type: phone.type as 'WORK' | 'HOME' | 'MOBILE' | 'OTHER',
      isPrimary: phone.isPrimary,
      createdAt: phone.createdAt,
      updatedAt: phone.updatedAt,
    };
  }

  /**
   * Deleta telefone de um contato
   * 
   * @param phoneId - ID do telefone
   * @param contactId - ID do contato
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @throws Error se validações falharem
   */
  static async deletePhone(
    phoneId: string,
    contactId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<void> {
    // Validar que telefone existe, pertence ao contato, pertence ao tenant
    const existingPhone = await prisma.contactPhone.findFirst({
      where: {
        id: phoneId,
        contactId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!existingPhone) {
      throw new Error('Telefone não encontrado, não pertence ao contato ou não pertence ao seu tenant');
    }

    // Validar que contato existe e não está soft deleted
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!contact) {
      throw new Error('Contato não encontrado, não pertence ao seu tenant ou foi deletado');
    }

    // Deletar telefone via Prisma transaction
    await prisma.$transaction(async (tx) => {
      // Se for primary e houver outros telefones, marcar o primeiro como primary antes de deletar (opcional)
      if (existingPhone.isPrimary) {
        const firstOtherPhone = await tx.contactPhone.findFirst({
          where: {
            contactId,
            tenantId,
            id: { not: phoneId },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        if (firstOtherPhone) {
          await tx.contactPhone.update({
            where: {
              id: firstOtherPhone.id,
            },
            data: {
              isPrimary: true,
            },
          });
        }
      }

      // Deletar telefone
      await tx.contactPhone.delete({
        where: {
          id: phoneId,
        },
      });
    });

    // Registrar auditoria
    if (requestingUserId) {
      logAudit('ContactPhone', phoneId, 'delete', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }
  }
}

