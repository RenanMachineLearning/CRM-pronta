/**
 * Testes E2E para alteração de senha
 * 
 * Valida fluxo completo de change-password
 */

import request from 'supertest';
import { app } from '../../src/index';
import { cleanDatabase, createTestTenant, createTestUser, closeDatabase, prisma } from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';
import { comparePassword } from '../../src/utils/password';

describe('Password Change - E2E Tests', () => {
  let tenantA: { id: string; slug: string };
  let tenantB: { id: string; slug: string };
  let userA: { id: string; email: string; password: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant A
    const tenantAObj = await createTestTenant({
      name: 'Password Change Tenant A',
      slug: 'password-change-tenant-a',
      status: 'ACTIVE',
    });
    tenantA = { id: tenantAObj.id, slug: tenantAObj.slug };

    // Criar tenant B
    const tenantBObj = await createTestTenant({
      name: 'Password Change Tenant B',
      slug: 'password-change-tenant-b',
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

  describe('POST /api/auth/change-password', () => {
    beforeEach(async () => {
      // Resetar senha do usuário antes de cada teste
      const { hashPassword } = await import('../../src/utils/password');
      await prisma.user.update({
        where: { id: userA.id },
        data: {
          passwordHash: await hashPassword(userA.password),
        },
      });
    });

    it('deve alterar senha com senha atual correta', async () => {
      // Gerar token válido
      const token = generateToken(userA.id, tenantA.id);
      const newPassword = 'NewPassword123';

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Senha alterada com sucesso');

      // Verificar que senha foi atualizada
      const updatedUser = await prisma.user.findUnique({
        where: { id: userA.id },
      });

      const isPasswordValid = await comparePassword(
        newPassword,
        updatedUser!.passwordHash
      );
      expect(isPasswordValid).toBe(true);
    });

    it('deve retornar 401 com mensagem genérica se senha atual estiver incorreta', async () => {
      // Gerar token válido
      const token = generateToken(userA.id, tenantA.id);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: 'WrongPassword123',
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
      // Mensagem genérica (não revela qual validação falhou)
    });

    it('deve retornar erro se nova senha for igual à atual', async () => {
      // Gerar token válido
      const token = generateToken(userA.id, tenantA.id);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword: userA.password, // Mesma senha
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Nova senha inválida');
      expect(response.body).toHaveProperty('message', 'Nova senha deve ser diferente da atual');
    });

    it('deve retornar erro se nova senha não atender complexidade mínima', async () => {
      // Gerar token válido
      const token = generateToken(userA.id, tenantA.id);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword: 'short', // Menos de 8 caracteres
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Senha inválida');
      expect(response.body).toHaveProperty('message', 'A senha deve ter no mínimo 8 caracteres');
    });

    it('deve retornar 401 se não estiver autenticado', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token não fornecido');
    });

    it('deve respeitar isolamento multi-tenant (usuário só altera própria senha)', async () => {
      // Gerar token para userA no tenantA
      const tokenA = generateToken(userA.id, tenantA.id);

      // Tentar alterar senha de userA no contexto de tenantB
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Id', tenantB.id) // Tenant diferente
        .send({
          currentPassword: userA.password,
          newPassword: 'NewPassword123',
        });

      // Deve falhar porque tenantId do token não corresponde ao contexto
      expect(response.status).toBe(403);
    });
  });

  describe('Validações', () => {
    beforeEach(async () => {
      // Resetar senha do usuário antes de cada teste
      const { hashPassword } = await import('../../src/utils/password');
      await prisma.user.update({
        where: { id: userA.id },
        data: {
          passwordHash: await hashPassword(userA.password),
        },
      });
    });

    it('deve retornar erro se senha atual não for fornecida', async () => {
      const token = generateToken(userA.id, tenantA.id);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Senha atual é obrigatória');
    });

    it('deve retornar erro se nova senha não for fornecida', async () => {
      const token = generateToken(userA.id, tenantA.id);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Nova senha é obrigatória');
    });

    it('deve retornar erro se nova senha for igual à atual', async () => {
      const token = generateToken(userA.id, tenantA.id);

      // Primeiro, resetar senha para garantir que sabemos a senha atual
      const currentPassword = 'TestPassword123';
      await prisma.user.update({
        where: { id: userA.id },
        data: {
          passwordHash: await (await import('../../src/utils/password')).hashPassword(currentPassword),
        },
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword,
          newPassword: currentPassword, // Mesma senha
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Nova senha inválida');
      expect(response.body).toHaveProperty('message', 'Nova senha deve ser diferente da atual');
    });

    it('deve retornar erro se nova senha tiver menos de 8 caracteres', async () => {
      const token = generateToken(userA.id, tenantA.id);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword: 'short', // 5 caracteres
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Senha inválida');
      expect(response.body).toHaveProperty('message', 'A senha deve ter no mínimo 8 caracteres');
    });
  });
});

