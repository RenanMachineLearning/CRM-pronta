/**
 * Testes unitários para orderByHelpers
 */

import {
  buildOrderBy,
  processOrderByParams,
  validateOrderField,
  validateOrderDirection,
  OrderByError,
} from '../../src/utils/orderByHelpers';

describe('orderByHelpers', () => {
  describe('validateOrderField', () => {
    it('deve validar campo válido para contact', () => {
      expect(validateOrderField('firstName', 'contact')).toBe(true);
      expect(validateOrderField('lastName', 'contact')).toBe(true);
      expect(validateOrderField('createdAt', 'contact')).toBe(true);
    });

    it('deve rejeitar campo inválido para contact', () => {
      expect(validateOrderField('invalidField', 'contact')).toBe(false);
    });

    it('deve rejeitar entidade inexistente', () => {
      expect(validateOrderField('firstName', 'invalidEntity')).toBe(false);
    });
  });

  describe('validateOrderDirection', () => {
    it('deve validar direções válidas', () => {
      expect(validateOrderDirection('asc')).toBe(true);
      expect(validateOrderDirection('desc')).toBe(true);
    });

    it('deve rejeitar direções inválidas', () => {
      expect(validateOrderDirection('invalid')).toBe(false);
      expect(validateOrderDirection('ASC')).toBe(false);
      expect(validateOrderDirection('')).toBe(false);
    });
  });

  describe('buildOrderBy', () => {
    describe('Ordenação simples', () => {
      it('deve construir orderBy simples com campo e direção', () => {
        const result = buildOrderBy('firstName', 'asc', 'contact');
        expect(result).toEqual({ firstName: 'asc' });
      });

      it('deve usar direção padrão quando não especificada', () => {
        const result = buildOrderBy('firstName', undefined, 'contact');
        expect(result).toEqual({ firstName: 'asc' });
      });

      it('deve construir orderBy com desc', () => {
        const result = buildOrderBy('createdAt', 'desc', 'contact');
        expect(result).toEqual({ createdAt: 'desc' });
      });
    });

    describe('Ordenação múltipla', () => {
      it('deve construir orderBy múltiplo com arrays', () => {
        const result = buildOrderBy(
          ['companyId', 'firstName'],
          ['asc', 'asc'],
          'contact'
        );
        expect(result).toEqual([
          { companyId: 'asc' },
          { firstName: 'asc' },
        ]);
      });

      it('deve construir orderBy múltiplo com direções diferentes', () => {
        const result = buildOrderBy(
          ['status', 'createdAt'],
          ['asc', 'desc'],
          'contact'
        );
        expect(result).toEqual([
          { status: 'asc' },
          { createdAt: 'desc' },
        ]);
      });

      it('deve usar direção padrão para campos sem direção especificada', () => {
        const result = buildOrderBy(
          ['firstName', 'lastName'],
          ['asc'],
          'contact'
        );
        expect(result).toEqual([
          { firstName: 'asc' },
          { lastName: 'asc' },
        ]);
      });
    });

    describe('Ordenação padrão', () => {
      it('deve retornar ordenação padrão quando sortBy não fornecido', () => {
        const result = buildOrderBy(undefined, undefined, 'contact');
        expect(result).toEqual({ createdAt: 'desc' });
      });

      it('deve retornar ordenação padrão genérica quando entityType não fornecido', () => {
        const result = buildOrderBy(undefined, undefined, undefined);
        expect(result).toEqual({ createdAt: 'desc' });
      });
    });

    describe('Validações e erros', () => {
      it('deve lançar erro para campo inválido', () => {
        expect(() => {
          buildOrderBy('invalidField', 'asc', 'contact');
        }).toThrow(OrderByError);
      });

      it('deve lançar erro para direção inválida', () => {
        expect(() => {
          buildOrderBy('firstName', 'invalid', 'contact');
        }).toThrow(OrderByError);
      });

      it('deve lançar erro quando arrays têm tamanhos diferentes', () => {
        expect(() => {
          buildOrderBy(
            ['firstName', 'lastName'],
            ['asc'],
            'contact'
          );
        }).toThrow(OrderByError);
      });

      it('deve incluir código de erro correto', () => {
        try {
          buildOrderBy('invalidField', 'asc', 'contact');
          fail('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error).toBeInstanceOf(OrderByError);
          expect(error.code).toBe('INVALID_ORDER_FIELD');
          expect(error.statusCode).toBe(400);
        }
      });
    });

    describe('Sem entityType (sem validação de campo)', () => {
      it('deve permitir qualquer campo quando entityType não fornecido', () => {
        const result = buildOrderBy('anyField', 'asc', undefined);
        expect(result).toEqual({ anyField: 'asc' });
      });

      it('ainda deve validar direção mesmo sem entityType', () => {
        expect(() => {
          buildOrderBy('anyField', 'invalid', undefined);
        }).toThrow(OrderByError);
      });
    });
  });

  describe('processOrderByParams', () => {
    describe('Parâmetros novos (sortBy/sortOrder)', () => {
      it('deve processar sortBy e sortOrder simples', () => {
        const query = { sortBy: 'firstName', sortOrder: 'asc' };
        const result = processOrderByParams(query, 'contact');
        expect(result).toEqual({ firstName: 'asc' });
      });

      it('deve processar sortBy e sortOrder com vírgula (múltiplo)', () => {
        const query = {
          sortBy: 'companyId,firstName',
          sortOrder: 'asc,asc',
        };
        const result = processOrderByParams(query, 'contact');
        expect(result).toEqual([
          { companyId: 'asc' },
          { firstName: 'asc' },
        ]);
      });

      it('deve processar sortBy sem sortOrder (usa padrão)', () => {
        const query = { sortBy: 'firstName' };
        const result = processOrderByParams(query, 'contact');
        expect(result).toEqual({ firstName: 'asc' });
      });
    });

    describe('Parâmetros legados (orderBy/order)', () => {
      it('deve processar orderBy e order simples', () => {
        const query = { orderBy: 'firstName', order: 'asc' };
        const result = processOrderByParams(query, 'contact');
        expect(result).toEqual({ firstName: 'asc' });
      });

      it('deve processar orderBy sem order (usa padrão)', () => {
        const query = { orderBy: 'firstName' };
        const result = processOrderByParams(query, 'contact');
        expect(result).toEqual({ firstName: 'asc' });
      });
    });

    describe('Prioridade de parâmetros', () => {
      it('deve priorizar sortBy sobre orderBy', () => {
        const query = {
          sortBy: 'firstName',
          orderBy: 'lastName',
          sortOrder: 'asc',
          order: 'desc',
        };
        const result = processOrderByParams(query, 'contact');
        expect(result).toEqual({ firstName: 'asc' });
      });

      it('deve usar orderBy quando sortBy não fornecido', () => {
        const query = { orderBy: 'lastName', order: 'desc' };
        const result = processOrderByParams(query, 'contact');
        expect(result).toEqual({ lastName: 'desc' });
      });
    });

    describe('Processamento de arrays com vírgula', () => {
      it('deve processar string com vírgula como array', () => {
        const query = {
          sortBy: 'companyId,firstName',
          sortOrder: 'asc,desc',
        };
        const result = processOrderByParams(query, 'contact');
        expect(result).toEqual([
          { companyId: 'asc' },
          { firstName: 'desc' },
        ]);
      });

      it('deve remover espaços ao processar vírgulas', () => {
        const query = {
          sortBy: 'companyId, firstName',
          sortOrder: 'asc, desc',
        };
        const result = processOrderByParams(query, 'contact');
        expect(result).toEqual([
          { companyId: 'asc' },
          { firstName: 'desc' },
        ]);
      });
    });

    describe('Validações', () => {
      it('deve validar campos através de buildOrderBy', () => {
        const query = { sortBy: 'invalidField', sortOrder: 'asc' };
        expect(() => {
          processOrderByParams(query, 'contact');
        }).toThrow(OrderByError);
      });

      it('deve validar direções através de buildOrderBy', () => {
        const query = { sortBy: 'firstName', sortOrder: 'invalid' };
        expect(() => {
          processOrderByParams(query, 'contact');
        }).toThrow(OrderByError);
      });
    });

    describe('Sem parâmetros', () => {
      it('deve retornar ordenação padrão quando nenhum parâmetro fornecido', () => {
        const query = {};
        const result = processOrderByParams(query, 'contact');
        expect(result).toEqual({ createdAt: 'desc' });
      });
    });
  });
});
