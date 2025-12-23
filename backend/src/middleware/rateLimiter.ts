/**
 * Middleware de Rate Limiting
 * 
 * Configura rate limiters para proteger a API contra ataques de brute force e sobrecarga.
 * 
 * Dois níveis de proteção:
 * - Global: 100 requisições por IP por minuto
 * - Login: 5 tentativas por IP por 15 minutos
 */

import rateLimit from 'express-rate-limit';

/**
 * Rate limiter global
 * 
 * Aplica limite de 100 requisições por IP por minuto em todas as rotas.
 * Pula health check para não interferir em monitoramento.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requisições por minuto
  message: {
    error: 'Muitas requisições',
    message: 'Tente novamente em alguns instantes.',
  },
  standardHeaders: true, // Incluir headers padrão (RFC draft: RateLimit-*)
  legacyHeaders: false, // Não usar headers legados (X-RateLimit-*)
  skip: (req) => req.path === '/health', // Pular health check
});

/**
 * Rate limiter para login
 * 
 * Aplica limite mais restritivo de 5 tentativas por IP por 15 minutos.
 * Conta todas as tentativas (inclusive sucessos) para prevenir brute force distribuído.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por 15 minutos
  message: {
    error: 'Muitas tentativas de login',
    message: 'Tente novamente em 15 minutos.',
  },
  standardHeaders: true, // Incluir headers padrão (RFC draft: RateLimit-*)
  legacyHeaders: false, // Não usar headers legados (X-RateLimit-*)
  skipSuccessfulRequests: false, // Contar todas as tentativas (inclusive sucessos)
});

