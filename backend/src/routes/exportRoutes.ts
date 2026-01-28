/**
 * Rotas de exportação (Etapa 9 - Parte 8).
 *
 * GET /api/export/:entityType — exporta registros em CSV ou Excel
 * com filtros e seleção de campos. Requer autenticação e permissão Export.create.
 */

import { Router } from 'express';
import { exportData } from '../controllers/exportController';
import { checkExportPermission } from '../middleware/upload.middleware';

const router = Router();

router.get(
  '/:entityType',
  checkExportPermission,
  exportData
);

export default router;
