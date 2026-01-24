/**
 * Testes unitários para o sistema de mapeamento de campos
 */

import { validateImportRow } from '../../src/utils/importValidator';
import { normalizeValue } from '../../src/utils/valueNormalizer';
import { validateUniqueness } from '../../src/services/uniquenessValidator';
import { validateBusinessRules } from '../../src/services/businessRuleValidator';
import { FieldValidationRules } from '../../src/types/validation.types';

describe('Sistema de Mapeamento de Campos - Testes Unitários', () => {
  const mockTenantId = 'test-tenant-id-mapping';
  const mockUserId = 'test-user-id-mapping';

  describe('Validação de Mapeamento de Campos', () => {
    it('deve validar mapeamento de campos obrigatórios', async () => {
      const row = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
      const fieldRules: Record<string, FieldValidationRules> = {
        firstName: { required: true, type: 'text' },
        lastName: { required: false, type: 'text' },
        email: { required: false, type: 'email' }
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
        email: { required: false, type: 'email' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('lastName');
      expect(result.errors[0].code).toBe('REQUIRED');
    });

    it('deve validar tipos de campos corretamente', async () => {
      const row = { 
        firstName: 'John', 
        age: '30', 
        birthDate: '1990-01-01', 
        isActive: 'true' 
      };
      
      const fieldRules: Record<string, FieldValidationRules> = {
        firstName: { required: true, type: 'text' },
        age: { required: false, type: 'number' },
        birthDate: { required: false, type: 'date' },
        isActive: { required: false, type: 'boolean' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedData.age).toBe(30);
      expect(result.normalizedData.isActive).toBe(true);
      expect(result.normalizedData.birthDate).toBeInstanceOf(Date);
    });

    it('deve retornar erro para tipos inválidos', async () => {
      const row = { age: 'not-a-number' };
      const fieldRules: Record<string, FieldValidationRules> = {
        age: { required: false, type: 'number' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('age');
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('deve validar formatos de campos específicos', async () => {
      const row = { 
        email: 'test@example.com', 
        phone: '+1234567890', 
        website: 'https://example.com' 
      };
      
      const fieldRules: Record<string, FieldValidationRules> = {
        email: { required: false, type: 'email' },
        phone: { required: false, type: 'phone' },
        website: { required: false, type: 'url' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve retornar erro para formatos inválidos', async () => {
      const row = { email: 'invalid-email' };
      const fieldRules: Record<string, FieldValidationRules> = {
        email: { required: false, type: 'email' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });

    it('deve aplicar normalização de valores', () => {
      const result = normalizeValue('  TEST EMAIL  ', 'email');
      expect(result).toBe('test email'); // Email normalizado para minúsculas e espaços removidos

      const phoneResult = normalizeValue('(11) 99999-9999', 'phone');
      expect(phoneResult).toBe('11999999999'); // Telefone normalizado

      const textResult = normalizeValue('  Trimmed Text  ', 'text');
      expect(textResult).toBe('Trimmed Text'); // Espaços removidos
    });

    it('deve validar unicidade de campos', async () => {
      // Este teste simula a validação de unicidade
      // Em um ambiente real, isso consultaria o banco de dados
      const result = await validateUniqueness('unique@test.com', 'email', 'Contact', mockTenantId, mockUserId);
      
      // O resultado real dependeria do estado do banco de dados
      expect(result).toHaveProperty('isUnique');
      expect(typeof result.isUnique).toBe('boolean');
    });

    it('deve validar regras de negócio', async () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        birthDate: '1990-01-01'
      };

      const errors = await validateBusinessRules(data, 'Contact', mockTenantId);
      
      // O número de erros depende das regras específicas implementadas
      expect(Array.isArray(errors)).toBe(true);
    });

    it('deve validar campos com opções (select)', async () => {
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
      expect(result.errors).toHaveLength(0);
    });

    it('deve retornar erro para opções inválidas', async () => {
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
      expect(result.errors[0].field).toBe('status');
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });

    it('deve lidar com campos multiselect', async () => {
      const row = { tags: 'tag1,tag2,tag3' };
      const fieldRules: Record<string, FieldValidationRules> = {
        tags: { 
          required: false, 
          type: 'multiselect', 
          options: ['tag1', 'tag2', 'tag3', 'tag4'] 
        }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(Array.isArray(result.normalizedData.tags)).toBe(true);
    });

    it('deve validar campos com comprimento máximo', async () => {
      const longText = 'A'.repeat(300); // Mais do que o máximo padrão de 255
      const row = { firstName: longText };
      const fieldRules: Record<string, FieldValidationRules> = {
        firstName: { required: true, type: 'text', maxLength: 255 }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('firstName');
      expect(result.errors[0].code).toBe('TOO_LONG');
    });

    it('deve validar campos com valores numéricos dentro do range', async () => {
      const row = { age: '25' };
      const fieldRules: Record<string, FieldValidationRules> = {
        age: { required: false, type: 'number', minValue: 18, maxValue: 65 }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedData.age).toBe(25);
    });

    it('deve retornar erro para valores numéricos fora do range', async () => {
      const row = { age: '70' }; // Acima do máximo de 65
      const fieldRules: Record<string, FieldValidationRules> = {
        age: { required: false, type: 'number', minValue: 18, maxValue: 65 }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('age');
      expect(result.errors[0].code).toBe('OUT_OF_RANGE');
    });
  });

  describe('Casos de Erro e Exceção', () => {
    it('deve lidar com valores nulos e indefinidos', async () => {
      const row = { firstName: null, lastName: undefined };
      const fieldRules: Record<string, FieldValidationRules> = {
        firstName: { required: false, type: 'text' },
        lastName: { required: false, type: 'text' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve retornar erro para campos obrigatórios com valores vazios', async () => {
      const row = { firstName: '' };
      const fieldRules: Record<string, FieldValidationRules> = {
        firstName: { required: true, type: 'text' }
      };

      const result = await validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('firstName');
      expect(result.errors[0].code).toBe('REQUIRED');
    });

    it('deve lidar com tipos de entidade inválidos', async () => {
      const row = { firstName: 'John' };
      const fieldRules: Record<string, FieldValidationRules> = {
        firstName: { required: true, type: 'text' }
      };

      const result = await validateImportRow(row, 'InvalidEntity', fieldRules, mockTenantId, mockUserId);

      // Deve retornar erro de entidade inválida
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_ENTITY');
    });
  });

  describe('Validações de Desempenho', () => {
    it('deve validar grandes volumes de dados de forma eficiente', async () => {
      // Criar um conjunto grande de dados para teste de desempenho
      const largeDataSet = Array.from({ length: 100 }, (_, i) => ({
        firstName: `FirstName${i}`,
        lastName: `LastName${i}`,
        email: `test${i}@example.com`,
        age: `${20 + (i % 50)}`
      }));

      const fieldRules: Record<string, FieldValidationRules> = {
        firstName: { required: true, type: 'text' },
        lastName: { required: false, type: 'text' },
        email: { required: true, type: 'email' },
        age: { required: false, type: 'number', minValue: 18, maxValue: 70 }
      };

      const startTime = Date.now();
      
      // Validar cada linha individualmente (em um cenário real, faríamos validação em lote)
      const results = await Promise.all(
        largeDataSet.map(row => validateImportRow(row, 'Contact', fieldRules, mockTenantId, mockUserId))
      );
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verificar que todas as validações foram bem-sucedidas
      const invalidResults = results.filter(r => !r.isValid);
      expect(invalidResults).toHaveLength(0);

      // Verificar que o tempo de processamento é razoável (menos de 5 segundos para 100 registros)
      expect(processingTime).toBeLessThan(5000);
    });
  });
});