/**
 * Extensão de tipos do Express para incluir contexto de tenant e autenticação
 * Permite adicionar tenantId, tenant e userId ao objeto Request
 */

import { Tenant } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;    // Adicionado por tenantContextMiddleware
      tenant?: Tenant;      // Adicionado por tenantContextMiddleware
      userId?: string;      // Adicionado por authMiddleware
    }
  }
}

