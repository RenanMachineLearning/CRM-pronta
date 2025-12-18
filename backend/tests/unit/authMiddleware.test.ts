/**
 * Testes unitários para o middleware de autenticação
 * Testa o middleware isoladamente, sem dependências HTTP
 */

import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { verifyToken } from '../../src/utils/jwt';

// Mock do verifyToken
jest.mock('../../src/utils/jwt', () => ({
  verifyToken: jest.fn(),
  generateToken: jest.fn(),
}));

describe('Auth Middleware - Unitário', () => {
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
      tenantId: 'tenant-123', // Simular que tenant context já rodou
    };
  });

  describe('Extração de Token', () => {
    it('deve extrair token do header Authorization: Bearer <token>', async () => {
      const token = 'valid-token-123';
      const decoded = { userId: 'user-123', tenantId: 'tenant-123' };
      
      (verifyToken as jest.Mock).mockReturnValue(decoded);
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(verifyToken).toHaveBeenCalledWith(token);
      expect(mockRequest.userId).toBe(decoded.userId);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('deve funcionar com "bearer" (case-insensitive)', async () => {
      const token = 'valid-token-123';
      const decoded = { userId: 'user-123', tenantId: 'tenant-123' };
      
      (verifyToken as jest.Mock).mockReturnValue(decoded);
      mockRequest.headers = {
        authorization: `bearer ${token}`, // lowercase
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(verifyToken).toHaveBeenCalledWith(token);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('deve retornar 401 se header Authorization não for fornecido', async () => {
      mockRequest.headers = {};

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Token não fornecido',
        message: 'Forneça um token de autenticação no header Authorization',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(verifyToken).not.toHaveBeenCalled();
    });

    it('deve retornar 401 se token não começar com "Bearer "', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token-123',
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Token inválido',
        message: 'Token deve estar no formato: Authorization: Bearer <token>',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(verifyToken).not.toHaveBeenCalled();
    });

    it('deve retornar 401 se token estiver vazio após "Bearer "', async () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Token não fornecido',
        message: 'Token não pode estar vazio',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(verifyToken).not.toHaveBeenCalled();
    });
  });

  describe('Validação de Token', () => {
    it('deve validar token válido e adicionar userId ao request', async () => {
      const token = 'valid-token-123';
      const decoded = { userId: 'user-123', tenantId: 'tenant-123' };
      
      (verifyToken as jest.Mock).mockReturnValue(decoded);
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(verifyToken).toHaveBeenCalledWith(token);
      expect(mockRequest.userId).toBe(decoded.userId);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('deve retornar 401 se token for inválido', async () => {
      const token = 'invalid-token';
      
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token inválido');
      });
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Token inválido',
        message: 'Token expirado ou inválido',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve retornar 401 se token estiver expirado', async () => {
      const token = 'expired-token';
      
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token expirado');
      });
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Token inválido',
        message: 'Token expirado ou inválido',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve retornar 401 se token for malformado', async () => {
      const token = 'malformed-token';
      
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token malformado');
      });
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Validação de TenantId', () => {
    it('deve validar que tenantId do token corresponde a req.tenantId', async () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-123', tenantId: 'tenant-123' };
      
      (verifyToken as jest.Mock).mockReturnValue(decoded);
      mockRequest.tenantId = 'tenant-123'; // Mesmo tenant
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('deve retornar 400 se req.tenantId não existir (tenant context não rodou)', async () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-123', tenantId: 'tenant-123' };
      
      (verifyToken as jest.Mock).mockReturnValue(decoded);
      mockRequest.tenantId = undefined; // Tenant context não rodou
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Contexto de tenant ausente',
        message: 'Tenant context deve ser processado antes da autenticação',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve retornar 403 se tenantId do token for diferente de req.tenantId', async () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-123', tenantId: 'tenant-A' };
      
      (verifyToken as jest.Mock).mockReturnValue(decoded);
      mockRequest.tenantId = 'tenant-B'; // Tenant diferente
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Acesso negado',
        message: 'Token não autorizado para este tenant',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve passar se tenantId do token corresponder a req.tenantId', async () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-123', tenantId: 'tenant-456' };
      
      (verifyToken as jest.Mock).mockReturnValue(decoded);
      mockRequest.tenantId = 'tenant-456'; // Mesmo tenant
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });

  describe('Adição ao Request', () => {
    it('deve adicionar userId ao request quando token é válido', async () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-789', tenantId: 'tenant-123' };
      
      (verifyToken as jest.Mock).mockReturnValue(decoded);
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.userId).toBe('user-789');
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('deve manter tenantId do request (não sobrescrever)', async () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-123', tenantId: 'tenant-123' };
      
      (verifyToken as jest.Mock).mockReturnValue(decoded);
      mockRequest.tenantId = 'tenant-123';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // tenantId deve permanecer o mesmo (não sobrescrito)
      expect(mockRequest.tenantId).toBe('tenant-123');
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('deve chamar next() quando tudo está válido', async () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-123', tenantId: 'tenant-123' };
      
      (verifyToken as jest.Mock).mockReturnValue(decoded);
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve retornar 500 quando ocorre erro inesperado', async () => {
      const token = 'valid-token';
      
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Erro inesperado');
      });
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      // Mock do console.error para não poluir os logs
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401); // Erro na validação retorna 401
      expect(mockNext).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});

