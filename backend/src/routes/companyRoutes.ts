/**
 * Rotas de empresas
 * 
 * Define endpoints para gestão de empresas (CRUD).
 * Todas as rotas requerem autenticação e permissões ACL apropriadas.
 */

import express from 'express';
import {
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyContacts,
} from '../controllers/companyController';
import { addAddressToCompany } from '../controllers/addressController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais no nível do router
// Ordem: tenantContextMiddleware → authMiddleware
router.use(tenantContextMiddleware, authMiddleware);

/**
 * GET /api/companies
 * 
 * Lista empresas do tenant atual com paginação e filtros.
 * 
 * Requer autenticação e permissão "Company.list"
 * 
 * Query params:
 * - limit: número (opcional, default: 20, max: 100)
 * - offset: número (opcional, default: 0)
 * - industry: string (opcional: busca parcial case-insensitive)
 * - size: string (opcional: SMALL, MEDIUM, LARGE, ENTERPRISE)
 * - orderBy: string (opcional: name, createdAt, default: name)
 * - order: string (opcional: asc, desc, default: asc para name, desc para createdAt)
 * 
 * Response 200:
 * {
 *   "data": [...],
 *   "pagination": { "total": 100, "limit": 20, "offset": 0 }
 * }
 * 
 * Nota: Contatos são incluídos apenas como contagem (contactsCount) para performance.
 * 
 * Response 400: Parâmetros inválidos
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.get(
  '/',
  authorizationMiddleware('Company', 'list'),
  listCompanies
);

/**
 * GET /api/companies/:id/contacts
 * 
 * Lista contatos associados a uma empresa específica.
 * 
 * Requer autenticação e permissão "Contact.list"
 * 
 * Query params:
 * - limit: número (opcional, default: 20, max: 100)
 * - offset: número (opcional, default: 0)
 * - status: string (opcional: ACTIVE, INACTIVE, ARCHIVED)
 * - tagId: string (opcional: UUID da tag)
 * - orderBy: string (opcional: firstName, lastName, createdAt, default: createdAt)
 * - order: string (opcional: asc, desc, default: desc)
 * 
 * Response 200:
 * {
 *   "data": [...],
 *   "pagination": { "total": 10, "limit": 20, "offset": 0 }
 * }
 * 
 * Nota: Retorna apenas contatos não deletados (soft delete) associados à empresa.
 * 
 * Response 400: Parâmetros inválidos
 * Response 404: Empresa não encontrada, não pertence ao tenant ou foi deletada
 * Response 401: Não autenticado
 * Response 403: Sem permissão (Contact.list)
 */
router.get(
  '/:id/contacts',
  authorizationMiddleware('Contact', 'list'), // Permissão de Contact.list (não Company)
  getCompanyContacts
);

/**
 * POST /api/companies/:id/addresses
 * 
 * Adiciona endereço a uma empresa.
 * 
 * Requer autenticação e permissão "Company.update"
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
 * Response 404: Empresa não encontrada ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * IMPORTANTE: Esta rota deve vir ANTES da rota /:id para evitar conflito de roteamento.
 */
router.post(
  '/:id/addresses',
  authorizationMiddleware('Company', 'update'),
  addAddressToCompany
);

/**
 * GET /api/companies/:id
 * 
 * Obtém empresa específica do tenant atual.
 * 
 * Requer autenticação e permissão "Company.read"
 * 
 * Response 200: Empresa encontrada (com campos filtrados por permissão)
 * Response 404: Empresa não encontrada ou não pertence ao tenant
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: Inclui lista completa de contatos associados (id, firstName, lastName, title).
 * 
 * IMPORTANTE: Esta rota deve vir DEPOIS de /:id/contacts para evitar conflito de roteamento.
 */
router.get(
  '/:id',
  authorizationMiddleware('Company', 'read'),
  getCompany
);

/**
 * POST /api/companies
 * 
 * Cria nova empresa no tenant atual.
 * 
 * Requer autenticação e permissão "Company.create"
 * 
 * Body:
 * {
 *   "name": "Empresa XYZ",
 *   "website": "https://example.com" (opcional),
 *   "industry": "Tecnologia" (opcional),
 *   "size": "MEDIUM" (opcional: SMALL, MEDIUM, LARGE, ENTERPRISE),
 *   "status": "ACTIVE" (opcional: ACTIVE, INACTIVE, ARCHIVED),
 *   "addresses": [
 *     { "street": "Rua X", "city": "São Paulo", "state": "SP", "zipCode": "01234-567", "type": "OTHER" }
 *   ] (opcional),
 *   "tagIds": ["uuid-tag-1", "uuid-tag-2"] (opcional)
 * }
 * 
 * Response 201: Empresa criada (com campos filtrados por permissão)
 * Response 400: Dados inválidos
 * Response 404: Tag não encontrada (se tagIds fornecidos)
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 */
router.post(
  '/',
  authorizationMiddleware('Company', 'create'),
  createCompany
);

/**
 * PUT /api/companies/:id
 * 
 * Atualiza empresa existente no tenant atual.
 * 
 * Requer autenticação e permissão "Company.update"
 * 
 * Body (todos opcionais, exceto que name é obrigatório se fornecido):
 * {
 *   "name": "Empresa XYZ",
 *   "website": "https://example.com" (ou null para remover),
 *   "industry": "Tecnologia",
 *   "size": "MEDIUM",
 *   "status": "ACTIVE",
 *   "addresses": [...] (substitui completamente),
 *   "tagIds": [...] (substitui completamente)
 * }
 * 
 * Nota: Arrays de relacionamentos (addresses, tagIds) substituem completamente os existentes.
 * 
 * Response 200: Empresa atualizada (com campos filtrados por permissão)
 * Response 400: Dados inválidos
 * Response 403: Sem permissão para atualizar campos específicos
 * Response 404: Empresa ou tag não encontrada
 * Response 401: Não autenticado
 */
router.put(
  '/:id',
  authorizationMiddleware('Company', 'update'),
  updateCompany
);

/**
 * DELETE /api/companies/:id
 * 
 * Deleta empresa (soft delete - marca deletedAt).
 * 
 * Requer autenticação e permissão "Company.delete"
 * 
 * Response 200: { "message": "Empresa deletada com sucesso", "id": "uuid" }
 * Response 404: Empresa não encontrada ou não pertence ao tenant
 * Response 409: Empresa possui contatos associados (não pode ser deletada)
 * Response 401: Não autenticado
 * Response 403: Sem permissão
 * 
 * Nota: Address e CompanyTag são deletados automaticamente via cascade.
 * Empresa não pode ser deletada se houver contatos associados.
 */
router.delete(
  '/:id',
  authorizationMiddleware('Company', 'delete'),
  deleteCompany
);

export default router;

