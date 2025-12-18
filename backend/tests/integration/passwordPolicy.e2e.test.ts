/**
 * Testes E2E para política de senhas
 * 
 * Valida que a política de senhas é aplicada corretamente em:
 * - Reset de senha
 * - Alteração de senha
 * - Mensagens de erro claras e específicas
 */

import request from 'supertest';
import { app } from '../../src/index';
import { cleanDatabase, createTestTenant, createTestUser, closeDatabase } from '../helpers/db';
import { PasswordResetService } from '../../src/services/passwordResetService';
import { generateToken } from '../../src/utils/jwt';

describe('Password Policy - E2E Tests', () => {
  let tenantA: { id: string; slug: string };
  let userA: { id: string; email: string; password: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant A
    const tenantAObj = await createTestTenant({
      name: 'Password Policy Tenant A',
      slug: 'password-policy-tenant-a',
      status: 'ACTIVE',
    });
    tenantA = { id: tenantAObj.id, slug: tenantAObj.slug };

    // Criar usuário no tenant A
    const userAObj = await createTestUser({
      email: 'userpolicy@example.com',
      password: 'StrongPass123',
      name: 'User Policy',
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    userA = {
      id: userAObj.id,
      email: userAObj.email,
      password: 'StrongPass123',
    };
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Reset de Senha - Validação de Política', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Gerar token de reset para cada teste
      resetToken = await PasswordResetService.generateResetToken(userA.id, tenantA.id);
    });

    it('deve rejeitar senha sem maiúscula no reset', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token: resetToken,
          newPassword: 'weakpass123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha inválida');
      expect(response.body.message).toContain('A senha deve conter pelo menos uma letra maiúscula');
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors).toContain('A senha deve conter pelo menos uma letra maiúscula');
    });

    it('deve rejeitar senha sem minúscula no reset', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token: resetToken,
          newPassword: 'WEAKPASS123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha inválida');
      expect(response.body.message).toContain('A senha deve conter pelo menos uma letra minúscula');
      expect(response.body.errors).toContain('A senha deve conter pelo menos uma letra minúscula');
    });

    it('deve rejeitar senha sem número no reset', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token: resetToken,
          newPassword: 'WeakPass',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha inválida');
      expect(response.body.message).toContain('A senha deve conter pelo menos um número');
      expect(response.body.errors).toContain('A senha deve conter pelo menos um número');
    });

    it('deve rejeitar senha muito curta no reset', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token: resetToken,
          newPassword: 'Weak1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha inválida');
      expect(response.body.message).toContain('A senha deve ter no mínimo 8 caracteres');
      expect(response.body.errors).toContain('A senha deve ter no mínimo 8 caracteres');
    });

    it('deve aceitar senha forte no reset', async () => {
      const newPassword = 'NewStrongPass123';
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token: resetToken,
          newPassword: newPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Senha redefinida com sucesso');

      // Verificar que a senha foi realmente alterada tentando fazer login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          email: userA.email,
          password: newPassword,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();

      // Restaurar senha original para próximos testes
      const { hashPassword } = await import('../../src/utils/password');
      const { prisma } = await import('../helpers/db');
      await prisma.user.update({
        where: { id: userA.id },
        data: {
          passwordHash: await hashPassword(userA.password),
        },
      });
    });

    it('deve retornar múltiplos erros quando senha falha em vários requisitos', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token: resetToken,
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha inválida');
      expect(response.body.errors.length).toBeGreaterThan(1);
      expect(response.body.message).toContain('A senha não atende aos requisitos:');
    });
  });

  describe('Alteração de Senha - Validação de Política', () => {
    let authToken: string;

    beforeEach(async () => {
      // Gerar token de autenticação para cada teste
      authToken = generateToken(userA.id, tenantA.id);
    });

    it('deve rejeitar senha sem maiúscula na alteração', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword: 'weakpass123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha inválida');
      expect(response.body.message).toContain('A senha deve conter pelo menos uma letra maiúscula');
      expect(response.body.errors).toContain('A senha deve conter pelo menos uma letra maiúscula');
    });

    it('deve rejeitar senha sem minúscula na alteração', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword: 'WEAKPASS123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha inválida');
      expect(response.body.message).toContain('A senha deve conter pelo menos uma letra minúscula');
      expect(response.body.errors).toContain('A senha deve conter pelo menos uma letra minúscula');
    });

    it('deve rejeitar senha sem número na alteração', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword: 'WeakPass',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha inválida');
      expect(response.body.message).toContain('A senha deve conter pelo menos um número');
      expect(response.body.errors).toContain('A senha deve conter pelo menos um número');
    });

    it('deve rejeitar senha muito curta na alteração', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword: 'Weak1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha inválida');
      expect(response.body.message).toContain('A senha deve ter no mínimo 8 caracteres');
      expect(response.body.errors).toContain('A senha deve ter no mínimo 8 caracteres');
    });

    it('deve aceitar senha forte na alteração', async () => {
      const newPassword = 'NewStrongPass456';
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword: newPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Senha alterada com sucesso');

      // Verificar que a senha foi realmente alterada tentando fazer login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          email: userA.email,
          password: newPassword,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();

      // Restaurar senha original para próximos testes
      const { hashPassword } = await import('../../src/utils/password');
      const { prisma: prismaHelper } = await import('../helpers/db');
      await prismaHelper.user.update({
        where: { id: userA.id },
        data: {
          passwordHash: await hashPassword(userA.password),
        },
      });
    });

    it('deve retornar múltiplos erros quando senha falha em vários requisitos na alteração', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha inválida');
      expect(response.body.errors.length).toBeGreaterThan(1);
      expect(response.body.message).toContain('A senha não atende aos requisitos:');
    });
  });

  describe('Mensagens de Erro - Clareza e Especificidade', () => {
    let resetToken: string;
    let authToken: string;

    beforeAll(async () => {
      resetToken = await PasswordResetService.generateResetToken(userA.id, tenantA.id);
      authToken = generateToken(userA.id, tenantA.id);
    });

    it('mensagens de erro devem ser claras e específicas no reset', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token: resetToken,
          newPassword: 'weakpass',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha inválida');
      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
      
      // Verificar que mensagens são específicas
      response.body.errors.forEach((error: string) => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
        expect(error).toMatch(/A senha deve/);
      });
    });

    it('mensagens de erro devem ser claras e específicas na alteração', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword: 'weakpass',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Senha inválida');
      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
      
      // Verificar que mensagens são específicas
      response.body.errors.forEach((error: string) => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
        expect(error).toMatch(/A senha deve/);
      });
    });

    it('formato de resposta deve ser consistente entre reset e alteração', async () => {
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .set('X-Tenant-Id', tenantA.id)
        .send({
          token: resetToken,
          newPassword: 'weakpass',
        });

      const changeResponse = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', tenantA.id)
        .send({
          currentPassword: userA.password,
          newPassword: 'weakpass',
        });

      // Ambos devem ter a mesma estrutura
      expect(resetResponse.body).toHaveProperty('error');
      expect(resetResponse.body).toHaveProperty('message');
      expect(resetResponse.body).toHaveProperty('errors');
      
      expect(changeResponse.body).toHaveProperty('error');
      expect(changeResponse.body).toHaveProperty('message');
      expect(changeResponse.body).toHaveProperty('errors');

      // Ambos devem ter o mesmo código de erro
      expect(resetResponse.status).toBe(changeResponse.status);
      expect(resetResponse.body.error).toBe(changeResponse.body.error);
    });
  });
});

