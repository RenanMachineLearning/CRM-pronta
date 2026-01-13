/**
 * Controller de endereços
 * 
 * Handlers para rotas de gestão de endereços de contatos e empresas.
 * Orquestra chamadas ao AddressService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização, exceto para permissões dinâmicas
 * baseadas no tipo de endereço (Contact ou Company).
 */

import { Request, Response } from 'express';
import { AddressService } from '../services/addressService';
import { checkPermission } from '../utils/permissions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Adiciona endereço a um contato
 * 
 * @param req - Request com contactId nos params e dados do endereço no body
 * @param res - Response para retornar endereço criado
 */
export async function addAddressToContact(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair contactId dos params
    const contactId = req.params.id;
    if (!contactId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do contato',
      });
      return;
    }

    // Extrair dados do body
    const { street, city, state, zipCode, country, type } = req.body;

    // Validar campos obrigatórios
    if (!street || typeof street !== 'string' || street.trim().length === 0) {
      res.status(400).json({
        error: 'Campo street obrigatório',
        message: 'Forneça um street válido',
      });
      return;
    }

    if (!city || typeof city !== 'string' || city.trim().length === 0) {
      res.status(400).json({
        error: 'Campo city obrigatório',
        message: 'Forneça um city válido',
      });
      return;
    }

    if (!state || typeof state !== 'string' || state.trim().length === 0) {
      res.status(400).json({
        error: 'Campo state obrigatório',
        message: 'Forneça um state válido',
      });
      return;
    }

    if (!zipCode || typeof zipCode !== 'string' || zipCode.trim().length === 0) {
      res.status(400).json({
        error: 'Campo zipCode obrigatório',
        message: 'Forneça um zipCode válido',
      });
      return;
    }

    if (!type || !['BILLING', 'SHIPPING', 'OTHER'].includes(type)) {
      res.status(400).json({
        error: 'Tipo inválido',
        message: 'Tipo deve ser BILLING, SHIPPING ou OTHER',
      });
      return;
    }

    // Validar country se fornecido
    if (country !== undefined && typeof country !== 'string') {
      res.status(400).json({
        error: 'Country inválido',
        message: 'Country deve ser uma string',
      });
      return;
    }

    // Adicionar endereço
    const newAddress = await AddressService.addAddressToContact(
      contactId,
      tenantId,
      {
        street,
        city,
        state,
        zipCode,
        country,
        type,
      },
      userId
    );

    res.status(201).json(newAddress);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrado') ||
      error.message.includes('não encontradas') ||
      error.message.includes('não pertence') ||
      error.message.includes('foi deletado') ||
      error.message.includes('foi deletada')
    ) {
      res.status(404).json({
        error: 'Recurso não encontrado',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('inválido') ||
      error.message.includes('obrigatório')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao adicionar endereço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao adicionar endereço',
    });
  }
}

/**
 * Adiciona endereço a uma empresa
 * 
 * @param req - Request com companyId nos params e dados do endereço no body
 * @param res - Response para retornar endereço criado
 */
export async function addAddressToCompany(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair companyId dos params
    const companyId = req.params.id;
    if (!companyId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID da empresa',
      });
      return;
    }

    // Extrair dados do body
    const { street, city, state, zipCode, country, type } = req.body;

    // Validar campos obrigatórios
    if (!street || typeof street !== 'string' || street.trim().length === 0) {
      res.status(400).json({
        error: 'Campo street obrigatório',
        message: 'Forneça um street válido',
      });
      return;
    }

    if (!city || typeof city !== 'string' || city.trim().length === 0) {
      res.status(400).json({
        error: 'Campo city obrigatório',
        message: 'Forneça um city válido',
      });
      return;
    }

    if (!state || typeof state !== 'string' || state.trim().length === 0) {
      res.status(400).json({
        error: 'Campo state obrigatório',
        message: 'Forneça um state válido',
      });
      return;
    }

    if (!zipCode || typeof zipCode !== 'string' || zipCode.trim().length === 0) {
      res.status(400).json({
        error: 'Campo zipCode obrigatório',
        message: 'Forneça um zipCode válido',
      });
      return;
    }

    if (!type || !['BILLING', 'SHIPPING', 'OTHER'].includes(type)) {
      res.status(400).json({
        error: 'Tipo inválido',
        message: 'Tipo deve ser BILLING, SHIPPING ou OTHER',
      });
      return;
    }

    // Validar country se fornecido
    if (country !== undefined && typeof country !== 'string') {
      res.status(400).json({
        error: 'Country inválido',
        message: 'Country deve ser uma string',
      });
      return;
    }

    // Adicionar endereço
    const newAddress = await AddressService.addAddressToCompany(
      companyId,
      tenantId,
      {
        street,
        city,
        state,
        zipCode,
        country,
        type,
      },
      userId
    );

    res.status(201).json(newAddress);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrado') ||
      error.message.includes('não encontradas') ||
      error.message.includes('não pertence') ||
      error.message.includes('foi deletado') ||
      error.message.includes('foi deletada')
    ) {
      res.status(404).json({
        error: 'Recurso não encontrado',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('inválido') ||
      error.message.includes('obrigatório')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao adicionar endereço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao adicionar endereço',
    });
  }
}

/**
 * Atualiza endereço
 * 
 * @param req - Request com addressId nos params e dados no body
 * @param res - Response para retornar endereço atualizado
 */
