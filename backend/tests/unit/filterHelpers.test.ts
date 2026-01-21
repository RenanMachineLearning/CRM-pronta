/**
 * Testes unitários para filterHelpers
 */

import {
  convertFilterValue,
  parseRelationField,
  getFilterableFields,
  isFilterableEntity,
} from '../../src/utils/filterHelpers';
import { FilterOperator, FilterError } from '../../src/types/filter.types';
import { Prisma } from '@prisma/client';

describe('filterHelpers', () => {
  describe('convertFilterValue', () => {
    it('deve converter string para number', () => {
      const result = convertFilterValue('123', 'number', FilterOperator.EQUALS);
      expect(result).toBe(123);
      expect(typeof result).toBe('number');
    });

    it('deve converter string para Date', () => {
      const dateStr = '2024-01-01T00:00:00.000Z';
      const result = convertFilterValue(dateStr, 'date', FilterOperator.EQUALS);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(dateStr);
    });

    it('deve converter string para boolean (true)', () => {
      const result = convertFilterValue('true', 'boolean', FilterOperator.EQUALS);
      expect(result).toBe(true);
    });

    it('deve converter string para boolean (false)', () => {
      const result = convertFilterValue('false', 'boolean', FilterOperator.EQUALS);
      expect(result).toBe(false);
    });

    it('deve converter string para Prisma.Decimal', () => {
      const result = convertFilterValue('100.50', 'decimal', FilterOperator.EQUALS);
      expect(result).toBeInstanceOf(Prisma.Decimal);
      expect(result.toString()).toBe('100.50');
    });

    it('deve converter number para Prisma.Decimal', () => {
      const result = convertFilterValue(100.50, 'decimal', FilterOperator.EQUALS);
      expect(result).toBeInstanceOf(Prisma.Decimal);
      expect(result.toString()).toBe('100.50');
    });

    it('deve retornar undefined para isNull/isNotNull', () => {
      const result1 = convertFilterValue(undefined, 'string', FilterOperator.IS_NULL);
      const result2 = convertFilterValue(undefined, 'string', FilterOperator.IS_NOT_NULL);
      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });

    it('deve converter array para between', () => {
      const result = convertFilterValue(['100', '200'], 'number', FilterOperator.BETWEEN);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toBe(100);
      expect(result[1]).toBe(200);
    });

    it('deve converter array para in/notIn', () => {
      const result = convertFilterValue(['1', '2', '3'], 'number', FilterOperator.IN);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([1, 2, 3]);
    });

    it('deve lançar erro para número inválido', () => {
      expect(() => {
        convertFilterValue('abc', 'number', FilterOperator.EQUALS);
      }).toThrow(FilterError);
    });

    it('deve lançar erro para data inválida', () => {
      expect(() => {
        convertFilterValue('invalid-date', 'date', FilterOperator.EQUALS);
      }).toThrow(FilterError);
    });

    it('deve lançar erro para boolean inválido', () => {
      expect(() => {
        convertFilterValue('maybe', 'boolean', FilterOperator.EQUALS);
      }).toThrow(FilterError);
    });
  });

  describe('parseRelationField', () => {
    it('deve parsear campo em relacionamento', () => {
      const result = parseRelationField('tags.name');
      expect(result).toEqual({
        relation: 'tags',
        field: 'name',
      });
    });

    it('deve retornar null para campo direto', () => {
      const result = parseRelationField('firstName');
      expect(result).toBeNull();
    });

    it('deve retornar null para string vazia', () => {
      const result = parseRelationField('');
      expect(result).toBeNull();
    });

    it('deve retornar null para campo com múltiplos pontos', () => {
      const result = parseRelationField('tags.some.field');
      // Deve retornar null pois não suporta múltiplos níveis
      expect(result).toBeNull();
    });
  });

  describe('getFilterableFields', () => {
    it('deve retornar campos filtráveis para contact', () => {
      const fields = getFilterableFields('contact');
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
      expect(fields).toContain('firstName');
      expect(fields).toContain('status');
      expect(fields).toContain('tags.name');
    });

    it('deve retornar campos filtráveis para company', () => {
      const fields = getFilterableFields('company');
      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain('name');
      expect(fields).toContain('industry');
    });

    it('deve retornar array vazio para entidade inexistente', () => {
      const fields = getFilterableFields('nonexistent');
      expect(fields).toEqual([]);
    });
  });

  describe('isFilterableEntity', () => {
    it('deve retornar true para entidades válidas', () => {
      expect(isFilterableEntity('contact')).toBe(true);
      expect(isFilterableEntity('company')).toBe(true);
      expect(isFilterableEntity('lead')).toBe(true);
      expect(isFilterableEntity('opportunity')).toBe(true);
      expect(isFilterableEntity('task')).toBe(true);
      expect(isFilterableEntity('note')).toBe(true);
    });

    it('deve retornar false para entidade inexistente', () => {
      expect(isFilterableEntity('nonexistent')).toBe(false);
    });
  });
});
