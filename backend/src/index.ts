/**
 * Ponto de entrada da aplicação backend
 * CRM SaaS - API REST
 */

import express from 'express';
import dotenv from 'dotenv';
import { tenantContextMiddleware } from './middleware/tenantContext';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware básico
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota pública (sem tenant)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Aplicar middleware de tenant em todas as outras rotas
app.use(tenantContextMiddleware);

// Exemplo de rota protegida
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Rota protegida',
    tenantId: req.tenantId,
    tenant: req.tenant?.name,
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

