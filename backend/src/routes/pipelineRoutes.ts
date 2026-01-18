/**
 * Rotas para gestão de pipelines
 * 
 * Endpoints:
 * - GET /api/pipelines - Listar pipelines do tenant
 * - GET /api/pipelines/:id - Obter pipeline específico
 * - POST /api/pipelines - Criar pipeline
 * - PUT /api/pipelines/:id - Atualizar pipeline
 * - DELETE /api/pipelines/:id - Deletar pipeline
 */

import express from 'express';
import {
  listPipelines,
  getPipeline,
  createPipeline,
  updatePipeline,
  deletePipeline,
} from '../controllers/pipelineController';
import { tenantContextMiddleware } from '../middleware/tenantContext';
import { authMiddleware } from '../middleware/authMiddleware';
import { authorizationMiddleware } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Aplicar middlewares globais
router.use(tenantContextMiddleware, authMiddleware);

// GET /api/pipelines - Listar pipelines
// Nota: Não requer permissão específica conforme checklist (apenas autenticação)
router.get('/', listPipelines);

// GET /api/pipelines/:id - Obter pipeline específico
// Nota: Não requer permissão específica conforme checklist (apenas autenticação)
router.get('/:id', getPipeline);

// POST /api/pipelines - Criar pipeline
router.post(
  '/',
  authorizationMiddleware('Pipeline', 'create'),
  createPipeline
);

// PUT /api/pipelines/:id - Atualizar pipeline
router.put(
  '/:id',
  authorizationMiddleware('Pipeline', 'update'),
  updatePipeline
);

// DELETE /api/pipelines/:id - Deletar pipeline
router.delete(
  '/:id',
  authorizationMiddleware('Pipeline', 'delete'),
  deletePipeline
);

export default router;
