/**
 * Testes unitários para filterValidator
 */

import {
  validateFilter,
  validateFilters,
  validateFilterValue,
} from '../../src/utils/filterValidator';
import { Filter, FilterOperator, FilterError } from '../../src/types/filter.types';

describe('filterValidator', () => {
  describe('validateFilter', () => {
    it('deve validar filtro válido', () => {
      const filter: Filter = {
        field: 'status',
        operator: FilterOperator.EQUALS,
        value: 'ACTIVE',
      };

      expect(() => validateFilter(filter, 'contact')).not.toThrow();
    });

    it('deve lançar erro se filtro não é objeto', () => {
      expect(() => {
        validateFilter(null as any, 'contact');
      }).toThrow(FilterError);
    });

    it('deve lançar erro se field está ausente', () => {
      const filter = {
        operator: FilterOperator.EQUALS,
        value: 'ACTIVE',
      } as any;

      expect(() => validateFilter(filter, 'contact')).toThrow(FilterError);
    });

    it('deve lançar erro se operator está ausente', () => {
      const filter = {
        field: 'status',
        value: 'ACTIVE',
      } as any;

      expect(() => validateFilter(filter, 'contact')).toThrow(FilterError);
    });

    it('deve lançar erro se operador é inválido', () => {
      const filter: Filter = {
        field: 'status',
        operator: 'invalid' as any,
        value: 'ACTIVE',
      };

      expect(() => validateFilter(filter, 'contact')).toThrow(FilterError);
    });

    it('deve lançar erro se entidade não suporta filtros', () => {
      const filter: Filter = {
        field: 'status',
        operator: FilterOperator.EQUALS,
        value: 'ACTIVE',
      };

      expect(() => validateFilter(filter, 'nonexistent')).toThrow(FilterError);
    });

    it('deve lançar erro se campo não existe na entidade', () => {
      const filter: Filter = {
        field: 'nonexistentField',
        operator: FilterOperator.EQUALS,
        value: 'value',
      };

      expect(() => validateFilter(filter, 'contact')).toThrow(FilterError);
    });

    it('deve lançar erro se operador não é válido para tipo do campo', () => {
      const filter: Filter = {
        field: 'firstName', // string
        operator: FilterOperator.BETWEEN, // não válido para string
        value: ['a', 'b'],
      };

      expect(() => validateFilter(filter, 'contact')).toThrow(FilterError);
    });

    it('deve validar enum value', () => {
      const filter: Filter = {
        field: 'status',
        operator: FilterOperator.EQUALS,
        value: 'ACTIVE',
      };

      expect(() => validateFilter(filter, 'contact')).not.toThrow();
    });

    it('deve lançar erro para enum value inválido', () => {
      const filter: Filter = {
        field: 'status',
        operator: FilterOperator.EQUALS,
        value: 'INVALID_STATUS',
      };

      expect(() => validateFilter(filter, 'contact')).toThrow(FilterError);
    });

    it('deve validar isNull sem value', () => {
      const filter: Filter = {
        field: 'firstName',
        operator: FilterOperator.IS_NULL,
      };

      expect(() => validateFilter(filter, 'contact')).not.toThrow();
    });

    it('deve lançar erro se isNull tem value', () => {
      const filter: Filter = {
        field: 'firstName',
        operator: FilterOperator.IS_NULL,
        value: 'something',
      };

      expect(() => validateFilter(filter, 'contact')).toThrow(FilterError);
    });

    it('deve lançar erro se operador requer value mas não tem', () => {
      const filter: Filter = {
        field: 'status',
        operator: FilterOperator.EQUALS,
        // value ausente
      } as any;

      expect(() => validateFilter(filter, 'contact')).toThrow(FilterError);
    });
  });

  describe('validateFilterValue', () => {
    it('deve validar between com array de 2 elementos', () => {
      expect(() => {
        validateFilterValue([100, 200], 'number', FilterOperator.BETWEEN);
      }).not.toThrow();
    });

    it('deve lançar erro se between não é array', () => {
      expect(() => {
        validateFilterValue(100, 'number', FilterOperator.BETWEEN);
      }).toThrow(FilterError);
    });

    it('deve lançar erro se between tem menos de 2 elementos', () => {
      expect(() => {
        validateFilterValue([100], 'number', FilterOperator.BETWEEN);
      }).toThrow(FilterError);
    });

    it('deve lançar erro se between tem min > max', () => {
      expect(() => {
        validateFilterValue([200, 100], 'number', FilterOperator.BETWEEN);
      }).toThrow(FilterError);
    });

    it('deve validar in com array não vazio', () => {
      expect(() => {
        validateFilterValue([1, 2, 3], 'number', FilterOperator.IN);
      }).not.toThrow();
    });

    it('deve lançar erro se in não é array', () => {
      expect(() => {
        validateFilterValue(1, 'number', FilterOperator.IN);
      }).toThrow(FilterError);
    });

    it('deve lançar erro se in é array vazio', () => {
      expect(() => {
        validateFilterValue([], 'number', FilterOperator.IN);
      }).toThrow(FilterError);
    });

    it('deve validar contains com string não vazia', () => {
      expect(() => {
        validateFilterValue('test', 'string', FilterOperator.CONTAINS);
      }).not.toThrow();
    });

    it('deve lançar erro se contains é string vazia', () => {
      expect(() => {
        validateFilterValue('', 'string', FilterOperator.CONTAINS);
      }).toThrow(FilterError);
    });
  });

  describe('validateFilters', () => {
    it('deve validar array de filtros válidos', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
        { field: 'firstName', operator: FilterOperator.CONTAINS, value: 'João' },
      ];

      expect(() => validateFilters(filters, 'contact')).not.toThrow();
    });

    it('deve lançar erro se não é array', () => {
      expect(() => {
        validateFilters({} as any, 'contact');
      }).toThrow(FilterError);
    });

    it('deve lançar erro se array está vazio', () => {
      expect(() => {
        validateFilters([], 'contact');
      }).toThrow(FilterError);
    });

    it('deve lançar erro se excede limite de 10 filtros', () => {
      const filters: Filter[] = Array(11).fill({
        field: 'status',
        operator: FilterOperator.EQUALS,
        value: 'ACTIVE',
      });

      expect(() => validateFilters(filters, 'contact')).toThrow(FilterError);
    });

    it('deve validar até 10 filtros', () => {
      const filters: Filter[] = Array(10).fill({
        field: 'status',
        operator: FilterOperator.EQUALS,
        value: 'ACTIVE',
      });

      expect(() => validateFilters(filters, 'contact')).not.toThrow();
    });

    it('deve incluir índice do filtro no erro', () => {
      const filters: Filter[] = [
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
        { field: 'invalidField', operator: FilterOperator.EQUALS, value: 'value' },
      ];

      try {
        validateFilters(filters, 'contact');
        fail('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error).toBeInstanceOf(FilterError);
        expect(error.details?.filterIndex).toBe(1);
      }
    });
  });
});
