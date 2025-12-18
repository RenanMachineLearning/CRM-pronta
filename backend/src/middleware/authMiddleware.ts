/**
 * Middleware de autenticação
 * 
 * Valida tokens JWT e garante que usuários autenticados acessem apenas dados do seu tenant.
 * 
 * Ordem de execução: request → tenantContext → authMiddleware
 * 
 * IMPORTANTE: Este middleware depende do tenantContextMiddleware ter rodado antes.
 * O tenantContextMiddleware deve adicionar req.tenantId ao request.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

/**
 * Middleware de autenticação JWT
 * 
 * Extrai e valida token do header Authorization: Bearer <token>
 * Valida que tenantId do token corresponde ao contexto da requisição
 * Adiciona userId e tenantId ao request
 * 
 * @param req - Request (deve ter req.tenantId do tenantContextMiddleware)
 * @param res - Response
 * @param next - NextFunction
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extrair token do header Authorization: Bearer <token>
    const authHeader = req.headers.authorization;

    // Verificar se header Authorization foi fornecido
    if (!authHeader) {
      res.status(401).json({
        error: 'Token não fornecido',
        message: 'Forneça um token de autenticação no header Authorization',
      });
      return;
    }

    // Validar formato: deve começar com "Bearer " (case-insensitive)
    const bearerPrefix = 'Bearer ';
    if (!authHeader.toLowerCase().startsWith(bearerPrefix.toLowerCase())) {
      res.status(401).json({
        error: 'Token inválido',
        message: 'Token deve estar no formato: Authorization: Bearer <token>',
      });
      return;
    }

    // Extrair token após "Bearer "
    const token = authHeader.substring(bearerPrefix.length).trim();

    // Verificar se token não está vazio
    if (!token || token.length === 0) {
      res.status(401).json({
        error: 'Token não fornecido',
        message: 'Token não pode estar vazio',
      });
      return;
    }

    // Validar token usando verifyToken
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error: any) {
      // Qualquer erro na validação do token retorna 401 genérico
      // Não revelar detalhes sobre o erro (segurança)
      res.status(401).json({
        error: 'Token inválido',
        message: 'Token expirado ou inválido',
      });
      return;
    }

    // Validar que tenantId do token corresponde ao req.tenantId
    // IMPORTANTE: tenantContextMiddleware deve ter rodado antes
    if (!req.tenantId) {
      // Se req.tenantId não existe, tenant context não rodou
      res.status(400).json({
        error: 'Contexto de tenant ausente',
        message: 'Tenant context deve ser processado antes da autenticação',
      });
      return;
    }

    // Validar correspondência entre tenantId do token e req.tenantId
    if (decoded.tenantId !== req.tenantId) {
      // Token de tenant A não funciona em contexto de tenant B
      res.status(403).json({
        error: 'Acesso negado',
        message: 'Token não autorizado para este tenant',
      });
      return;
    }

    // Token válido e tenantId corresponde - adicionar informações ao request
    req.userId = decoded.userId;
    // req.tenantId já existe (do tenant context), não precisa adicionar novamente

    // Continuar para o próximo middleware/rota
    next();
  } catch (error) {
    // Tratamento de erros inesperados
    // Não logar tokens ou informações sensíveis
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao processar autenticação',
    });
  }
}

