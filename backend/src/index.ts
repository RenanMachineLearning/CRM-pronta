/**
 * Ponto de entrada da aplicação backend
 * CRM SaaS - API REST
 */

import express from 'express';
import dotenv from 'dotenv';
import { tenantContextMiddleware } from './middleware/tenantContext';
import { authMiddleware } from './middleware/authMiddleware';
import { globalRateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/authRoutes';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware básico
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter global (100 req/min)
app.use(globalRateLimiter);

// Rota pública (sem tenant, pode ser skip pelo rate limiter)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Rotas de autenticação (antes do middleware de tenant)
// Login precisa extrair tenant manualmente do header
app.use('/api/auth', authRoutes);

// Aplicar middleware de tenant em todas as outras rotas
app.use(tenantContextMiddleware);

// Aplicar middleware de autenticação em rotas protegidas
// Rotas públicas (/health, /api/auth/*) não precisam de autenticação
app.use(authMiddleware);

// Exemplo de rota protegida (requer tenant context + autenticação)
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Rota protegida',
    tenantId: req.tenantId,
    tenant: req.tenant?.name,
    userId: req.userId,
  });
});

// Exportar app para testes
export { app };

// Iniciar servidor apenas se não estiver em modo de teste
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
}

