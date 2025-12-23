/**
 * Testes unitários para middleware de autorização ACL
 * 
 * Testa o middleware de autorização isoladamente.
 */

import { Request, Response, NextFunction } from 'express';
import { authorizationMiddleware } from '../../src/middleware/authorizationMiddleware';
import { checkPermission } from '../../src/utils/permissions';

// Mock do checkPermission
jest.mock('../../src/utils/permissions', () => ({
  checkPermission: jest.fn(),
}));

const mockedCheckPermission = checkPermission as jest.MockedFunction<typeof checkPermission>;

describe('Authorization Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request
    mockRequest = {
      userId: 'user-123',
      tenantId: 'tenant-456',
    };

    // Mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock next
    mockNext = jest.fn();
  });

  it('Deve permitir acesso quando usuário tem permissão', async () => {
    mockedCheckPermission.mockResolvedValue(true);

    const middleware = authorizationMiddleware('User', 'read');
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockedCheckPermission).toHaveBeenCalledWith('user-123', 'tenant-456', 'User', 'read', undefined);
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('Deve negar acesso quando usuário não tem permissão', async () => {
    mockedCheckPermission.mockResolvedValue(false);

    const middleware = authorizationMiddleware('User', 'create');
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockedCheckPermission).toHaveBeenCalledWith('user-123', 'tenant-456', 'User', 'create', undefined);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Acesso negado',
      message: 'Você não tem permissão para realizar esta ação',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('Deve retornar 401 quando userId não está presente', async () => {
    mockRequest.userId = undefined;

    const middleware = authorizationMiddleware('User', 'read');
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Não autenticado',
      message: 'Token de autenticação necessário',
    });
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockedCheckPermission).not.toHaveBeenCalled();
  });

  it('Deve retornar 401 quando tenantId não está presente', async () => {
    mockRequest.tenantId = undefined;

    const middleware = authorizationMiddleware('User', 'read');
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Não autenticado',
      message: 'Token de autenticação necessário',
    });
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockedCheckPermission).not.toHaveBeenCalled();
  });

  it('Deve suportar permissões por campo', async () => {
    mockedCheckPermission.mockResolvedValue(true);

    const middleware = authorizationMiddleware('User', 'read', 'email');
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockedCheckPermission).toHaveBeenCalledWith('user-123', 'tenant-456', 'User', 'read', 'email');
    expect(mockNext).toHaveBeenCalled();
  });

  it('Deve retornar 500 quando ocorre erro na verificação de permissão', async () => {
    const error = new Error('Database error');
    mockedCheckPermission.mockRejectedValue(error);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const middleware = authorizationMiddleware('User', 'read');
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Erro interno do servidor',
      message: 'Falha ao verificar permissão',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Erro ao verificar permissão:', error);
    expect(mockNext).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('Deve funcionar com diferentes entidades e ações', async () => {
    mockedCheckPermission.mockResolvedValue(true);

    const middleware = authorizationMiddleware('Role', 'update');
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockedCheckPermission).toHaveBeenCalledWith('user-123', 'tenant-456', 'Role', 'update', undefined);
    expect(mockNext).toHaveBeenCalled();
  });
});

