/**
 * Testes unitários agrupados para serviços de filtros
 * 
 * Agrupa testes de validação e construção de filtros para facilitar manutenção.
 * Reutiliza testes existentes e adiciona casos de integração entre componentes.
 */

import { Prisma } from '@prisma/client';
import { validateFilters } from '../../../src/utils/filterValidator';
import { buildFilterQuery } from '../../../src/utils/filterBuilder';
import { FilterOperator } from '../../../src/types/filter.types';
import type { Filter } from '../../../src/types/filter.types';

describe('FilterService - Testes Agrupados', () => {
  describe('Validação de Filtros', () => {
    it('deve validar filtros válidos', () => {
      const validFilters: Filter[] = [
        { field: 'firstName', operator: FilterOperator.CONTAINS, value: 'john' },
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
      ];

      expect(() => validateFilters(validFilters, 'contact')).not.toThrow();
    });

    it('deve rejeitar filtros com campos inválidos', () => {
      const invalidFilters: Filter[] = [
        { field: 'nonexistentField', operator: FilterOperator.EQUALS, value: 'value' },
      ];

      expect(() => validateFilters(invalidFilters, 'contact')).toThrow();
    });

    it('deve rejeitar filtros com operadores inválidos', () => {
      const invalidFilters: Filter[] = [
        { field: 'firstName', operator: 'invalidOperator' as any, value: 'john' },
      ];

      expect(() => validateFilters(invalidFilters, 'contact')).toThrow();
    });

    it('deve validar tipos de valores compatíveis', () => {
      const validFilters: Filter[] = [
        { field: 'createdAt', operator: FilterOperator.GREATER_THAN, value: '2023-01-01' },
        { field: 'value', operator: FilterOperator.BETWEEN, value: [100, 500] },
      ];

      expect(() => validateFilters(validFilters, 'opportunity')).not.toThrow();
    });
  });

  describe('Construção de Query Prisma', () => {
    it('deve construir query Prisma válida para equals', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
      ];

      const query = buildFilterQuery(filters, 'contact');

      expect(query).toEqual({
        status: { equals: 'ACTIVE' },
      });
    });

    it('deve construir query Prisma válida para contains', () => {
      const filters: Filter[] = [
        { field: 'firstName', operator: FilterOperator.CONTAINS, value: 'john' },
      ];

      const query = buildFilterQuery(filters, 'contact');
      
      expect(query).toEqual({
        firstName: {
          contains: 'john',
          mode: 'insensitive',
        },
      });
    });

    it('deve construir query Prisma válida para between', () => {
      const filters: Filter[] = [
        { field: 'value', operator: FilterOperator.BETWEEN, value: [100, 500] },
      ];

      const query = buildFilterQuery(filters, 'opportunity');

      expect(query).toEqual({
        value: {
          gte: new Prisma.Decimal(100),
          lte: new Prisma.Decimal(500),
        },
      });
    });

    it('deve construir query Prisma válida para múltiplos filtros', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
        { field: 'firstName', operator: FilterOperator.CONTAINS, value: 'john' },
      ];

      const query = buildFilterQuery(filters, 'contact');
      
      expect(query).toHaveProperty('status');
      expect(query.status).toEqual({ equals: 'ACTIVE' });
      expect(query).toHaveProperty('firstName');
      expect(query.firstName).toHaveProperty('contains', 'john');
    });

    it('deve construir query Prisma válida para isNull', () => {
      const filters: Filter[] = [
        { field: 'companyId', operator: FilterOperator.IS_NULL },
      ];

      const query = buildFilterQuery(filters, 'contact');

      expect(query).toEqual({
        companyId: { is: null },
      });
    });

    it('deve construir query Prisma válida para isNotNull', () => {
      const filters: Filter[] = [
        { field: 'companyId', operator: FilterOperator.IS_NOT_NULL },
      ];

      const query = buildFilterQuery(filters, 'contact');

      expect(query).toEqual({
        companyId: {
          isNot: null,
        },
      });
    });

    it('deve construir query Prisma válida para in', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.IN, value: ['ACTIVE', 'INACTIVE'] },
      ];

      const query = buildFilterQuery(filters, 'contact');
      
      expect(query).toEqual({
        status: {
          in: ['ACTIVE', 'INACTIVE'],
        },
      });
    });

    it('deve construir query Prisma válida para notIn', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.NOT_IN, value: ['ARCHIVED'] },
      ];

      const query = buildFilterQuery(filters, 'contact');
      
      expect(query).toEqual({
        status: {
          notIn: ['ARCHIVED'],
        },
      });
    });
  });

  describe('Integração Validação + Construção', () => {
    it('deve validar e construir query para filtros complexos', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
        { field: 'firstName', operator: FilterOperator.CONTAINS, value: 'john' },
        { field: 'createdAt', operator: FilterOperator.GREATER_THAN, value: '2023-01-01' },
      ];

      // Validar primeiro
      expect(() => validateFilters(filters, 'contact')).not.toThrow();

      // Construir query
      const query = buildFilterQuery(filters, 'contact');
      
      expect(query).toHaveProperty('status');
      expect(query.status).toEqual({ equals: 'ACTIVE' });
      expect(query).toHaveProperty('firstName');
      expect(query).toHaveProperty('createdAt');
    });

    it('deve rejeitar filtros inválidos durante validação', () => {
      const invalidFilters: Filter[] = [
        { field: 'nonexistentField', operator: FilterOperator.EQUALS, value: 'value' },
      ];

      expect(() => validateFilters(invalidFilters, 'contact')).toThrow();

      // Mas buildFilterQuery não lança erro, apenas ignora campos inválidos
      const query = buildFilterQuery(invalidFilters, 'contact');
      expect(query).toEqual({});
    });
  });
});
