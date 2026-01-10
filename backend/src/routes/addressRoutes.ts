/**
 * Rotas de endereços
 * 
 * Define endpoints para gestão de endereços (update e delete).
 * Endereços podem pertencer a contatos ou empresas (polimórfico).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  updateAddress,
  deleteAddress,
} from '../controllers/addressController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * PUT /api/addresses/:id
 * 
 * Atualiza endereço existente.
 * 
 * Requer autenticação e permissão baseada no tipo:
 * - Se endereço pertence a Contact: "Contact.update"
 * - Se endereço pertence a Company: "Company.update"
 * 
 * Body (todos opcionais):
 * {
 *   "street": "Nova Rua",
 *   "city": "Nova Cidade",
 *   "state": "RJ",
 *   "zipCode": "20000-000",
 *   "country": "Brasil",
 *   "type": "SHIPPING"
 * }
 * 
 * Response 200: Endereço atualizado
 * Response 400: Dados inválidos
 * Response 404: Endereço não encontrado ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: Permissão é verificada dinamicamente no controller baseada no tipo de endereço.
 */
router.put(
  '/:id',
  // Middleware: tenantContextMiddleware e authMiddleware já aplicados globalmente
  // Permissão verificada no controller (dinâmica)
  updateAddress
);

/**
 * DELETE /api/addresses/:id
 * 
 * Remove endereço.
 * 
 * Requer autenticação e permissão baseada no tipo:
 * - Se endereço pertence a Contact: "Contact.update"
 * - Se endereço pertence a Company: "Company.update"
 * 
 * Response 200: { "message": "Endereço deletado com sucesso", "id": "uuid" }
 * Response 404: Endereço não encontrado ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: Permissão é verificada dinamicamente no controller baseada no tipo de endereço.
 */
router.delete(
  '/:id',
  // Middleware: tenantContextMiddleware e authMiddleware já aplicados globalmente
  // Permissão verificada no controller (dinâmica)
  deleteAddress
);

export default router;

