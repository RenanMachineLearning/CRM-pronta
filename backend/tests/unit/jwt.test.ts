/**
 * Testes unitários para utilitário de geração e validação de tokens JWT
 * Testa as funções generateToken e verifyToken isoladamente
 */

import * as jwt from 'jsonwebtoken';
import { generateToken, verifyToken } from '../../src/utils/jwt';

// Mock das variáveis de ambiente antes de importar o módulo
const originalEnv = process.env;

describe('JWT Utils', () => {
  // Configurar variáveis de ambiente para os testes
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret-key-for-jwt-tests-minimum-32-chars',
      JWT_EXPIRES_IN: '1h', // Usar 1 hora para testes mais rápidos
    };
  });

  // Restaurar variáveis de ambiente após os testes
  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateToken', () => {
    it('deve gerar token válido com userId e tenantId', () => {
      const userId = 'user-123';
      const tenantId = 'tenant-456';
      const token = generateToken(userId, tenantId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('token gerado deve ser uma string não vazia', () => {
      const token = generateToken('user-123', 'tenant-456');
      
      expect(token).toBeTruthy();
      expect(token.trim().length).toBeGreaterThan(0);
    });

    it('token gerado deve ter 3 partes separadas por ponto (header.payload.signature)', () => {
      const token = generateToken('user-123', 'tenant-456');
      const parts = token.split('.');
      
      expect(parts.length).toBe(3);
      expect(parts[0]).toBeTruthy(); // header
      expect(parts[1]).toBeTruthy(); // payload
      expect(parts[2]).toBeTruthy(); // signature
    });

    it('deve lançar erro se userId for vazio', () => {
      expect(() => generateToken('', 'tenant-456')).toThrow('userId não pode ser vazio');
      expect(() => generateToken('   ', 'tenant-456')).toThrow('userId não pode ser vazio');
    });

    it('deve lançar erro se tenantId for vazio', () => {
      expect(() => generateToken('user-123', '')).toThrow('tenantId não pode ser vazio');
      expect(() => generateToken('user-123', '   ')).toThrow('tenantId não pode ser vazio');
    });

    it('payload do token deve conter sub, tenantId, iat, exp', () => {
      const userId = 'user-123';
      const tenantId = 'tenant-456';
      const token = generateToken(userId, tenantId);
      
      // Decodificar token sem validar (apenas para inspecionar payload)
      const decoded = jwt.decode(token) as any;
      
      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(userId);
      expect(decoded.tenantId).toBe(tenantId);
      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.iat).toBe('number');
      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe('number');
    });

    it('sub deve corresponder ao userId fornecido', () => {
      const userId = 'user-789';
      const token = generateToken(userId, 'tenant-456');
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.sub).toBe(userId);
    });

    it('tenantId deve corresponder ao tenantId fornecido', () => {
      const tenantId = 'tenant-999';
      const token = generateToken('user-123', tenantId);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.tenantId).toBe(tenantId);
    });
  });

  describe('verifyToken', () => {
    it('deve validar token válido e retornar userId e tenantId corretos', () => {
      const userId = 'user-123';
      const tenantId = 'tenant-456';
      const token = generateToken(userId, tenantId);
      
      const result = verifyToken(token);
      
      expect(result.userId).toBe(userId);
      expect(result.tenantId).toBe(tenantId);
    });

    it('deve rejeitar token expirado', () => {
      // Criar token com expiração no passado
      const payload = {
        sub: 'user-123',
        tenantId: 'tenant-456',
        iat: Math.floor(Date.now() / 1000) - 3600, // 1 hora atrás
        exp: Math.floor(Date.now() / 1000) - 1800, // 30 minutos atrás (expirado)
      };
      
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET!);
      
      expect(() => verifyToken(expiredToken)).toThrow('Token expirado');
    });

    it('deve rejeitar token com assinatura inválida', () => {
      const userId = 'user-123';
      const tenantId = 'tenant-456';
      const validToken = generateToken(userId, tenantId);
      
      // Modificar o token (alterar um caractere na assinatura)
      const invalidToken = validToken.slice(0, -1) + 'X';
      
      expect(() => verifyToken(invalidToken)).toThrow('Token inválido');
    });

    it('deve rejeitar token malformado (string inválida)', () => {
      expect(() => verifyToken('not-a-valid-token')).toThrow('Token inválido');
      expect(() => verifyToken('header.payload')).toThrow('Token inválido');
      expect(() => verifyToken('header.payload.signature.extra')).toThrow('Token inválido');
    });

    it('deve rejeitar token sem sub (userId)', () => {
      // Criar token sem campo 'sub'
      const payload = {
        tenantId: 'tenant-456',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      
      const tokenWithoutSub = jwt.sign(payload, process.env.JWT_SECRET!);
      
      expect(() => verifyToken(tokenWithoutSub)).toThrow('campo "sub" (userId) ausente');
    });

    it('deve rejeitar token sem tenantId', () => {
      // Criar token sem campo 'tenantId'
      const payload = {
        sub: 'user-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      
      const tokenWithoutTenantId = jwt.sign(payload, process.env.JWT_SECRET!);
      
      expect(() => verifyToken(tokenWithoutTenantId)).toThrow('campo "tenantId" ausente');
    });

    it('deve rejeitar token vazio', () => {
      expect(() => verifyToken('')).toThrow('Token não pode ser vazio');
      expect(() => verifyToken('   ')).toThrow('Token não pode ser vazio');
    });

    it('deve lançar erro específico para token expirado', () => {
      const payload = {
        sub: 'user-123',
        tenantId: 'tenant-456',
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) - 1800,
      };
      
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET!);
      
      try {
        verifyToken(expiredToken);
        // Se não lançou erro, o teste falha
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toBe('Token expirado');
      }
    });

    it('deve lançar erro específico para token inválido', () => {
      const validToken = generateToken('user-123', 'tenant-456');
      const invalidToken = validToken.slice(0, -1) + 'X';
      
      try {
        verifyToken(invalidToken);
        // Se não lançou erro, o teste falha
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toBe('Token inválido');
      }
    });
  });

  describe('Integração generateToken + verifyToken', () => {
    it('token gerado deve ser validado corretamente', () => {
      const userId = 'user-123';
      const tenantId = 'tenant-456';
      const token = generateToken(userId, tenantId);
      
      const result = verifyToken(token);
      
      expect(result.userId).toBe(userId);
      expect(result.tenantId).toBe(tenantId);
    });

    it('userId e tenantId devem ser preservados no ciclo gerar → validar', () => {
      const userId = 'user-789';
      const tenantId = 'tenant-999';
      
      const token = generateToken(userId, tenantId);
      const result = verifyToken(token);
      
      expect(result.userId).toBe(userId);
      expect(result.tenantId).toBe(tenantId);
    });

    it('tokens diferentes gerados para mesmo userId/tenantId devem ser válidos (iat diferente)', async () => {
      const userId = 'user-123';
      const tenantId = 'tenant-456';
      
      const token1 = generateToken(userId, tenantId);
      // Aguardar um pouco para garantir iat diferente (JWT usa segundos, então 1 segundo é suficiente)
      await new Promise(resolve => setTimeout(resolve, 1100));
      const token2 = generateToken(userId, tenantId);
      
      // Ambos os tokens devem ser válidos
      const result1 = verifyToken(token1);
      const result2 = verifyToken(token2);
      
      expect(result1.userId).toBe(userId);
      expect(result1.tenantId).toBe(tenantId);
      expect(result2.userId).toBe(userId);
      expect(result2.tenantId).toBe(tenantId);
      
      // Tokens devem ser diferentes (iat diferente)
      expect(token1).not.toBe(token2);
    }, 15000); // Timeout de 15 segundos para este teste
  });
});

