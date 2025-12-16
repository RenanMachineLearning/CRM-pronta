/**
 * Middleware de contexto de tenant
 * 
 * Extrai e valida o tenant das requisições HTTP via header.
 * Na Etapa 2 (Autenticação), essa estratégia será revisada para integração
 * com autenticação (tenant identificado automaticamente pelo email do usuário).
 * 
 * Ordem de execução: request → tenantContext → (futuro: auth)
 */

import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenantService';

export async function tenantContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extrair tenant do header (método fixo para V1 - header sempre)
    const tenantId = req.headers['x-tenant-id'] as string;
    const tenantSlug = req.headers['x-tenant-slug'] as string;

    // Verificar se algum identificador foi fornecido
    if (!tenantId && !tenantSlug) {
      return res.status(400).json({
        error: 'Tenant não identificado',
        message: 'Forneça X-Tenant-Id ou X-Tenant-Slug no header',
      });
    }

    // Validar tenant usando Service (lógica centralizada)
    let tenant;
    if (tenantId) {
      tenant = await TenantService.validateById(tenantId);
    } else if (tenantSlug) {
      tenant = await TenantService.validateBySlug(tenantSlug);
    }

    // Se tenant não encontrado ou inativo, retornar erro genérico
    // (reduz enumeração de tenants e vazamento de estado interno)
    if (!tenant) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Tenant inválido ou inativo',
      });
    }

    // Adicionar tenant ao request
    req.tenantId = tenant.id;
    req.tenant = tenant;

    next();
    return;
  } catch (error) {
    console.error('Erro no middleware de tenant:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao processar contexto de tenant',
    });
  }
}

