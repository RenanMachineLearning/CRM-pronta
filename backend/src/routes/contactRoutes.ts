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
import {
  addEmail,
  updateEmail,
  deleteEmail,
} from '../controllers/contactEmailController';
import {
  addPhone,
  updatePhone,
  deletePhone,
} from '../controllers/contactPhoneController';
import { addAddressToContact } from '../controllers/addressController';
import { addTagToContact, removeTagFromContact } from '../controllers/contactTagController';
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
 * Query params de paginação:
 * - page: número (opcional, default: 1) - Número da página (>= 1)
 * - limit: número (opcional, default: 20, max: 100) - Itens por página
 * - offset: número (opcional, legado) - Offset para paginação (compatibilidade)
 * 
 * Paginação padrão: page=1, limit=20
 * 
 * Exemplos de paginação:
 * - GET /api/contacts?page=1&limit=20
 * - GET /api/contacts?page=2&limit=10
 * - GET /api/contacts?offset=20&limit=20 (legado, ainda funciona)
 * 
 * Query params de filtros:
 * - companyId: string (opcional: UUID da empresa)
 * - status: string (opcional: ACTIVE, INACTIVE, ARCHIVED)
 * - tagId: string (opcional: UUID da tag)
 * - q: string (opcional) - Termo de busca textual (tolerante a diacríticos)
 *   A busca é tolerante a acentos: buscar "jose" encontra "José", buscar "sao paulo" encontra "São Paulo"
 * - hasEmail: boolean (opcional) - Filtrar contatos com/sem email (true/false)
 * - hasPhone: boolean (opcional) - Filtrar contatos com/sem telefone (true/false)
 * - filters: JSON (opcional) - Filtros avançados (array de objetos Filter)
 * 
 * Exemplo de filtros avançados:
 * ?filters=[{"field":"status","operator":"equals","value":"ACTIVE"},{"field":"createdAt","operator":"greaterThan","value":"2024-01-01"}]
 * 
 * Operadores disponíveis: equals, notEquals, contains, notContains, greaterThan, lessThan,
 * greaterThanOrEqual, lessThanOrEqual, between, in, notIn, isNull, isNotNull
 * 
 * Query params de ordenação:
 * - sortBy: string | string[] (opcional) - Campo(s) para ordenação
 *   Exemplo simples: ?sortBy=firstName
 *   Exemplo múltiplo: ?sortBy=companyId,firstName
 * - sortOrder: 'asc' | 'desc' | ('asc' | 'desc')[] (opcional, default: 'asc')
 *   Exemplo simples: ?sortOrder=asc
 *   Exemplo múltiplo: ?sortOrder=asc,desc
 * - orderBy: string (opcional, legado) - Campo para ordenação (compatibilidade)
 * - order: 'asc' | 'desc' (opcional, legado) - Direção (compatibilidade)
 * 
 * Ordenação padrão: createdAt desc
 * 
 * Exemplos de ordenação:
 * - GET /api/contacts?sortBy=firstName&sortOrder=asc
 * - GET /api/contacts?sortBy=companyId,firstName&sortOrder=asc,asc
 * 
 * Response 200:
 * {
 *   "data": [...],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 20,
 *     "total": 100,
 *     "totalPages": 5,
 *     "offset": 0
 *   }
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
 * POST /api/contacts/:id/emails
 * 
 * Adiciona email a um contato.
 * 
 * Requer autenticação e permissão "Contact.update"
 * 
 * Body:
 * {
 *   "email": "joao@example.com",
 *   "type": "WORK" (WORK, HOME, OTHER),
 *   "isPrimary": true (opcional, boolean)
 * }
 * 
 * Response 201: Email criado
 * Response 400: Dados inválidos (formato de email, tipo inválido)
 * Response 404: Contato não encontrado ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: Se não houver email primary e isPrimary não for fornecido, o email será marcado como primary automaticamente.
 */
router.post(
  '/:id/emails',
  authorizationMiddleware('Contact', 'update'),
  addEmail
);

/**
 * PUT /api/contacts/:id/emails/:emailId
 * 
 * Atualiza email de um contato.
 * 
 * Requer autenticação e permissão "Contact.update"
 * 
 * Body (todos opcionais):
 * {
 *   "email": "novo@example.com" (opcional),
 *   "type": "HOME" (opcional: WORK, HOME, OTHER),
 *   "isPrimary": false (opcional, boolean)
 * }
 * 
 * Response 200: Email atualizado
 * Response 400: Dados inválidos (formato de email, tipo inválido, tentativa de remover único primary)
 * Response 404: Contato ou email não encontrado
 * Response 409: Tentativa de remover único email primary
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: Não é possível remover o único email primary. Pelo menos um email deve ser primary.
 */
router.put(
  '/:id/emails/:emailId',
  authorizationMiddleware('Contact', 'update'),
  updateEmail
);

