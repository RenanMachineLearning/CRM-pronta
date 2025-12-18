/**
 * Rotas de autenticação
 * 
 * Define endpoints para login, logout e refresh token
 */

import express from 'express';
import { login, logout, refresh } from '../controllers/authController';
import { loginRateLimiter } from '../middleware/rateLimiter';

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

export default router;

