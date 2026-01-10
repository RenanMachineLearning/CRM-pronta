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

/**
 * Valida formato de CEP brasileiro
 * Aceita formato XXXXX-XXX (com hífen) ou XXXXXXXX (sem hífen)
 * 
 * @param zipCode - CEP a ser validado
 * @returns true se válido, false caso contrário
 */
export function validateZipCode(zipCode: string): boolean {
  if (!zipCode || typeof zipCode !== 'string') {
    return false;
  }
  
  // Remove hífen e espaços
  const digitsOnly = zipCode.replace(/[\s\-]/g, '');
  // Deve ter exatamente 8 dígitos
  return /^\d{8}$/.test(digitsOnly);
}

/**
 * Valida se país está na lista de países suportados
 * Aceita nomes comuns em português e inglês
 * 
 * @param country - País a ser validado
 * @returns true se válido, false caso contrário
 */
export function validateCountry(country: string): boolean {
  if (!country || typeof country !== 'string') {
    return false;
  }
  
  const validCountries = [
    'Brasil', 'Brazil',
    'Estados Unidos', 'United States', 'USA', 'US',
    'Argentina',
    'Chile',
    'Colômbia', 'Colombia',
    'México', 'Mexico',
    'Peru', 'Perú',
    'Uruguai', 'Uruguay',
    'Paraguai', 'Paraguay',
    'Venezuela',
    'Equador', 'Ecuador',
    'Bolívia', 'Bolivia',
    // Adicionar mais conforme necessário
  ];
  
  const normalizedCountry = country.trim().toLowerCase();
  return validCountries.some(valid => 
    valid.toLowerCase() === normalizedCountry
  );
}

/**
 * Valida formato de cor hexadecimal
 * Aceita formato #RRGGBB ou #RRGGBBAA (com ou sem #)
 * 
 * @param color - Cor a ser validada
 * @returns true se válido, false caso contrário
 */
export function validateHexColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }
  
  // Remove # se presente
  const hex = color.startsWith('#') ? color.slice(1) : color;
  
  // Aceita 6 dígitos (RRGGBB) ou 8 dígitos (RRGGBBAA)
  const hexRegex = /^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
  return hexRegex.test(hex);
}

