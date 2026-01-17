/**
 * Testes E2E para conversão de leads em contatos e/ou oportunidades via API
 * 
 * Valida conversão de leads em contatos, oportunidades ou ambos.
 * Testa isolamento multi-tenant, validações, auditoria, permissões ACL,
 * criação de contatos com emails/telefones, criação de oportunidades com pipeline padrão.
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

describe('Lead Conversion - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };
  let pipeline1: { id: string };
  let stage1: { id: string }; // Primeiro estágio do pipeline padrão
  let company1: { id: string; name: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Lead Conversion Test Tenant 1',
      slug: 'lead-conversion-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Lead Conversion Test Tenant 2',
      slug: 'lead-conversion-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Lead (incluindo convert)
    const leadPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'list' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'convert' }),
    ]);

    const leadPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Lead', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Lead', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Lead', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Lead', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Lead', action: 'list' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Lead', action: 'convert' }),
    ]);

    // Criar permissões para Contact e Opportunity
    const contactPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'read' }),
    ]);

    const opportunityPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Opportunity', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Opportunity', action: 'read' }),
    ]);

    // Associar permissões aos Admins
    await prisma.rolePermission.createMany({
      data: [
        ...leadPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...leadPermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
        ...contactPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...opportunityPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin1@leadconversion.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@leadconversion.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Gerar tokens JWT
    adminToken1 = generateToken(adminUser1.id, tenant1.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);

    // Criar pipeline padrão e estágios para tenant1
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

    await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline1.id,
        tenantId: tenant1.id,
        name: 'Proposta',
        order: 2,
        probability: 30,
        color: '#F59E0B',
      },
    });

    // Criar empresa para testes
    company1 = await prisma.company.create({
      data: {
        tenantId: tenant1.id,
        name: 'Empresa ABC',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /api/leads/:id/convert - Converter lead em contato', () => {
    it('deve converter lead em contato com sucesso', async () => {
      // Criar lead
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'João',
          lastName: 'Silva',
          email: 'joao@example.com',
          phone: '+5511999999999',
          company: 'Empresa XYZ',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Converter lead em contato
      const convertResponse = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: true,
          createOpportunity: false,
        });

      expect(convertResponse.status).toBe(200);
      expect(convertResponse.body.lead.converted).toBe(true);
      expect(convertResponse.body.lead.convertedToContactId).toBeTruthy();
      expect(convertResponse.body.lead.convertedToOpportunityId).toBeNull();
      expect(convertResponse.body.contact).toBeTruthy();
      expect(convertResponse.body.contact.firstName).toBe('João');
      expect(convertResponse.body.contact.lastName).toBe('Silva');
      expect(convertResponse.body.contact.email).toBe('joao@example.com');
      expect(convertResponse.body.opportunity).toBeNull();

      // Verificar que contato foi criado com email e telefone
      const contactResponse = await request(app)
        .get(`/api/contacts/${convertResponse.body.contact.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(contactResponse.status).toBe(200);
      expect(contactResponse.body.emails).toHaveLength(1);
      expect(contactResponse.body.emails[0].email).toBe('joao@example.com');
      expect(contactResponse.body.emails[0].isPrimary).toBe(true);
      expect(contactResponse.body.phones).toHaveLength(1);
      expect(contactResponse.body.phones[0].phone).toBe('+5511999999999');
      expect(contactResponse.body.phones[0].isPrimary).toBe(true);

      // Verificar que lead foi atualizado
      const leadCheckResponse = await request(app)
        .get(`/api/leads/${leadId}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(leadCheckResponse.status).toBe(200);
      expect(leadCheckResponse.body.converted).toBe(true);
      expect(leadCheckResponse.body.status).toBe('CONVERTED');
      expect(leadCheckResponse.body.convertedToContactId).toBe(convertResponse.body.contact.id);
    });

    it('deve criar contato mesmo sem email válido', async () => {
      // Criar lead sem email válido
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Maria',
          lastName: 'Santos',
          email: 'email-invalido', // Email inválido
          phone: '+5511888888888',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Converter lead em contato
      const convertResponse = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: true,
          createOpportunity: false,
        });

      expect(convertResponse.status).toBe(200);
      expect(convertResponse.body.contact).toBeTruthy();
      // Email inválido não deve ser adicionado ao contato
      expect(convertResponse.body.contact.email).toBeNull();
    });

    it('deve criar contato mesmo sem telefone válido', async () => {
      // Criar lead sem telefone válido
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Pedro',
          lastName: 'Oliveira',
          email: 'pedro@example.com',
          phone: '123', // Telefone inválido
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Converter lead em contato
      const convertResponse = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: true,
          createOpportunity: false,
        });

      expect(convertResponse.status).toBe(200);
      expect(convertResponse.body.contact).toBeTruthy();
      // Telefone inválido não deve ser adicionado ao contato
    });
  });

  describe('POST /api/leads/:id/convert - Converter lead em oportunidade', () => {
    it('deve converter lead em oportunidade com sucesso usando pipeline padrão', async () => {
      // Criar lead
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Carlos',
          lastName: 'Ferreira',
          email: 'carlos@example.com',
          company: 'Empresa XYZ',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Converter lead em oportunidade
      const convertResponse = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: false,
          createOpportunity: true,
          opportunityData: {
            name: 'Negócio ABC',
            value: 50000.00,
            currency: 'BRL',
          },
        });

      expect(convertResponse.status).toBe(200);
      expect(convertResponse.body.lead.converted).toBe(true);
      expect(convertResponse.body.lead.convertedToContactId).toBeNull();
      expect(convertResponse.body.lead.convertedToOpportunityId).toBeTruthy();
      expect(convertResponse.body.contact).toBeNull();
      expect(convertResponse.body.opportunity).toBeTruthy();
      expect(convertResponse.body.opportunity.name).toBe('Negócio ABC');
      expect(convertResponse.body.opportunity.value).toBe(50000.00);
      expect(convertResponse.body.opportunity.stageId).toBe(stage1.id); // Deve usar primeiro estágio do pipeline padrão

      // Verificar que oportunidade foi criada
      const opportunityResponse = await request(app)
        .get(`/api/opportunities/${convertResponse.body.opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(opportunityResponse.status).toBe(200);
      expect(opportunityResponse.body.leadId).toBe(leadId);
      expect(opportunityResponse.body.stageId).toBe(stage1.id);
    });

    it('deve gerar nome da oportunidade automaticamente se não fornecido', async () => {
      // Criar lead
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Ana',
          lastName: 'Costa',
          email: 'ana@example.com',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Converter lead em oportunidade sem fornecer nome
      const convertResponse = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: false,
          createOpportunity: true,
          opportunityData: {
            value: 30000.00,
          },
        });

      expect(convertResponse.status).toBe(200);
      expect(convertResponse.body.opportunity.name).toBe('Oportunidade de Ana Costa');
    });

    it('deve usar stageId fornecido em vez do pipeline padrão', async () => {
      // Criar outro estágio
      const stage2 = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline1.id,
          tenantId: tenant1.id,
          name: 'Proposta',
          order: 2,
          probability: 30,
          color: '#F59E0B',
        },
      });

      // Criar lead
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Roberto',
          lastName: 'Lima',
          email: 'roberto@example.com',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Converter lead em oportunidade com stageId específico
      const convertResponse = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: false,
          createOpportunity: true,
          opportunityData: {
            value: 40000.00,
            stageId: stage2.id,
          },
        });

      expect(convertResponse.status).toBe(200);
      expect(convertResponse.body.opportunity.stageId).toBe(stage2.id);
    });
  });

  describe('POST /api/leads/:id/convert - Converter lead em contato e oportunidade', () => {
    it('deve converter lead em contato e oportunidade simultaneamente', async () => {
      // Criar lead
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Fernanda',
          lastName: 'Alves',
          email: 'fernanda@example.com',
          phone: '+5511777777777',
          company: 'Empresa ABC', // Nome da empresa que existe
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Converter lead em contato e oportunidade
      const convertResponse = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: true,
          createOpportunity: true,
          opportunityData: {
            name: 'Negócio Grande',
            value: 100000.00,
            currency: 'BRL',
          },
        });

      expect(convertResponse.status).toBe(200);
      expect(convertResponse.body.lead.converted).toBe(true);
      expect(convertResponse.body.lead.convertedToContactId).toBeTruthy();
      expect(convertResponse.body.lead.convertedToOpportunityId).toBeTruthy();
      expect(convertResponse.body.contact).toBeTruthy();
      expect(convertResponse.body.opportunity).toBeTruthy();

      // Verificar que oportunidade está associada ao contato criado
      const opportunityResponse = await request(app)
        .get(`/api/opportunities/${convertResponse.body.opportunity.id}`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(opportunityResponse.status).toBe(200);
      expect(opportunityResponse.body.contactId).toBe(convertResponse.body.contact.id);
      expect(opportunityResponse.body.companyId).toBe(company1.id); // Deve encontrar empresa pelo nome
    });
  });

  describe('POST /api/leads/:id/convert - Validações e erros', () => {
    it('deve retornar 400 se não criar contato nem oportunidade', async () => {
      // Criar lead
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Teste',
          lastName: 'Erro',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Tentar converter sem criar contato nem oportunidade
      const convertResponse = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: false,
          createOpportunity: false,
        });

      expect(convertResponse.status).toBe(400);
      expect(convertResponse.body.message).toContain('pelo menos contato ou oportunidade');
    });

    it('deve retornar 400 se criar oportunidade sem value', async () => {
      // Criar lead
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Teste',
          lastName: 'Value',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Tentar converter em oportunidade sem value
      const convertResponse = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: false,
          createOpportunity: true,
          opportunityData: {
            // value não fornecido
          },
        });

      expect(convertResponse.status).toBe(400);
      expect(convertResponse.body.message).toContain('value é obrigatório');
    });

    it('deve retornar 409 se lead já foi convertido', async () => {
      // Criar lead
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Teste',
          lastName: 'Convertido',
          email: 'teste@example.com',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Converter primeira vez
      const convertResponse1 = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: true,
          createOpportunity: false,
        });

      expect(convertResponse1.status).toBe(200);

      // Tentar converter novamente
      const convertResponse2 = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: true,
          createOpportunity: false,
        });

      expect(convertResponse2.status).toBe(409);
      expect(convertResponse2.body.message).toContain('já foi convertido');
    });

    it('deve retornar 404 se lead não encontrado', async () => {
      const fakeLeadId = '00000000-0000-0000-0000-000000000000';

      const convertResponse = await request(app)
        .post(`/api/leads/${fakeLeadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: true,
          createOpportunity: false,
        });

      expect(convertResponse.status).toBe(404);
    });

    it('deve respeitar isolamento multi-tenant', async () => {
      // Criar lead no tenant1
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Teste',
          lastName: 'Isolamento',
          email: 'teste@example.com',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Tentar converter usando tenant2
      const convertResponse = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant2.id)
        .set('Authorization', `Bearer ${adminToken2}`)
        .send({
          createContact: true,
          createOpportunity: false,
        });

      expect(convertResponse.status).toBe(404);
    });
  });

  describe('POST /api/leads/:id/convert - Auditoria', () => {
    it('deve registrar auditoria na conversão', async () => {
      // Criar lead
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          firstName: 'Auditoria',
          lastName: 'Test',
          email: 'auditoria@example.com',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Converter lead
      const convertResponse = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('X-Tenant-Id', tenant1.id)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          createContact: true,
          createOpportunity: false,
        });

      expect(convertResponse.status).toBe(200);

      // Aguardar auditoria ser registrada
      await waitForAuditLog(leadId, 'update', tenant1.id);

      // Verificar auditoria
      const auditLogs = await getAuditLogs(leadId, tenant1.id);
      const updateLog = auditLogs.find((log) => log.action === 'update' && log.changes);

      expect(updateLog).toBeTruthy();
      expect(updateLog?.entity).toBe('Lead');
      expect(updateLog?.changes).toBeTruthy();
      if (updateLog?.changes) {
        const changes = updateLog.changes as any;
        expect(changes.converted).toBeTruthy();
        expect(changes.converted.old).toBe(false);
        expect(changes.converted.new).toBe(true);
        expect(changes.status).toBeTruthy();
        expect(changes.status.new).toBe('CONVERTED');
      }
    });
  });
});
