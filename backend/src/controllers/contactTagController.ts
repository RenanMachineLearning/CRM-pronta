/**
 * Controller para associação de tags com contatos
 * 
 * Handlers para rotas de associação/desassociação de tags de contatos.
 * Orquestra chamadas ao ContactTagService.
 * 
 * Nota: Verificações de autorização são feitas exclusivamente via middleware.
 * Controllers não devem conter lógica de autorização.
 */

import { Request, Response } from 'express';
import { ContactTagService } from '../services/contactTagService';

/**
 * Adiciona tag a um contato
 * 
 * @param req - Request com contactId nos params e tagId no body
 * @param res - Response para retornar contato atualizado
 */
export async function addTagToContact(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair contactId dos params
    const contactId = req.params.id;

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId)) {
      res.status(400).json({
        error: 'contactId inválido',
        message: 'contactId deve ser um UUID válido',
      });
      return;
    }

    // Extrair tagId do body
    const { tagId } = req.body;

    // Validar tagId obrigatório
    if (!tagId || typeof tagId !== 'string') {
      res.status(400).json({
        error: 'tagId inválido',
        message: 'tagId é obrigatório e deve ser uma string',
      });
      return;
    }

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagId)) {
      res.status(400).json({
        error: 'tagId inválido',
        message: 'tagId deve ser um UUID válido',
      });
      return;
    }

    // Adicionar tag ao contato
    const contact = await ContactTagService.addTagToContact(contactId, tagId, tenantId);

    res.status(200).json(contact);
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrado') ||
      error.message.includes('não encontrada') ||
      error.message.includes('não pertence') ||
      error.message.includes('deletado')
    ) {
      res.status(404).json({
        error: 'Recurso não encontrado',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('já está associada') ||
      error.message.includes('já associada')
    ) {
      res.status(409).json({
        error: 'Conflito',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('inválido') ||
      error.message.includes('UUID')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao adicionar tag ao contato:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao adicionar tag ao contato',
    });
  }
}

/**
 * Remove tag de um contato
 * 
 * @param req - Request com contactId e tagId nos params
 * @param res - Response para retornar confirmação
 */
export async function removeTagFromContact(req: Request, res: Response): Promise<void> {
  try {
    // tenantId já validado pelo middleware
    const tenantId = req.tenantId!;

    // Extrair contactId e tagId dos params
    const contactId = req.params.id;
    const tagId = req.params.tagId;

    // Validar formato UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId)) {
      res.status(400).json({
        error: 'contactId inválido',
        message: 'contactId deve ser um UUID válido',
      });
      return;
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagId)) {
      res.status(400).json({
        error: 'tagId inválido',
        message: 'tagId deve ser um UUID válido',
      });
      return;
    }

    // Remover tag do contato
    await ContactTagService.removeTagFromContact(contactId, tagId, tenantId);

    res.status(200).json({
      message: 'Tag removida do contato com sucesso',
    });
  } catch (error: any) {
    // Tratar erros específicos do service
    if (
      error.message.includes('não encontrado') ||
      error.message.includes('não encontrada') ||
      error.message.includes('não pertence') ||
      error.message.includes('deletado') ||
      error.message.includes('não está associada')
    ) {
      res.status(404).json({
        error: 'Recurso não encontrado',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('inválido') ||
      error.message.includes('UUID')
    ) {
      res.status(400).json({
        error: 'Dados inválidos',
        message: error.message,
      });
      return;
    }

    console.error('Erro ao remover tag do contato:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao remover tag do contato',
    });
  }
}

