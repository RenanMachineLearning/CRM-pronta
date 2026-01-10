/**
 * Serviço para gestão de endereços
 * 
 * Lógica de negócio para operações CRUD de endereços de contatos e empresas.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { PrismaClient } from '@prisma/client';
import { logAudit } from '../utils/auditLog';
import { validateZipCode, validateCountry } from '../utils/validators';

const prisma = new PrismaClient();

// Interface para resposta de endereço
export interface AddressResponse {
  id: string;
  tenantId: string;
  contactId: string | null;
  companyId: string | null;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  type: 'BILLING' | 'SHIPPING' | 'OTHER';
  createdAt: Date;
  updatedAt: Date;
}

export class AddressService {
  /**
   * Adiciona endereço a um contato
   * 
   * @param contactId - ID do contato
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param data - Dados do endereço
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Endereço criado
   * @throws Error se validações falharem
   */
  static async addAddressToContact(
    contactId: string,
    tenantId: string,
    data: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country?: string;
      type: 'BILLING' | 'SHIPPING' | 'OTHER';
    },
    requestingUserId?: string
  ): Promise<AddressResponse> {
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

    // Validar campos obrigatórios
    if (!data.street || typeof data.street !== 'string' || data.street.trim().length === 0) {
      throw new Error('Campo street é obrigatório');
    }
    if (!data.city || typeof data.city !== 'string' || data.city.trim().length === 0) {
      throw new Error('Campo city é obrigatório');
    }
    if (!data.state || typeof data.state !== 'string' || data.state.trim().length === 0) {
      throw new Error('Campo state é obrigatório');
    }
    if (!data.zipCode || typeof data.zipCode !== 'string' || data.zipCode.trim().length === 0) {
      throw new Error('Campo zipCode é obrigatório');
    }

    // Validar formato de CEP
    if (!validateZipCode(data.zipCode)) {
      throw new Error(`CEP inválido: ${data.zipCode}`);
    }

    // Validar país (se fornecido, senão usar "Brasil" como padrão)
    const country = data.country || 'Brasil';
    if (!validateCountry(country)) {
      throw new Error(`País inválido: ${country}`);
    }

    // Normalizar CEP (remover hífen e espaços, manter apenas dígitos)
    const normalizedZipCode = data.zipCode.replace(/[\s\-]/g, '');

    // Criar endereço via Prisma transaction
    const address = await prisma.address.create({
      data: {
        tenantId,
        contactId,
        street: data.street.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        zipCode: normalizedZipCode,
        country: country.trim(),
        type: data.type,
      },
    });

    // Registrar auditoria
    if (requestingUserId) {
      logAudit('Address', address.id, 'create', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return {
      id: address.id,
      tenantId: address.tenantId,
      contactId: address.contactId,
      companyId: address.companyId,
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      type: address.type as 'BILLING' | 'SHIPPING' | 'OTHER',
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  /**
   * Adiciona endereço a uma empresa
   * 
   * @param companyId - ID da empresa
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param data - Dados do endereço
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Endereço criado
   * @throws Error se validações falharem
   */
  static async addAddressToCompany(
    companyId: string,
    tenantId: string,
    data: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country?: string;
      type: 'BILLING' | 'SHIPPING' | 'OTHER';
    },
    requestingUserId?: string
  ): Promise<AddressResponse> {
    // Validar que empresa existe, pertence ao tenant e não está soft deleted
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Empresa não pode estar soft deleted
      },
      select: {
        id: true,
      },
    });

    if (!company) {
      throw new Error('Empresa não encontrada, não pertence ao seu tenant ou foi deletada');
    }

    // Validar campos obrigatórios
    if (!data.street || typeof data.street !== 'string' || data.street.trim().length === 0) {
      throw new Error('Campo street é obrigatório');
    }
    if (!data.city || typeof data.city !== 'string' || data.city.trim().length === 0) {
      throw new Error('Campo city é obrigatório');
    }
    if (!data.state || typeof data.state !== 'string' || data.state.trim().length === 0) {
      throw new Error('Campo state é obrigatório');
    }
    if (!data.zipCode || typeof data.zipCode !== 'string' || data.zipCode.trim().length === 0) {
      throw new Error('Campo zipCode é obrigatório');
    }

    // Validar formato de CEP
    if (!validateZipCode(data.zipCode)) {
      throw new Error(`CEP inválido: ${data.zipCode}`);
    }

    // Validar país (se fornecido, senão usar "Brasil" como padrão)
    const country = data.country || 'Brasil';
    if (!validateCountry(country)) {
      throw new Error(`País inválido: ${country}`);
    }

    // Normalizar CEP (remover hífen e espaços, manter apenas dígitos)
    const normalizedZipCode = data.zipCode.replace(/[\s\-]/g, '');

    // Criar endereço via Prisma transaction
    const address = await prisma.address.create({
      data: {
        tenantId,
        companyId,
        street: data.street.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        zipCode: normalizedZipCode,
        country: country.trim(),
        type: data.type,
      },
    });

    // Registrar auditoria
    if (requestingUserId) {
      logAudit('Address', address.id, 'create', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return {
      id: address.id,
      tenantId: address.tenantId,
      contactId: address.contactId,
      companyId: address.companyId,
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      type: address.type as 'BILLING' | 'SHIPPING' | 'OTHER',
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  /**
   * Atualiza endereço
   * 
   * @param addressId - ID do endereço
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param data - Dados para atualização
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Endereço atualizado
   * @throws Error se validações falharem
   */
  static async updateAddress(
    addressId: string,
    tenantId: string,
    data: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      type?: 'BILLING' | 'SHIPPING' | 'OTHER';
    },
    requestingUserId?: string
  ): Promise<AddressResponse> {
    // Validar que endereço existe e pertence ao tenant
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!existingAddress) {
      throw new Error('Endereço não encontrado ou não pertence ao seu tenant');
    }

    // Validar que contato ou empresa associada existe e não está soft deleted
    if (existingAddress.contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: existingAddress.contactId,
          tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!contact) {
        throw new Error('Contato associado não encontrado, não pertence ao seu tenant ou foi deletado');
      }
    } else if (existingAddress.companyId) {
      const company = await prisma.company.findFirst({
        where: {
          id: existingAddress.companyId,
          tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!company) {
        throw new Error('Empresa associada não encontrada, não pertence ao seu tenant ou foi deletada');
      }
    } else {
      throw new Error('Endereço não está associado a um contato ou empresa');
    }

    // Preparar dados de atualização
    const updateData: any = {};

    // Se street fornecido, validar e normalizar
    if (data.street !== undefined) {
      if (typeof data.street !== 'string' || data.street.trim().length === 0) {
        throw new Error('Campo street não pode ser vazio');
      }
      updateData.street = data.street.trim();
    }

    // Se city fornecido, validar e normalizar
    if (data.city !== undefined) {
      if (typeof data.city !== 'string' || data.city.trim().length === 0) {
        throw new Error('Campo city não pode ser vazio');
      }
      updateData.city = data.city.trim();
    }

    // Se state fornecido, validar e normalizar
    if (data.state !== undefined) {
      if (typeof data.state !== 'string' || data.state.trim().length === 0) {
        throw new Error('Campo state não pode ser vazio');
      }
      updateData.state = data.state.trim();
    }

    // Se zipCode fornecido, validar formato e normalizar
    if (data.zipCode !== undefined) {
      if (typeof data.zipCode !== 'string' || data.zipCode.trim().length === 0) {
        throw new Error('Campo zipCode não pode ser vazio');
      }
      if (!validateZipCode(data.zipCode)) {
        throw new Error(`CEP inválido: ${data.zipCode}`);
      }
      updateData.zipCode = data.zipCode.replace(/[\s\-]/g, '');
    }

    // Se country fornecido, validar
    if (data.country !== undefined) {
      if (typeof data.country !== 'string' || data.country.trim().length === 0) {
        throw new Error('Campo country não pode ser vazio');
      }
      if (!validateCountry(data.country)) {
        throw new Error(`País inválido: ${data.country}`);
      }
      updateData.country = data.country.trim();
    }

    // Se type fornecido, validar
    if (data.type !== undefined) {
      if (!['BILLING', 'SHIPPING', 'OTHER'].includes(data.type)) {
        throw new Error('Tipo deve ser BILLING, SHIPPING ou OTHER');
      }
      updateData.type = data.type;
    }

    // Se não houver dados para atualizar, retornar endereço existente
    if (Object.keys(updateData).length === 0) {
      return {
        id: existingAddress.id,
        tenantId: existingAddress.tenantId,
        contactId: existingAddress.contactId,
        companyId: existingAddress.companyId,
        street: existingAddress.street,
        city: existingAddress.city,
        state: existingAddress.state,
        zipCode: existingAddress.zipCode,
        country: existingAddress.country,
        type: existingAddress.type as 'BILLING' | 'SHIPPING' | 'OTHER',
        createdAt: existingAddress.createdAt,
        updatedAt: existingAddress.updatedAt,
      };
    }

    // Atualizar endereço via Prisma transaction
    const address = await prisma.address.update({
      where: {
        id: addressId,
      },
      data: updateData,
    });

    // Preparar changes para auditoria
    const changes: any = {};
    if (data.street !== undefined && data.street.trim() !== existingAddress.street) {
      changes.street = { old: existingAddress.street, new: address.street };
    }
    if (data.city !== undefined && data.city.trim() !== existingAddress.city) {
      changes.city = { old: existingAddress.city, new: address.city };
    }
    if (data.state !== undefined && data.state.trim() !== existingAddress.state) {
      changes.state = { old: existingAddress.state, new: address.state };
    }
    if (data.zipCode !== undefined) {
      // Normalizar zipCode para comparação (remover hífen e espaços)
      const normalizedInputZipCode = data.zipCode.replace(/[\s\-]/g, '');
      if (normalizedInputZipCode !== existingAddress.zipCode) {
        changes.zipCode = { old: existingAddress.zipCode, new: address.zipCode };
      }
    }
    if (data.country !== undefined && data.country.trim() !== existingAddress.country) {
      changes.country = { old: existingAddress.country, new: address.country };
    }
    if (data.type !== undefined && data.type !== existingAddress.type) {
      changes.type = { old: existingAddress.type, new: address.type };
    }

    // Registrar auditoria com changes
    if (requestingUserId && Object.keys(changes).length > 0) {
      logAudit('Address', address.id, 'update', requestingUserId, tenantId, changes).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    return {
      id: address.id,
      tenantId: address.tenantId,
      contactId: address.contactId,
      companyId: address.companyId,
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      type: address.type as 'BILLING' | 'SHIPPING' | 'OTHER',
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  /**
   * Deleta endereço
   * 
   * @param addressId - ID do endereço
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @throws Error se validações falharem
   */
  static async deleteAddress(
    addressId: string,
    tenantId: string,
    requestingUserId?: string
  ): Promise<void> {
    // Validar que endereço existe e pertence ao tenant
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        tenantId, // Isolamento multi-tenant obrigatório
      },
    });

    if (!existingAddress) {
      throw new Error('Endereço não encontrado ou não pertence ao seu tenant');
    }

    // Validar que contato ou empresa associada existe e não está soft deleted
    if (existingAddress.contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: existingAddress.contactId,
          tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!contact) {
        throw new Error('Contato associado não encontrado, não pertence ao seu tenant ou foi deletado');
      }
    } else if (existingAddress.companyId) {
      const company = await prisma.company.findFirst({
        where: {
          id: existingAddress.companyId,
          tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!company) {
        throw new Error('Empresa associada não encontrada, não pertence ao seu tenant ou foi deletada');
      }
    }

    // Deletar endereço via Prisma transaction (hard delete - tabela relacionada)
    await prisma.address.delete({
      where: {
        id: addressId,
      },
    });

    // Registrar auditoria
    if (requestingUserId) {
      logAudit('Address', addressId, 'delete', requestingUserId, tenantId).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }
  }
}

