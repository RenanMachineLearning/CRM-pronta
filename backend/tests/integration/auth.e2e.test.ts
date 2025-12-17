/**
 * Testes E2E para endpoints de autenticação
 * 
 * Valida fluxo completo de login, logout e refresh token
 */

import request from 'supertest';
import { app } from '../../src/index';
import { cleanDatabase, createTestTenant, createTestUser, closeDatabase } from '../helpers/db';
import { verifyToken } from '../../src/utils/jwt';

describe('Auth Endpoints - E2E Tests', () => {
  let activeTenant: { id: string; slug: string };
  let testUser: { id: string; email: string; password: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant ativo
    const tenant = await createTestTenant({
      name: 'Auth Test Tenant',
      slug: 'auth-test-tenant',
      status: 'ACTIVE',
    });

    activeTenant = { id: tenant.id, slug: tenant.slug };

    // Criar usuário de teste
    const user = await createTestUser({
      email: 'test@example.com',
      password: 'TestPassword123',
      name: 'Test User',
      tenantId: tenant.id,
      status: 'ACTIVE',
    });

    testUser = {
      id: user.id,
      email: user.email,
      password: 'TestPassword123', // Senha em texto plano para testes
    };
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('POST /api/auth/login', () => {
    it('deve retornar token quando credenciais são válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Id', activeTenant.id)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
    });

    it('deve retornar 401 quando senha está incorreta', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Id', activeTenant.id)
        .send({
          email: testUser.email,
          password: 'WrongPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
      expect(response.body).toHaveProperty('message', 'Email ou senha incorretos');
    });

    it('deve retornar 401 quando email não existe (sem revelar)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Id', activeTenant.id)
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
      expect(response.body).toHaveProperty('message', 'Email ou senha incorretos');
      // Não deve revelar que email não existe
    });

    it('deve retornar 400 quando email não é fornecido', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Id', activeTenant.id)
        .send({
          password: testUser.password,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email é obrigatório');
    });

    it('deve retornar 400 quando password não é fornecido', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Id', activeTenant.id)
        .send({
          email: testUser.email,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Senha é obrigatória');
    });

    it('deve retornar 401 quando usuário está inativo (BLOCKED)', async () => {
      // Criar usuário bloqueado
      const blockedUser = await createTestUser({
        email: 'blocked@example.com',
        password: 'BlockedPassword123',
        name: 'Blocked User',
        tenantId: activeTenant.id,
        status: 'BLOCKED',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Id', activeTenant.id)
        .send({
          email: blockedUser.email,
          password: 'BlockedPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
    });

    it('deve retornar 401 quando usuário está inativo (INACTIVE)', async () => {
      // Criar usuário inativo
      const inactiveUser = await createTestUser({
        email: 'inactive@example.com',
        password: 'InactivePassword123',
        name: 'Inactive User',
        tenantId: activeTenant.id,
        status: 'INACTIVE',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Id', activeTenant.id)
        .send({
          email: inactiveUser.email,
          password: 'InactivePassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
    });

    it('deve retornar 403 quando tenant não existe', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Id', '00000000-0000-0000-0000-000000000000')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Acesso negado');
      expect(response.body).toHaveProperty('message', 'Tenant inválido ou inativo');
    });

    it('deve retornar 400 quando tenant não é fornecido', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Tenant não identificado');
    });

    it('token retornado deve ser válido (pode ser verificado com verifyToken)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Id', activeTenant.id)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      const token = response.body.token;

      // Verificar que token é válido
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.tenantId).toBe(activeTenant.id);
    });

    it('token retornado deve conter userId e tenantId corretos', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Id', activeTenant.id)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      const token = response.body.token;

      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.tenantId).toBe(activeTenant.id);
    });

    it('deve funcionar com X-Tenant-Slug ao invés de X-Tenant-Id', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Slug', activeTenant.slug)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('deve retornar 200 com mensagem de sucesso', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logout realizado com sucesso');
    });

    it('não precisa validar token (stateless na V1)', async () => {
      // Logout funciona sem token na V1 (stateless)
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('deve retornar 501 (não implementado na V1)', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(501);
      expect(response.body).toHaveProperty('error', 'Não implementado');
      expect(response.body).toHaveProperty('message', 'Refresh token será implementado na V2');
    });
  });
});

