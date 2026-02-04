/**
 * Testes unitários para validação de dados
 *
 * Testa as regras de validação aplicadas durante a importação de dados
 */

import { validateImportRow } from '../../../src/utils/importValidator';
import { normalizeValue } from '../../../src/utils/valueNormalizer';
import { FieldValidationRules } from '../../../src/types/validation.types';

describe('Validação de Dados - Testes Unitários', () => {
  const mockTenantId = 'test-tenant';
  const mockUserId = 'test-user';

  it('deve validar linha de importação com campos válidos', async () => {
    const row = {
      firstName: 'João',
      lastName: 'Silva',
      email: 'joao.silva@example.com',
      phone: '+55 11 99999-9999'
    };

    const entityType = 'Contact';
    const fieldRules: Record<string, FieldValidationRules> = {
      firstName: { required: true, type: 'text' },
      lastName: { required: false, type: 'text' },
      email: { required: false, type: 'email' },
      phone: { required: false, type: 'phone' }
    };

    const result = await validateImportRow(row, entityType, fieldRules, mockTenantId, mockUserId);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('deve detectar campos obrigatórios ausentes', async () => {
    const row = {
      firstName: '', // Ausente
      lastName: 'Silva',
      email: 'joao.silva@example.com'
    };

    const entityType = 'Contact';
    const fieldRules: Record<string, FieldValidationRules> = {
      firstName: { required: true, type: 'text' },
      lastName: { required: false, type: 'text' },
      email: { required: false, type: 'email' }
    };

    const result = await validateImportRow(row, entityType, fieldRules, mockTenantId, mockUserId);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('firstName');
  });

  it('deve detectar campos com tipo inválido', async () => {
    const row = {
      firstName: 'João',
      age: 'não é um número' // Deveria ser numérico
    };

    const entityType = 'Contact';
    const fieldRules: Record<string, FieldValidationRules> = {
      firstName: { required: true, type: 'text' },
      age: { required: false, type: 'number' }
    };

    const result = await validateImportRow(row, entityType, fieldRules, mockTenantId, mockUserId);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('age');
  });

  it('deve detectar emails inválidos', async () => {
    const row = {
      firstName: 'João',
      email: 'email-invalido' // Email inválido
    };

    const entityType = 'Contact';
    const fieldRules: Record<string, FieldValidationRules> = {
      firstName: { required: true, type: 'text' },
      email: { required: false, type: 'email' }
    };

    const result = await validateImportRow(row, entityType, fieldRules, mockTenantId, mockUserId);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('email');
  });

  it('deve detectar telefones inválidos', async () => {
    const row = {
      firstName: 'João',
      phone: '123' // Telefone inválido
    };

    const entityType = 'Contact';
    const fieldRules: Record<string, FieldValidationRules> = {
      firstName: { required: true, type: 'text' },
      phone: { required: false, type: 'phone' }
    };

    const result = await validateImportRow(row, entityType, fieldRules, mockTenantId, mockUserId);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('phone');
  });

  it('deve validar datas válidas', async () => {
    const row = {
      firstName: 'João',
      birthDate: '1990-01-01'
    };

    const entityType = 'Contact';
    const fieldRules: Record<string, FieldValidationRules> = {
      firstName: { required: true, type: 'text' },
      birthDate: { required: false, type: 'date' }
    };
    
    const result = await validateImportRow(row, entityType, fieldRules, mockTenantId, mockUserId);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('deve detectar datas inválidas', async () => {
    const row = {
      firstName: 'João',
      birthDate: 'data-invalida'
    };

    const entityType = 'Contact';
    const fieldRules: Record<string, FieldValidationRules> = {
      firstName: { required: true, type: 'text' },
      birthDate: { required: false, type: 'date' }
    };

    const result = await validateImportRow(row, entityType, fieldRules, mockTenantId, mockUserId);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('birthDate');
  });

  it('deve validar campos únicos', async () => {
    // Este teste simula a validação de campos únicos
    // Na implementação real, isso envolveria checagem contra o banco de dados
    const row = {
      firstName: 'João',
      email: 'joao.unico@example.com'
    };

    const entityType = 'Contact';
    const fieldRules: Record<string, FieldValidationRules> = {
      firstName: { required: true, type: 'text' },
      email: { required: false, type: 'email', unique: true }
    };

    // Simular que o email ainda não existe no banco
    const result = await validateImportRow(row, entityType, fieldRules, mockTenantId, mockUserId);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('deve detectar campos únicos duplicados', async () => {
    const row = {
      firstName: 'João',
      email: 'ja.existe@example.com' // Email que já existe
    };

    const entityType = 'Contact';
    const fieldRules: Record<string, FieldValidationRules> = {
      firstName: { required: true, type: 'text' },
      email: { required: false, type: 'email', unique: true }
    };

    // Simular que o email já existe no banco
    const result = await validateImportRow(row, entityType, fieldRules, mockTenantId, mockUserId);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('email');
  });
});

describe('Normalização de Valores - Testes Unitários', () => {
  it('deve normalizar email para lowercase', () => {
    const value = 'TESTE@EMAIL.COM';
    const fieldType = 'email';
    
    const normalized = normalizeValue(value, fieldType);
    
    expect(normalized).toBe('teste@email.com');
  });

  it('deve normalizar telefone removendo caracteres especiais', () => {
    const value = '+55 (11) 99999-9999';
    const fieldType = 'phone';
    
    const normalized = normalizeValue(value, fieldType);
    
    expect(normalized).toBe('+5511999999999');
  });

  it('deve converter string para número', () => {
    const value = '123';
    const fieldType = 'number';
    
    const normalized = normalizeValue(value, fieldType);
    
    expect(normalized).toBe(123);
  });

  it('deve converter string vazia para null em campo numérico', () => {
    const value = '';
    const fieldType = 'number';
    
    const normalized = normalizeValue(value, fieldType);
    
    expect(normalized).toBeNull();
  });

  it('deve converter string para data', () => {
    const value = '1990-01-01';
    const fieldType = 'date';
    
    const normalized = normalizeValue(value, fieldType);
    
    expect(normalized).toBeInstanceOf(Date);
    expect(normalized).toEqual(new Date('1990-01-01'));
  });

  it('deve retornar o valor original para tipo desconhecido', () => {
    const value = 'valor qualquer';
    const fieldType = 'tipo-desconhecido';
    
    const normalized = normalizeValue(value, fieldType);
    
    expect(normalized).toBe('valor qualquer');
  });

  it('deve normalizar texto removendo espaços extras', () => {
    const value = '  texto com espaços  ';
    const fieldType = 'text';
    
    const normalized = normalizeValue(value, fieldType);
    
    expect(normalized).toBe('texto com espaços');
  });

  it('deve manter valores booleanos corretos', () => {
    expect(normalizeValue('true', 'boolean')).toBe(true);
    expect(normalizeValue('false', 'boolean')).toBe(false);
    expect(normalizeValue('TRUE', 'boolean')).toBe(true);
    expect(normalizeValue('FALSE', 'boolean')).toBe(false);
    expect(normalizeValue(1, 'boolean')).toBe(true);
    expect(normalizeValue(0, 'boolean')).toBe(false);
  });
});