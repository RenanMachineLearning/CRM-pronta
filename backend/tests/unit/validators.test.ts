/**
 * Testes unitários para validadores de dados
 * Testa as funções de validação isoladamente (validateEmail, validatePhone, validateUrl, etc.)
 */

import {
  validateEmail,
  validatePhone,
  validateUrl,
  validateZipCode,
  validateDateNotFuture,
  validateCountry,
  validateHexColor,
  validateUUID,
  normalizePhone,
  normalizeUrl,
} from '../../src/utils/validators';

describe('Validators', () => {
  describe('validateEmail', () => {
    it('deve validar email válido', () => {
      expect(validateEmail('user@example.com')).toBe(true);
    });

    it('deve rejeitar email inválido sem @', () => {
      expect(validateEmail('invalid')).toBe(false);
    });

    it('deve rejeitar email inválido sem domínio', () => {
      expect(validateEmail('user@')).toBe(false);
    });

    it('deve rejeitar email inválido sem TLD', () => {
      expect(validateEmail('user@example')).toBe(false);
    });

    it('deve rejeitar email inválido começando com @', () => {
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('deve validar email com subdomínio', () => {
      expect(validateEmail('user@mail.example.com')).toBe(true);
    });

    it('deve validar email com caracteres especiais', () => {
      expect(validateEmail('user.name+tag@example.com')).toBe(true);
    });

    it('deve validar email com espaços (deve trim)', () => {
      expect(validateEmail(' user@example.com ')).toBe(true);
    });

    it('deve rejeitar email vazio', () => {
      expect(validateEmail('')).toBe(false);
    });

    it('deve rejeitar email apenas com espaços', () => {
      expect(validateEmail('   ')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('deve validar telefone válido com 10 dígitos', () => {
      expect(validatePhone('(11) 98765-4321')).toBe(true);
    });

    it('deve validar telefone válido com 15 dígitos', () => {
      expect(validatePhone('+55 11 98765-4321')).toBe(true);
    });

    it('deve rejeitar telefone com menos de 10 dígitos', () => {
      expect(validatePhone('123')).toBe(false);
    });

    it('deve rejeitar telefone com mais de 15 dígitos', () => {
      expect(validatePhone('1234567890123456')).toBe(false);
    });

    it('deve validar telefone com formatação completa', () => {
      expect(validatePhone('+1 (555) 123-4567')).toBe(true);
    });

    it('deve validar telefone apenas com dígitos', () => {
      expect(validatePhone('11987654321')).toBe(true);
    });

    it('deve validar telefone brasileiro formatado', () => {
      expect(validatePhone('(11) 98765-4321')).toBe(true);
    });

    it('deve validar telefone internacional', () => {
      expect(validatePhone('+5511987654321')).toBe(true);
    });

    it('deve rejeitar telefone vazio', () => {
      expect(validatePhone('')).toBe(false);
    });

    it('deve rejeitar telefone apenas com caracteres especiais', () => {
      expect(validatePhone('()--+')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('deve validar URL válida HTTP', () => {
      expect(validateUrl('http://example.com')).toBe(true);
    });

    it('deve validar URL válida HTTPS', () => {
      expect(validateUrl('https://example.com')).toBe(true);
    });

    it('deve validar URL com path', () => {
      expect(validateUrl('https://example.com/path')).toBe(true);
    });

    it('deve validar URL com query string', () => {
      expect(validateUrl('https://example.com?param=value')).toBe(true);
    });

    it('deve validar URL com path e query', () => {
      expect(validateUrl('https://example.com/path?param=value')).toBe(true);
    });

    it('deve rejeitar URL inválida sem protocolo', () => {
      expect(validateUrl('example.com')).toBe(false);
    });

    it('deve rejeitar URL com protocolo não permitido (ftp)', () => {
      expect(validateUrl('ftp://example.com')).toBe(false);
    });

    it('deve rejeitar string que não é URL', () => {
      expect(validateUrl('not-a-url')).toBe(false);
    });

    it('deve rejeitar URL vazia', () => {
      expect(validateUrl('')).toBe(false);
    });

    it('deve rejeitar URL apenas com espaços', () => {
      expect(validateUrl('   ')).toBe(false);
    });
  });

  describe('validateZipCode', () => {
    it('deve validar CEP válido com hífen', () => {
      expect(validateZipCode('12345-678')).toBe(true);
    });

    it('deve validar CEP válido sem hífen', () => {
      expect(validateZipCode('12345678')).toBe(true);
    });

    it('deve validar CEP com espaços (deve remover)', () => {
      expect(validateZipCode('12345 678')).toBe(true);
    });

    it('deve rejeitar CEP com menos de 8 dígitos', () => {
      expect(validateZipCode('12345')).toBe(false);
    });

    it('deve rejeitar CEP com mais de 8 dígitos', () => {
      expect(validateZipCode('123456789')).toBe(false);
    });

    it('deve rejeitar CEP vazio', () => {
      expect(validateZipCode('')).toBe(false);
    });

    it('deve rejeitar CEP com letras', () => {
      expect(validateZipCode('12345-67a')).toBe(false);
    });
  });

  describe('validateDateNotFuture', () => {
    it('deve validar data passada', () => {
      const pastDate = new Date('2020-01-01');
      expect(validateDateNotFuture(pastDate)).toBe(true);
    });

    it('deve validar data atual', () => {
      const now = new Date();
      expect(validateDateNotFuture(now)).toBe(true);
    });

    it('deve rejeitar data futura', () => {
      const futureDate = new Date('2099-12-31');
      expect(validateDateNotFuture(futureDate)).toBe(false);
    });

    it('deve validar data passada como string', () => {
      expect(validateDateNotFuture('2020-01-01')).toBe(true);
    });

    it('deve rejeitar data futura como string', () => {
      expect(validateDateNotFuture('2099-12-31')).toBe(false);
    });

    it('deve rejeitar data inválida', () => {
      expect(validateDateNotFuture('invalid-date')).toBe(false);
    });

    it('deve rejeitar string vazia', () => {
      expect(validateDateNotFuture('')).toBe(false);
    });
  });

  describe('validateCountry', () => {
    it('deve validar país em português', () => {
      expect(validateCountry('Brasil')).toBe(true);
      expect(validateCountry('Argentina')).toBe(true);
      expect(validateCountry('Chile')).toBe(true);
    });

    it('deve validar país em inglês', () => {
      expect(validateCountry('Brazil')).toBe(true);
      expect(validateCountry('United States')).toBe(true);
    });

    it('deve validar país com acentos', () => {
      expect(validateCountry('Colômbia')).toBe(true);
      expect(validateCountry('México')).toBe(true);
    });

    it('deve validar país com variações', () => {
      expect(validateCountry('USA')).toBe(true);
      expect(validateCountry('US')).toBe(true);
    });

    it('deve validar país case-insensitive', () => {
      expect(validateCountry('BRASIL')).toBe(true);
      expect(validateCountry('brasil')).toBe(true);
    });

    it('deve validar país com espaços (deve trim)', () => {
      expect(validateCountry(' Brasil ')).toBe(true);
    });

    it('deve rejeitar país não suportado', () => {
      expect(validateCountry('França')).toBe(false);
      expect(validateCountry('Germany')).toBe(false);
    });

    it('deve rejeitar país vazio', () => {
      expect(validateCountry('')).toBe(false);
    });

    it('deve rejeitar país apenas com espaços', () => {
      expect(validateCountry('   ')).toBe(false);
    });
  });

  describe('validateHexColor', () => {
    it('deve validar cor hexadecimal com #', () => {
      expect(validateHexColor('#FF0000')).toBe(true);
      expect(validateHexColor('#3B82F6')).toBe(true);
    });

    it('deve validar cor hexadecimal sem #', () => {
      expect(validateHexColor('FF0000')).toBe(true);
      expect(validateHexColor('3B82F6')).toBe(true);
    });

    it('deve validar cor hexadecimal com alpha', () => {
      expect(validateHexColor('#FF0000FF')).toBe(true);
      expect(validateHexColor('3B82F680')).toBe(true);
    });

    it('deve validar cor hexadecimal case-insensitive', () => {
      expect(validateHexColor('ff0000')).toBe(true);
      expect(validateHexColor('FF0000')).toBe(true);
    });

    it('deve rejeitar cor hexadecimal inválida', () => {
      expect(validateHexColor('#GG0000')).toBe(false);
      expect(validateHexColor('#FF00')).toBe(false);
      expect(validateHexColor('#FF00000')).toBe(false);
    });

    it('deve rejeitar cor vazia', () => {
      expect(validateHexColor('')).toBe(false);
    });
  });

  describe('validateUUID', () => {
    it('deve validar UUID v4 válido', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      expect(validateUUID(validUUID)).toBe(true);
    });

    it('deve validar UUID case-insensitive', () => {
      const validUUID = '550E8400-E29B-41D4-A716-446655440000';
      expect(validateUUID(validUUID)).toBe(true);
    });

    it('deve rejeitar UUID inválido', () => {
      expect(validateUUID('not-a-uuid')).toBe(false);
      expect(validateUUID('550e8400-e29b-41d4-a716')).toBe(false);
    });

    it('deve rejeitar UUID vazio', () => {
      expect(validateUUID('')).toBe(false);
    });
  });

  describe('normalizePhone', () => {
    it('deve normalizar telefone removendo caracteres especiais', () => {
      expect(normalizePhone('(11) 98765-4321')).toBe('11987654321');
      expect(normalizePhone('+55 11 98765-4321')).toBe('5511987654321');
    });

    it('deve manter telefone já normalizado', () => {
      expect(normalizePhone('11987654321')).toBe('11987654321');
    });

    it('deve retornar string vazia se telefone for vazio', () => {
      expect(normalizePhone('')).toBe('');
    });

    it('deve retornar telefone inválido como está', () => {
      expect(normalizePhone('abc')).toBe('abc');
    });
  });

  describe('normalizeUrl', () => {
    it('deve manter URL com protocolo HTTP', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('deve manter URL com protocolo HTTPS', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('deve adicionar http:// se não tiver protocolo', () => {
      expect(normalizeUrl('example.com')).toBe('http://example.com');
    });

    it('deve adicionar http:// e remover espaços', () => {
      expect(normalizeUrl(' example.com ')).toBe('http://example.com');
    });

    it('deve retornar string vazia se URL for vazia', () => {
      expect(normalizeUrl('')).toBe('');
    });

    it('deve retornar URL inválida como está', () => {
      expect(normalizeUrl('not-a-url')).toBe('http://not-a-url');
    });
  });
});

