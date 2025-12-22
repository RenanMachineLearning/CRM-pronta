/**
 * Testes E2E para opções de campos select
 * 
 * Valida obtenção e atualização de opções de campos do tipo select.
 * Testa validações de formato, campos deletados e preparação para quando dados existirem.
 */

import request from 'supertest';
import { app } from '../../src/index';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  assignRoleToUser,
  createStandardRoles,
  createTestEntity,
  createTestField,
  closeDatabase,
} from '../helpers/db';
import { generateToken } from '../../src/utils/jwt';

describe('Field Options - E2E Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string; email: string; password: string };
  let adminToken: string;
  let adminRole: { id: string };
  let contactEntity: { id: string };
  let selectField: { id: string };
  let textField: { id: string };
  let deletedField: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Field Options Test Tenant',
      slug: 'field-options-test-tenant',
      status: 'ACTIVE',
    });
    tenant = { id: tenantObj.id, slug: tenantObj.slug };

    // Criar roles padrão
    const roles = await createStandardRoles(tenant.id);
    adminRole = roles.admin;

    // Criar permissões para Field
    const { createTestPermission } = await import('../helpers/db');
    await Promise.all([
      createTestPermission({ tenantId: tenant.id, entity: 'Field', action: 'read' }),
      createTestPermission({ tenantId: tenant.id, entity: 'Field', action: 'update' }),
    ]);

    // Criar usuário Admin
    const adminUserObj = await createTestUser({
      email: 'admin@fieldoptions.test',
      password: 'AdminPass123',
      name: 'Admin User',
      tenantId: tenant.id,
    });
    adminUser = { ...adminUserObj, password: 'AdminPass123' };
    await assignRoleToUser(adminUser.id, adminRole.id);
    adminToken = generateToken(adminUser.id, tenant.id);

    // Criar entidade de teste
    contactEntity = await createTestEntity({
      tenantId: tenant.id,
      name: 'Contact',
      label: 'Contato',
      isSystem: true,
    });

    // Criar campos de teste
    selectField = await createTestField({
      tenantId: tenant.id,
      entityId: contactEntity.id,
      name: 'status',
      label: 'Status',
      type: 'select',
      required: false,
      unique: false,
      order: 1,
    });

    // Atualizar campo select com opções iniciais
    const { prisma } = await import('../helpers/db');
    await prisma.field.update({
      where: { id: selectField.id },
      data: {
        options: [
          { value: 'active', label: 'Ativo' },
          { value: 'inactive', label: 'Inativo' },
          { value: 'archived', label: 'Arquivado' },
        ],
      },
    });

    textField = await createTestField({
      tenantId: tenant.id,
      entityId: contactEntity.id,
      name: 'name',
      label: 'Nome',
      type: 'text',
      required: true,
      unique: false,
      order: 2,
    });

    deletedField = await createTestField({
      tenantId: tenant.id,
      entityId: contactEntity.id,
      name: 'deletedField',
      label: 'Campo Deletado',
      type: 'select',
      required: false,
      unique: false,
      order: 3,
    });

    // Soft delete do campo
    await prisma.field.update({
      where: { id: deletedField.id },
      data: { isDeleted: true },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('GET /api/fields/:id/options', () => {
    it('deve retornar opções de campo select', async () => {
      const response = await request(app)
        .get(`/api/fields/${selectField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(response.body[0]).toHaveProperty('value');
      expect(response.body[0]).toHaveProperty('label');
      expect(response.body[0].value).toBe('active');
      expect(response.body[0].label).toBe('Ativo');
    });

    it('deve retornar array vazio se campo não tem opções', async () => {
      // Criar campo select sem opções
      const fieldWithoutOptions = await createTestField({
        tenantId: tenant.id,
        entityId: contactEntity.id,
        name: 'emptySelect',
        label: 'Select Vazio',
        type: 'select',
        required: false,
        unique: false,
        order: 4,
      });

      const response = await request(app)
        .get(`/api/fields/${fieldWithoutOptions.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('deve falhar ao obter opções de campo não-select', async () => {
      const response = await request(app)
        .get(`/api/fields/${textField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tipo inválido');
      expect(response.body.message).toBe('Campo não é do tipo select');
    });

    it('deve falhar ao obter opções de campo deletado', async () => {
      const response = await request(app)
        .get(`/api/fields/${deletedField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Campo deletado');
      expect(response.body.message).toBe('Campo deletado não pode ter opções acessadas');
    });

    it('deve falhar ao obter opções de campo inexistente', async () => {
      const response = await request(app)
        .get('/api/fields/00000000-0000-0000-0000-000000000000/options')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Campo não encontrado');
    });

    it('deve requerer autenticação', async () => {
      const response = await request(app)
        .get(`/api/fields/${selectField.id}/options`)
        .set('X-Tenant-Id', tenant.id);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/fields/:id/options', () => {
    it('deve atualizar opções de campo select', async () => {
      const newOptions = [
        { value: 'active', label: 'Ativo', color: '#00FF00' },
        { value: 'inactive', label: 'Inativo', color: '#FF0000' },
        { value: 'archived', label: 'Arquivado', color: '#808080' },
        { value: 'new', label: 'Novo', color: '#0000FF' },
      ];

      const response = await request(app)
        .put(`/api/fields/${selectField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send(newOptions);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Opções atualizadas com sucesso');
      expect(Array.isArray(response.body.options)).toBe(true);
      expect(response.body.options.length).toBe(4);
      expect(response.body.options[0].value).toBe('active');
      expect(response.body.options[0].label).toBe('Ativo');
      expect(response.body.options[0].color).toBe('#00FF00');
    });

    it('deve preservar ordem das opções', async () => {
      const orderedOptions = [
        { value: 'zebra', label: 'Zebra' },
        { value: 'alpha', label: 'Alpha' },
        { value: 'beta', label: 'Beta' },
      ];

      const response = await request(app)
        .put(`/api/fields/${selectField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send(orderedOptions);

      expect(response.status).toBe(200);
      expect(response.body.options[0].value).toBe('zebra');
      expect(response.body.options[1].value).toBe('alpha');
      expect(response.body.options[2].value).toBe('beta');
    });

    it('deve falhar ao atualizar opções de campo não-select', async () => {
      const response = await request(app)
        .put(`/api/fields/${textField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send([{ value: 'test', label: 'Test' }]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tipo inválido');
      expect(response.body.message).toBe('Campo não é do tipo select');
    });

    it('deve falhar ao atualizar opções de campo deletado', async () => {
      const response = await request(app)
        .put(`/api/fields/${deletedField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send([{ value: 'test', label: 'Test' }]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Campo deletado');
      expect(response.body.message).toBe('Campo deletado não pode ter opções alteradas');
    });

    it('deve falhar ao atualizar com formato inválido (não é array)', async () => {
      const response = await request(app)
        .put(`/api/fields/${selectField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send({ value: 'test', label: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Formato inválido');
      expect(response.body.message).toBe('Opções devem ser um array');
    });

    it('deve falhar ao atualizar com array vazio', async () => {
      const response = await request(app)
        .put(`/api/fields/${selectField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send([]);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('pelo menos uma opção');
    });

    it('deve falhar ao atualizar com valores duplicados', async () => {
      const duplicateOptions = [
        { value: 'test', label: 'Test 1' },
        { value: 'test', label: 'Test 2' },
      ];

      const response = await request(app)
        .put(`/api/fields/${selectField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send(duplicateOptions);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('Valor duplicado nas opções');
    });

    it('deve falhar ao atualizar com opção sem value', async () => {
      const invalidOptions = [
        { label: 'Test' },
      ];

      const response = await request(app)
        .put(`/api/fields/${selectField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send(invalidOptions);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('campo "value"');
    });

    it('deve falhar ao atualizar com opção sem label', async () => {
      const invalidOptions = [
        { value: 'test' },
      ];

      const response = await request(app)
        .put(`/api/fields/${selectField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send(invalidOptions);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.message).toContain('campo "label"');
    });

    it('deve permitir atualizar apenas label e color mantendo value', async () => {
      const updatedOptions = [
        { value: 'active', label: 'Ativo Atualizado', color: '#00FF00' },
        { value: 'inactive', label: 'Inativo Atualizado', color: '#FF0000' },
      ];

      const response = await request(app)
        .put(`/api/fields/${selectField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send(updatedOptions);

      expect(response.status).toBe(200);
      expect(response.body.options[0].value).toBe('active');
      expect(response.body.options[0].label).toBe('Ativo Atualizado');
      expect(response.body.options[0].color).toBe('#00FF00');
    });

    it('deve requerer autenticação', async () => {
      const response = await request(app)
        .put(`/api/fields/${selectField.id}/options`)
        .set('X-Tenant-Id', tenant.id)
        .send([{ value: 'test', label: 'Test' }]);

      expect(response.status).toBe(401);
    });

    it('deve requerer permissão Field.update', async () => {
      // Criar usuário sem permissão
      const { createTestUser, assignRoleToUser } = await import('../helpers/db');
      const { createStandardRoles } = await import('../helpers/db');
      
      const roles = await createStandardRoles(tenant.id);
      const userObj = await createTestUser({
        email: 'user@fieldoptions.test',
        password: 'UserPass123',
        name: 'User',
        tenantId: tenant.id,
      });
      await assignRoleToUser(userObj.id, roles.visualizador.id);
      const userToken = generateToken(userObj.id, tenant.id);

      const response = await request(app)
        .put(`/api/fields/${selectField.id}/options`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send([{ value: 'test', label: 'Test' }]);

      expect(response.status).toBe(403);
    });
  });

  describe('Validação de Valores Existentes (Preparatória)', () => {
    it('deve estar preparado para validar valores existentes quando tabelas existirem', async () => {
      // Por enquanto, apenas validar estrutura
      // Quando tabelas existirem (Etapas 5-7 para sistema, seção 10 para customizadas),
      // a validação de valores existentes será implementada

      const options = [
        { value: 'existing', label: 'Existente' },
        { value: 'new', label: 'Nova' },
      ];

      const response = await request(app)
        .put(`/api/fields/${selectField.id}/options`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', tenant.id)
        .send(options);

      // Por enquanto, deve funcionar (apenas valida estrutura)
      expect(response.status).toBe(200);

      // Quando dados existirem, este teste deve ser atualizado para:
      // 1. Criar registro com valor 'old' que não está mais nas opções
      // 2. Tentar atualizar opções removendo 'old' → deve falhar
      // 3. Tentar atualizar opções mantendo 'old' → deve funcionar
    });
  });
});

