/**
 * Testes unitários para filterBuilder
 */

import { buildFilterQuery } from '../../src/utils/filterBuilder';
import { Filter, FilterOperator } from '../../src/types/filter.types';
import { Prisma } from '@prisma/client';

describe('filterBuilder', () => {
  describe('buildFilterQuery', () => {
    it('deve construir query para equals', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        status: { equals: 'ACTIVE' },
      });
    });

    it('deve construir query para notEquals', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.NOT_EQUALS, value: 'INACTIVE' },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        status: { not: 'INACTIVE' },
      });
    });

    it('deve construir query para contains (case-insensitive)', () => {
      const filters: Filter[] = [
        { field: 'firstName', operator: FilterOperator.CONTAINS, value: 'João' },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        firstName: {
          contains: 'João',
          mode: 'insensitive',
        },
      });
    });

    it('deve construir query para notContains', () => {
      const filters: Filter[] = [
        { field: 'firstName', operator: FilterOperator.NOT_CONTAINS, value: 'Test' },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        firstName: {
          not: {
            contains: 'Test',
            mode: 'insensitive',
          },
        },
      });
    });

    it('deve construir query para greaterThan', () => {
      const filters: Filter[] = [
        { field: 'createdAt', operator: FilterOperator.GREATER_THAN, value: new Date('2024-01-01') },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        createdAt: { gt: new Date('2024-01-01') },
      });
    });

    it('deve construir query para lessThan', () => {
      const filters: Filter[] = [
        { field: 'createdAt', operator: FilterOperator.LESS_THAN, value: new Date('2024-12-31') },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        createdAt: { lt: new Date('2024-12-31') },
      });
    });

    it('deve construir query para greaterThanOrEqual', () => {
      const filters: Filter[] = [
        { field: 'createdAt', operator: FilterOperator.GREATER_THAN_OR_EQUAL, value: new Date('2024-01-01') },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        createdAt: { gte: new Date('2024-01-01') },
      });
    });

    it('deve construir query para lessThanOrEqual', () => {
      const filters: Filter[] = [
        { field: 'createdAt', operator: FilterOperator.LESS_THAN_OR_EQUAL, value: new Date('2024-12-31') },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        createdAt: { lte: new Date('2024-12-31') },
      });
    });

    it('deve construir query para between', () => {
      const filters: Filter[] = [
        {
          field: 'createdAt',
          operator: FilterOperator.BETWEEN,
          value: [new Date('2024-01-01'), new Date('2024-12-31')],
        },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        createdAt: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31'),
        },
      });
    });

    it('deve construir query para in', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.IN, value: ['ACTIVE', 'INACTIVE'] },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        status: { in: ['ACTIVE', 'INACTIVE'] },
      });
    });

    it('deve construir query para notIn', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.NOT_IN, value: ['ARCHIVED'] },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        status: { notIn: ['ARCHIVED'] },
      });
    });

    it('deve construir query para isNull', () => {
      const filters: Filter[] = [
        { field: 'lastName', operator: FilterOperator.IS_NULL },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        lastName: { is: null },
      });
    });

    it('deve construir query para isNotNull', () => {
      const filters: Filter[] = [
        { field: 'lastName', operator: FilterOperator.IS_NOT_NULL },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        lastName: { isNot: null },
      });
    });

    it('deve construir query para campo em relacionamento', () => {
      const filters: Filter[] = [
        { field: 'tags.name', operator: FilterOperator.CONTAINS, value: 'vip' },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        tags: {
          some: {
            name: {
              contains: 'vip',
              mode: 'insensitive',
            },
          },
        },
      });
    });

    it('deve construir query para múltiplos filtros', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
        { field: 'firstName', operator: FilterOperator.CONTAINS, value: 'João' },
      ];

      const result = buildFilterQuery(filters, 'contact');

      expect(result).toEqual({
        status: { equals: 'ACTIVE' },
        firstName: {
          contains: 'João',
          mode: 'insensitive',
        },
      });
    });

    it('deve construir query para Prisma.Decimal (opportunity.value)', () => {
      const filters: Filter[] = [
        { field: 'value', operator: FilterOperator.GREATER_THAN, value: new Prisma.Decimal('10000') },
      ];

      const result = buildFilterQuery(filters, 'opportunity');

      expect(result).toEqual({
        value: { gt: new Prisma.Decimal('10000') },
      });
    });

    it('deve lançar erro para entidade inexistente', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
      ];

      expect(() => {
        buildFilterQuery(filters, 'nonexistent');
      }).toThrow();
    });
  });
});
