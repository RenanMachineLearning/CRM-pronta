/**
 * Rotas de contatos
 * 
 * Define endpoints para gestão de contatos (CRUD).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
} from '../controllers/contactController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/contacts
 * 
 * Lista contatos do tenant atual com paginação e filtros.
 * 
 * Requer autenticação e permissão "Contact.list"
 * 
 * Query params:
 * - limit: número (opcional, default: 20, max: 100)
 * - offset: número (opcional, default: 0)
 * - companyId: string (opcional: UUID da empresa)
 * - status: string (opcional: ACTIVE, INACTIVE, ARCHIVED)
 * - tagId: string (opcional: UUID da tag)
 * - orderBy: string (opcional: firstName, lastName, createdAt, default: createdAt)
 * - order: string (opcional: asc, desc, default: desc)
 * 
 * Response 200:
 * {
 *   "data": [...],
 *   "pagination": { "total": 100, "limit": 20, "offset": 0 }
 * }
 * 
 * Response 400: Parâmetros inválidos
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/',
  authorizationMiddleware('Contact', 'list'),
  listContacts
);

/**
 * GET /api/contacts/:id
 * 
 * Obtém contato específico do tenant atual.
 * 
 * Requer autenticação e permissão "Contact.read"
 * 
 * Response 200: Contato encontrado (com campos filtrados por permissão)
 * Response 404: Contato não encontrado ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/:id',
  authorizationMiddleware('Contact', 'read'),
  getContact
);

/**
 * POST /api/contacts
 * 
 * Cria novo contato no tenant atual.
 * 
 * Requer autenticação e permissão "Contact.create"
 * 
 * Body:
 * {
 *   "firstName": "João",
 *   "lastName": "Silva",
 *   "title": "Gerente",
 *   "status": "ACTIVE",
 *   "companyId": "uuid-empresa" (opcional),
 *   "emails": [
 *     { "email": "joao@example.com", "type": "WORK", "isPrimary": true }
 *   ],
 *   "phones": [
 *     { "phone": "+55 11 99999-9999", "type": "MOBILE", "isPrimary": true }
 *   ],
 *   "addresses": [
 *     { "street": "Rua X", "city": "São Paulo", "state": "SP", "zipCode": "01234-567", "type": "OTHER" }
 *   ],
 *   "tagIds": ["uuid-tag-1", "uuid-tag-2"] (opcional)
 * }
 * 
 * Response 201: Contato criado (com campos filtrados por permissão)
 * Response 400: Dados inválidos
 * Response 404: Empresa ou tag não encontrada (se companyId ou tagIds fornecidos)
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/',
  authorizationMiddleware('Contact', 'create'),
  createContact
);

/**
 * PUT /api/contacts/:id
 * 
 * Atualiza contato existente no tenant atual.
 * 
 * Requer autenticação e permissão "Contact.update"
 * 
 * Body (todos opcionais, exceto que firstName é obrigatório se fornecido):
 * {
 *   "firstName": "João",
 *   "lastName": "Silva",
 *   "title": "Gerente",
 *   "status": "ACTIVE",
 *   "companyId": "uuid-empresa" (ou null para remover associação),
 *   "emails": [...] (substitui completamente),
 *   "phones": [...] (substitui completamente),
 *   "addresses": [...] (substitui completamente),
 *   "tagIds": [...] (substitui completamente)
 * }
 * 
 * Nota: Arrays de relacionamentos (emails, phones, addresses, tagIds) substituem completamente os existentes.
 * 
 * Response 200: Contato atualizado (com campos filtrados por permissão)
 * Response 400: Dados inválidos
 * Response 403: Sem permissão para atualizar campos específicos
 * Response 404: Contato, empresa ou tag não encontrada
 * Response 401: Não autenticado
 */
router.put(
  '/:id',
  authorizationMiddleware('Contact', 'update'),
  updateContact
);

/**
 * DELETE /api/contacts/:id
 * 
 * Deleta contato (soft delete - marca deletedAt).
 * 
 * Requer autenticação e permissão "Contact.delete"
 * 
 * Response 200: { "message": "Contato deletado com sucesso", "id": "uuid" }
 * Response 404: Contato não encontrado ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: ContactEmail, ContactPhone, Address e ContactTag são deletados automaticamente via cascade.
 */
router.delete(
  '/:id',
  authorizationMiddleware('Contact', 'delete'),
  deleteContact
);

export default router;

