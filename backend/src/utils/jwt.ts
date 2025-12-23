/**
 * Utilitário para geração e validação de tokens JWT
 * 
 * Este módulo fornece funções seguras para:
 * - Gerar tokens JWT com userId e tenantId
 * - Validar tokens JWT e extrair informações
 * 
 * Regras de segurança:
 * - Tokens sempre contêm tenantId (obrigatório para multi-tenant)
 * - Tokens expiram conforme JWT_EXPIRES_IN
 * - JWT_SECRET é obrigatório e deve ser forte em produção
 */

import { sign, verify, TokenExpiredError, JsonWebTokenError, JwtPayload, Secret } from 'jsonwebtoken';

// Configuração de JWT
// Função helper para obter JWT_SECRET (validado quando necessário)
function getJwtSecret(): Secret {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET não está definido nas variáveis de ambiente. ' +
      'Configure JWT_SECRET no arquivo .env'
    );
  }
  return secret;
}

// Função helper para obter JWT_EXPIRES_IN
function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '7d';
}

/**
 * Interface para o payload do token JWT
 */
interface JWTPayload {
  sub: string;        // userId (subject - padrão JWT)
  tenantId: string;  // ID do tenant (obrigatório para multi-tenant)
  iat?: number;      // Issued at (gerado automaticamente)
  exp?: number;      // Expiration (calculado automaticamente)
}

/**
 * Interface para o resultado da validação do token
 */
export interface TokenVerificationResult {
  userId: string;
  tenantId: string;
}

/**
 * Gera um token JWT para um usuário e tenant
 * 
 * @param userId - ID do usuário (será armazenado como 'sub' no payload)
 * @param tenantId - ID do tenant (obrigatório para isolamento multi-tenant)
 * @returns Token JWT assinado como string
 * @throws {Error} - Se userId ou tenantId forem vazios, ou se JWT_SECRET não estiver definido
 * 
 * @example
 * const token = generateToken('user-123', 'tenant-456');
 * // Token pode ser usado em requisições autenticadas
 */
export function generateToken(userId: string, tenantId: string): string {
  // Valida que userId foi fornecido
  if (!userId || userId.trim().length === 0) {
    throw new Error('userId não pode ser vazio');
  }

  // Valida que tenantId foi fornecido
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('tenantId não pode ser vazio');
  }

  // Cria payload do token
  // Usa 'sub' (subject) ao invés de 'userId' (padrão JWT)
  const payload = {
    sub: userId,
    tenantId: tenantId,
    // iat e exp são gerados automaticamente pelo jsonwebtoken
  };

  // Gera e assina o token
  // Algoritmo HS256 é o padrão e seguro para a maioria dos casos
  const secret = getJwtSecret();
  const expiresIn = getJwtExpiresIn();
  // @ts-ignore - jsonwebtoken types podem ter problemas com overloads, mas funciona em runtime
  const token = sign(payload, secret, {
    expiresIn: expiresIn,
    // iat (issued at) é adicionado automaticamente
    // exp (expiration) é calculado automaticamente baseado em expiresIn
  });

  return token;
}

/**
 * Valida um token JWT e retorna as informações do usuário e tenant
 * 
 * @param token - Token JWT a ser validado
 * @returns Objeto com userId e tenantId extraídos do token
 * @throws {Error} - Se token for inválido, expirado, malformado ou se campos obrigatórios estiverem ausentes
 * 
 * @example
 * try {
 *   const { userId, tenantId } = verifyToken(token);
 *   // Token válido - usar userId e tenantId
 * } catch (error) {
 *   // Token inválido ou expirado
 * }
 */
export function verifyToken(token: string): TokenVerificationResult {
  // Valida que token foi fornecido
  if (!token || token.trim().length === 0) {
    throw new Error('Token não pode ser vazio');
  }

  try {
    // Verifica assinatura e expiração do token
    // verify lança erro se token for inválido ou expirado
    const secret = getJwtSecret();
    const decoded = verify(token, secret) as JwtPayload & JWTPayload;

    // Valida que campos obrigatórios estão presentes
    if (!decoded.sub) {
      throw new Error('Token inválido: campo "sub" (userId) ausente');
    }

    if (!decoded.tenantId) {
      throw new Error('Token inválido: campo "tenantId" ausente');
    }

    // Retorna userId e tenantId
    // Mapeia 'sub' (padrão JWT) para 'userId' (mais intuitivo para uso)
    return {
      userId: decoded.sub,
      tenantId: decoded.tenantId,
    };
  } catch (error) {
    // Tratamento específico de erros do jsonwebtoken
    if (error instanceof TokenExpiredError) {
      throw new Error('Token expirado');
    }

    if (error instanceof JsonWebTokenError) {
      throw new Error('Token inválido');
    }

    // Re-lança outros erros (incluindo nossos erros customizados)
    throw error;
  }
}

