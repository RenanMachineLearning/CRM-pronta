/**
 * Testes E2E para CRUD completo de pipelines via API
 * 
 * Valida criação, leitura, atualização e deleção de pipelines e seus estágios.
 * Testa isolamento multi-tenant, validações, auditoria, permissões ACL,
 * proteção de pipeline padrão e estágios em uso.
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
  waitForAuditLog,
  getAuditLogs,
  prisma,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';
import { Prisma } from '@prisma/client';

describe('Pipeline CRUD - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Pipeline CRUD Test Tenant 1',
      slug: 'pipeline-crud-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Pipeline CRUD Test Tenant 2',
      slug: 'pipeline-crud-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Pipeline (se não existirem)
    const pipelinePermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Pipeline', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Pipeline', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Pipeline', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Pipeline', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Pipeline', action: 'list' }),
    ]);

    const pipelinePermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Pipeline', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Pipeline', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Pipeline', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Pipeline', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Pipeline', action: 'list' }),
    ]);

    // Associar permissões aos Admins
    await prisma.rolePermission.createMany({
      data: [
        ...pipelinePermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...pipelinePermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin1@pipelinecrud.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@pipelinecrud.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Gerar tokens JWT
    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /api/pipelines - Criar pipeline', () => {
    it('deve criar pipeline com estágios válidos', async () => {
      const response = await request(app)
        .post('/api/pipelines')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Pipeline de Vendas',
          isDefault: false,
          stages: [
            {
              name: 'Qualificação',
              order: 1,
              probability: 10,
              color: '#3B82F6',
            },
            {
              name: 'Proposta',
              order: 2,
              probability: 30,
              color: '#F59E0B',
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Pipeline de Vendas');
      expect(response.body.isDefault).toBe(false);
      expect(response.body.stages).toHaveLength(2);
      expect(response.body.stages[0].name).toBe('Qualificação');
      expect(response.body.stages[0].order).toBe(1);
      expect(response.body.stages[0].probability).toBe(10);
      expect(response.body.stages[0].color).toBe('#3B82F6');
    });

    it('deve criar pipeline padrão e desmarcar outros como padrão', async () => {
      // Criar primeiro pipeline padrão
      const pipeline1 = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline Padrão 1',
          isDefault: true,
        },
      });

      // Criar estágios para o primeiro pipeline
      await prisma.pipelineStage.createMany({
        data: [
          {
            pipelineId: pipeline1.id,
            tenantId: tenant1.id,
            name: 'Estágio 1',
            order: 1,
            probability: 10,
          },
        ],
      });

      // Criar novo pipeline como padrão
      const response = await request(app)
        .post('/api/pipelines')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Pipeline Padrão 2',
          isDefault: true,
          stages: [
            {
              name: 'Estágio 1',
              order: 1,
              probability: 10,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.isDefault).toBe(true);

      // Verificar que o primeiro pipeline não é mais padrão
      const updatedPipeline1 = await prisma.pipeline.findUnique({
        where: { id: pipeline1.id },
      });
      expect(updatedPipeline1?.isDefault).toBe(false);
    });

    it('deve rejeitar pipeline sem nome', async () => {
      const response = await request(app)
        .post('/api/pipelines')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          stages: [
            {
              name: 'Estágio 1',
              order: 1,
            },
          ],
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar pipeline sem estágios', async () => {
      const response = await request(app)
        .post('/api/pipelines')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Pipeline sem Estágios',
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar pipeline com estágios com order duplicado', async () => {
      const response = await request(app)
        .post('/api/pipelines')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Pipeline com Order Duplicado',
          stages: [
            {
              name: 'Estágio 1',
              order: 1,
            },
            {
              name: 'Estágio 2',
              order: 1, // Duplicado
            },
          ],
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar pipeline com probability inválida', async () => {
      const response = await request(app)
        .post('/api/pipelines')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Pipeline com Probability Inválida',
          stages: [
            {
              name: 'Estágio 1',
              order: 1,
              probability: 150, // Inválido (> 100)
            },
          ],
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar pipeline com color inválida', async () => {
      const response = await request(app)
        .post('/api/pipelines')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Pipeline com Color Inválida',
          stages: [
            {
              name: 'Estágio 1',
              order: 1,
              color: 'INVALID_COLOR', // Inválido
            },
          ],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/pipelines - Listar pipelines', () => {
    it('deve listar pipelines do tenant atual', async () => {
      // Criar alguns pipelines primeiro
      const pipeline1 = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline 1',
          isDefault: false,
        },
      });

      await prisma.pipelineStage.createMany({
        data: [
          {
            pipelineId: pipeline1.id,
            tenantId: tenant1.id,
            name: 'Estágio 1',
            order: 1,
            probability: 10,
          },
        ],
      });

      const response = await request(app)
        .get('/api/pipelines')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('deve incluir estágios ordenados por order', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline com Estágios',
          isDefault: false,
        },
      });

      await prisma.pipelineStage.createMany({
        data: [
          {
            pipelineId: pipeline.id,
            tenantId: tenant1.id,
            name: 'Estágio 3',
            order: 3,
            probability: 60,
          },
          {
            pipelineId: pipeline.id,
            tenantId: tenant1.id,
            name: 'Estágio 1',
            order: 1,
            probability: 10,
          },
          {
            pipelineId: pipeline.id,
            tenantId: tenant1.id,
            name: 'Estágio 2',
            order: 2,
            probability: 30,
          },
        ],
      });

      const response = await request(app)
        .get('/api/pipelines')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      const foundPipeline = response.body.data.find(
        (p: any) => p.id === pipeline.id
      );
      expect(foundPipeline).toBeDefined();
      expect(foundPipeline.stages).toHaveLength(3);
      expect(foundPipeline.stages[0].order).toBe(1);
      expect(foundPipeline.stages[1].order).toBe(2);
      expect(foundPipeline.stages[2].order).toBe(3);
    });

    it('deve incluir contagem de oportunidades', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline com Oportunidades',
          isDefault: false,
        },
      });

      const stage = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          tenantId: tenant1.id,
          name: 'Estágio 1',
          order: 1,
          probability: 10,
        },
      });

      // Criar oportunidades usando este estágio
      await prisma.opportunity.createMany({
        data: [
          {
            tenantId: tenant1.id,
            name: 'Oportunidade 1',
            value: new Prisma.Decimal(10000),
            currency: 'BRL',
            stageId: stage.id,
            status: 'OPEN',
            probability: 10,
          },
          {
            tenantId: tenant1.id,
            name: 'Oportunidade 2',
            value: new Prisma.Decimal(20000),
            currency: 'BRL',
            stageId: stage.id,
            status: 'OPEN',
            probability: 10,
          },
        ],
      });

      const response = await request(app)
        .get('/api/pipelines')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      const foundPipeline = response.body.data.find(
        (p: any) => p.id === pipeline.id
      );
      expect(foundPipeline).toBeDefined();
      expect(foundPipeline.opportunitiesCount).toBe(2);
    });
  });

  describe('GET /api/pipelines/:id - Obter pipeline específico', () => {
    it('deve retornar pipeline existente', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline Get',
          isDefault: false,
        },
      });

      await prisma.pipelineStage.createMany({
        data: [
          {
            pipelineId: pipeline.id,
            tenantId: tenant1.id,
            name: 'Estágio 1',
            order: 1,
            probability: 10,
          },
        ],
      });

      const response = await request(app)
        .get(`/api/pipelines/${pipeline.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(pipeline.id);
      expect(response.body.name).toBe('Pipeline Get');
      expect(response.body.stages).toHaveLength(1);
    });

    it('deve retornar 404 para pipeline inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/pipelines/${fakeId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar 404 para pipeline de outro tenant', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant2.id,
          name: 'Pipeline Tenant 2',
          isDefault: false,
        },
      });

      const response = await request(app)
        .get(`/api/pipelines/${pipeline.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/pipelines/:id - Atualizar pipeline', () => {
    it('deve atualizar pipeline existente', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline Update',
          isDefault: false,
        },
      });

      await prisma.pipelineStage.createMany({
        data: [
          {
            pipelineId: pipeline.id,
            tenantId: tenant1.id,
            name: 'Estágio 1',
            order: 1,
            probability: 10,
          },
        ],
      });

      const response = await request(app)
        .put(`/api/pipelines/${pipeline.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Pipeline Updated',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Pipeline Updated');
    });

    it('deve atualizar estágios (substituir completamente)', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline Update Stages',
          isDefault: false,
        },
      });

      const stage1 = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          tenantId: tenant1.id,
          name: 'Estágio Antigo 1',
          order: 1,
          probability: 10,
        },
      });

      const stage2 = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          tenantId: tenant1.id,
          name: 'Estágio Antigo 2',
          order: 2,
          probability: 30,
        },
      });

      const response = await request(app)
        .put(`/api/pipelines/${pipeline.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          stages: [
            {
              id: stage1.id, // Atualizar estágio existente
              name: 'Estágio Atualizado',
              order: 1,
              probability: 20,
            },
            {
              // Criar novo estágio (sem id)
              name: 'Estágio Novo',
              order: 3,
              probability: 50,
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.stages).toHaveLength(2);
      
      // Verificar que estágio 1 foi atualizado
      const updatedStage1 = response.body.stages.find(
        (s: any) => s.id === stage1.id
      );
      expect(updatedStage1).toBeDefined();
      expect(updatedStage1.name).toBe('Estágio Atualizado');
      expect(updatedStage1.probability).toBe(20);

      // Verificar que estágio 2 foi deletado (não está na resposta)
      const deletedStage2 = response.body.stages.find(
        (s: any) => s.id === stage2.id
      );
      expect(deletedStage2).toBeUndefined();

      // Verificar que novo estágio foi criado
      const newStage = response.body.stages.find(
        (s: any) => s.name === 'Estágio Novo'
      );
      expect(newStage).toBeDefined();
      expect(newStage.order).toBe(3);
    });

    it('deve rejeitar tentativa de deletar estágio em uso', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline com Estágio em Uso',
          isDefault: false,
        },
      });

      const stage = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          tenantId: tenant1.id,
          name: 'Estágio em Uso',
          order: 1,
          probability: 10,
        },
      });

      // Criar oportunidade usando este estágio
      await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade',
          value: new Prisma.Decimal(10000),
          currency: 'BRL',
          stageId: stage.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      // Tentar atualizar pipeline removendo estágio em uso
      const response = await request(app)
        .put(`/api/pipelines/${pipeline.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          stages: [
            {
              name: 'Novo Estágio',
              order: 2,
              probability: 20,
            },
          ],
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('em uso');
    });

    it('deve retornar 404 para pipeline de outro tenant', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant2.id,
          name: 'Pipeline Tenant 2',
          isDefault: false,
        },
      });

      const response = await request(app)
        .put(`/api/pipelines/${pipeline.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Updated',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/pipelines/:id - Deletar pipeline', () => {
    it('deve deletar pipeline não utilizado', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline Delete',
          isDefault: false,
        },
      });

      await prisma.pipelineStage.createMany({
        data: [
          {
            pipelineId: pipeline.id,
            tenantId: tenant1.id,
            name: 'Estágio 1',
            order: 1,
            probability: 10,
          },
        ],
      });

      const response = await request(app)
        .delete(`/api/pipelines/${pipeline.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deletado com sucesso');
      expect(response.body.id).toBe(pipeline.id);

      // Verificar que pipeline foi deletado
      const deleted = await prisma.pipeline.findUnique({
        where: { id: pipeline.id },
      });
      expect(deleted).toBeNull();
    });

    it('deve rejeitar deletar pipeline padrão', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline Padrão',
          isDefault: true,
        },
      });

      await prisma.pipelineStage.createMany({
        data: [
          {
            pipelineId: pipeline.id,
            tenantId: tenant1.id,
            name: 'Estágio 1',
            order: 1,
            probability: 10,
          },
        ],
      });

      const response = await request(app)
        .delete(`/api/pipelines/${pipeline.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('padrão');
    });

    it('deve rejeitar deletar pipeline com oportunidades', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline em Uso',
          isDefault: false,
        },
      });

      const stage = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          tenantId: tenant1.id,
          name: 'Estágio 1',
          order: 1,
          probability: 10,
        },
      });

      // Criar oportunidade usando este estágio
      await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade',
          value: new Prisma.Decimal(10000),
          currency: 'BRL',
          stageId: stage.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      const response = await request(app)
        .delete(`/api/pipelines/${pipeline.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('oportunidade');
    });

    it('deve retornar 404 para pipeline inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/pipelines/${fakeId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar 404 para pipeline de outro tenant', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant2.id,
          name: 'Pipeline Tenant 2',
          isDefault: false,
        },
      });

      const response = await request(app)
        .delete(`/api/pipelines/${pipeline.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Isolamento Multi-Tenant', () => {
    it('deve listar apenas pipelines do tenant atual', async () => {
      // Criar pipeline no tenant2
      await prisma.pipeline.create({
        data: {
          tenantId: tenant2.id,
          name: 'Pipeline Tenant 2',
          isDefault: false,
        },
      });

      const response = await request(app)
        .get('/api/pipelines')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((pipeline: any) => {
        expect(pipeline.tenantId).toBe(tenant1.id);
      });
    });
  });

  describe('Auditoria', () => {
    it('deve registrar auditoria ao criar pipeline', async () => {
      const response = await request(app)
        .post('/api/pipelines')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Pipeline Auditoria Create',
          stages: [
            {
              name: 'Estágio 1',
              order: 1,
              probability: 10,
            },
          ],
        });

      expect(response.status).toBe(201);
      const pipelineId = response.body.id;

      // Aguardar auditoria ser registrada
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Pipeline',
        entityId: pipelineId,
        action: 'create',
      });

      expect(auditFound).toBe(true);

      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Pipeline',
        entityId: pipelineId,
        action: 'create',
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      const createLog = auditLogs[0];
      expect(createLog.entityType).toBe('Pipeline');
      expect(createLog.entityId).toBe(pipelineId);
      expect(createLog.action).toBe('create');
      expect(createLog.userId).toBe(adminUser1.id);
    });

    it('deve registrar auditoria ao atualizar pipeline', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline Auditoria Update',
          isDefault: false,
        },
      });

      await prisma.pipelineStage.createMany({
        data: [
          {
            pipelineId: pipeline.id,
            tenantId: tenant1.id,
            name: 'Estágio 1',
            order: 1,
            probability: 10,
          },
        ],
      });

      const response = await request(app)
        .put(`/api/pipelines/${pipeline.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Pipeline Auditoria Updated',
        });

      expect(response.status).toBe(200);

      // Aguardar auditoria ser registrada
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Pipeline',
        entityId: pipeline.id,
        action: 'update',
      });

      expect(auditFound).toBe(true);

      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Pipeline',
        entityId: pipeline.id,
        action: 'update',
      });

      const updateLog = auditLogs[0];
      expect(updateLog).toBeDefined();
      expect(updateLog.action).toBe('update');
      expect(updateLog.changes).toBeDefined();
    });

    it('deve registrar auditoria ao deletar pipeline', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId: tenant1.id,
          name: 'Pipeline Auditoria Delete',
          isDefault: false,
        },
      });

      await prisma.pipelineStage.createMany({
        data: [
          {
            pipelineId: pipeline.id,
            tenantId: tenant1.id,
            name: 'Estágio 1',
            order: 1,
            probability: 10,
          },
        ],
      });

      const response = await request(app)
        .delete(`/api/pipelines/${pipeline.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);

      // Aguardar auditoria ser registrada
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Pipeline',
        entityId: pipeline.id,
        action: 'delete',
      });

      expect(auditFound).toBe(true);

      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Pipeline',
        entityId: pipeline.id,
        action: 'delete',
      });

      const deleteLog = auditLogs[0];
      expect(deleteLog).toBeDefined();
      expect(deleteLog.action).toBe('delete');
    });
  });
});
