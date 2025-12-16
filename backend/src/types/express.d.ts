/**
 * Extensão de tipos do Express para incluir contexto de tenant
 * Permite adicionar tenantId e tenant ao objeto Request
 */

import { Tenant } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: Tenant;
    }
  }
}

