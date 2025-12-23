/**
 * Testes E2E para CRUD completo de campos via API
 * 
 * Valida criação, leitura, atualização e deleção de campos.
 * Testa isolamento multi-tenant, validações de tipo, auditoria e permissões ACL.
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
  createTestField,
  closeDatabase,
  waitForAuditLog,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';
import { SUPPORTED_FIELD_TYPES } from '../../src/services/fieldService';

describe('Field CRUD - E2E Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let adminUser1: { id: string; email: string; password: string };
  let adminUser2: { id: string; email: string; password: string };
  let adminToken1: string;
  let adminToken2: string;
  let adminRole1: { id: string };
  let adminRole2: { id: string };
  let entity1: { id: string };
  let entity2: { id: string };
  let systemEntity: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Field CRUD Test Tenant 1',
      slug: 'field-crud-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    const tenant2Obj = await createTestTenant({
      name: 'Field CRUD Test Tenant 2',
      slug: 'field-crud-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id, slug: tenant2Obj.slug };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Field (se não existirem)
    const fieldPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Field', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Field', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Field', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Field', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Field', action: 'list' }),
    ]);

    const fieldPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Field', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Field', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Field', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Field', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Field', action: 'list' }),
    ]);

    // Associar permissões aos Admins
    const { prisma } = await import('../helpers/db');
    await prisma.rolePermission.createMany({
      data: [
        ...fieldPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...fieldPermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin1@fieldcrud.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { ...adminUser1Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser1.id, adminRole1.id);
    adminToken1 = generateToken(adminUser1.id, tenant1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@fieldcrud.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { ...adminUser2Obj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser2.id, adminRole2.id);
    adminToken2 = generateToken(adminUser2.id, tenant2.id);

    // Criar entidades de teste
    entity1 = await createTestEntity({
      tenantId: tenant1.id,
      name: 'Entity1',
      label: 'Entidade 1',
      isSystem: false,
    });

    entity2 = await createTestEntity({
      tenantId: tenant1.id,
      name: 'Entity2',
      label: 'Entidade 2',
      isSystem: false,
    });

    systemEntity = await createTestEntity({
      tenantId: tenant1.id,
      name: 'SystemEntity',
      label: 'Entidade do Sistema',
      isSystem: true,
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('POST /api/entities/:entityId/fields - Create', () => {
    it('deve criar campo customizado com sucesso', async () => {
      const response = await request(app)
        .post(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: 'testField',
          label: 'Campo de Teste',
          type: 'text',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('testField');
      expect(response.body.label).toBe('Campo de Teste');
      expect(response.body.type).toBe('text');
      expect(response.body.tenantId).toBe(tenant1.id);
      expect(response.body.entityId).toBe(entity1.id);
      expect(response.body.isDeleted).toBe(false);
    });

    it('deve validar todos os tipos de campo suportados', async () => {
      for (const type of SUPPORTED_FIELD_TYPES) {
        const fieldName = `field${type}${Date.now()}`;
        const data: any = {
          name: fieldName,
          label: `Campo ${type}`,
          type,
        };

        // Campos select precisam de opções
        if (type === 'select') {
          data.options = [
            { value: 'option1', label: 'Opção 1' },
            { value: 'option2', label: 'Opção 2' },
          ];
        }

        const response = await request(app)
          .post(`/api/entities/${entity1.id}/fields`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('X-Tenant-Id', tenant1.id)
          .send(data);

        expect(response.status).toBe(201);
        expect(response.body.type).toBe(type);
      }
    });

    it('deve rejeitar tipo de campo inválido', async () => {
      const response = await request(app)
        .post(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: 'invalidField',
          label: 'Campo Inválido',
          type: 'invalidType',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('Tipo de campo inválido');
    });

    it('deve validar que name é obrigatório', async () => {
      const response = await request(app)
        .post(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          label: 'Campo sem Nome',
          type: 'text',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Nome é obrigatório');
    });

    it('deve validar que label é obrigatório', async () => {
      const response = await request(app)
        .post(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: 'fieldWithoutLabel',
          type: 'text',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Label é obrigatório');
    });

    it('deve rejeitar entityId inválido na URL', async () => {
      const response = await request(app)
        .post('/api/entities/invalid-uuid/fields')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: 'fieldWithoutEntity',
          label: 'Campo sem Entidade',
          type: 'text',
        });

      // Entidade não encontrada retorna 404
      expect(response.status).toBe(404);
    });

    it('deve rejeitar nome duplicado na mesma entidade', async () => {
      const uniqueName = `duplicateField${Date.now()}`;

      // Criar primeiro campo
      await request(app)
        .post(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: uniqueName,
          label: 'Campo Duplicado',
          type: 'text',
        });

      // Tentar criar outro com mesmo nome na mesma entidade (deve falhar)
      const response = await request(app)
        .post(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: uniqueName,
          label: 'Campo Duplicado 2',
          type: 'text',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Nome duplicado');
    });

    it('deve permitir mesmo nome em entidades diferentes', async () => {
      const sharedName = `sharedField${Date.now()}`;

      // Criar em entity1
      const response1 = await request(app)
        .post(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: sharedName,
          label: 'Campo Compartilhado',
          type: 'text',
        });

      expect(response1.status).toBe(201);

      // Criar em entity2 com mesmo nome (deve funcionar)
      const response2 = await request(app)
        .post(`/api/entities/${entity2.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: sharedName,
          label: 'Campo Compartilhado',
          type: 'text',
        });

      expect(response2.status).toBe(201);
      expect(response2.body.name).toBe(sharedName);
      expect(response2.body.entityId).toBe(entity2.id);
      expect(response2.body.id).not.toBe(response1.body.id);
    });

    it('deve validar opções para campos select', async () => {
      const response = await request(app)
        .post(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: `selectField${Date.now()}`,
          label: 'Campo Select',
          type: 'select',
          options: [
            { value: 'option1', label: 'Opção 1' },
            { value: 'option2', label: 'Opção 2' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('select');
      expect(response.body.options).toBeDefined();
    });

    it('deve rejeitar campo select sem opções', async () => {
      const response = await request(app)
        .post(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: 'selectFieldNoOptions',
          label: 'Campo Select Sem Opções',
          type: 'select',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('select devem ter pelo menos uma opção');
    });

    it('deve gerar log de auditoria ao criar campo', async () => {
      const response = await request(app)
        .post(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          name: `auditedField${Date.now()}`,
          label: 'Campo Auditado',
          type: 'text',
        });

      expect(response.status).toBe(201);

      // Aguardar log de auditoria
      const hasLog = await waitForAuditLog(tenant1.id, {
        entityType: 'Field',
        entityId: response.body.id,
        action: 'create',
        userId: adminUser1.id,
      });

      expect(hasLog).toBe(true);
    });
  });

  describe('GET /api/entities/:entityId/fields - List', () => {
    it('deve listar campos de uma entidade ordenados por order', async () => {
      // Criar campos em ordem diferente
      await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'field3',
        label: 'Campo 3',
        type: 'text',
        order: 3,
      });
      await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'field1',
        label: 'Campo 1',
        type: 'text',
        order: 1,
      });
      await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'field2',
        label: 'Campo 2',
        type: 'text',
        order: 2,
      });

      const response = await request(app)
        .get(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);

      // Verificar ordenação
      const field1 = response.body.find((f: any) => f.name === 'field1');
      const field2 = response.body.find((f: any) => f.name === 'field2');
      const field3 = response.body.find((f: any) => f.name === 'field3');

      expect(field1).toBeDefined();
      expect(field2).toBeDefined();
      expect(field3).toBeDefined();

      const index1 = response.body.indexOf(field1);
      const index2 = response.body.indexOf(field2);
      const index3 = response.body.indexOf(field3);

      expect(index1).toBeLessThan(index2);
      expect(index2).toBeLessThan(index3);
    });

    it('deve excluir campos deletados por padrão (soft delete)', async () => {
      // Criar campo normal
      const activeField = await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'activeField',
        label: 'Campo Ativo',
        type: 'text',
      });

      // Criar campo deletado
      const deletedField = await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'deletedField',
        label: 'Campo Deletado',
        type: 'text',
      });

      // Marcar como deletado
      const { prisma } = await import('../helpers/db');
      await prisma.field.update({
        where: { id: deletedField.id },
        data: { isDeleted: true },
      });

      const response = await request(app)
        .get(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(200);
      expect(response.body.some((f: any) => f.id === activeField.id)).toBe(true);
      expect(response.body.some((f: any) => f.id === deletedField.id)).toBe(false);
    });

    it('deve isolar campos por tenant', async () => {
      // Criar campo em tenant1
      const field1 = await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'tenant1Field',
        label: 'Campo Tenant 1',
        type: 'text',
      });

      // Criar entidade e campo em tenant2
      const entity2Tenant2 = await createTestEntity({
        tenantId: tenant2.id,
        name: 'Entity2Tenant2',
        label: 'Entidade 2 Tenant 2',
      });
      const field2 = await createTestField({
        tenantId: tenant2.id,
        entityId: entity2Tenant2.id,
        name: 'tenant2Field',
        label: 'Campo Tenant 2',
        type: 'text',
      });

      const response1 = await request(app)
        .get(`/api/entities/${entity1.id}/fields`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      const response2 = await request(app)
        .get(`/api/entities/${entity2Tenant2.id}/fields`)
        .set('Authorization', `Bearer ${adminToken2}`)
        .set('X-Tenant-Id', tenant2.id);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      expect(response1.body.some((f: any) => f.id === field1.id)).toBe(true);
      expect(response1.body.some((f: any) => f.id === field2.id)).toBe(false);
      expect(response2.body.some((f: any) => f.id === field2.id)).toBe(true);
      expect(response2.body.some((f: any) => f.id === field1.id)).toBe(false);
    });
  });

  describe('GET /api/fields/:id - Get by ID', () => {
    it('deve obter campo por ID com informações da entidade', async () => {
      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'getField',
        label: 'Campo Get',
        type: 'text',
      });

      const response = await request(app)
        .get(`/api/fields/${field.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(field.id);
      expect(response.body.name).toBe('getField');
      expect(response.body.entity).toBeDefined();
      expect(response.body.entity.id).toBe(entity1.id);
    });

    it('deve lançar erro se campo não encontrado', async () => {
      const response = await request(app)
        .get('/api/fields/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Campo não encontrado');
    });
  });

  describe('PUT /api/fields/:id - Update', () => {
    it('deve atualizar campo customizado', async () => {
      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'updatableField',
        label: 'Campo Atualizável',
        type: 'text',
        required: false,
        unique: false,
      });

      const response = await request(app)
        .put(`/api/fields/${field.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          label: 'Label Atualizado',
          required: true,
          unique: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(field.id);
      expect(response.body.name).toBe('updatableField'); // name não muda
      expect(response.body.label).toBe('Label Atualizado');
      expect(response.body.required).toBe(true);
      expect(response.body.unique).toBe(true);
      expect(response.body.type).toBe('text'); // type não muda
    });

    it('não deve permitir alterar type', async () => {
      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'fixedTypeField',
        label: 'Campo Tipo Fixo',
        type: 'text',
      });

      const response = await request(app)
        .put(`/api/fields/${field.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          label: 'Novo Label',
          type: 'number', // Tentar alterar type (deve ser rejeitado)
        });

      // API rejeita tentativa de alterar type
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tipo não pode ser alterado');
    });

    it('deve rejeitar atualização de campo de entidade do sistema', async () => {
      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: systemEntity.id,
        name: 'systemFieldUpdate',
        label: 'Campo do Sistema',
        type: 'text',
      });

      const response = await request(app)
        .put(`/api/fields/${field.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          label: 'Novo Label',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Operação não permitida');
      expect(response.body.message).toContain('sistema');
    });

    it('deve gerar log de auditoria ao atualizar campo', async () => {
      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'auditedUpdateField',
        label: 'Campo Atualizado Auditado',
        type: 'text',
      });

      const response = await request(app)
        .put(`/api/fields/${field.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id)
        .send({
          label: 'Label Atualizado',
        });

      expect(response.status).toBe(200);

      // Aguardar log de auditoria
      const hasLog = await waitForAuditLog(tenant1.id, {
        entityType: 'Field',
        entityId: field.id,
        action: 'update',
        userId: adminUser1.id,
      });

      expect(hasLog).toBe(true);
    });
  });

  describe('DELETE /api/fields/:id - Delete', () => {
    it('deve fazer soft delete do campo (marcar isDeleted: true)', async () => {
      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'deletableField',
        label: 'Campo Deletável',
        type: 'text',
      });

      const response = await request(app)
        .delete(`/api/fields/${field.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(200);

      // Verificar que campo foi marcado como deletado
      const { prisma } = await import('../helpers/db');
      const deleted = await prisma.field.findUnique({
        where: { id: field.id },
      });

      expect(deleted).toBeDefined();
      expect(deleted?.isDeleted).toBe(true);
    });

    it('deve rejeitar deleção de campo de entidade do sistema', async () => {
      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: systemEntity.id,
        name: 'systemFieldDelete',
        label: 'Campo do Sistema',
        type: 'text',
      });

      const response = await request(app)
        .delete(`/api/fields/${field.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Operação não permitida');
      expect(response.body.message).toContain('sistema');
    });

    it('deve gerar log de auditoria ao deletar campo', async () => {
      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'auditedDeleteField',
        label: 'Campo Deletado Auditado',
        type: 'text',
      });

      const response = await request(app)
        .delete(`/api/fields/${field.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('X-Tenant-Id', tenant1.id);

      expect(response.status).toBe(200);

      // Aguardar log de auditoria
      const hasLog = await waitForAuditLog(tenant1.id, {
        entityType: 'Field',
        entityId: field.id,
        action: 'delete',
        userId: adminUser1.id,
      });

      expect(hasLog).toBe(true);
    });
  });
});

