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
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import entityRoutes from './routes/entityRoutes';
import fieldRoutes from './routes/fieldRoutes';
import relationshipRoutes from './routes/relationshipRoutes';
import contactRoutes from './routes/contactRoutes';
import companyRoutes from './routes/companyRoutes';
import addressRoutes from './routes/addressRoutes';
import tagRoutes from './routes/tagRoutes';
import leadRoutes from './routes/leadRoutes';
import opportunityRoutes from './routes/opportunityRoutes';
import pipelineRoutes from './routes/pipelineRoutes';
import taskRoutes from './routes/taskRoutes';
import noteRoutes from './routes/noteRoutes';
import timelineRoutes from './routes/timelineRoutes';
import { startTaskNotificationJob } from './jobs/taskNotificationJob';

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

// Rotas de usuários (protegidas - requerem tenant context + autenticação)
app.use('/api/users', userRoutes);

// Rotas de roles (protegidas - requerem tenant context + autenticação)
app.use('/api/roles', roleRoutes);

// Rotas de audit logs (protegidas - requerem tenant context + autenticação)
app.use('/api/audit-logs', auditLogRoutes);

// Rotas de entidades (metadados) (protegidas - requerem tenant context + autenticação)
app.use('/api/entities', entityRoutes);

// Rotas de campos (metadados) (protegidas - requerem tenant context + autenticação)
app.use('/api', fieldRoutes);

// Rotas de relacionamentos (metadados) (protegidas - requerem tenant context + autenticação)
app.use('/api', relationshipRoutes);

// Rotas de contatos (protegidas - requerem tenant context + autenticação)
app.use('/api/contacts', contactRoutes);

// Rotas de empresas (protegidas - requerem tenant context + autenticação)
app.use('/api/companies', companyRoutes);

// Rotas de endereços (protegidas - requerem tenant context + autenticação)
app.use('/api/addresses', addressRoutes);

// Rotas de tags (protegidas - requerem tenant context + autenticação)
app.use('/api/tags', tagRoutes);

// Rotas de leads (protegidas - requerem tenant context + autenticação)
app.use('/api/leads', leadRoutes);

// Rotas de oportunidades (protegidas - requerem tenant context + autenticação)
app.use('/api/opportunities', opportunityRoutes);

// Rotas de pipelines (protegidas - requerem tenant context + autenticação)
app.use('/api/pipelines', pipelineRoutes);

// Rotas de tarefas (protegidas - requerem tenant context + autenticação)
app.use('/api/tasks', taskRoutes);

// Rotas de notas (protegidas - requerem tenant context + autenticação)
app.use('/api/notes', noteRoutes);

// Rotas de timeline (protegidas - requerem tenant context + autenticação)
app.use('/api/timeline', timelineRoutes);

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
    
    // Iniciar job de notificações de tarefas vencidas
    startTaskNotificationJob();
  });
}

