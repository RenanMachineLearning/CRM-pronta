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

/**
 * Valida formato de UUID v4
 * 
 * @param uuid - UUID a ser validado
 * @returns true se válido, false caso contrário
 */
export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  
  const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_V4_REGEX.test(uuid);
}

/**
 * Normaliza formato de telefone removendo caracteres especiais
 * Mantém apenas dígitos
 * 
 * @param phone - Telefone a ser normalizado
 * @returns Telefone normalizado (apenas dígitos)
 */
export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }
  
  // Remove espaços, parênteses, hífens, pontos, barras e +
  return phone.replace(/[\s\(\)\-\+\.\/]/g, '');
}

/**
 * Normaliza URL adicionando http:// se não tiver protocolo
 * 
 * @param url - URL a ser normalizada
 * @returns URL normalizada com protocolo
 */
export function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return url;
  }
  
  const trimmedUrl = url.trim();
  
  // Se já tem protocolo, retornar como está
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  
  // Adicionar http:// se não tiver protocolo
  return `http://${trimmedUrl}`;
}

/**
 * Valida se um valor numérico é positivo (maior que zero)
 * @param value - Valor a ser validado (number ou string)
 * @throws Error se valor não for positivo
 */
export function validatePositiveNumber(value: number | string): void {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || numValue <= 0) {
    throw new Error('Valor deve ser um número positivo maior que zero');
  }
}

/**
 * Valida se um valor numérico é positivo (maior que zero) - versão que retorna boolean
 * @param value - Valor a ser validado (number ou string)
 * @returns true se válido (maior que 0), false caso contrário
 */
export function isValidPositiveNumber(value: number | string): boolean {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(numValue) && numValue > 0;
}

/**
 * Valida se uma data é futura ou presente (não pode ser passada)
 * @param date - Data a ser validada
 * @throws Error se data é inválida ou passada
 */
export function validateDateNotPast(date: Date | string): void {
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) {
    throw new Error('Data inválida');
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Zerar horas para comparar apenas datas
  const dateToCheck = new Date(dateObj);
  dateToCheck.setHours(0, 0, 0, 0);
  if (dateToCheck < now) {
    throw new Error('Data deve ser futura ou presente (não pode ser passada)');
  }
}

/**
 * Valida se uma data é futura ou presente (não pode ser passada) - versão que retorna boolean
 * @param date - Data a ser validada
 * @returns true se data é válida e é futura ou presente, false caso contrário
 */
export function isValidDateNotPast(date: Date | string): boolean {
  try {
    validateDateNotPast(date);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida se probabilidade está no range 0-100
 * @param probability - Probabilidade a ser validada
 * @throws Error se probabilidade está fora do range
 */
export function validateProbability(probability: number): void {
  if (isNaN(probability) || probability < 0 || probability > 100) {
    throw new Error('Probabilidade deve estar entre 0 e 100');
  }
}

/**
 * Valida se probabilidade está no range 0-100 - versão que retorna boolean
 * @param probability - Probabilidade a ser validada
 * @returns true se válido (0-100), false caso contrário
 */
export function isValidProbability(probability: number): boolean {
  return !isNaN(probability) && probability >= 0 && probability <= 100;
}
