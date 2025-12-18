/**
 * Utilitário para hash e comparação de senhas usando bcrypt
 * 
 * Este módulo fornece funções seguras para:
 * - Gerar hash de senhas (com salt automático)
 * - Comparar senhas com hashes armazenados
 * 
 * Regras de segurança:
 * - Nunca armazenar senhas em texto plano
 * - Nunca logar senhas ou hashes completos
 * - hashPassword sempre lança erro para input inválido
 * - comparePassword nunca lança erro, apenas retorna false
 */

import bcrypt from 'bcrypt';

// Número de salt rounds para bcrypt (configurável por ambiente)
// Default: 12 (balance entre segurança e performance)
// Valores menores (8-10) para desenvolvimento mais rápido
// Valores maiores (12-14) para produção com maior segurança
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

/**
 * Gera hash de uma senha usando bcrypt
 * 
 * @param password - Senha em texto plano
 * @returns Promise<string> - Hash da senha (inclui salt)
 * @throws {Error} - Se a senha for vazia ou contiver apenas espaços
 * 
 * @example
 * const hash = await hashPassword('minhaSenha123');
 * // hash será algo como: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqBWVHxkd0
 */
export async function hashPassword(password: string): Promise<string> {
  // Valida que a senha foi fornecida e não está vazia
  if (!password || password.trim().length === 0) {
    throw new Error('Password must not be empty');
  }

  // Gera hash com salt automático (bcrypt gera salt automaticamente)
  // Cada chamada gera um hash diferente devido ao salt único
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  
  return hash;
}

/**
 * Compara uma senha em texto plano com um hash armazenado
 * 
 * @param password - Senha em texto plano fornecida pelo usuário
 * @param hash - Hash armazenado no banco de dados
 * @returns Promise<boolean> - true se a senha corresponde ao hash, false caso contrário
 * 
 * @example
 * const isValid = await comparePassword('minhaSenha123', storedHash);
 * if (isValid) {
 *   // Senha correta - permitir acesso
 * }
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  // Valida que ambos os parâmetros foram fornecidos
  // Retorna false silenciosamente (nunca lança erro) para entradas inválidas
  if (!password || password.trim().length === 0) {
    return false;
  }

  if (!hash || hash.trim().length === 0) {
    return false;
  }

  try {
    // Compara a senha com o hash usando bcrypt
    // bcrypt.compare extrai o salt do hash automaticamente
    const isMatch = await bcrypt.compare(password, hash);
    
    return isMatch;
  } catch (error) {
    // Em caso de erro (hash inválido, formato incorreto, etc.)
    // Retorna false silenciosamente (segurança por obscuridade)
    // Não revela detalhes sobre o erro para evitar vazamento de informação
    return false;
  }
}

/**
 * Valida a força/complexidade de uma senha
 * 
 * @param password - Senha a ser validada
 * @returns boolean - true se a senha atende aos requisitos mínimos, false caso contrário
 * 
 * @remarks
 * - V1: Valida apenas comprimento mínimo (8 caracteres)
 * - V2: Pode ser expandido para incluir maiúsculas, números, símbolos
 * 
 * @example
 * if (validatePasswordStrength('minhaSenha123')) {
 *   // Senha válida
 * }
 */
export function validatePasswordStrength(password: string): boolean {
  // Valida que a senha foi fornecida
  if (!password || password.trim().length === 0) {
    return false;
  }

  // V1: Valida apenas comprimento mínimo (8 caracteres)
  if (password.length < 8) {
    return false;
  }

  // V2: Adicionar validações de complexidade:
  // - Pelo menos uma letra maiúscula
  // - Pelo menos uma letra minúscula
  // - Pelo menos um número
  // - Pelo menos um símbolo especial

  return true;
}

