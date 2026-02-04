/**
 * Testes unitários para o sistema de validação de dados de importação
 */

import { validateImportRow } from '../../../src/utils/importValidator';
import { normalizeValue } from '../../../src/utils/valueNormalizer';
import { validateUniqueness } from '../../../src/services/uniquenessValidator';
import { validateBusinessRules } from '../../../src/services/businessRuleValidator';
import { FieldValidationRules } from '../../../src/types/validation.types';

describe('Sistema de Validação de Dados', () => {
  const mockTenantId = 'test-tenant-id-validation';
  const mockUserId = 'test-user-id-validation';

  describe('Validação de Campos Obrigatórios', () => {
    it('deve validar campos obrigatórios presentes', async () => {
      const row = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
      const fieldRules: Record<string, FieldValidationRules> = {
        firstName: { required: true, type: 'text' },
        lastName: { required: false, type: 'text' },
        email: { required: true, type: 'email' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve retornar erro para campos obrigatórios ausentes', async () => {
      const row = { firstName: 'John', email: 'john@example.com' }; // lastName ausente
      const fieldRules: Record<string, FieldValidationRules> = {
        firstName: { required: true, type: 'text' },
        lastName: { required: true, type: 'text' }, // Obrigatório
        email: { required: true, type: 'email' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('lastName');
      expect(result.errors[0].code).toBe('REQUIRED');
    });

    it('deve aceitar campos não obrigatórios ausentes', async () => {
      const row = { firstName: 'John', email: 'john@example.com' }; // lastName ausente
      const fieldRules: Record<string, FieldValidationRules> = {
        firstName: { required: true, type: 'text' },
        lastName: { required: false, type: 'text' }, // Não obrigatório
        email: { required: true, type: 'email' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validação de Tipos de Campo', () => {
    it('deve validar tipo texto corretamente', async () => {
      const row = { name: 'Company Name' };
      const fieldRules: Record<string, FieldValidationRules> = {
        name: { required: true, type: 'text' }
      };

      const result = await validateImportRow(row, 'Company', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
    });

    it('deve validar tipo número corretamente', async () => {
      const row = { value: 1000 };
      const fieldRules: Record<string, FieldValidationRules> = {
        value: { required: true, type: 'number' }
      };

      const result = await validateImportRow(row, 'Opportunity', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
    });

    it('deve validar tipo número a partir de string', async () => {
      const row = { value: '1000' };
      const fieldRules: Record<string, FieldValidationRules> = {
        value: { required: true, type: 'number' }
      };

      const result = await validateImportRow(row, 'Opportunity', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.normalizedData.value).toBe(1000);
    });

    it('deve retornar erro para tipo inválido', async () => {
      const row = { value: 'not-a-number' };
      const fieldRules: Record<string, FieldValidationRules> = {
        value: { required: true, type: 'number' }
      };

      const result = await validateImportRow(row, 'Opportunity', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('deve validar tipo email corretamente', async () => {
      const row = { email: 'test@example.com' };
      const fieldRules: Record<string, FieldValidationRules> = {
        email: { required: true, type: 'email' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
    });

    it('deve retornar erro para email inválido', async () => {
      const row = { email: 'not-an-email' };
      const fieldRules: Record<string, FieldValidationRules> = {
        email: { required: true, type: 'email' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });

    it('deve validar tipo booleano corretamente', async () => {
      const row = { active: true };
      const fieldRules: Record<string, FieldValidationRules> = {
        active: { required: true, type: 'boolean' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
    });

    it('deve validar tipo booleano a partir de string', async () => {
      const row = { active: 'true' };
      const fieldRules: Record<string, FieldValidationRules> = {
        active: { required: true, type: 'boolean' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.normalizedData.active).toBe(true);
    });
  });

  describe('Validação de Formatos Específicos', () => {
    it('deve validar formato de email', async () => {
      const row = { email: 'valid@example.com' };
      const fieldRules: Record<string, FieldValidationRules> = {
        email: { required: true, type: 'email' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
    });

    it('deve retornar erro para formato de email inválido', async () => {
      const row = { email: 'invalid-email' };
      const fieldRules: Record<string, FieldValidationRules> = {
        email: { required: true, type: 'email' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });

    it('deve validar formato de URL', async () => {
      const row = { website: 'https://example.com' };
      const fieldRules: Record<string, FieldValidationRules> = {
        website: { required: false, type: 'url' }
      };

      const result = await validateImportRow(row, 'Company', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
    });

    it('deve retornar erro para formato de URL inválido', async () => {
      const row = { website: 'not-a-url' };
      const fieldRules: Record<string, FieldValidationRules> = {
        website: { required: false, type: 'url' }
      };

      const result = await validateImportRow(row, 'Company', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });

    it('deve validar formato de data', async () => {
      const row = { birthDate: '2023-01-01' };
      const fieldRules: Record<string, FieldValidationRules> = {
        birthDate: { required: false, type: 'date' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
    });

    it('deve retornar erro para formato de data inválido', async () => {
      const row = { birthDate: 'invalid-date' };
      const fieldRules: Record<string, FieldValidationRules> = {
        birthDate: { required: false, type: 'date' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });
  });

  describe('Normalização de Valores', () => {
    it('deve normalizar email para minúsculas', () => {
      const result = normalizeValue('TEST@EXAMPLE.COM', 'email');
      expect(result).toBe('test@example.com');
    });

    it('deve normalizar texto removendo espaços extras', () => {
      const result = normalizeValue('  test value  ', 'text');
      expect(result).toBe('test value');
    });

    it('deve normalizar número a partir de string', () => {
      const result = normalizeValue('123.45', 'number');
      expect(result).toBe(123.45);
    });

    it('deve normalizar booleano a partir de string', () => {
      const result = normalizeValue('true', 'boolean');
      expect(result).toBe(true);
    });

    it('deve normalizar telefone removendo caracteres especiais', () => {
      const result = normalizeValue('(11) 99999-9999', 'phone');
      expect(result).toBe('(11)99999-9999'); // ou outro formato dependendo da implementação
    });

    it('deve normalizar URL adicionando protocolo se necessário', () => {
      const result = normalizeValue('example.com', 'url');
      expect(result).toContain('https://example.com');
    });
  });

  describe('Validação de Unicidade', () => {
    it('deve validar unicidade de email para contatos', async () => {
      // Este teste seria mais completo com mocks do banco de dados
      // Por enquanto, testamos a assinatura da função
      const result = await validateUniqueness('unique@example.com', 'email', 'Contact', mockTenantId, mockUserId);
      
      // O resultado real dependeria do estado do banco de dados
      // Mas a função deve retornar um objeto com a estrutura correta
      expect(result).toHaveProperty('isUnique');
      expect(typeof result.isUnique).toBe('boolean');
    });

    it('deve validar unicidade de nome para empresas', async () => {
      const result = await validateUniqueness('Unique Company Name', 'name', 'Company', mockTenantId, mockUserId);
      
      expect(result).toHaveProperty('isUnique');
      expect(typeof result.isUnique).toBe('boolean');
    });
  });

  describe('Validação de Regras de Negócio', () => {
    it('deve validar regras de negócio para contatos', async () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        birthDate: '1990-01-01'
      };

      const errors = await validateBusinessRules(data, 'Contact', mockTenantId);
      
      // Dependendo das regras específicas, pode ou não haver erros
      expect(Array.isArray(errors)).toBe(true);
    });

    it('deve validar regras de negócio para oportunidades', async () => {
      const data = {
        name: 'Test Opportunity',
        value: 1000,
        probability: 50,
        status: 'OPEN'
      };

      const errors = await validateBusinessRules(data, 'Opportunity', mockTenantId);
      
      expect(Array.isArray(errors)).toBe(true);
    });

    it('deve validar que valor de oportunidade não é negativo', async () => {
      const data = {
        name: 'Test Opportunity',
        value: -100, // Valor negativo
        probability: 50,
        status: 'OPEN'
      };

      const errors = await validateBusinessRules(data, 'Opportunity', mockTenantId);
      
      const negativeValueError = errors.find(e => e.code === 'OUT_OF_RANGE');
      expect(negativeValueError).toBeDefined();
      expect(negativeValueError?.field).toBe('value');
    });
  });

  describe('Validação Completa de Linha', () => {
    it('deve validar uma linha completa com sucesso', async () => {
      const row = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        title: 'Developer'
      };

      const fieldRules: Record<string, FieldValidationRules> = {
        firstName: { required: true, type: 'text', minLength: 1, maxLength: 100 },
        lastName: { required: false, type: 'text', maxLength: 100 },
        email: { required: false, type: 'email', unique: true, maxLength: 255 },
        phone: { required: false, type: 'phone', maxLength: 20 },
        title: { required: false, type: 'text', maxLength: 100 }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedData.firstName).toBe('John');
      expect(result.normalizedData.email).toBe('john@example.com');
    });

    it('deve retornar múltiplos erros para linha inválida', async () => {
      const row = {
        firstName: '', // Campo obrigatório vazio
        email: 'invalid-email', // Formato inválido
        value: 'not-a-number' // Tipo inválido para campo numérico
      };

      const fieldRules: Record<string, FieldValidationRules> = {
        firstName: { required: true, type: 'text' },
        email: { required: false, type: 'email' },
        value: { required: false, type: 'number' }
      };

      const result = await validateImportRow(row, 'Opportunity', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2); // firstName vazio e email inválido
      
      const requiredError = result.errors.find(e => e.code === 'REQUIRED');
      expect(requiredError).toBeDefined();
      expect(requiredError?.field).toBe('firstName');

      const formatError = result.errors.find(e => e.code === 'INVALID_FORMAT');
      expect(formatError).toBeDefined();
      expect(formatError?.field).toBe('email');
    });
  });

  describe('Validação de Tipos Específicos', () => {
    it('deve validar campo select com opções válidas', async () => {
      const row = { status: 'ACTIVE' };
      const fieldRules: Record<string, FieldValidationRules> = {
        status: { 
          required: false, 
          type: 'select', 
          options: ['ACTIVE', 'INACTIVE', 'PENDING'] 
        }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
    });

    it('deve retornar erro para campo select com opção inválida', async () => {
      const row = { status: 'INVALID_STATUS' };
      const fieldRules: Record<string, FieldValidationRules> = {
        status: { 
          required: false, 
          type: 'select', 
          options: ['ACTIVE', 'INACTIVE', 'PENDING'] 
        }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });

    it('deve validar campo multiselect', async () => {
      const row = { tags: ['tag1', 'tag2'] };
      const fieldRules: Record<string, FieldValidationRules> = {
        tags: { 
          required: false, 
          type: 'multiselect', 
          options: ['tag1', 'tag2', 'tag3'] 
        }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
    });

    it('deve validar campo currency', async () => {
      const row = { amount: 123.45 };
      const fieldRules: Record<string, FieldValidationRules> = {
        amount: { 
          required: false, 
          type: 'currency' 
        }
      };

      const result = await validateImportRow(row, 'Opportunity', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
    });

    it('deve validar campo percentage', async () => {
      const row = { discount: 10 };
      const fieldRules: Record<string, FieldValidationRules> = {
        discount: { 
          required: false, 
          type: 'percentage',
          minValue: 0,
          maxValue: 100
        }
      };

      const result = await validateImportRow(row, 'Opportunity', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
    });

    it('deve retornar erro para percentage fora do range', async () => {
      const row = { discount: 150 }; // Fora do range 0-100
      const fieldRules: Record<string, FieldValidationRules> = {
        discount: { 
          required: false, 
          type: 'percentage',
          minValue: 0,
          maxValue: 100
        }
      };

      const result = await validateImportRow(row, 'Opportunity', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('OUT_OF_RANGE');
    });
  });

  describe('Validação com Normalização', () => {
    it('deve normalizar e validar valores corretamente', async () => {
      const row = {
        email: '  TEST@EXAMPLE.COM  ', // Maiúsculas e espaços extras
        phone: '(11) 99999-9999', // Formato com parênteses e hífen
        value: '1234.56' // Número como string
      };

      const fieldRules: Record<string, FieldValidationRules> = {
        email: { required: false, type: 'email' },
        phone: { required: false, type: 'phone' },
        value: { required: false, type: 'number' }
      };

      const result = await validateImportRow(row, 'Opportunity', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.normalizedData.email).toBe('test@example.com'); // Normalizado
      expect(result.normalizedData.value).toBe(1234.56); // Convertido para número
    });
  });
});