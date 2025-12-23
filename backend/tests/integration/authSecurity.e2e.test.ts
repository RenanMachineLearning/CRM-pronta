/**
 * Testes E2E de Segurança de Autenticação
 * 
 * Testa cenários críticos de segurança em rotas protegidas reais.
 * 
 * Nota: Este arquivo não duplica testes existentes. Apenas adiciona cenários E2E
 * críticos que testam o comportamento final em rotas protegidas reais.
 * 
 * Testes já cobertos em outros arquivos:
 * - Brute force: rateLimiter.e2e.test.ts
 * - Isolamento multi-tenant: authMiddleware.integration.test.ts
 * - Tokens de reset expirados: passwordReset.e2e.test.ts
 */

import request from 'supertest';
import { app } from '../../src/index';
import { cleanDatabase, createTestTenant, createTestUser, closeDatabase } from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';
import * as jwt from 'jsonwebtoken';

describe('Auth Security - E2E Tests', () => {
  let tenantA: { id: string; slug: string };
  let userA: { id: string; email: string; password: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant A
    const tenantAObj = await createTestTenant({
      name: 'Auth Security Tenant A',
      slug: 'auth-security-tenant-a',
      status: 'ACTIVE',
    });
    tenantA = { id: tenantAObj.id, slug: tenantAObj.slug };

    // Criar usuário no tenant A
    const userAObj = await createTestUser({
      email: 'security@example.com',
      password: 'SecurityPass123',
      name: 'Security Test User',
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    userA = {
      id: userAObj.id,
      email: userAObj.email,
      password: 'SecurityPass123',
    };
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('Token Expiration (E2E em rotas protegidas)', () => {
    it('deve rejeitar token JWT expirado em rota protegida', async () => {
      // Criar token com expiração no passado
      const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
      const expiredPayload = {
        sub: userA.id,
        tenantId: tenantA.id,
        iat: Math.floor(Date.now() / 1000) - 3600, // 1 hora atrás
        exp: Math.floor(Date.now() / 1000) - 1800, // 30 minutos atrás (expirado)
      };
      
      const expiredToken = jwt.sign(expiredPayload, JWT_SECRET);

      // Tentar acessar rota protegida com token expirado
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${expiredToken}`)
        .set('X-Tenant-Id', tenantA.id);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token inválido');
      expect(response.body).toHaveProperty('message', 'Token expirado ou inválido');
    });

    it('deve rejeitar token JWT com expiração muito curta após expirar', async () => {
      // Criar token com expiração de 1 segundo
      const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
      const shortExpirationPayload = {
        sub: userA.id,
        tenantId: tenantA.id,
      };
      
      const shortToken = jwt.sign(shortExpirationPayload, JWT_SECRET, {
        expiresIn: '1s',
      });

      // Aguardar expiração (2 segundos para garantir)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Tentar acessar rota protegida com token expirado
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${shortToken}`)
        .set('X-Tenant-Id', tenantA.id);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token inválido');
      expect(response.body).toHaveProperty('message', 'Token expirado ou inválido');
    }, 10000); // Timeout de 10 segundos para aguardar expiração
  });

  describe('Token Manipulation (E2E em rotas protegidas)', () => {
    it('deve rejeitar token com assinatura inválida em rota protegida', async () => {
      // Gerar token válido
      const validToken = generateToken(userA.id, tenantA.id);
      
      // Modificar assinatura do token (alterar último caractere)
      const invalidToken = validToken.slice(0, -1) + 'X';

      // Tentar acessar rota protegida com token manipulado
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${invalidToken}`)
        .set('X-Tenant-Id', tenantA.id);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token inválido');
      expect(response.body).toHaveProperty('message', 'Token expirado ou inválido');
    });

    it('deve rejeitar token malformado em rota protegida', async () => {
      // Tokens malformados com Bearer (serão rejeitados pelo verifyToken)
      const malformedTokensWithBearer = [
        'not-a-valid-token',
        'header.payload',
        'header.payload.signature.extra',
        'header',
      ];

      for (const malformedToken of malformedTokensWithBearer) {
        const response = await request(app)
          .get('/api/test')
          .set('Authorization', `Bearer ${malformedToken}`)
          .set('X-Tenant-Id', tenantA.id);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token inválido');
        // Pode retornar "Token expirado ou inválido" (do verifyToken) ou outra mensagem de erro
        expect(response.body).toHaveProperty('message');
      }

      // Token vazio com Bearer (será rejeitado pelo middleware)
      const responseEmpty = await request(app)
        .get('/api/test')
        .set('Authorization', 'Bearer ')
        .set('X-Tenant-Id', tenantA.id);

      expect(responseEmpty.status).toBe(401);
      // Pode retornar "Token não fornecido" ou "Token inválido" dependendo da validação
      expect(['Token não fornecido', 'Token inválido']).toContain(responseEmpty.body.error);
    });

    it('deve rejeitar token sem campos obrigatórios em rota protegida', async () => {
      // Criar token sem sub (userId)
      const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
      const tokenWithoutSub = jwt.sign(
        { tenantId: tenantA.id }, // Sem 'sub'
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Tentar acessar rota protegida
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${tokenWithoutSub}`)
        .set('X-Tenant-Id', tenantA.id);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token inválido');
      expect(response.body).toHaveProperty('message', 'Token expirado ou inválido');
    });

    it('deve rejeitar token sem tenantId em rota protegida', async () => {
      // Criar token sem tenantId
      const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
      const tokenWithoutTenantId = jwt.sign(
        { sub: userA.id }, // Sem 'tenantId'
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Tentar acessar rota protegida
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${tokenWithoutTenantId}`)
        .set('X-Tenant-Id', tenantA.id);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token inválido');
      expect(response.body).toHaveProperty('message', 'Token expirado ou inválido');
    });
  });

  describe('Token Validation (E2E - comportamento final)', () => {
    it('deve aceitar token válido em rota protegida', async () => {
      // Gerar token válido
      const validToken = generateToken(userA.id, tenantA.id);

      // Acessar rota protegida com token válido
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Tenant-Id', tenantA.id);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Rota protegida');
      expect(response.body).toHaveProperty('tenantId', tenantA.id);
      expect(response.body).toHaveProperty('userId', userA.id);
    });

    it('deve rejeitar requisição sem token em rota protegida', async () => {
      // Tentar acessar rota protegida sem token
      const response = await request(app)
        .get('/api/test')
        .set('X-Tenant-Id', tenantA.id);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token não fornecido');
      expect(response.body).toHaveProperty('message', 'Forneça um token de autenticação no header Authorization');
    });

    it('deve rejeitar token com formato incorreto (sem Bearer)', async () => {
      const validToken = generateToken(userA.id, tenantA.id);

      // Tentar acessar sem prefixo Bearer
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', validToken) // Sem "Bearer "
        .set('X-Tenant-Id', tenantA.id);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token inválido');
      expect(response.body).toHaveProperty('message', 'Token deve estar no formato: Authorization: Bearer <token>');
    });
  });
});