/**
 * DELETE /api/contacts/:id/emails/:emailId
 * 
 * Remove email de um contato.
 * 
 * Requer autenticação e permissão "Contact.update"
 * 
 * Response 200: { "message": "Email deletado com sucesso", "id": "uuid" }
 * Response 404: Contato ou email não encontrado
 * Response 409: Tentativa de deletar último email do contato
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: Não é possível deletar o último email do contato. Se o email deletado for primary, o primeiro email restante será marcado como primary.
 */
router.delete(
  '/:id/emails/:emailId',
  authorizationMiddleware('Contact', 'update'),
  deleteEmail
);

/**
 * POST /api/contacts/:id/phones
 * 
 * Adiciona telefone a um contato.
 * 
 * Requer autenticação e permissão "Contact.update"
 * 
 * Body:
 * {
 *   "phone": "+55 11 99999-9999",
 *   "type": "MOBILE" (WORK, HOME, MOBILE, OTHER),
 *   "isPrimary": true (opcional, boolean)
 * }
 * 
 * Response 201: Telefone criado
 * Response 400: Dados inválidos (formato de telefone, tipo inválido)
 * Response 404: Contato não encontrado ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/:id/phones',
  authorizationMiddleware('Contact', 'update'),
  addPhone
);

/**
 * PUT /api/contacts/:id/phones/:phoneId
 * 
 * Atualiza telefone de um contato.
 * 
 * Requer autenticação e permissão "Contact.update"
 * 
 * Body (todos opcionais):
 * {
 *   "phone": "+55 11 88888-8888" (opcional),
 *   "type": "WORK" (opcional: WORK, HOME, MOBILE, OTHER),
 *   "isPrimary": false (opcional, boolean)
 * }
 * 
 * Response 200: Telefone atualizado
 * Response 400: Dados inválidos (formato de telefone, tipo inválido)
 * Response 404: Contato ou telefone não encontrado
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.put(
  '/:id/phones/:phoneId',
  authorizationMiddleware('Contact', 'update'),
  updatePhone
);

/**
 * DELETE /api/contacts/:id/phones/:phoneId
 * 
 * Remove telefone de um contato.
 * 
 * Requer autenticação e permissão "Contact.update"
 * 
 * Response 200: { "message": "Telefone deletado com sucesso", "id": "uuid" }
 * Response 404: Contato ou telefone não encontrado
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: Se o telefone deletado for primary e houver outros telefones, o primeiro telefone restante será marcado como primary.
 */
router.delete(
  '/:id/phones/:phoneId',
  authorizationMiddleware('Contact', 'update'),
  deletePhone
);

/**
 * POST /api/contacts/:id/addresses
 * 
 * Adiciona endereço a um contato.
 * 
 * Requer autenticação e permissão "Contact.update"
 * 
 * Body:
 * {
 *   "street": "Rua das Flores, 123",
 *   "city": "São Paulo",
 *   "state": "SP",
 *   "zipCode": "01234-567",
 *   "country": "Brasil" (opcional, default: "Brasil"),
 *   "type": "BILLING" (BILLING, SHIPPING, OTHER)
 * }
 * 
 * Response 201: Endereço criado
 * Response 400: Dados inválidos (campos obrigatórios, formato CEP, país)
 * Response 404: Contato não encontrado ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * IMPORTANTE: Esta rota deve vir ANTES da rota /:id para evitar conflito de roteamento.
 */
router.post(
  '/:id/addresses',
  authorizationMiddleware('Contact', 'update'),
  addAddressToContact
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
 * 
 * IMPORTANTE: Esta rota deve vir DEPOIS das rotas aninhadas (/:id/emails, /:id/phones) para evitar conflito de roteamento.
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
 * POST /api/contacts/:id/tags
 * 
 * Adiciona tag a um contato.
 * 
 * Requer autenticação e permissão "Contact.update"
 * 
 * Params:
 * - id: string (UUID do contato)
 * 
 * Body:
 * - tagId: string (UUID da tag)
 * 
 * Response 200: Contato atualizado com tags
 * Response 400: Dados inválidos
 * Response 404: Contato ou tag não encontrada
 * Response 409: Tag já está associada ao contato
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/:id/tags',
  authorizationMiddleware('Contact', 'update'),
  addTagToContact
);

/**
 * DELETE /api/contacts/:id/tags/:tagId
 * 
 * Remove tag de um contato.
 * 
 * Requer autenticação e permissão "Contact.update"
 * 
 * Params:
 * - id: string (UUID do contato)
 * - tagId: string (UUID da tag)
 * 
 * Response 200: Confirmação de remoção
 * Response 400: Dados inválidos
 * Response 404: Contato, tag ou associação não encontrada
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.delete(
  '/:id/tags/:tagId',
  authorizationMiddleware('Contact', 'update'),
  removeTagFromContact
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

