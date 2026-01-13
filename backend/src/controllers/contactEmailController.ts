/**
 * Controller de emails de contatos
 * 
 * Handlers para rotas de gestão de emails de contatos.
 * Orquestra chamadas ao ContactEmailService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { ContactEmailService } from '../services/contactEmailService';

/**
 * Adiciona email a um contato
 * 
 * @param req - Request com contactId nos params e dados do email no body
 * @param res - Response para retornar email criado
 */
export async function addEmail(req: Request, res: Response): Promise<void> {
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
    const { email, type, isPrimary } = req.body;

    // Validar email obrigatório
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      res.status(400).json({
        error: 'Email obrigatório',
        message: 'Forneça um email válido',
      });
      return;
    }

    // Validar type obrigatório
    if (!type || !['WORK', 'HOME', 'OTHER'].includes(type)) {
      res.status(400).json({
        error: 'Tipo inválido',
        message: 'Tipo deve ser WORK, HOME ou OTHER',
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

    // Adicionar email
    const newEmail = await ContactEmailService.addEmail(
      contactId,
      tenantId,
      {
        email,
        type,
        isPrimary,
      },
      userId
    );

    res.status(201).json(newEmail);
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

    if (
      error.message.includes('inválido') ||
      error.message.includes('já existe')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao adicionar email:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao adicionar email',
    });
  }
}

/**
 * Atualiza email de um contato
 * 
 * @param req - Request com contactId e emailId nos params e dados no body
 * @param res - Response para retornar email atualizado
 */
export async function updateEmail(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair IDs dos params
    const contactId = req.params.id;
    const emailId = req.params.emailId;

    if (!contactId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do contato',
      });
      return;
    }

    if (!emailId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do email',
      });
      return;
    }

    // Extrair dados do body (todos opcionais)
    const { email, type, isPrimary } = req.body;

    // Validar email se fornecido
    if (email !== undefined) {
      if (typeof email !== 'string' || email.trim().length === 0) {
        res.status(400).json({
          error: 'Email inválido',
          message: 'Email deve ser uma string não vazia',
        });
        return;
      }
    }

    // Validar type se fornecido
    if (type !== undefined && !['WORK', 'HOME', 'OTHER'].includes(type)) {
      res.status(400).json({
        error: 'Tipo inválido',
        message: 'Tipo deve ser WORK, HOME ou OTHER',
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

    // Atualizar email
    const updatedEmail = await ContactEmailService.updateEmail(
      emailId,
      contactId,
      tenantId,
      {
        email,
        type,
        isPrimary,
      },
      userId
    );

    res.status(200).json(updatedEmail);
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

    if (
      error.message.includes('inválido') ||
      error.message.includes('já existe') ||
      error.message.includes('não é possível remover')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    // Erro 409: Tentativa de remover único primary
    if (error.message.includes('único email primary')) {
      res.status(409).json({
        error: 'Não é possível remover único primary',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao atualizar email:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao atualizar email',
    });
  }
}

/**
 * Deleta email de um contato
 * 
 * @param req - Request com contactId e emailId nos params
 * @param res - Response para confirmar deleção
 */
export async function deleteEmail(req: Request, res: Response): Promise<void> {
  try {
    // tenantId e userId já validados pelo middleware
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // Extrair IDs dos params
    const contactId = req.params.id;
    const emailId = req.params.emailId;

    if (!contactId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do contato',
      });
      return;
    }

    if (!emailId) {
      res.status(400).json({
        error: 'ID não fornecido',
        message: 'Forneça o ID do email',
      });
      return;
    }

    // Deletar email
    await ContactEmailService.deleteEmail(emailId, contactId, tenantId, userId);

    res.status(200).json({
      message: 'Email deletado com sucesso',
      id: emailId,
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

    // Erro 409: Tentativa de deletar último email
    if (error.message.includes('último email')) {
      res.status(409).json({
        error: 'Não é possível deletar último email',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao deletar email:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao deletar email',
    });
  }
}

