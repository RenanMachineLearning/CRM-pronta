/**
 * Utilitários de validação para formulários
 * Funções reutilizáveis de validação
 */

export type ValidatorFn = (value: any) => string | undefined;

/**
 * Valida campo obrigatório
 */
export const required = (message = 'Campo obrigatório'): ValidatorFn => {
  return (value: any) => {
    if (value === undefined || value === null || value === '') {
      return message;
    }
    if (typeof value === 'string' && !value.trim()) {
      return message;
    }
    return undefined;
  };
};

/**
 * Valida email
 */
export const email = (message = 'Email inválido'): ValidatorFn => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (value: any) => {
    if (!value) return undefined;
    if (typeof value !== 'string') return message;
    if (!emailRegex.test(value)) return message;
    return undefined;
  };
};

/**
 * Valida telefone (10-15 dígitos)
 */
export const phone = (message = 'Telefone inválido'): ValidatorFn => {
  return (value: any) => {
    if (!value) return undefined;
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      return message;
    }
    return undefined;
  };
};

/**
 * Valida UUID
 */
export const uuid = (message = 'ID inválido'): ValidatorFn => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return (value: any) => {
    if (!value) return undefined;
    if (!uuidRegex.test(value)) return message;
    return undefined;
  };
};

/**
 * Valida URL
 */
export const url = (message = 'URL inválida'): ValidatorFn => {
  return (value: any) => {
    if (!value) return undefined;
    try {
      new URL(value);
      return undefined;
    } catch {
      return message;
    }
  };
};

/**
 * Valida comprimento mínimo
 */
export const minLength = (min: number, message?: string): ValidatorFn => {
  const defaultMessage = `Mínimo de ${min} caracteres`;
  return (value: any) => {
    if (!value) return undefined;
    if (typeof value !== 'string') return defaultMessage;
    if (value.length < min) return message || defaultMessage;
    return undefined;
  };
};

/**
 * Valida comprimento máximo
 */
export const maxLength = (max: number, message?: string): ValidatorFn => {
  const defaultMessage = `Máximo de ${max} caracteres`;
  return (value: any) => {
    if (!value) return undefined;
    if (typeof value !== 'string') return undefined;
    if (value.length > max) return message || defaultMessage;
    return undefined;
  };
};

/**
 * Valida valor mínimo (números)
 */
export const minValue = (min: number, message?: string): ValidatorFn => {
  const defaultMessage = `Valor mínimo: ${min}`;
  return (value: any) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    if (isNaN(num)) return 'Valor deve ser numérico';
    if (num < min) return message || defaultMessage;
    return undefined;
  };
};

/**
 * Valida valor máximo (números)
 */
export const maxValue = (max: number, message?: string): ValidatorFn => {
  const defaultMessage = `Valor máximo: ${max}`;
  return (value: any) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    if (isNaN(num)) return 'Valor deve ser numérico';
    if (num > max) return message || defaultMessage;
    return undefined;
  };
};

/**
 * Valida pattern regex
 */
export const pattern = (regex: RegExp, message: string): ValidatorFn => {
  return (value: any) => {
    if (!value) return undefined;
    if (typeof value !== 'string') return message;
    if (!regex.test(value)) return message;
    return undefined;
  };
};

/**
 * Valida data não no passado
 */
export const dateNotInPast = (message = 'Data não pode ser no passado'): ValidatorFn => {
  return (value: any) => {
    if (!value) return undefined;
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return message;
    return undefined;
  };
};

/**
 * Valida CPF (brasileiro)
 */
export const cpf = (message = 'CPF inválido'): ValidatorFn => {
  return (value: any) => {
    if (!value) return undefined;
    const cpfClean = value.replace(/\D/g, '');
    if (cpfClean.length !== 11) return message;
    if (/^(\d)\1{10}$/.test(cpfClean)) return message;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpfClean.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpfClean.substring(9, 10))) return message;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpfClean.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpfClean.substring(10, 11))) return message;

    return undefined;
  };
};

/**
 * Valida CNPJ (brasileiro)
 */
export const cnpj = (message = 'CNPJ inválido'): ValidatorFn => {
  return (value: any) => {
    if (!value) return undefined;
    const cnpjClean = value.replace(/\D/g, '');
    if (cnpjClean.length !== 14) return message;
    if (/^(\d)\1{13}$/.test(cnpjClean)) return message;

    let size = cnpjClean.length - 2;
    let numbers = cnpjClean.substring(0, size);
    const digits = cnpjClean.substring(size);
    let sum = 0;
    let pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return message;

    size = size + 1;
    numbers = cnpjClean.substring(0, size);
    sum = 0;
    pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return message;

    return undefined;
  };
};

/**
 * Combina múltiplos validadores (executa em ordem, retorna primeiro erro)
 */
export const compose = (...validators: ValidatorFn[]): ValidatorFn => {
  return (value: any) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return undefined;
  };
};

/**
 * Objeto com todos os validadores para facilitar importação
 */
export const validators = {
  required,
  email,
  phone,
  uuid,
  url,
  minLength,
  maxLength,
  minValue,
  maxValue,
  pattern,
  dateNotInPast,
  cpf,
  cnpj,
  compose,
};

export default validators;
