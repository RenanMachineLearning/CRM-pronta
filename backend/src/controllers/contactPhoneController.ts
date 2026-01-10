/**
 * Controller de telefones de contatos
 * 
 * Handlers para rotas de gestão de telefones de contatos.
 * Orquestra chamadas ao ContactPhoneService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { ContactPhoneService } from '../services/contactPhoneService';

/**
 * Adiciona telefone a um contato
 * 
 * @param req - Request com contactId nos params e dados do telefone no body
 * @param res - Response para retornar telefone criado
 */
export async function addPhone(req: Request, res: Response): Promise<void> {
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
    const { phone, type, isPrimary } = req.body;

    // Validar phone obrigatório
    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      res.status(400).json({
        error: 'Telefone obrigatório',
        message: 'Forneça um telefone válido',
      });
      return;
    }

    // Validar type obrigatório
    if (!type || !['WORK', 'HOME', 'MOBILE', 'OTHER'].includes(type)) {
      res.status(400).json({
        error: 'Tipo inválido',
        message: 'Tipo deve ser WORK, HOME, MOBILE ou OTHER',
      });
      return;
    }

    // Validar isPrimary (opcional, boolean)
    if (isPrimary !== undefined && typeof isPrimary !== 'boolean') {
      res.status(400).json({
        error: 'isPrimary inválido',
        message: 'isPrimary deve ser um boolean',
      });
      return;
    }

    // Adicionar telefone
    const newPhone = await ContactPhoneService.addPhone(
      contactId,
      tenantId,
      {
        phone,
        type,
        isPrimary,
      },
      userId
    );

    res.status(201).json(newPhone);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrado') ||
      error.message.includes('não encontradas') ||
      error.message.includes('não pertence') ||
      error.message.includes('foi deletado')
    ) {
      res.status(404).json({
        error: 'Recurso não encontrado',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('inválido')) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao adicionar telefone:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao adicionar telefone',
    });
  }
}

/**
 * Atualiza telefone de um contato
 * 
 * @param req - Request com contactId e phoneId nos params e dados no body
 * @param res - Response para retornar telefone atualizado
 */
export async function updatePhone(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair IDs dos params
    const contactId = req.params.id;
    const phoneId = req.params.phoneId;

    if (!contactId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do contato',
      });
      return;
    }

    if (!phoneId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do telefone',
      });
      return;
    }

    // Extrair dados do body (todos opcionais)
    const { phone, type, isPrimary } = req.body;

    // Validar phone se fornecido
    if (phone !== undefined) {
      if (typeof phone !== 'string' || phone.trim().length === 0) {
        res.status(400).json({
          error: 'Telefone inválido',
          message: 'Telefone deve ser uma string não vazia',
        });
        return;
      }
    }

    // Validar type se fornecido
    if (type !== undefined && !['WORK', 'HOME', 'MOBILE', 'OTHER'].includes(type)) {
      res.status(400).json({
        error: 'Tipo inválido',
        message: 'Tipo deve ser WORK, HOME, MOBILE ou OTHER',
      });
      return;
    }

    // Validar isPrimary se fornecido
    if (isPrimary !== undefined && typeof isPrimary !== 'boolean') {
      res.status(400).json({
        error: 'isPrimary inválido',
        message: 'isPrimary deve ser um boolean',
      });
      return;
    }

    // Atualizar telefone
    const updatedPhone = await ContactPhoneService.updatePhone(
      phoneId,
      contactId,
      tenantId,
      {
        phone,
        type,
        isPrimary,
      },
      userId
    );

    res.status(200).json(updatedPhone);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrado') ||
      error.message.includes('não encontradas') ||
      error.message.includes('não pertence') ||
      error.message.includes('foi deletado')
    ) {
      res.status(404).json({
        error: 'Recurso não encontrado',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('inválido')) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao atualizar telefone:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar telefone',
    });
  }
}

/**
 * Deleta telefone de um contato
 * 
 * @param req - Request com contactId e phoneId nos params
 * @param res - Response para confirmar deleção
 */
export async function deletePhone(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair IDs dos params
    const contactId = req.params.id;
    const phoneId = req.params.phoneId;

    if (!contactId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do contato',
      });
      return;
    }

    if (!phoneId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do telefone',
      });
      return;
    }

    // Deletar telefone
    await ContactPhoneService.deletePhone(phoneId, contactId, tenantId, userId);

    res.status(200).json({
      message: 'Telefone deletado com sucesso',
      id: phoneId,
    });
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrado') ||
      error.message.includes('não encontradas') ||
      error.message.includes('não pertence') ||
      error.message.includes('foi deletado')
    ) {
      res.status(404).json({
        error: 'Recurso não encontrado',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao deletar telefone:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar telefone',
    });
  }
}

