/**
 * Validadores de dados
 * 
 * Funções utilitárias para validação de formatos de dados comuns.
 */

/**
 * Valida formato de email
 * @param email - Email a ser validado
 * @returns true se válido, false caso contrário
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida formato básico de telefone (aceita números, espaços, parênteses, hífens, +)
 * @param phone - Telefone a ser validado
 * @returns true se válido, false caso contrário
 */
export function validatePhone(phone: string): boolean {
  // Remove espaços, parênteses, hífens e + para contar apenas dígitos
  const digitsOnly = phone.replace(/[\s\(\)\-\+]/g, '');
  // Deve ter pelo menos 10 dígitos (formato internacional mínimo)
  return /^\d{10,15}$/.test(digitsOnly);
}

/**
 * Valida se uma data não é futura
 * @param date - Data a ser validada
 * @returns true se data é válida e não é futura, false caso contrário
 */
export function validateDateNotFuture(date: Date | string): boolean {
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) {
    return false; // Data inválida
  }
  return dateObj <= new Date(); // Não pode ser futura
}

/**
 * Valida formato de URL
 * @param url - URL a ser validada
 * @returns true se válido, false caso contrário
 */
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Aceitar apenas http e https
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

