/**
 * Rotas de autenticação
 * 
 * Define endpoints para login, logout e refresh token
 */

import express from 'express';
import { login, logout, refresh, forgotPassword, resetPassword, changePassword } from '../controllers/authController';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantContextMiddleware } from '../middleware/tenantContext';

const router = express.Router();

/**
 * POST /api/auth/login
 * 
 * Realiza login de usuário
 * 
 * Body:
 * - email: string (obrigatório)
 * - password: string (obrigatório)
 * 
 * Headers:
 * - X-Tenant-Id ou X-Tenant-Slug (obrigatório)
 * 
 * Response 200:
 * - token: string (JWT token)
 * 
 * Response 400:
 * - Email ou senha não fornecidos
 * - Tenant não identificado
 * 
 * Response 401:
 * - Credenciais inválidas (genérico - não revela se email existe)
 * 
 * Response 403:
 * - Tenant inválido ou inativo
 */
router.post('/login', loginRateLimiter, login);

/**
 * POST /api/auth/logout
 * 
 * Realiza logout de usuário
 * 
 * Para JWT stateless (V1): apenas retorna sucesso.
 * Cliente é responsável por remover token do storage.
 * 
 * Response 200:
 * - message: string
 * 
 * Nota: Público apenas na V1 (JWT stateless). Na V2, pode ser protegido com middleware de autenticação.
 */
router.post('/logout', logout);

/**
 * POST /api/auth/refresh
 * 
 * Atualiza token JWT (refresh)
 * 
 * NOTA: Refresh token é opcional na V1 e será implementado na V2.
 * Esta rota não será implementada na V1.
 * 
 * Response 501:
 * - Não implementado
 */
router.post('/refresh', refresh);

/**
 * POST /api/auth/forgot-password
 * 
 * Solicita reset de senha
 * 
 * Body:
 * - email: string (obrigatório)
 * 
 * Headers:
 * - X-Tenant-Id ou X-Tenant-Slug (obrigatório)
 * 
 * Response 200:
 * - message: string (sempre sucesso, não revela se email existe)
 * 
 * Response 400:
 * - Email não fornecido
 * - Tenant não identificado
 * 
 * Response 403:
 * - Tenant inválido ou inativo
 * 
 * Nota de Segurança:
 * - Sempre retorna sucesso para não revelar se email existe
 * - Se email existir, token é gerado e email é enviado (ou logado em DEV)
 */
router.post('/forgot-password', forgotPassword);

/**
 * POST /api/auth/reset-password
 * 
 * Reseta senha usando token
 * 
 * Body:
 * - token: string (obrigatório) - Token de reset recebido por email
 * - newPassword: string (obrigatório) - Nova senha (mínimo 8 caracteres)
 * 
 * Headers:
 * - X-Tenant-Id ou X-Tenant-Slug (obrigatório)
 * 
 * Response 200:
 * - message: string
 * 
 * Response 400:
 * - Token ou senha não fornecidos
 * - Token inválido, expirado ou já utilizado
 * - Senha não atende complexidade mínima (8 caracteres)
 * - Tenant não identificado
 * 
 * Response 403:
 * - Tenant inválido ou inativo
 * 
 * Nota de Segurança:
 * - Token é invalidado após uso (não pode ser reutilizado)
 * - Token expira em 1 hora
 * - Token de tenant A não funciona em tenant B
 */
router.post('/reset-password', resetPassword);

/**
 * POST /api/auth/change-password
 * 
 * Altera senha do usuário autenticado
 * 
 * Requer autenticação (token JWT no header Authorization: Bearer <token>)
 * 
 * Body:
 * - currentPassword: string (obrigatório) - Senha atual do usuário
 * - newPassword: string (obrigatório) - Nova senha (mínimo 8 caracteres, diferente da atual)
 * 
 * Headers:
 * - Authorization: Bearer <token> (obrigatório)
 * - X-Tenant-Id ou X-Tenant-Slug (obrigatório)
 * 
 * Response 200:
 * - message: string
 * 
 * Response 400:
 * - Senha atual ou nova senha não fornecidas
 * - Nova senha igual à atual
 * - Senha não atende complexidade mínima (8 caracteres)
 * - Tenant não identificado
 * 
 * Response 401:
 * - Token não fornecido ou inválido
 * - Credenciais inválidas (senha atual incorreta - mensagem genérica)
 * 
 * Response 403:
 * - Tenant inválido ou inativo
 * 
 * Nota de Segurança:
 * - Rota protegida por authMiddleware (requer token JWT válido)
 * - Herda rate limiter global (100 req/min por IP)
 * - Mensagens de erro genéricas (não revela qual validação falhou)
 * - V2: Considerar invalidar tokens após troca de senha
 */
router.post('/change-password', tenantContextMiddleware, authMiddleware, changePassword);

export default router;

