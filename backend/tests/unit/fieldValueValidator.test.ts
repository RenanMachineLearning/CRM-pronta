/**
 * Testes unitários para validação e processamento de valores por tipo de campo
 * Testa processamento (conversão) e validação (regras de negócio) separadamente
 */

import {
  processFieldValue,
  validateFieldValue,
  processAndValidateFieldValue,
  FieldValidationError,
} from '../../src/utils/fieldValueValidator';
import { FieldResponse } from '../../src/services/fieldService';

// Helper para criar campo mock
function createMockField(
  type: string,
  required: boolean = false,
  options?: any
): FieldResponse {
  return {
    id: 'field-id',
    entityId: 'entity-id',
    name: 'testField',
    label: 'Campo de Teste',
    type,
    required,
    unique: false,
    defaultValue: null,
    options,
    tenantId: 'tenant-id',
    order: 0,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Field Value Validator', () => {
  describe('processFieldValue - Text', () => {
    const field = createMockField('text');

    it('deve processar string válida', () => {
      const result = processFieldValue(field, 'teste');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('teste');
      }
    });

    it('deve converter número para string', () => {
      const result = processFieldValue(field, 123);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('123');
      }
    });

    it('deve converter boolean para string', () => {
      const result = processFieldValue(field, true);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('true');
      }
    });

    it('deve retornar null para campo opcional', () => {
      const optionalField = createMockField('text', false);
      const result = processFieldValue(optionalField, null);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('validateFieldValue - Text', () => {
    it('deve validar string sem maxLength', () => {
      const field = createMockField('text');
      expect(() => validateFieldValue(field, 'teste')).not.toThrow();
    });

    it('deve validar string dentro de maxLength', () => {
      const field = createMockField('text', false, { maxLength: 10 });
      expect(() => validateFieldValue(field, 'teste')).not.toThrow();
    });

    it('deve lançar erro se exceder maxLength', () => {
      const field = createMockField('text', false, { maxLength: 5 });
      expect(() => validateFieldValue(field, 'texto muito longo')).toThrow(FieldValidationError);
      try {
        validateFieldValue(field, 'texto muito longo');
      } catch (err) {
        expect(err).toBeInstanceOf(FieldValidationError);
        if (err instanceof FieldValidationError) {
          expect(err.fieldName).toBe('testField');
          expect(err.fieldLabel).toBe('Campo de Teste');
          expect(err.message).toContain('excede o tamanho máximo');
        }
      }
    });

    it('deve lançar erro se campo obrigatório for null', () => {
      const field = createMockField('text', true);
      expect(() => validateFieldValue(field, null)).toThrow(FieldValidationError);
      try {
        validateFieldValue(field, null);
      } catch (err) {
        expect(err).toBeInstanceOf(FieldValidationError);
        if (err instanceof FieldValidationError) {
          expect(err.message).toContain('é obrigatório');
        }
      }
    });

    it('deve aceitar null para campo opcional', () => {
      const field = createMockField('text', false);
      expect(() => validateFieldValue(field, null)).not.toThrow();
      const result = validateFieldValue(field, null);
      expect(result).toBeNull();
    });
  });

  describe('processFieldValue - Number', () => {
    const field = createMockField('number');

    it('deve processar número válido', () => {
      const result = processFieldValue(field, 123);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(123);
      }
    });

    it('deve converter string numérica para número', () => {
      const result = processFieldValue(field, '123');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(123);
      }
    });

    it('deve converter string numérica com espaços', () => {
      const result = processFieldValue(field, '  123  ');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(123);
      }
    });

    it('deve retornar erro para string não numérica', () => {
      const result = processFieldValue(field, 'abc');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('não é um número válido');
      }
    });

    it('deve retornar null para string vazia', () => {
      const result = processFieldValue(field, '');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('deve retornar erro para NaN', () => {
      const result = processFieldValue(field, NaN);
      expect(result.ok).toBe(false);
    });
  });

  describe('validateFieldValue - Number', () => {
    it('deve validar número sem min/max', () => {
      const field = createMockField('number');
      expect(() => validateFieldValue(field, 123)).not.toThrow();
    });

    it('deve validar número dentro de min/max', () => {
      const field = createMockField('number', false, { min: 0, max: 100 });
      expect(() => validateFieldValue(field, 50)).not.toThrow();
    });

    it('deve lançar erro se menor que min', () => {
      const field = createMockField('number', false, { min: 0, max: 100 });
      expect(() => validateFieldValue(field, -1)).toThrow(FieldValidationError);
      try {
        validateFieldValue(field, -1);
      } catch (err) {
        expect(err).toBeInstanceOf(FieldValidationError);
        if (err instanceof FieldValidationError) {
          expect(err.message).toContain('deve ser maior ou igual a 0');
        }
      }
    });

    it('deve lançar erro se maior que max', () => {
      const field = createMockField('number', false, { min: 0, max: 100 });
      expect(() => validateFieldValue(field, 101)).toThrow(FieldValidationError);
      try {
        validateFieldValue(field, 101);
      } catch (err) {
        expect(err).toBeInstanceOf(FieldValidationError);
        if (err instanceof FieldValidationError) {
          expect(err.message).toContain('deve ser menor ou igual a 100');
        }
      }
    });
  });

  describe('processFieldValue - Date', () => {
    const field = createMockField('date');

    it('deve processar Date válido', () => {
      const date = new Date('2024-01-01');
      const result = processFieldValue(field, date);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeInstanceOf(Date);
        expect(result.value.getTime()).toBe(date.getTime());
      }
    });

    it('deve converter string ISO 8601 para Date', () => {
      const result = processFieldValue(field, '2024-01-01T00:00:00.000Z');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeInstanceOf(Date);
      }
    });

    it('deve converter timestamp para Date', () => {
      const timestamp = new Date('2024-01-01').getTime();
      const result = processFieldValue(field, timestamp);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeInstanceOf(Date);
      }
    });

    it('deve retornar erro para string inválida', () => {
      const result = processFieldValue(field, 'data inválida');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('não é uma data válida');
      }
    });

    it('deve retornar null para string vazia', () => {
      const result = processFieldValue(field, '');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('validateFieldValue - Date', () => {
    it('deve validar Date válido', () => {
      const field = createMockField('date');
      const date = new Date('2024-01-01');
      expect(() => validateFieldValue(field, date)).not.toThrow();
    });

    it('deve lançar erro para Date inválido', () => {
      const field = createMockField('date');
      const invalidDate = new Date('invalid');
      expect(() => validateFieldValue(field, invalidDate)).toThrow(FieldValidationError);
    });
  });

  describe('processFieldValue - Boolean', () => {
    const field = createMockField('boolean');

    it('deve processar boolean válido', () => {
      const result = processFieldValue(field, true);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('deve converter string "true" para boolean', () => {
      const result = processFieldValue(field, 'true');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('deve converter string "false" para boolean', () => {
      const result = processFieldValue(field, 'false');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });

    it('deve converter string "1" para boolean true', () => {
      const result = processFieldValue(field, '1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('deve converter string "0" para boolean false', () => {
      const result = processFieldValue(field, '0');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });

    it('deve converter número 0 para boolean false', () => {
      const result = processFieldValue(field, 0);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });

    it('deve converter número diferente de 0 para boolean true', () => {
      const result = processFieldValue(field, 1);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('deve retornar erro para string inválida', () => {
      const result = processFieldValue(field, 'maybe');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('não pode ser convertido para boolean');
      }
    });
  });

  describe('validateFieldValue - Boolean', () => {
    it('deve validar boolean válido', () => {
      const field = createMockField('boolean');
      expect(() => validateFieldValue(field, true)).not.toThrow();
      expect(() => validateFieldValue(field, false)).not.toThrow();
    });

    it('deve lançar erro para valor não boolean', () => {
      const field = createMockField('boolean');
      expect(() => validateFieldValue(field, 'true')).toThrow(FieldValidationError);
    });
  });

  describe('processFieldValue - Select', () => {
    const field = createMockField('select', false, [
      { value: 'option1', label: 'Opção 1' },
      { value: 'option2', label: 'Opção 2' },
    ]);

    it('deve processar string válida', () => {
      const result = processFieldValue(field, 'option1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('option1');
      }
    });

    it('deve converter número para string', () => {
      const result = processFieldValue(field, 123);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('123');
      }
    });
  });

  describe('validateFieldValue - Select', () => {
    const options = [
      { value: 'active', label: 'Ativo' },
      { value: 'inactive', label: 'Inativo' },
      { value: 'pending', label: 'Pendente' },
    ];

    it('deve validar valor nas opções', () => {
      const field = createMockField('select', false, options);
      expect(() => validateFieldValue(field, 'active')).not.toThrow();
    });

    it('deve lançar erro se valor não está nas opções', () => {
      const field = createMockField('select', false, options);
      expect(() => validateFieldValue(field, 'invalid')).toThrow(FieldValidationError);
      try {
        validateFieldValue(field, 'invalid');
      } catch (err) {
        expect(err).toBeInstanceOf(FieldValidationError);
        if (err instanceof FieldValidationError) {
          expect(err.message).toContain('deve ser uma das opções');
          expect(err.message).toContain('active, inactive, pending');
        }
      }
    });

    it('deve lançar erro se opções não estão definidas', () => {
      const field = createMockField('select', false);
      expect(() => validateFieldValue(field, 'value')).toThrow(FieldValidationError);
      try {
        validateFieldValue(field, 'value');
      } catch (err) {
        expect(err).toBeInstanceOf(FieldValidationError);
        if (err instanceof FieldValidationError) {
          expect(err.message).toContain('não tem opções definidas');
        }
      }
    });
  });

  describe('processFieldValue - Lookup', () => {
    const field = createMockField('lookup');

    it('deve processar string válida', () => {
      // UUID v4 válido: terceiro grupo começa com 4, quarto grupo começa com 8, 9, a ou b
      const uuid = '123e4567-e89b-42d3-a456-426614174000';
      const result = processFieldValue(field, uuid);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(uuid);
      }
    });

    it('deve converter número para string', () => {
      const result = processFieldValue(field, 123);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('123');
      }
    });
  });

  describe('validateFieldValue - Lookup', () => {
    it('deve validar UUID v4 válido', () => {
      const field = createMockField('lookup');
      // UUID v4 válido: terceiro grupo começa com 4, quarto grupo começa com 8, 9, a ou b
      const validUUID = '123e4567-e89b-42d3-a456-426614174000';
      expect(() => validateFieldValue(field, validUUID)).not.toThrow();
    });

    it('deve lançar erro para UUID inválido', () => {
      const field = createMockField('lookup');
      expect(() => validateFieldValue(field, 'not-a-uuid')).toThrow(FieldValidationError);
      try {
        validateFieldValue(field, 'not-a-uuid');
      } catch (err) {
        expect(err).toBeInstanceOf(FieldValidationError);
        if (err instanceof FieldValidationError) {
          expect(err.message).toContain('deve ser um UUID válido');
        }
      }
    });

    it('deve lançar erro para UUID v3 (não é v4)', () => {
      const field = createMockField('lookup');
      // UUID v3 tem 3 no lugar de 4
      const invalidUUID = '123e4567-e89b-32d3-a456-426614174000';
      expect(() => validateFieldValue(field, invalidUUID)).toThrow(FieldValidationError);
    });

    it('não deve validar existência no banco (V1)', () => {
      // V1: apenas valida formato, não consulta banco
      const field = createMockField('lookup');
      // UUID v4 válido: terceiro grupo começa com 4, quarto grupo começa com 8, 9, a ou b
      const validUUID = '123e4567-e89b-42d3-a456-426614174000';
      // Não deve lançar erro mesmo que UUID não exista no banco
      expect(() => validateFieldValue(field, validUUID)).not.toThrow();
    });
  });

  describe('processAndValidateFieldValue - Integração', () => {
    it('deve processar e validar text com sucesso', () => {
      const field = createMockField('text', false, { maxLength: 10 });
      const result = processAndValidateFieldValue(field, 'teste');
      expect(result).toBe('teste');
    });

    it('deve processar e validar number com sucesso', () => {
      const field = createMockField('number', false, { min: 0, max: 100 });
      const result = processAndValidateFieldValue(field, '50');
      expect(result).toBe(50);
    });

    it('deve processar e validar date com sucesso', () => {
      const field = createMockField('date');
      const result = processAndValidateFieldValue(field, '2024-01-01T00:00:00.000Z');
      expect(result).toBeInstanceOf(Date);
    });

    it('deve processar e validar boolean com sucesso', () => {
      const field = createMockField('boolean');
      const result = processAndValidateFieldValue(field, 'true');
      expect(result).toBe(true);
    });

    it('deve processar e validar select com sucesso', () => {
      const field = createMockField('select', false, [
        { value: 'option1', label: 'Opção 1' },
      ]);
      const result = processAndValidateFieldValue(field, 'option1');
      expect(result).toBe('option1');
    });

    it('deve processar e validar lookup com sucesso', () => {
      const field = createMockField('lookup');
      // UUID v4 válido: terceiro grupo começa com 4, quarto grupo começa com 8, 9, a ou b
      const uuid = '123e4567-e89b-42d3-a456-426614174000';
      const result = processAndValidateFieldValue(field, uuid);
      expect(result).toBe(uuid);
    });

    it('deve lançar FieldValidationError se processamento falhar', () => {
      const field = createMockField('number');
      expect(() => processAndValidateFieldValue(field, 'abc')).toThrow(FieldValidationError);
      try {
        processAndValidateFieldValue(field, 'abc');
      } catch (err) {
        expect(err).toBeInstanceOf(FieldValidationError);
        if (err instanceof FieldValidationError) {
          expect(err.fieldName).toBe('testField');
          expect(err.fieldLabel).toBe('Campo de Teste');
        }
      }
    });

    it('deve lançar FieldValidationError se validação falhar', () => {
      const field = createMockField('text', false, { maxLength: 5 });
      expect(() => processAndValidateFieldValue(field, 'texto muito longo')).toThrow(FieldValidationError);
    });

    it('deve tratar valores nulos corretamente (required vs opcional)', () => {
      const requiredField = createMockField('text', true);
      expect(() => processAndValidateFieldValue(requiredField, null)).toThrow(FieldValidationError);

      const optionalField = createMockField('text', false);
      const result = processAndValidateFieldValue(optionalField, null);
      expect(result).toBeNull();
    });
  });

  describe('FieldValidationError', () => {
    it('deve criar erro com propriedades corretas', () => {
      const error = new FieldValidationError('email', 'E-mail', 'Campo é obrigatório');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FieldValidationError);
      expect(error.name).toBe('FieldValidationError');
      expect(error.fieldName).toBe('email');
      expect(error.fieldLabel).toBe('E-mail');
      expect(error.message).toBe('Campo é obrigatório');
    });

    it('deve manter stack trace', () => {
      const error = new FieldValidationError('email', 'E-mail', 'Campo é obrigatório');
      expect(error.stack).toBeDefined();
    });
  });
});

