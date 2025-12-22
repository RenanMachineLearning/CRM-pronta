/**
 * Testes E2E para relacionamentos entre entidades
 * 
 * Valida criação, listagem e deleção de relacionamentos (oneToMany e manyToMany).
 * Testa validações de invariantes, unicidade de nome e permissões ACL.
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
  createTestEntity,
  closeDatabase,
  getAuditLogs,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';

describe('Relationships - E2E Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string; email: string; password: string };
  let adminToken: string;
  let adminRole: { id: string };
  let contactEntity: { id: string };
  let companyEntity: { id: string };
  let leadEntity: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Relationships Test Tenant',
      slug: 'relationships-test-tenant',
      status: 'ACTIVE',
    });
    tenant = { id: tenantObj.id, slug: tenantObj.slug };

    // Criar roles padrão
    const roles = await createStandardRoles(tenant.id);
    adminRole = roles.admin;

    // Criar permissões para Relationship
    // Nota: createStandardRoles cria permissões para entidades padrão, mas Relationship
    // não está na lista padrão. Como Admin recebe TODAS as permissões existentes,
    // precisamos criar as permissões de Relationship para que Admin tenha acesso.
    const relationshipPermissions = await Promise.all([
      createTestPermission({ tenantId: tenant.id, entity: 'Relationship', action: 'create' }),
      createTestPermission({ tenantId: tenant.id, entity: 'Relationship', action: 'read' }),
      createTestPermission({ tenantId: tenant.id, entity: 'Relationship', action: 'list' }),
      createTestPermission({ tenantId: tenant.id, entity: 'Relationship', action: 'delete' }),
    ]);

    // Associar permissões ao Admin (Admin recebe todas as permissões via seed, mas como
    // criamos permissões fora do seed, precisamos associar manualmente)
    const { prisma } = await import('../helpers/db');
    await prisma.rolePermission.createMany({
      data: relationshipPermissions.map((perm) => ({
        roleId: adminRole.id,
        permissionId: perm.id,
      })),
      skipDuplicates: true,
    });

    // Criar usuário Admin
    const adminUserObj = await createTestUser({
      email: 'admin@relationships.test',
      password: 'AdminPass123',
      name: 'Admin User',
      tenantId: tenant.id,
    });
    adminUser = { ...adminUserObj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser.id, adminRole.id);
    adminToken = generateToken(adminUser.id, tenant.id);

    // Criar entidades de teste
    contactEntity = await createTestEntity({
      tenantId: tenant.id,
      name: 'Contact',
      label: 'Contato',
      isSystem: false,
    });

    companyEntity = await createTestEntity({
      tenantId: tenant.id,
      name: 'Company',
      label: 'Empresa',
      isSystem: false,
    });

    leadEntity = await createTestEntity({
      tenantId: tenant.id,
      name: 'Lead',
      label: 'Lead',
      isSystem: false,
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('Criar Relacionamento', () => {
    it('deve criar relacionamento oneToMany entre entidades', async () => {
      const response = await request(app)
        .post('/api/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          sourceEntityId: contactEntity.id,
          targetEntityId: companyEntity.id,
          type: 'oneToMany',
          name: 'companies',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('oneToMany');
      expect(response.body.name).toBe('companies');
      expect(response.body.sourceEntity.id).toBe(contactEntity.id);
      expect(response.body.targetEntity.id).toBe(companyEntity.id);
    });

    it('deve criar relacionamento manyToMany entre entidades', async () => {
      const response = await request(app)
        .post('/api/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          sourceEntityId: contactEntity.id,
          targetEntityId: leadEntity.id,
          type: 'manyToMany',
          name: 'leads',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('manyToMany');
      expect(response.body.name).toBe('leads');
      expect(response.body.sourceEntity.id).toBe(contactEntity.id);
      expect(response.body.targetEntity.id).toBe(leadEntity.id);
    });

    it('deve falhar ao criar relacionamento com entidade inexistente', async () => {
      const response = await request(app)
        .post('/api/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          sourceEntityId: '00000000-0000-0000-0000-000000000000',
          targetEntityId: companyEntity.id,
          type: 'oneToMany',
          name: 'test',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entidade não encontrada');
    });

    it('deve falhar ao criar relacionamento com tipo inválido', async () => {
      const response = await request(app)
        .post('/api/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          sourceEntityId: contactEntity.id,
          targetEntityId: companyEntity.id,
          type: 'invalidType',
          name: 'test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tipo inválido');
    });

    it('deve falhar ao criar relacionamento com nome duplicado para mesma entidade origem', async () => {
      // Criar primeiro relacionamento
      await request(app)
        .post('/api/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          sourceEntityId: contactEntity.id,
          targetEntityId: companyEntity.id,
          type: 'oneToMany',
          name: 'duplicate',
        });

      // Tentar criar segundo relacionamento com mesmo nome
      const response = await request(app)
        .post('/api/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          sourceEntityId: contactEntity.id,
          targetEntityId: leadEntity.id,
          type: 'oneToMany',
          name: 'duplicate',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Relacionamento duplicado');
    });

    it('deve permitir mesmo nome para entidades origem diferentes', async () => {
      // Criar relacionamento para Contact
      const response1 = await request(app)
        .post('/api/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          sourceEntityId: contactEntity.id,
          targetEntityId: companyEntity.id,
          type: 'oneToMany',
          name: 'sharedName',
        });

      expect(response1.status).toBe(201);

      // Criar relacionamento para Lead com mesmo nome (deve funcionar)
      const response2 = await request(app)
        .post('/api/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          sourceEntityId: leadEntity.id,
          targetEntityId: companyEntity.id,
          type: 'oneToMany',
          name: 'sharedName',
        });

      expect(response2.status).toBe(201);
    });
  });

  describe('Listar Relacionamentos', () => {
    it('deve listar relacionamentos de uma entidade', async () => {
      // Criar relacionamento primeiro
      await request(app)
        .post('/api/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          sourceEntityId: contactEntity.id,
          targetEntityId: companyEntity.id,
          type: 'oneToMany',
          name: 'listTest',
        });

      // Listar relacionamentos
      const response = await request(app)
        .get(`/api/entities/${contactEntity.id}/relationships`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('type');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('sourceEntity');
      expect(response.body[0]).toHaveProperty('targetEntity');
    });

    it('deve retornar array vazio se entidade não tem relacionamentos', async () => {
      // Criar entidade sem relacionamentos
      const newEntity = await createTestEntity({
        tenantId: tenant.id,
        name: 'NewEntity',
        label: 'Nova Entidade',
      });

      const response = await request(app)
        .get(`/api/entities/${newEntity.id}/relationships`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('deve falhar ao listar relacionamentos de entidade inexistente', async () => {
      const response = await request(app)
        .get('/api/entities/00000000-0000-0000-0000-000000000000/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Entidade não encontrada');
    });
  });

  describe('Deletar Relacionamento', () => {
    it('deve deletar relacionamento existente', async () => {
      // Criar relacionamento primeiro
      const createResponse = await request(app)
        .post('/api/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          sourceEntityId: contactEntity.id,
          targetEntityId: companyEntity.id,
          type: 'oneToMany',
          name: 'deleteTest',
        });

      const relationshipId = createResponse.body.id;

      // Deletar relacionamento
      const deleteResponse = await request(app)
        .delete(`/api/relationships/${relationshipId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toBe('Relacionamento deletado com sucesso');

      // Verificar que relacionamento foi deletado
      const listResponse = await request(app)
        .get(`/api/entities/${contactEntity.id}/relationships`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      const relationshipExists = listResponse.body.some(
        (rel: any) => rel.id === relationshipId
      );
      expect(relationshipExists).toBe(false);
    });

    it('deve falhar ao deletar relacionamento inexistente', async () => {
      const response = await request(app)
        .delete('/api/relationships/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Relacionamento não encontrado');
    });
  });

  describe('Auditoria', () => {
    it('deve gerar log de auditoria ao criar relacionamento', async () => {
      // Contar logs antes
      const logsBefore = await getAuditLogs(tenant.id, {
        entityType: 'Relationship',
        action: 'create',
      });
      const countBefore = logsBefore.length;

      // Criar relacionamento
      const createResponse = await request(app)
        .post('/api/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          sourceEntityId: contactEntity.id,
          targetEntityId: companyEntity.id,
          type: 'oneToMany',
          name: 'auditTest',
        });

      expect(createResponse.status).toBe(201);
      const relationshipId = createResponse.body.id;

      // Aguardar auditoria
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar log de auditoria
      const logsAfter = await getAuditLogs(tenant.id, {
        entityType: 'Relationship',
        action: 'create',
      });
      expect(logsAfter.length).toBeGreaterThan(countBefore);

      const auditLog = logsAfter.find((log) => log.entityId === relationshipId);
      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('create');
      expect(auditLog?.userId).toBe(adminUser.id);
      expect(auditLog?.tenantId).toBe(tenant.id);
    });

    it('deve gerar log de auditoria ao deletar relacionamento', async () => {
      // Criar relacionamento primeiro
      const createResponse = await request(app)
        .post('/api/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({
          sourceEntityId: contactEntity.id,
          targetEntityId: companyEntity.id,
          type: 'oneToMany',
          name: 'auditDeleteTest',
        });

      const relationshipId = createResponse.body.id;

      // Contar logs antes
      const logsBefore = await getAuditLogs(tenant.id, {
        entityType: 'Relationship',
        action: 'delete',
      });
      const countBefore = logsBefore.length;

      // Deletar relacionamento
      await request(app)
        .delete(`/api/relationships/${relationshipId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      // Aguardar auditoria
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar log de auditoria
      const logsAfter = await getAuditLogs(tenant.id, {
        entityType: 'Relationship',
        action: 'delete',
      });
      expect(logsAfter.length).toBeGreaterThan(countBefore);

      const auditLog = logsAfter.find((log) => log.entityId === relationshipId);
      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('delete');
      expect(auditLog?.userId).toBe(adminUser.id);
      expect(auditLog?.tenantId).toBe(tenant.id);
    });
  });
});

