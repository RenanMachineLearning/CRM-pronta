/**
 * Testes unitários para paginationHelper
 */

import {
  processPaginationParams,
  PaginationError,
} from '../../src/utils/paginationHelper';

describe('paginationHelper', () => {
  describe('processPaginationParams', () => {
    describe('Paginação com page/limit', () => {
      it('deve processar page e limit corretamente', () => {
        const query = { page: '2', limit: '10' };
        const result = processPaginationParams(query);

        expect(result).toEqual({
          skip: 10,
          take: 10,
          page: 2,
          limit: 10,
        });
      });

      it('deve usar valores padrão quando não especificados', () => {
        const query = {};
        const result = processPaginationParams(query);

        expect(result).toEqual({
          skip: 0,
          take: 20,
          page: 1,
          limit: 20,
        });
      });

      it('deve usar defaultLimit customizado', () => {
        const query = {};
        const result = processPaginationParams(query, 50);

        expect(result).toEqual({
          skip: 0,
          take: 50,
          page: 1,
          limit: 50,
        });
      });

      it('deve calcular skip corretamente para diferentes páginas', () => {
        expect(processPaginationParams({ page: '1', limit: '20' }).skip).toBe(0);
        expect(processPaginationParams({ page: '2', limit: '20' }).skip).toBe(20);
        expect(processPaginationParams({ page: '3', limit: '20' }).skip).toBe(40);
        expect(processPaginationParams({ page: '5', limit: '10' }).skip).toBe(40);
      });
    });

    describe('Paginação com offset (legado)', () => {
      it('deve processar offset e limit corretamente', () => {
        const query = { offset: '20', limit: '10' };
        const result = processPaginationParams(query);

        expect(result).toEqual({
          skip: 20,
          take: 10,
          page: 3, // Math.floor(20 / 10) + 1
          limit: 10,
        });
      });

      it('deve calcular page a partir do offset', () => {
        expect(processPaginationParams({ offset: '0', limit: '20' }).page).toBe(1);
        expect(processPaginationParams({ offset: '20', limit: '20' }).page).toBe(2);
        expect(processPaginationParams({ offset: '40', limit: '20' }).page).toBe(3);
        expect(processPaginationParams({ offset: '25', limit: '10' }).page).toBe(3);
      });
    });

    describe('Priorização de page sobre offset', () => {
      it('deve priorizar page quando ambos page e offset fornecidos', () => {
        const query = { page: '2', offset: '50', limit: '10' };
        const result = processPaginationParams(query);

        expect(result).toEqual({
          skip: 10, // (2 - 1) * 10, não 50
          take: 10,
          page: 2,
          limit: 10,
        });
      });
    });

    describe('Limite máximo', () => {
      it('deve limitar limit a 100 quando exceder', () => {
        const query = { page: '1', limit: '200' };
        const result = processPaginationParams(query);

        expect(result.limit).toBe(100);
        expect(result.take).toBe(100);
      });

      it('deve aceitar limit até 100', () => {
        const query = { page: '1', limit: '100' };
        const result = processPaginationParams(query);

        expect(result.limit).toBe(100);
      });
    });

    describe('Validações e erros', () => {
      it('deve lançar erro para page inválida (menor que 1)', () => {
        expect(() => {
          processPaginationParams({ page: '0' });
        }).toThrow(PaginationError);

        expect(() => {
          processPaginationParams({ page: '-1' });
        }).toThrow(PaginationError);
      });

      it('deve lançar erro para page não numérica', () => {
        expect(() => {
          processPaginationParams({ page: 'abc' });
        }).toThrow(PaginationError);

        // parseInt('1.5') retorna 1, então não lança erro
        // A função aceita valores que podem ser convertidos para inteiro
        const result = processPaginationParams({ page: '1.5' });
        expect(result.page).toBe(1); // parseInt('1.5') = 1
      });

      it('deve lançar erro para limit inválido (menor que 1)', () => {
        expect(() => {
          processPaginationParams({ limit: '0' });
        }).toThrow(PaginationError);

        expect(() => {
          processPaginationParams({ limit: '-1' });
        }).toThrow(PaginationError);
      });

      it('deve lançar erro para limit não numérico', () => {
        expect(() => {
          processPaginationParams({ limit: 'abc' });
        }).toThrow(PaginationError);
      });

      it('deve lançar erro para offset inválido (menor que 0)', () => {
        expect(() => {
          processPaginationParams({ offset: '-1' });
        }).toThrow(PaginationError);
      });

      it('deve lançar erro para offset não numérico', () => {
        expect(() => {
          processPaginationParams({ offset: 'abc' });
        }).toThrow(PaginationError);
      });

      it('deve incluir código de erro correto', () => {
        try {
          processPaginationParams({ page: '0' });
          fail('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error).toBeInstanceOf(PaginationError);
          expect(error.code).toBe('INVALID_PAGE');
          expect(error.statusCode).toBe(400);
        }
      });
    });

    describe('Casos especiais', () => {
      it('deve processar page como string numérica', () => {
        const result = processPaginationParams({ page: '3', limit: '15' });
        expect(result.page).toBe(3);
        expect(result.skip).toBe(30);
      });

      it('deve processar limit como string numérica', () => {
        const result = processPaginationParams({ limit: '25' });
        expect(result.limit).toBe(25);
        expect(result.take).toBe(25);
      });

      it('deve processar offset como string numérica', () => {
        const result = processPaginationParams({ offset: '30', limit: '10' });
        expect(result.skip).toBe(30);
        expect(result.page).toBe(4);
      });

      it('deve calcular page corretamente quando offset não é múltiplo de limit', () => {
        const result = processPaginationParams({ offset: '25', limit: '10' });
        expect(result.skip).toBe(25);
        expect(result.page).toBe(3); // Math.floor(25 / 10) + 1
      });
    });
  });
});
