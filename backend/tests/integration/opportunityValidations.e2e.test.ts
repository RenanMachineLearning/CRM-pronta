/**
 * Testes E2E para validações de oportunidades via API
 * 
 * Foca exclusivamente em validações de campos:
 * - value (positivo, numérico, obrigatório)
 * - closeDate (futura ou presente, opcional)
 * - probability (0-100, opcional)
 * - stageId (UUID válido, existe, pertence ao tenant, obrigatório)
 */

import request from 'supertest';
import { app } from '../../src/index';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  assignRoleToUser,
  createStandardRoles,
  createTestPermission,
  closeDatabase,
  prisma,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';
import { Prisma } from '@prisma/client';

describe('Opportunity Validations - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };
  let pipeline1: { id: string };
  let pipeline2: { id: string };
  let stage1: { id: string }; // Primeiro estágio do pipeline1
  let stage2: { id: string }; // Segundo estágio do pipeline1
  let stageTenant2: { id: string }; // Estágio do pipeline2 (outro tenant)

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Opportunity Validations Test Tenant 1',
      slug: 'opportunity-validations-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Opportunity Validations Test Tenant 2',
      slug: 'opportunity-validations-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Opportunity
    const opportunityPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Opportunity', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Opportunity', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Opportunity', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Opportunity', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Opportunity', action: 'list' }),
    ]);

    const opportunityPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Opportunity', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Opportunity', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Opportunity', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Opportunity', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Opportunity', action: 'list' }),
    ]);

    // Associar permissões aos Admins
    await prisma.rolePermission.createMany({
      data: [
        ...opportunityPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...opportunityPermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin1@opportunityvalidations.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@opportunityvalidations.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Gerar tokens JWT
    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);

    // Criar pipelines e estágios para tenant1
    pipeline1 = await prisma.pipeline.create({
      data: {
        tenantId: tenant1.id,
        name: 'Pipeline de Vendas',
        isDefault: true,
      },
    });

    stage1 = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline1.id,
        tenantId: tenant1.id,
        name: 'Qualificação',
        order: 1,
        probability: 10,
        color: '#3B82F6',
      },
    });

    stage2 = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline1.id,
        tenantId: tenant1.id,
        name: 'Proposta',
        order: 2,
        probability: 30,
        color: '#F59E0B',
      },
    });

    // Criar pipeline e estágio para tenant2 (para testar isolamento)
    pipeline2 = await prisma.pipeline.create({
      data: {
        tenantId: tenant2.id,
        name: 'Pipeline de Vendas',
        isDefault: true,
      },
    });

    stageTenant2 = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline2.id,
        tenantId: tenant2.id,
        name: 'Qualificação',
        order: 1,
        probability: 10,
        color: '#3B82F6',
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Validação de Value', () => {
    it('deve rejeitar valor negativo ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio Inválido',
          value: -1000,
          stageId: stage1.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('número positivo');
    });

    it('deve rejeitar valor zero ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Valor Zero',
          value: 0,
          stageId: stage1.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('número positivo');
    });

    it('deve rejeitar valor não numérico (string inválida) ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Valor Inválido',
          value: 'abc',
          stageId: stage1.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('número positivo');
    });

    it('deve rejeitar valor null ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio sem Valor',
          value: null,
          stageId: stage1.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('value é obrigatório');
    });

    it('deve rejeitar valor undefined ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio sem Valor',
          stageId: stage1.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('value é obrigatório');
    });

    it('deve rejeitar valor como string vazia ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Valor Vazio',
          value: '',
          stageId: stage1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve aceitar valor positivo válido ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio Válido',
          value: 50000.00,
          stageId: stage1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.value).toBe(50000.00);
    });

    it('deve aceitar valor como string numérica válida ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Valor String',
          value: '75000.50',
          stageId: stage1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.value).toBe(75000.50);
    });

    it('deve aceitar valor muito pequeno (0.01) ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Valor Mínimo',
          value: 0.01,
          stageId: stage1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.value).toBe(0.01);
    });

    it('deve rejeitar valor negativo ao atualizar oportunidade', async () => {
      // Criar oportunidade primeiro
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Negócio para Atualizar',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
        },
      });

      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          value: -1000,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('número positivo');
    });

    it('deve aceitar valor válido ao atualizar oportunidade', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Negócio para Atualizar',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
        },
      });

      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          value: 75000.00,
        });

      expect(response.status).toBe(200);
      expect(response.body.value).toBe(75000.00);
    });
  });

  describe('Validação de CloseDate', () => {
    it('deve rejeitar data passada ao criar oportunidade', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 dia atrás
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Data Passada',
          value: 50000.00,
          stageId: stage1.id,
          closeDate: pastDate.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('futura ou presente');
    });

    it('deve aceitar data presente (hoje) ao criar oportunidade', async () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0); // Meio-dia de hoje
      
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Data Presente',
          value: 50000.00,
          stageId: stage1.id,
          closeDate: today.toISOString(),
        });

      expect(response.status).toBe(201);
    });

    it('deve aceitar data futura ao criar oportunidade', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias no futuro
      
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Data Futura',
          value: 50000.00,
          stageId: stage1.id,
          closeDate: futureDate.toISOString(),
        });

      expect(response.status).toBe(201);
    });

    it('deve aceitar closeDate null (campo opcional) ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio sem Data',
          value: 50000.00,
          stageId: stage1.id,
          closeDate: null,
        });

      expect(response.status).toBe(201);
      expect(response.body.closeDate).toBeNull();
    });

    it('deve aceitar closeDate undefined (campo opcional) ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio sem Data',
          value: 50000.00,
          stageId: stage1.id,
        });

      expect(response.status).toBe(201);
    });

    it('deve rejeitar data inválida (formato incorreto) ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Data Inválida',
          value: 50000.00,
          stageId: stage1.id,
          closeDate: 'invalid-date',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
    });

    it('deve rejeitar data passada ao atualizar oportunidade', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Negócio para Atualizar',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
        },
      });

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          closeDate: pastDate.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('futura ou presente');
    });

    it('deve aceitar data futura ao atualizar oportunidade', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Negócio para Atualizar',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
        },
      });

      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          closeDate: futureDate.toISOString(),
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Validação de Probability', () => {
    it('deve rejeitar probabilidade maior que 100', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Probability Inválida',
          value: 50000.00,
          stageId: stage1.id,
          probability: 150,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('entre 0 e 100');
    });

    it('deve rejeitar probabilidade negativa', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Probability Negativa',
          value: 50000.00,
          stageId: stage1.id,
          probability: -10,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('entre 0 e 100');
    });

    it('deve aceitar probabilidade 0', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Probability 0',
          value: 50000.00,
          stageId: stage1.id,
          probability: 0,
        });

      expect(response.status).toBe(201);
      expect(response.body.probability).toBe(0);
    });

    it('deve aceitar probabilidade 100', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Probability 100',
          value: 50000.00,
          stageId: stage1.id,
          probability: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body.probability).toBe(100);
    });

    it('deve aceitar probabilidade 50', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Probability 50',
          value: 50000.00,
          stageId: stage1.id,
          probability: 50,
        });

      expect(response.status).toBe(201);
      expect(response.body.probability).toBe(50);
    });

    it('deve aceitar probabilidade decimal (50.5)', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Probability Decimal',
          value: 50000.00,
          stageId: stage1.id,
          probability: 50.5,
        });

      expect(response.status).toBe(201);
      expect(response.body.probability).toBe(50.5);
    });

    it('deve aceitar probabilidade null (campo opcional)', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio sem Probability',
          value: 50000.00,
          stageId: stage1.id,
          probability: null,
        });

      expect(response.status).toBe(201);
    });

    it('deve aceitar probabilidade undefined (campo opcional)', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio sem Probability',
          value: 50000.00,
          stageId: stage1.id,
        });

      expect(response.status).toBe(201);
    });

    it('deve rejeitar probabilidade maior que 100 ao atualizar oportunidade', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Negócio para Atualizar',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
        },
      });

      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          probability: 150,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('entre 0 e 100');
    });
  });

  describe('Validação de StageId', () => {
    it('deve rejeitar stageId não fornecido', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio sem Stage',
          value: 50000.00,
          // stageId não fornecido
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('stageId');
    });

    it('deve rejeitar stageId com formato UUID inválido', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Stage Inválido',
          value: 50000.00,
          stageId: 'invalid-uuid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('UUID válido');
    });

    it('deve rejeitar stageId que não existe', async () => {
      const fakeStageId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Stage Inexistente',
          value: 50000.00,
          stageId: fakeStageId,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('PipelineStage não encontrado');
    });

    it('deve rejeitar stageId de outro tenant', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Stage de Outro Tenant',
          value: 50000.00,
          stageId: stageTenant2.id, // Estágio do tenant2
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('PipelineStage não encontrado');
    });

    it('deve aceitar stageId válido do tenant atual', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio Válido',
          value: 50000.00,
          stageId: stage1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.stageId).toBe(stage1.id);
    });

    it('deve aceitar stageId com UUID maiúsculas (case insensitive)', async () => {
      const upperCaseStageId = stage1.id.toUpperCase();
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com UUID Maiúsculo',
          value: 50000.00,
          stageId: upperCaseStageId,
        });

      expect(response.status).toBe(201);
      expect(response.body.stageId).toBe(stage1.id);
    });

    it('deve rejeitar stageId inválido ao atualizar oportunidade', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Negócio para Atualizar',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
        },
      });

      const fakeStageId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          stageId: fakeStageId,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('PipelineStage não encontrado');
    });
  });

  describe('Validações em Update (PUT)', () => {
    it('deve permitir atualizar apenas name sem tocar em value', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Negócio Original',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
        },
      });

      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio Atualizado',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Negócio Atualizado');
      expect(response.body.value).toBe(50000);
    });

    it('deve permitir atualizar múltiplos campos válidos simultaneamente', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Negócio Original',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
        },
      });

      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio Atualizado',
          value: 75000.00,
          closeDate: futureDate.toISOString(),
          probability: 75,
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Negócio Atualizado');
      expect(response.body.value).toBe(75000.00);
      expect(response.body.probability).toBe(75);
    });
  });

  describe('Validações Combinadas', () => {
    it('deve rejeitar oportunidade com value inválido e closeDate inválida (retorna erro de value primeiro)', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Múltiplos Erros',
          value: -1000,
          stageId: stage1.id,
          closeDate: pastDate.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('número positivo');
    });

    it('deve rejeitar oportunidade com value inválido e probability inválida (retorna erro de value primeiro)', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Múltiplos Erros',
          value: -1000,
          stageId: stage1.id,
          probability: 150,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('número positivo');
    });

    it('deve aceitar oportunidade com todos os campos válidos', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio Completo',
          value: 50000.00,
          stageId: stage1.id,
          closeDate: futureDate.toISOString(),
          probability: 50,
        });

      expect(response.status).toBe(201);
      expect(response.body.value).toBe(50000.00);
      expect(response.body.probability).toBe(50);
    });
  });

  describe('Isolamento Multi-Tenant', () => {
    it('deve respeitar isolamento multi-tenant na validação de stageId', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Stage de Outro Tenant',
          value: 50000.00,
          stageId: stageTenant2.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('PipelineStage não encontrado');
    });

    it('deve permitir usar stageId do próprio tenant', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio Válido',
          value: 50000.00,
          stageId: stage1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.stageId).toBe(stage1.id);
    });
  });

  describe('Edge Cases', () => {
    it('deve rejeitar value como string "0"', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Valor Zero String',
          value: '0',
          stageId: stage1.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('número positivo');
    });

    it('deve rejeitar value como string "-1"', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Valor Negativo String',
          value: '-1',
          stageId: stage1.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('número positivo');
    });

    it('deve aceitar value como string "1.5"', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Valor Decimal String',
          value: '1.5',
          stageId: stage1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.value).toBe(1.5);
    });

    it('deve aceitar value como string "1000000.99"', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Valor Grande String',
          value: '1000000.99',
          stageId: stage1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.value).toBe(1000000.99);
    });

    it('deve aceitar closeDate como ISO string válida', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Data ISO',
          value: 50000.00,
          stageId: stage1.id,
          closeDate: futureDate.toISOString(),
        });

      expect(response.status).toBe(201);
    });

    it('deve aceitar probabilidade decimal (0.1)', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Probability Mínima',
          value: 50000.00,
          stageId: stage1.id,
          probability: 0.1,
        });

      expect(response.status).toBe(201);
      expect(response.body.probability).toBe(0.1);
    });

    it('deve aceitar probabilidade decimal (99.9)', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Probability Máxima',
          value: 50000.00,
          stageId: stage1.id,
          probability: 99.9,
        });

      expect(response.status).toBe(201);
      expect(response.body.probability).toBe(99.9);
    });
  });
});
