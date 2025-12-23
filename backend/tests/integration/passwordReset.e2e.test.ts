/**
 * Testes E2E para recuperação e reset de senha
 * 
 * Valida fluxo completo de forgot-password e reset-password
 */

import request from 'supertest';
import { app } from '../../src/index';
import { cleanDatabase, createTestTenant, createTestUser, closeDatabase, prisma } from '../helpers/db';
import { PasswordResetService } from '../../src/services/passwordResetService';
import { comparePassword } from '../../src/utils/password';

describe('Password Reset - E2E Tests', () => {
  let tenantA: { id: string; slug: string };
  let tenantB: { id: string; slug: string };
  let userA: { id: string; email: string; password: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant A
    const tenantAObj = await createTestTenant({
      name: 'Password Reset Tenant A',
      slug: 'password-reset-tenant-a',
      status: 'ACTIVE',
    });
    tenantA = { id: tenantAObj.id, slug: tenantAObj.slug };

    // Criar tenant B
    const tenantBObj = await createTestTenant({
      name: 'Password Reset Tenant B',
      slug: 'password-reset-tenant-b',
      status: 'ACTIVE',
    });
    tenantB = { id: tenantBObj.id, slug: tenantBObj.slug };

    // Criar usuário no tenant A
    const userAObj = await createTestUser({
      email: 'usera@example.com',
      password: 'Password123',
      name: 'User A',
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    userA = {
      id: userAObj.id,
      email: userAObj.email,
      password: 'Password123',
    };

    // Criar usuário no tenant B (para testes de isolamento)
    await createTestUser({
      email: 'userb@example.com',
      password: 'Password123',
      name: 'User B',
      tenantId: tenantB.id,
      status: 'ACTIVE',
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('POST /api/auth/forgot-password', () => {
    it('deve gerar token quando email existe', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({ email: userA.email });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verificar que token foi criado no banco
      const tokens = await prisma.passwordResetToken.findMany({
        where: {
          userId: userA.id,
          tenantId: tenantA.id,
        },
      });

      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].usedAt).toBeNull();
    });

    it('deve retornar sucesso mesmo se email não existe (não revelar)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      // Não deve revelar que email não existe
    });

    it('deve invalidar tokens anteriores do mesmo usuário', async () => {
      // Gerar primeiro token
      const token1 = await PasswordResetService.generateResetToken(
        userA.id,
        tenantA.id
      );

      // Gerar segundo token (deve invalidar o primeiro)
      const token2 = await PasswordResetService.generateResetToken(
        userA.id,
        tenantA.id
      );

      // Verificar que token1 foi invalidado
      const token1Data = await prisma.passwordResetToken.findUnique({
        where: { token: token1 },
      });

      expect(token1Data?.usedAt).not.toBeNull();

      // Verificar que token2 está ativo
      const token2Data = await prisma.passwordResetToken.findUnique({
        where: { token: token2 },
      });

      expect(token2Data?.usedAt).toBeNull();
    });

    it('deve funcionar apenas para usuários ativos', async () => {
      // Criar usuário inativo
      const inactiveUser = await createTestUser({
        email: 'inactive@example.com',
        password: 'Password123',
        name: 'Inactive User',
        tenantId: tenantA.id,
        status: 'INACTIVE',
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({ email: inactiveUser.email });

      // Deve retornar sucesso (não revelar que usuário está inativo)
      expect(response.status).toBe(200);

      // Mas não deve gerar token
      const tokens = await prisma.passwordResetToken.findMany({
        where: {
          userId: inactiveUser.id,
          tenantId: tenantA.id,
        },
      });

      expect(tokens.length).toBe(0);
    });

    it('deve respeitar isolamento multi-tenant', async () => {
      // Solicitar reset para userA no contexto de tenantA
      await request(app)
        .post('/api/auth/forgot-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({ email: userA.email });

      // Verificar que token foi criado apenas no tenantA
      const tokensTenantA = await prisma.passwordResetToken.findMany({
        where: {
          userId: userA.id,
          tenantId: tenantA.id,
        },
      });

      const tokensTenantB = await prisma.passwordResetToken.findMany({
        where: {
          userId: userA.id,
          tenantId: tenantB.id,
        },
      });

      expect(tokensTenantA.length).toBeGreaterThan(0);
      expect(tokensTenantB.length).toBe(0);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('deve resetar senha com token válido', async () => {
      // Gerar token
      const token = await PasswordResetService.generateResetToken(
        userA.id,
        tenantA.id
      );

      // Resetar senha
      const newPassword = 'NewPassword123';
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token,
          newPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Senha redefinida com sucesso');

      // Verificar que senha foi atualizada
      const updatedUser = await prisma.user.findUnique({
        where: { id: userA.id },
      });

      const isPasswordValid = await comparePassword(
        newPassword,
        updatedUser!.passwordHash
      );
      expect(isPasswordValid).toBe(true);

      // Verificar que token foi marcado como usado
      const tokenData = await prisma.passwordResetToken.findUnique({
        where: { token },
      });
      expect(tokenData?.usedAt).not.toBeNull();
    });

    it('deve retornar erro se token não existe', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token: 'nonexistent-token',
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token inválido');
    });

    it('deve retornar erro se token expirado', async () => {
      // Criar token expirado manualmente
      const expiredToken = await prisma.passwordResetToken.create({
        data: {
          token: 'expired-token',
          userId: userA.id,
          tenantId: tenantA.id,
          expiresAt: new Date(Date.now() - 1000), // Expirou há 1 segundo
          usedAt: null,
        },
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token: expiredToken.token,
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token inválido');
    });

    it('deve retornar erro se token já foi usado', async () => {
      // Gerar e usar token
      const token = await PasswordResetService.generateResetToken(
        userA.id,
        tenantA.id
      );

      await PasswordResetService.useResetToken(token, tenantA.id);

      // Tentar usar token novamente
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token,
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token inválido');
    });

    it('deve retornar erro se senha não atende complexidade mínima', async () => {
      // Gerar token
      const token = await PasswordResetService.generateResetToken(
        userA.id,
        tenantA.id
      );

      // Tentar resetar com senha muito curta
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token,
          newPassword: 'short', // Menos de 8 caracteres
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Senha inválida');
      expect(response.body).toHaveProperty('message', 'A senha deve ter no mínimo 8 caracteres');
    });

    it('deve invalidar token após uso', async () => {
      // Gerar token
      const token = await PasswordResetService.generateResetToken(
        userA.id,
        tenantA.id
      );

      // Resetar senha
      await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token,
          newPassword: 'NewPassword123',
        });

      // Verificar que token foi marcado como usado
      const tokenData = await prisma.passwordResetToken.findUnique({
        where: { token },
      });

      expect(tokenData?.usedAt).not.toBeNull();
    });

    it('deve respeitar isolamento multi-tenant', async () => {
      // Gerar token para userA no tenantA
      const token = await PasswordResetService.generateResetToken(
        userA.id,
        tenantA.id
      );

      // Tentar usar token no contexto de tenantB
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantB.id)
        .send({
          token,
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token inválido');
    });
  });

  describe('Validações de Segurança', () => {
    it('deve garantir que token de tenant A não funciona em tenant B', async () => {
      // Gerar token para userA no tenantA
      const token = await PasswordResetService.generateResetToken(
        userA.id,
        tenantA.id
      );

      // Tentar validar token no contexto de tenantB
      const validation = await PasswordResetService.validateResetToken(
        token,
        tenantB.id
      );

      expect(validation).toBeNull();
    });

    it('deve garantir que email não revela se usuário existe', async () => {
      // Solicitar reset para email existente
      const response1 = await request(app)
        .post('/api/auth/forgot-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({ email: userA.email });

      // Solicitar reset para email não existente
      const response2 = await request(app)
        .post('/api/auth/forgot-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({ email: 'nonexistent@example.com' });

      // Ambas devem retornar sucesso com mesma mensagem
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.message).toBe(response2.body.message);
    });

    it('deve garantir que token usado não pode ser reutilizado', async () => {
      // Gerar token
      const token = await PasswordResetService.generateResetToken(
        userA.id,
        tenantA.id
      );

      // Usar token
      await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token,
          newPassword: 'NewPassword123',
        });

      // Tentar usar token novamente
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token,
          newPassword: 'AnotherPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token inválido');
    });

    it('deve garantir que token expirado não funciona', async () => {
      // Criar token expirado
      const expiredToken = await prisma.passwordResetToken.create({
        data: {
          token: 'expired-token-2',
          userId: userA.id,
          tenantId: tenantA.id,
          expiresAt: new Date(Date.now() - 3600000), // Expirou há 1 hora
          usedAt: null,
        },
      });

      // Tentar usar token expirado
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token: expiredToken.token,
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token inválido');
    });
  });
});

