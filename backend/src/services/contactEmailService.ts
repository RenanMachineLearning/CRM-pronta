/**
 * Serviço para gestão de emails de contatos
 * 
 * Lógica de negócio para operações CRUD de emails de contatos.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/auditLog';
import { validateEmail } from '../utils/validators';


// Interface para resposta de email
export interface ContactEmailResponse {
  id: string;
  tenantId: string;
  contactId: string;
  email: string;
  type: 'WORK' | 'HOME' | 'OTHER';
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ContactEmailService {
  /**
   * Adiciona email a um contato
   * 
   * @param contactId - ID do contato
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param data - Dados do email
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Email criado
   * @throws Error se validações falharem
   */
  static async addEmail(
    contactId: string,
    tenantId: string,
    data: {
      email: string;
      type: 'WORK' | 'HOME' | 'OTHER';
      isPrimary?: boolean;
    },
    requestingUserId?: string
  ): Promise<ContactEmailResponse> {
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

    // Validar formato de email
    if (!validateEmail(data.email)) {
      throw new Error(`Email inválido: ${data.email}`);
    }

    // Normalizar email (trim + lowercase)
    const normalizedEmail = data.email.trim().toLowerCase();

    // Verificar se email já existe para o contato (evitar duplicatas)
    const existingEmail = await prisma.contactEmail.findFirst({
      where: {
        contactId,
        tenantId,
        email: normalizedEmail,
      },
    });

    if (existingEmail) {
      throw new Error('Este email já existe para este contato');
    }

    // Verificar se já existe email primary
    const hasPrimaryEmail = await prisma.contactEmail.findFirst({
      where: {
        contactId,
        tenantId,
        isPrimary: true,
      },
    });

    // Se não houver email primary e isPrimary não foi fornecido ou é false, marcar como primary automaticamente
    const shouldBePrimary = data.isPrimary === true || !hasPrimaryEmail;

    // Criar email via Prisma transaction
    const email = await prisma.$transaction(async (tx) => {
      // Se este email deve ser primary, desmarcar outros emails como primary
      if (shouldBePrimary) {
        await tx.contactEmail.updateMany({
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

      // Criar novo email
      const newEmail = await tx.contactEmail.create({
        data: {
          tenantId,
          contactId,
          email: normalizedEmail,
          type: data.type,
          isPrimary: shouldBePrimary,
        },
      });

      return newEmail;
    });

    // Registrar auditoria
    if (requestingUserId) {
      logAudit('ContactEmail', email.id, 'create', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return {
      id: email.id,
      tenantId: email.tenantId,
      contactId: email.contactId,
      email: email.email,
      type: email.type as 'WORK' | 'HOME' | 'OTHER',
      isPrimary: email.isPrimary,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
    };
  }

  /**
   * Atualiza email de um contato
   * 
   * @param emailId - ID do email
   * @param contactId - ID do contato
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param data - Dados para atualização
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Email atualizado
   * @throws Error se validações falharem
   */
  static async updateEmail(
    emailId: string,
    contactId: string,
    tenantId: string,
    data: {
      email?: string;
      type?: 'WORK' | 'HOME' | 'OTHER';
      isPrimary?: boolean;
    },
    requestingUserId?: string
  ): Promise<ContactEmailResponse> {
    // Validar que email existe, pertence ao contato, pertence ao tenant
    const existingEmail = await prisma.contactEmail.findFirst({
      where: {
        id: emailId,
        contactId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!existingEmail) {
      throw new Error('Email não encontrado, não pertence ao contato ou não pertence ao seu tenant');
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

    // Se email fornecido, validar formato e normalizar
    if (data.email !== undefined) {
      if (!validateEmail(data.email)) {
        throw new Error(`Email inválido: ${data.email}`);
      }
      const normalizedEmail = data.email.trim().toLowerCase();

      // Verificar duplicatas (exceto o próprio email)
      const duplicateEmail = await prisma.contactEmail.findFirst({
        where: {
          contactId,
          tenantId,
          email: normalizedEmail,
          id: { not: emailId }, // Excluir o próprio email
        },
      });

      if (duplicateEmail) {
        throw new Error('Este email já existe para este contato');
      }

      updateData.email = normalizedEmail;
    }

    // Se type fornecido, atualizar
    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    // Verificar regra de primary obrigatória
    if (data.isPrimary !== undefined) {
      if (data.isPrimary === false && existingEmail.isPrimary) {
        // Tentando remover primary - verificar se é o único primary
        const primaryEmailsCount = await prisma.contactEmail.count({
          where: {
            contactId,
            tenantId,
            isPrimary: true,
          },
        });

        if (primaryEmailsCount === 1) {
          throw new Error('Não é possível remover o único email primary. Pelo menos um email deve ser primary');
        }
      }
    }

    // Atualizar email via Prisma transaction
    const email = await prisma.$transaction(async (tx) => {
      // Se isPrimary for true, desmarcar outros emails como primary
      if (data.isPrimary === true) {
        await tx.contactEmail.updateMany({
          where: {
            contactId,
            tenantId,
            isPrimary: true,
            id: { not: emailId }, // Excluir o próprio email
          },
          data: {
            isPrimary: false,
          },
        });
      }

      // Atualizar email
      const updatedEmail = await tx.contactEmail.update({
        where: {
          id: emailId,
        },
        data: updateData,
      });

      return updatedEmail;
    });

    // Preparar changes para auditoria
    const changes: any = {};
    if (data.email !== undefined && data.email !== existingEmail.email) {
      changes.email = { old: existingEmail.email, new: email.email };
    }
    if (data.type !== undefined && data.type !== existingEmail.type) {
      changes.type = { old: existingEmail.type, new: email.type };
    }
    if (data.isPrimary !== undefined && data.isPrimary !== existingEmail.isPrimary) {
      changes.isPrimary = { old: existingEmail.isPrimary, new: email.isPrimary };
    }

    // Registrar auditoria com changes
    if (requestingUserId && Object.keys(changes).length > 0) {
      logAudit('ContactEmail', email.id, 'update', requestingUserId, tenantId, changes).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return {
      id: email.id,
      tenantId: email.tenantId,
      contactId: email.contactId,
      email: email.email,
      type: email.type as 'WORK' | 'HOME' | 'OTHER',
      isPrimary: email.isPrimary,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
    };
  }

  /**
   * Deleta email de um contato
   * 
   * @param emailId - ID do email
   * @param contactId - ID do contato
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @throws Error se validações falharem
   */
  static async deleteEmail(
    emailId: string,
    contactId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<void> {
    // Validar que email existe, pertence ao contato, pertence ao tenant
    const existingEmail = await prisma.contactEmail.findFirst({
      where: {
        id: emailId,
        contactId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!existingEmail) {
      throw new Error('Email não encontrado, não pertence ao contato ou não pertence ao seu tenant');
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

    // Verificar se é o único email do contato
    const emailsCount = await prisma.contactEmail.count({
      where: {
        contactId,
        tenantId,
      },
    });

    if (emailsCount === 1) {
      throw new Error('Não é possível deletar o último email do contato');
    }

    // Deletar email via Prisma transaction
    await prisma.$transaction(async (tx) => {
      // Se for primary e houver outros emails, marcar o primeiro como primary antes de deletar
      if (existingEmail.isPrimary) {
        const firstOtherEmail = await tx.contactEmail.findFirst({
          where: {
            contactId,
            tenantId,
            id: { not: emailId },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        if (firstOtherEmail) {
          await tx.contactEmail.update({
            where: {
              id: firstOtherEmail.id,
            },
            data: {
              isPrimary: true,
            },
          });
        }
      }

      // Deletar email
      await tx.contactEmail.delete({
        where: {
          id: emailId,
        },
      });
    });

    // Registrar auditoria
    if (requestingUserId) {
      logAudit('ContactEmail', emailId, 'delete', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }
  }
}

