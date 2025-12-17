/**
 * Testes unitários para o middleware de contexto de tenant
 * Testa o middleware isoladamente, sem dependências HTTP
 */

import { Request, Response, NextFunction } from 'express';
import { tenantContextMiddleware } from '../../src/middleware/tenantContext';
import { TenantService } from '../../src/services/tenantService';

// Mock do TenantService
jest.mock('../../src/services/tenantService');

describe('Tenant Context Middleware - Unitário', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;

  beforeEach(() => {
    // Resetar mocks
    jest.clearAllMocks();

    // Mock do response
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    // Mock do next
    mockNext = jest.fn();

    // Mock do request
    mockRequest = {
      headers: {},
    };
  });

  describe('Extração de Tenant do Header', () => {
    it('deve extrair tenantId do header X-Tenant-Id', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTenant = {
        id: tenantId,
        name: 'Test Tenant',
        slug: 'test-tenant',
        status: 'ACTIVE' as const,
        subdomain: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (TenantService.validateById as jest.Mock).mockResolvedValue(mockTenant);
      mockRequest.headers = {
        'x-tenant-id': tenantId,
      };

      await tenantContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(TenantService.validateById).toHaveBeenCalledWith(tenantId);
      expect(TenantService.validateById).toHaveBeenCalledTimes(1);
      expect(mockRequest.tenantId).toBe(tenantId);
      expect(mockRequest.tenant).toEqual(mockTenant);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('deve extrair tenantSlug do header X-Tenant-Slug', async () => {
      const tenantSlug = 'test-tenant';
      const mockTenant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Tenant',
        slug: tenantSlug,
        status: 'ACTIVE' as const,
        subdomain: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (TenantService.validateBySlug as jest.Mock).mockResolvedValue(mockTenant);
      mockRequest.headers = {
        'x-tenant-slug': tenantSlug,
      };

      await tenantContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(TenantService.validateBySlug).toHaveBeenCalledWith(tenantSlug);
      expect(TenantService.validateBySlug).toHaveBeenCalledTimes(1);
      expect(mockRequest.tenantId).toBe(mockTenant.id);
      expect(mockRequest.tenant).toEqual(mockTenant);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('deve priorizar X-Tenant-Id sobre X-Tenant-Slug quando ambos estão presentes', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const tenantSlug = 'other-slug';
      const mockTenant = {
        id: tenantId,
        name: 'Test Tenant',
        slug: 'test-tenant',
        status: 'ACTIVE' as const,
        subdomain: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (TenantService.validateById as jest.Mock).mockResolvedValue(mockTenant);
      mockRequest.headers = {
        'x-tenant-id': tenantId,
        'x-tenant-slug': tenantSlug,
      };

      await tenantContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(TenantService.validateById).toHaveBeenCalledWith(tenantId);
      expect(TenantService.validateById).toHaveBeenCalledTimes(1);
      expect(TenantService.validateBySlug).not.toHaveBeenCalled();
      expect(mockRequest.tenantId).toBe(tenantId);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validação de Tenant', () => {
    it('deve retornar 400 quando nenhum header de tenant é fornecido', async () => {
      mockRequest.headers = {};

      await tenantContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Tenant não identificado',
        message: 'Forneça X-Tenant-Id ou X-Tenant-Slug no header',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(TenantService.validateById).not.toHaveBeenCalled();
      expect(TenantService.validateBySlug).not.toHaveBeenCalled();
    });

    it('deve retornar 403 quando tenant não é encontrado', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      (TenantService.validateById as jest.Mock).mockResolvedValue(null);
      mockRequest.headers = {
        'x-tenant-id': tenantId,
      };

      await tenantContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(TenantService.validateById).toHaveBeenCalledWith(tenantId);
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Acesso negado',
        message: 'Tenant inválido ou inativo',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve retornar 403 quando tenant está inativo (SUSPENDED)', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      (TenantService.validateById as jest.Mock).mockResolvedValue(null); // validateById retorna null para inativo
      mockRequest.headers = {
        'x-tenant-id': tenantId,
      };

      await tenantContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Acesso negado',
        message: 'Tenant inválido ou inativo',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve retornar 403 quando tenant slug não é encontrado', async () => {
      const tenantSlug = 'inexistente';
      (TenantService.validateBySlug as jest.Mock).mockResolvedValue(null);
      mockRequest.headers = {
        'x-tenant-slug': tenantSlug,
      };

      await tenantContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(TenantService.validateBySlug).toHaveBeenCalledWith(tenantSlug);
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Acesso negado',
        message: 'Tenant inválido ou inativo',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Adição de Tenant ao Request', () => {
    it('deve adicionar tenantId e tenant ao request quando válido', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const mockTenant = {
        id: tenantId,
        name: 'Test Tenant',
        slug: 'test-tenant',
        status: 'ACTIVE' as const,
        subdomain: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (TenantService.validateById as jest.Mock).mockResolvedValue(mockTenant);
      mockRequest.headers = {
        'x-tenant-id': tenantId,
      };

      await tenantContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.tenantId).toBe(tenantId);
      expect(mockRequest.tenant).toEqual(mockTenant);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve retornar 500 quando ocorre erro no TenantService', async () => {
      const tenantId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new Error('Database connection error');
      (TenantService.validateById as jest.Mock).mockRejectedValue(error);
      mockRequest.headers = {
        'x-tenant-id': tenantId,
      };

      // Mock do console.error para não poluir os logs
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await tenantContextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Erro interno do servidor',
        message: 'Falha ao processar contexto de tenant',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Erro no middleware de tenant:',
        error
      );

      consoleSpy.mockRestore();
    });
  });
});

