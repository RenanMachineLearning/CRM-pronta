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
 * Interface para resultado da validação de política de senha
 * 
 * Fornece detalhes sobre quais requisitos foram atendidos e quais falharam
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

/**
 * Valida a política de senha com requisitos completos de complexidade
 * 
 * @param password - Senha a ser validada
 * @param requireSpecialChar - Se true, exige caractere especial (padrão: false na V1)
 * @returns PasswordValidationResult - Objeto com detalhes da validação
 * 
 * @remarks
 * - Valida comprimento mínimo (8 caracteres)
 * - Valida presença de letra maiúscula (A-Z)
 * - Valida presença de letra minúscula (a-z)
 * - Valida presença de número (0-9)
 * - Valida presença de caractere especial (opcional na V1)
 * - Retorna lista de erros específicos para mensagens claras
 * 
 * @example
 * const result = validatePasswordPolicy('StrongPass123');
 * if (!result.isValid) {
 *   console.log('Erros:', result.errors);
 * }
 */
export function validatePasswordPolicy(
  password: string,
  requireSpecialChar: boolean = false
): PasswordValidationResult {
  const errors: string[] = [];
  
  // Validar que a senha foi fornecida
  if (!password || password.trim().length === 0) {
    return {
      isValid: false,
      errors: ['A senha é obrigatória'],
      requirements: {
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
      },
    };
  }

  // Verificar cada requisito
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  // Coletar erros específicos
  if (!requirements.minLength) {
    errors.push('A senha deve ter no mínimo 8 caracteres');
  }
  if (!requirements.hasUpperCase) {
    errors.push('A senha deve conter pelo menos uma letra maiúscula');
  }
  if (!requirements.hasLowerCase) {
    errors.push('A senha deve conter pelo menos uma letra minúscula');
  }
  if (!requirements.hasNumber) {
    errors.push('A senha deve conter pelo menos um número');
  }
  if (requireSpecialChar && !requirements.hasSpecialChar) {
    errors.push('A senha deve conter pelo menos um caractere especial');
  }

  return {
    isValid: errors.length === 0,
    errors,
    requirements,
  };
}

/**
 * Valida a força/complexidade de uma senha (função simples para compatibilidade)
 * 
 * @param password - Senha a ser validada
 * @returns boolean - true se a senha atende aos requisitos mínimos, false caso contrário
 * 
 * @remarks
 * - Usa validatePasswordPolicy internamente
 * - Mantida para compatibilidade com código existente
 * - Caractere especial não é exigido por padrão (V1)
 * 
 * @example
 * if (validatePasswordStrength('minhaSenha123')) {
 *   // Senha válida
 * }
 */
export function validatePasswordStrength(password: string): boolean {
  const result = validatePasswordPolicy(password, false);
  return result.isValid;
}

