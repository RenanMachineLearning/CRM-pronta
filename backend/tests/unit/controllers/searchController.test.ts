/**
 * Testes unitários para SearchController
 * 
 * Testa lógica do controller de busca isoladamente, focando em
 * validação de parâmetros, tratamento de erros e formatação de respostas.
 */

import { Request, Response } from 'express';
import { searchGlobal } from '../../../src/controllers/searchController';
import { SearchService } from '../../../src/services/searchService';

// Mock do SearchService
jest.mock('../../../src/services/searchService');

describe('SearchController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      tenantId: 'test-tenant-id',
      userId: 'test-user-id',
      query: {
        q: 'test',
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('searchGlobal', () => {
    it('deve chamar SearchService.searchGlobal com parâmetros corretos', async () => {
      const mockSearchResult = {
        query: 'test',
        timestamp: new Date().toISOString(),
        results: {
          contacts: [],
          companies: [],
          leads: [],
          opportunities: [],
        },
        totals: {
          contacts: 0,
          companies: 0,
          leads: 0,
          opportunities: 0,
        },
      };

      (SearchService.searchGlobal as jest.Mock).mockResolvedValue(mockSearchResult);

      await searchGlobal(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(SearchService.searchGlobal).toHaveBeenCalledWith(
        { query: 'test' },
        'test-tenant-id',
        'test-user-id'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockSearchResult);
    });

    it('deve tratar erro do SearchService', async () => {
      const error = new Error('Search failed');
      (SearchService.searchGlobal as jest.Mock).mockRejectedValue(error);

      await searchGlobal(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('deve validar parâmetros de query', async () => {
      mockRequest.query = {
        q: 'test',
        entities: ['contact', 'company'],
        limit: '10',
      };

      const mockSearchResult = {
        query: 'test',
        timestamp: new Date().toISOString(),
        results: {
          contacts: [],
          companies: [],
          leads: [],
          opportunities: [],
        },
        totals: {
          contacts: 0,
          companies: 0,
          leads: 0,
          opportunities: 0,
        },
      };

      (SearchService.searchGlobal as jest.Mock).mockResolvedValue(mockSearchResult);

      await searchGlobal(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(SearchService.searchGlobal).toHaveBeenCalledWith(
        {
          query: 'test',
          entities: ['contact', 'company'],
          limit: 10,
        },
        'test-tenant-id',
        'test-user-id'
      );
    });

    it('deve tratar query vazia', async () => {
      mockRequest.query = {
        q: '',
      };

      await searchGlobal(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Deve chamar SearchService mesmo com query vazia (service valida)
      expect(SearchService.searchGlobal).toHaveBeenCalled();
    });
  });
});