export async function updateAddress(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair addressId dos params
    const addressId = req.params.id;
    if (!addressId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do endereço',
      });
      return;
    }

    // Buscar endereço para determinar tipo (Contact ou Company) e verificar permissão
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        tenantId,
      },
      select: {
        contactId: true,
        companyId: true,
      },
    });

    if (!address) {
      res.status(404).json({
        error: 'Endereço não encontrado',
        message: 'Endereço não encontrado ou não pertence ao seu tenant',
      });
      return;
    }

    // Verificar permissão dinâmica baseada no tipo de endereço
    if (address.contactId) {
      // Endereço pertence a Contact - verificar permissão Contact.update
      const hasPermission = await checkPermission(userId, tenantId, 'Contact', 'update');
      if (!hasPermission) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para atualizar endereços de contatos',
        });
        return;
      }
    } else if (address.companyId) {
      // Endereço pertence a Company - verificar permissão Company.update
      const hasPermission = await checkPermission(userId, tenantId, 'Company', 'update');
      if (!hasPermission) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para atualizar endereços de empresas',
        });
        return;
      }
    } else {
      res.status(400).json({
        error: 'Endereço inválido',
        message: 'Endereço não está associado a um contato ou empresa',
      });
      return;
    }

    // Extrair dados do body (todos opcionais)
    const { street, city, state, zipCode, country, type } = req.body;

    // Validar campos se fornecidos
    if (street !== undefined && (typeof street !== 'string' || street.trim().length === 0)) {
      res.status(400).json({
        error: 'Street inválido',
        message: 'Street deve ser uma string não vazia',
      });
      return;
    }

    if (city !== undefined && (typeof city !== 'string' || city.trim().length === 0)) {
      res.status(400).json({
        error: 'City inválido',
        message: 'City deve ser uma string não vazia',
      });
      return;
    }

    if (state !== undefined && (typeof state !== 'string' || state.trim().length === 0)) {
      res.status(400).json({
        error: 'State inválido',
        message: 'State deve ser uma string não vazia',
      });
      return;
    }

    if (zipCode !== undefined && (typeof zipCode !== 'string' || zipCode.trim().length === 0)) {
      res.status(400).json({
        error: 'ZipCode inválido',
        message: 'ZipCode deve ser uma string não vazia',
      });
      return;
    }

    if (country !== undefined && (typeof country !== 'string' || country.trim().length === 0)) {
      res.status(400).json({
        error: 'Country inválido',
        message: 'Country deve ser uma string não vazia',
      });
      return;
    }

    if (type !== undefined && !['BILLING', 'SHIPPING', 'OTHER'].includes(type)) {
      res.status(400).json({
        error: 'Tipo inválido',
        message: 'Tipo deve ser BILLING, SHIPPING ou OTHER',
      });
      return;
    }

    // Atualizar endereço
    const updatedAddress = await AddressService.updateAddress(
      addressId,
      tenantId,
      {
        street,
        city,
        state,
        zipCode,
        country,
        type,
      },
      userId
    );

    res.status(200).json(updatedAddress);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrado') ||
      error.message.includes('não encontradas') ||
      error.message.includes('não pertence') ||
      error.message.includes('foi deletado') ||
      error.message.includes('foi deletada')
    ) {
      res.status(404).json({
        error: 'Recurso não encontrado',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('inválido') ||
      error.message.includes('obrigatório') ||
      error.message.includes('não pode ser vazio')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao atualizar endereço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar endereço',
    });
  }
}

/**
 * Deleta endereço
 * 
 * @param req - Request com addressId nos params
 * @param res - Response para confirmar deleção
 */
export async function deleteAddress(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair addressId dos params
    const addressId = req.params.id;
    if (!addressId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do endereço',
      });
      return;
    }

    // Buscar endereço para determinar tipo (Contact ou Company) e verificar permissão
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        tenantId,
      },
      select: {
        contactId: true,
        companyId: true,
      },
    });

    if (!address) {
      res.status(404).json({
        error: 'Endereço não encontrado',
        message: 'Endereço não encontrado ou não pertence ao seu tenant',
      });
      return;
    }

    // Verificar permissão dinâmica baseada no tipo de endereço
    if (address.contactId) {
      // Endereço pertence a Contact - verificar permissão Contact.update
      const hasPermission = await checkPermission(userId, tenantId, 'Contact', 'update');
      if (!hasPermission) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para deletar endereços de contatos',
        });
        return;
      }
    } else if (address.companyId) {
      // Endereço pertence a Company - verificar permissão Company.update
      const hasPermission = await checkPermission(userId, tenantId, 'Company', 'update');
      if (!hasPermission) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para deletar endereços de empresas',
        });
        return;
      }
    } else {
      res.status(400).json({
        error: 'Endereço inválido',
        message: 'Endereço não está associado a um contato ou empresa',
      });
      return;
    }

    // Deletar endereço
    await AddressService.deleteAddress(addressId, tenantId, userId);

    res.status(200).json({
      message: 'Endereço deletado com sucesso',
      id: addressId,
    });
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrado') ||
      error.message.includes('não encontradas') ||
      error.message.includes('não pertence') ||
      error.message.includes('foi deletado') ||
      error.message.includes('foi deletada')
    ) {
      res.status(404).json({
        error: 'Recurso não encontrado',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao deletar endereço:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar endereço',
    });
  }
}

