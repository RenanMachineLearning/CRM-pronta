/**
 * Testes E2E para CRUD completo de oportunidades via API
 * 
 * Valida criação, leitura, atualização e deleção de oportunidades.
 * Testa isolamento multi-tenant, validações, auditoria, permissões ACL,
 * integração com PipelineStage, relacionamentos (Contact, Company, Lead) e tags.
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

describe('Opportunity CRUD - E2E Tests', () => {
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
  let stage1: { id: string }; // Qualificação
  let stage2: { id: string }; // Proposta
  let stage3: { id: string }; // Negociação
  let stage4: { id: string }; // Fechamento
  let contact1: { id: string };
  let company1: { id: string };
  let lead1: { id: string };
  let tag1: { id: string; name: string };
  let tag2: { id: string; name: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Opportunity CRUD Test Tenant 1',
      slug: 'opportunity-crud-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Opportunity CRUD Test Tenant 2',
      slug: 'opportunity-crud-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Opportunity (se não existirem)
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
      email: 'admin1@opportunitycrud.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@opportunitycrud.test',
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

    stage3 = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline1.id,
        tenantId: tenant1.id,
        name: 'Negociação',
        order: 3,
        probability: 60,
        color: '#EF4444',
      },
    });

    stage4 = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline1.id,
        tenantId: tenant1.id,
        name: 'Fechamento',
        order: 4,
        probability: 90,
        color: '#10B981',
      },
    });

    // Criar pipeline para tenant2
    pipeline2 = await prisma.pipeline.create({
      data: {
        tenantId: tenant2.id,
        name: 'Pipeline de Vendas',
        isDefault: true,
      },
    });

    // Criar contact, company e lead para testes
    contact1 = await prisma.contact.create({
      data: {
        tenantId: tenant1.id,
        firstName: 'João',
        lastName: 'Silva',
        status: 'ACTIVE',
      },
    });

    company1 = await prisma.company.create({
      data: {
        tenantId: tenant1.id,
        name: 'Empresa ABC',
        status: 'ACTIVE',
      },
    });

    lead1 = await prisma.lead.create({
      data: {
        tenantId: tenant1.id,
        firstName: 'Lead',
        lastName: 'Test',
        status: 'NEW',
        converted: false,
      },
    });

    // Criar tags de teste para tenant1
    tag1 = await prisma.tag.create({
      data: {
        tenantId: tenant1.id,
        name: 'Hot Opportunity',
        color: '#FF0000',
      },
    });

    tag2 = await prisma.tag.create({
      data: {
        tenantId: tenant1.id,
        name: 'Cold Opportunity',
        color: '#0000FF',
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /api/opportunities - Criar oportunidade', () => {
    it('deve criar oportunidade com dados válidos', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio ABC',
          value: 50000.00,
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
          closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias no futuro
          probability: 10,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Negócio ABC');
      expect(response.body.value).toBe(50000.00);
      expect(response.body.currency).toBe('BRL');
      expect(response.body.stageId).toBe(stage1.id);
      expect(response.body.status).toBe('OPEN');
      expect(response.body.probability).toBe(10);
      expect(response.body.stage).toBeDefined();
      expect(response.body.stage.name).toBe('Qualificação');
    });

    it('deve criar oportunidade com relacionamentos (contact, company, lead)', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Relacionamentos',
          value: 75000.00,
          stageId: stage2.id,
          contactId: contact1.id,
          companyId: company1.id,
          leadId: lead1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.contactId).toBe(contact1.id);
      expect(response.body.companyId).toBe(company1.id);
      expect(response.body.leadId).toBe(lead1.id);
      expect(response.body.contact).toBeDefined();
      expect(response.body.company).toBeDefined();
      expect(response.body.lead).toBeDefined();
    });

    it('deve criar oportunidade com tags', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Tags',
          value: 100000.00,
          stageId: stage3.id,
          tagIds: [tag1.id, tag2.id],
        });

      expect(response.status).toBe(201);
      expect(response.body.tags).toHaveLength(2);
      expect(response.body.tags.map((t: any) => t.id)).toContain(tag1.id);
      expect(response.body.tags.map((t: any) => t.id)).toContain(tag2.id);
    });

    it('deve usar probability do PipelineStage se não fornecida', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Probability do Estágio',
          value: 25000.00,
          stageId: stage4.id, // probability: 90
        });

      expect(response.status).toBe(201);
      expect(response.body.probability).toBe(90); // Usa probability do estágio
    });

    it('deve rejeitar oportunidade sem name', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          value: 50000.00,
          stageId: stage1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar oportunidade sem value', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio sem Value',
          stageId: stage1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar oportunidade sem stageId', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio sem Stage',
          value: 50000.00,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar value <= 0', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Value Inválido',
          value: -1000,
          stageId: stage1.id,
        });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar probability fora do range 0-100', async () => {
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
    });

    it('deve rejeitar closeDate no passado', async () => {
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
    });

    it('deve rejeitar stageId inválido', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Stage Inválido',
          value: 50000.00,
          stageId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(404);
    });

    it('deve rejeitar stageId de outro tenant', async () => {
      // Criar stage no tenant2
      const stageTenant2 = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline2.id,
          tenantId: tenant2.id,
          name: 'Estágio Tenant 2',
          order: 1,
          probability: 10,
        },
      });

      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Negócio com Stage de Outro Tenant',
          value: 50000.00,
          stageId: stageTenant2.id,
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/opportunities - Listar oportunidades', () => {
    it('deve listar oportunidades do tenant atual', async () => {
      // Criar algumas oportunidades primeiro
      await prisma.opportunity.createMany({
        data: [
          {
            tenantId: tenant1.id,
            name: 'Oportunidade 1',
            value: new Prisma.Decimal(10000),
            currency: 'BRL',
            stageId: stage1.id,
            status: 'OPEN',
            probability: 10,
          },
          {
            tenantId: tenant1.id,
            name: 'Oportunidade 2',
            value: new Prisma.Decimal(20000),
            currency: 'BRL',
            stageId: stage2.id,
            status: 'OPEN',
            probability: 30,
          },
        ],
      });

      const response = await request(app)
        .get('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
    });

    it('deve filtrar oportunidades por stageId', async () => {
      const response = await request(app)
        .get(`/api/opportunities?stageId=${stage1.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((opp: any) => {
        expect(opp.stageId).toBe(stage1.id);
      });
    });

    it('deve filtrar oportunidades por status', async () => {
      await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade WON',
          value: new Prisma.Decimal(30000),
          currency: 'BRL',
          stageId: stage4.id,
          status: 'WON',
          probability: 90,
        },
      });

      const response = await request(app)
        .get('/api/opportunities?status=WON')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((opp: any) => {
        expect(opp.status).toBe('WON');
      });
    });

    it('deve filtrar oportunidades por contactId', async () => {
      const opp = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade com Contact',
          value: new Prisma.Decimal(40000),
          currency: 'BRL',
          stageId: stage2.id,
          status: 'OPEN',
          contactId: contact1.id,
          probability: 30,
        },
      });

      const response = await request(app)
        .get(`/api/opportunities?contactId=${contact1.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((o: any) => {
        expect(o.contactId).toBe(contact1.id);
      });
    });

    it('deve filtrar oportunidades por companyId', async () => {
      const opp = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade com Company',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage3.id,
          status: 'OPEN',
          companyId: company1.id,
          probability: 60,
        },
      });

      const response = await request(app)
        .get(`/api/opportunities?companyId=${company1.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((o: any) => {
        expect(o.companyId).toBe(company1.id);
      });
    });

    it('deve paginar resultados', async () => {
      const response = await request(app)
        .get('/api/opportunities?limit=2&offset=0')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('deve ordenar por value', async () => {
      const response = await request(app)
        .get('/api/opportunities?orderBy=value&order=desc')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      if (response.body.data.length > 1) {
        const values = response.body.data.map((opp: any) => opp.value);
        for (let i = 0; i < values.length - 1; i++) {
          expect(values[i]).toBeGreaterThanOrEqual(values[i + 1]);
        }
      }
    });

    it('deve ordenar por closeDate', async () => {
      const futureDate1 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const futureDate2 = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

      await prisma.opportunity.createMany({
        data: [
          {
            tenantId: tenant1.id,
            name: 'Oportunidade Data 1',
            value: new Prisma.Decimal(10000),
            currency: 'BRL',
            stageId: stage1.id,
            status: 'OPEN',
            closeDate: futureDate1,
            probability: 10,
          },
          {
            tenantId: tenant1.id,
            name: 'Oportunidade Data 2',
            value: new Prisma.Decimal(20000),
            currency: 'BRL',
            stageId: stage2.id,
            status: 'OPEN',
            closeDate: futureDate2,
            probability: 30,
          },
        ],
      });

      const response = await request(app)
        .get('/api/opportunities?orderBy=closeDate&order=asc')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      if (response.body.data.length > 1) {
        const dates = response.body.data
          .filter((opp: any) => opp.closeDate)
          .map((opp: any) => new Date(opp.closeDate).getTime());
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeLessThanOrEqual(dates[i + 1]);
        }
      }
    });
  });

  describe('GET /api/opportunities/:id - Obter oportunidade específica', () => {
    it('deve retornar oportunidade existente', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade Get',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      const response = await request(app)
        .get(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(opportunity.id);
      expect(response.body.name).toBe('Oportunidade Get');
      expect(response.body.stage).toBeDefined();
      expect(response.body.stage.id).toBe(stage1.id);
    });

    it('deve retornar 404 para oportunidade inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/opportunities/${fakeId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar 404 para oportunidade de outro tenant', async () => {
      const stageTenant2 = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline2.id,
          tenantId: tenant2.id,
          name: 'Estágio Tenant 2',
          order: 1,
          probability: 10,
        },
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant2.id,
          name: 'Oportunidade Tenant 2',
          value: new Prisma.Decimal(10000),
          currency: 'BRL',
          stageId: stageTenant2.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      const response = await request(app)
        .get(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/opportunities/:id - Atualizar oportunidade', () => {
    it('deve atualizar oportunidade existente', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade Update',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Oportunidade Updated',
          value: 60000.00,
          status: 'WON',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Oportunidade Updated');
      expect(response.body.value).toBe(60000.00);
      expect(response.body.status).toBe('WON');
    });

    it('deve atualizar stageId e usar probability do novo estágio', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade Stage Update',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          stageId: stage4.id, // probability: 90
        });

      expect(response.status).toBe(200);
      expect(response.body.stageId).toBe(stage4.id);
      expect(response.body.probability).toBe(90); // Usa probability do novo estágio
    });

    it('deve atualizar tags (substituir completamente)', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade Tags',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      // Adicionar tag inicial
      await prisma.opportunityTag.create({
        data: {
          opportunityId: opportunity.id,
          tagId: tag1.id,
        },
      });

      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          tagIds: [tag2.id],
        });

      expect(response.status).toBe(200);
      expect(response.body.tags).toHaveLength(1);
      expect(response.body.tags[0].id).toBe(tag2.id);
    });

    it('deve remover relacionamentos (contactId, companyId, leadId) quando null', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade com Relacionamentos',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
          contactId: contact1.id,
          companyId: company1.id,
          leadId: lead1.id,
          probability: 10,
        },
      });

      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          contactId: null,
          companyId: null,
          leadId: null,
        });

      expect(response.status).toBe(200);
      expect(response.body.contactId).toBeNull();
      expect(response.body.companyId).toBeNull();
      expect(response.body.leadId).toBeNull();
    });

    it('deve retornar 404 para oportunidade de outro tenant', async () => {
      const stageTenant2 = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline2.id,
          tenantId: tenant2.id,
          name: 'Estágio Tenant 2',
          order: 1,
          probability: 10,
        },
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant2.id,
          name: 'Oportunidade Tenant 2',
          value: new Prisma.Decimal(10000),
          currency: 'BRL',
          stageId: stageTenant2.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Updated',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/opportunities/:id - Deletar oportunidade', () => {
    it('deve fazer soft delete da oportunidade', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade Delete',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      const response = await request(app)
        .delete(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deletada com sucesso');
      expect(response.body.id).toBe(opportunity.id);

      // Verificar que oportunidade não aparece mais em listagens
      const listResponse = await request(app)
        .get('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      const deletedOpp = listResponse.body.data.find((o: any) => o.id === opportunity.id);
      expect(deletedOpp).toBeUndefined();

      // Verificar que deletedAt foi preenchido
      const deleted = await prisma.opportunity.findUnique({
        where: { id: opportunity.id },
      });
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('deve retornar 404 para oportunidade inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/opportunities/${fakeId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar 404 para oportunidade de outro tenant', async () => {
      const stageTenant2 = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline2.id,
          tenantId: tenant2.id,
          name: 'Estágio Tenant 2',
          order: 1,
          probability: 10,
        },
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant2.id,
          name: 'Oportunidade Tenant 2',
          value: new Prisma.Decimal(10000),
          currency: 'BRL',
          stageId: stageTenant2.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      const response = await request(app)
        .delete(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Isolamento Multi-Tenant', () => {
    it('deve listar apenas oportunidades do tenant atual', async () => {
      // Criar estágio e oportunidade no tenant2
      const stageTenant2 = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline2.id,
          tenantId: tenant2.id,
          name: 'Estágio Tenant 2',
          order: 1,
          probability: 10,
        },
      });

      await prisma.opportunity.create({
        data: {
          tenantId: tenant2.id,
          name: 'Oportunidade Tenant 2',
          value: new Prisma.Decimal(10000),
          currency: 'BRL',
          stageId: stageTenant2.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      const response = await request(app)
        .get('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((opp: any) => {
        expect(opp.tenantId).toBe(tenant1.id);
      });
    });
  });

  describe('Auditoria', () => {
    it('deve registrar auditoria ao criar oportunidade', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Oportunidade Auditoria Create',
          value: 50000.00,
          stageId: stage1.id,
        });

      expect(response.status).toBe(201);
      const opportunityId = response.body.id;

      // Aguardar auditoria ser registrada
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Opportunity',
        entityId: opportunityId,
        action: 'create',
      });

      expect(auditFound).toBe(true);

      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Opportunity',
        entityId: opportunityId,
        action: 'create',
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      const createLog = auditLogs[0];
      expect(createLog.entityType).toBe('Opportunity');
      expect(createLog.entityId).toBe(opportunityId);
      expect(createLog.action).toBe('create');
      expect(createLog.userId).toBe(adminUser1.id);
    });

    it('deve registrar auditoria ao atualizar oportunidade', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade Auditoria Update',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      const response = await request(app)
        .put(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Oportunidade Auditoria Updated',
          value: 60000.00,
        });

      expect(response.status).toBe(200);

      // Aguardar auditoria ser registrada
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Opportunity',
        entityId: opportunity.id,
        action: 'update',
      });

      expect(auditFound).toBe(true);

      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Opportunity',
        entityId: opportunity.id,
        action: 'update',
      });

      const updateLog = auditLogs[0];
      expect(updateLog).toBeDefined();
      expect(updateLog.action).toBe('update');
      expect(updateLog.changes).toBeDefined();
    });

    it('deve registrar auditoria ao deletar oportunidade', async () => {
      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId: tenant1.id,
          name: 'Oportunidade Auditoria Delete',
          value: new Prisma.Decimal(50000),
          currency: 'BRL',
          stageId: stage1.id,
          status: 'OPEN',
          probability: 10,
        },
      });

      const response = await request(app)
        .delete(`/api/opportunities/${opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);

      // Aguardar auditoria ser registrada
      const auditFound = await waitForAuditLog(tenant1.id, {
        entityType: 'Opportunity',
        entityId: opportunity.id,
        action: 'delete',
      });

      expect(auditFound).toBe(true);

      const auditLogs = await getAuditLogs(tenant1.id, {
        entityType: 'Opportunity',
        entityId: opportunity.id,
        action: 'delete',
      });

      const deleteLog = auditLogs[0];
      expect(deleteLog).toBeDefined();
      expect(deleteLog.action).toBe('delete');
    });
  });
});
