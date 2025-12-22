/**
 * Testes unitários para EntityService
 * 
 * Testa lógica de negócio isoladamente usando banco de dados real.
 * Foca em validações, regras de negócio e transformações de dados.
 */

import { EntityService, CreateEntityData, UpdateEntityData } from '../../src/services/entityService';
import {
  cleanDatabase,
  createTestTenant,
  createTestEntity,
  createTestField,
  closeDatabase,
} from '../helpers/db';

describe('EntityService', () => {
  let tenant1: { id: string };
  let tenant2: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Tenant 1',
      slug: 'tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id };

    const tenant2Obj = await createTestTenant({
      name: 'Tenant 2',
      slug: 'tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id };
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('createEntity', () => {
    it('deve criar entidade customizada com sucesso', async () => {
      const data: CreateEntityData = {
        name: 'TestEntity',
        label: 'Entidade de Teste',
      };

      const entity = await EntityService.createEntity(tenant1.id, data);

      expect(entity).toBeDefined();
      expect(entity.name).toBe('TestEntity');
      expect(entity.label).toBe('Entidade de Teste');
      expect(entity.tenantId).toBe(tenant1.id);
      expect(entity.isSystem).toBe(false);
      expect(entity.id).toBeDefined();
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
    });

    it('deve validar que nome deve começar com letra', async () => {
      const data: CreateEntityData = {
        name: '123Invalid',
        label: 'Nome Inválido',
      };

      await expect(EntityService.createEntity(tenant1.id, data)).rejects.toThrow(
        'Nome da entidade deve começar com letra e conter apenas letras e números'
      );
    });

    it('deve validar que nome contém apenas letras e números', async () => {
      const data: CreateEntityData = {
        name: 'Test-Entity',
        label: 'Nome Inválido',
      };

      await expect(EntityService.createEntity(tenant1.id, data)).rejects.toThrow(
        'Nome da entidade deve começar com letra e conter apenas letras e números'
      );
    });

    it('deve validar que nome é único por tenant', async () => {
      const data: CreateEntityData = {
        name: 'UniqueEntity',
        label: 'Entidade Única',
      };

      // Criar primeira entidade
      await EntityService.createEntity(tenant1.id, data);

      // Tentar criar outra com mesmo nome no mesmo tenant (deve falhar)
      await expect(EntityService.createEntity(tenant1.id, data)).rejects.toThrow(
        'Nome da entidade já existe neste tenant'
      );
    });

    it('deve permitir mesmo nome em tenants diferentes (isolamento)', async () => {
      const data: CreateEntityData = {
        name: 'SharedName',
        label: 'Nome Compartilhado',
      };

      // Criar em tenant1
      const entity1 = await EntityService.createEntity(tenant1.id, data);
      expect(entity1.name).toBe('SharedName');

      // Criar em tenant2 com mesmo nome (deve funcionar)
      const entity2 = await EntityService.createEntity(tenant2.id, data);
      expect(entity2.name).toBe('SharedName');
      expect(entity2.tenantId).toBe(tenant2.id);
      expect(entity2.id).not.toBe(entity1.id);
    });

    it('deve aceitar nome começando com letra minúscula', async () => {
      const data: CreateEntityData = {
        name: 'testEntity',
        label: 'Entidade Teste',
      };

      const entity = await EntityService.createEntity(tenant1.id, data);
      expect(entity.name).toBe('testEntity');
    });

    it('deve aceitar nome com números após letra', async () => {
      const data: CreateEntityData = {
        name: 'Entity123',
        label: 'Entidade 123',
      };

      const entity = await EntityService.createEntity(tenant1.id, data);
      expect(entity.name).toBe('Entity123');
    });
  });

  describe('listEntities', () => {
    it('deve listar entidades do tenant com contagem de campos', async () => {
      // Criar algumas entidades
      const entity1 = await createTestEntity({
        tenantId: tenant1.id,
        name: 'Entity1',
        label: 'Entidade 1',
      });
      const entity2 = await createTestEntity({
        tenantId: tenant1.id,
        name: 'Entity2',
        label: 'Entidade 2',
      });

      // Criar campos para entity1
      await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'field1',
        label: 'Campo 1',
        type: 'text',
      });
      await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'field2',
        label: 'Campo 2',
        type: 'number',
      });

      const entities = await EntityService.listEntities(tenant1.id);

      expect(entities.length).toBeGreaterThanOrEqual(2);
      const foundEntity1 = entities.find((e) => e.id === entity1.id);
      expect(foundEntity1).toBeDefined();
      expect(foundEntity1?.fieldsCount).toBe(2);

      const foundEntity2 = entities.find((e) => e.id === entity2.id);
      expect(foundEntity2).toBeDefined();
      expect(foundEntity2?.fieldsCount).toBe(0);
    });

    it('deve isolar entidades por tenant', async () => {
      // Criar entidade em tenant1
      await createTestEntity({
        tenantId: tenant1.id,
        name: 'Tenant1Entity',
        label: 'Entidade Tenant 1',
      });

      // Criar entidade em tenant2
      await createTestEntity({
        tenantId: tenant2.id,
        name: 'Tenant2Entity',
        label: 'Entidade Tenant 2',
      });

      const tenant1Entities = await EntityService.listEntities(tenant1.id);
      const tenant2Entities = await EntityService.listEntities(tenant2.id);

      // Verificar que cada tenant vê apenas suas entidades
      const tenant1HasOwn = tenant1Entities.some((e) => e.name === 'Tenant1Entity');
      const tenant1HasOther = tenant1Entities.some((e) => e.name === 'Tenant2Entity');

      const tenant2HasOwn = tenant2Entities.some((e) => e.name === 'Tenant2Entity');
      const tenant2HasOther = tenant2Entities.some((e) => e.name === 'Tenant1Entity');

      expect(tenant1HasOwn).toBe(true);
      expect(tenant1HasOther).toBe(false);
      expect(tenant2HasOwn).toBe(true);
      expect(tenant2HasOther).toBe(false);
    });

    it('deve ordenar entidades por data de criação (mais recente primeiro)', async () => {
      const entity1 = await createTestEntity({
        tenantId: tenant1.id,
        name: 'OldEntity',
        label: 'Entidade Antiga',
      });

      // Aguardar um pouco para garantir diferença de timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const entity2 = await createTestEntity({
        tenantId: tenant1.id,
        name: 'NewEntity',
        label: 'Entidade Nova',
      });

      const entities = await EntityService.listEntities(tenant1.id);

      const index1 = entities.findIndex((e) => e.id === entity1.id);
      const index2 = entities.findIndex((e) => e.id === entity2.id);

      // entity2 (mais recente) deve aparecer antes de entity1
      expect(index2).toBeLessThan(index1);
    });
  });

  describe('getEntityById', () => {
    it('deve obter entidade por ID com campos e relacionamentos', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityWithFields',
        label: 'Entidade com Campos',
      });

      // Criar campos
      const field1 = await createTestField({
        tenantId: tenant1.id,
        entityId: entity.id,
        name: 'field1',
        label: 'Campo 1',
        type: 'text',
        order: 1,
      });
      const field2 = await createTestField({
        tenantId: tenant1.id,
        entityId: entity.id,
        name: 'field2',
        label: 'Campo 2',
        type: 'number',
        order: 2,
      });

      const result = await EntityService.getEntityById(tenant1.id, entity.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(entity.id);
      expect(result.name).toBe('EntityWithFields');
      expect(result.fields).toBeDefined();
      expect(result.fields?.length).toBe(2);
      expect(result.fields?.[0].id).toBe(field1.id);
      expect(result.fields?.[1].id).toBe(field2.id);
      expect(result.relationships).toBeDefined();
      expect(Array.isArray(result.relationships)).toBe(true);
    });

    it('deve excluir campos deletados (soft delete)', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityWithDeletedFields',
        label: 'Entidade com Campos Deletados',
      });

      // Criar campo normal
      const activeField = await createTestField({
        tenantId: tenant1.id,
        entityId: entity.id,
        name: 'activeField',
        label: 'Campo Ativo',
        type: 'text',
      });

      // Criar campo deletado
      const deletedField = await createTestField({
        tenantId: tenant1.id,
        entityId: entity.id,
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

      const result = await EntityService.getEntityById(tenant1.id, entity.id);

      expect(result.fields).toBeDefined();
      expect(result.fields?.length).toBe(1);
      expect(result.fields?.[0].id).toBe(activeField.id);
      expect(result.fields?.some((f) => f.id === deletedField.id)).toBe(false);
    });

    it('deve ordenar campos por order', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityOrdered',
        label: 'Entidade Ordenada',
      });

      // Criar campos em ordem diferente
      const field3 = await createTestField({
        tenantId: tenant1.id,
        entityId: entity.id,
        name: 'field3',
        label: 'Campo 3',
        type: 'text',
        order: 3,
      });
      const field1 = await createTestField({
        tenantId: tenant1.id,
        entityId: entity.id,
        name: 'field1',
        label: 'Campo 1',
        type: 'text',
        order: 1,
      });
      const field2 = await createTestField({
        tenantId: tenant1.id,
        entityId: entity.id,
        name: 'field2',
        label: 'Campo 2',
        type: 'text',
        order: 2,
      });

      const result = await EntityService.getEntityById(tenant1.id, entity.id);

      expect(result.fields?.length).toBe(3);
      expect(result.fields?.[0].id).toBe(field1.id);
      expect(result.fields?.[1].id).toBe(field2.id);
      expect(result.fields?.[2].id).toBe(field3.id);
    });

    it('deve lançar erro se entidade não encontrada', async () => {
      await expect(
        EntityService.getEntityById(tenant1.id, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Entidade não encontrada');
    });

    it('deve lançar erro se entidade pertence a outro tenant (isolamento)', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'IsolatedEntity',
        label: 'Entidade Isolada',
      });

      // Tentar buscar com tenant2 (deve falhar)
      await expect(EntityService.getEntityById(tenant2.id, entity.id)).rejects.toThrow(
        'Entidade não encontrada'
      );
    });
  });

  describe('updateEntity', () => {
    it('deve atualizar label da entidade', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'UpdatableEntity',
        label: 'Label Original',
      });

      const data: UpdateEntityData = {
        label: 'Label Atualizado',
      };

      const updated = await EntityService.updateEntity(tenant1.id, entity.id, data);

      expect(updated.id).toBe(entity.id);
      expect(updated.name).toBe('UpdatableEntity'); // name não muda
      expect(updated.label).toBe('Label Atualizado');
    });

    it('não deve permitir alterar name', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'FixedName',
        label: 'Label',
      });

      const data: UpdateEntityData = {
        label: 'Novo Label',
      };

      const updated = await EntityService.updateEntity(tenant1.id, entity.id, data);

      // name deve permanecer o mesmo
      expect(updated.name).toBe('FixedName');
      expect(updated.label).toBe('Novo Label');
    });

    it('deve lançar erro se entidade não encontrada', async () => {
      const data: UpdateEntityData = {
        label: 'Novo Label',
      };

      await expect(
        EntityService.updateEntity(tenant1.id, '00000000-0000-0000-0000-000000000000', data)
      ).rejects.toThrow('Entidade não encontrada');
    });

    it('deve lançar erro se entidade pertence a outro tenant (isolamento)', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'IsolatedEntityUpdate',
        label: 'Label',
      });

      const data: UpdateEntityData = {
        label: 'Novo Label',
      };

      // Tentar atualizar com tenant2 (deve falhar)
      await expect(EntityService.updateEntity(tenant2.id, entity.id, data)).rejects.toThrow(
        'Entidade não encontrada'
      );
    });

    it('deve lançar erro se tentar atualizar entidade do sistema', async () => {
      const systemEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'SystemEntity',
        label: 'Entidade do Sistema',
        isSystem: true,
      });

      const data: UpdateEntityData = {
        label: 'Novo Label',
      };

      await expect(EntityService.updateEntity(tenant1.id, systemEntity.id, data)).rejects.toThrow(
        'Entidades do sistema não podem ser alteradas'
      );
    });
  });

  describe('deleteEntity', () => {
    it('deve deletar entidade sem campos associados', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'DeletableEntity',
        label: 'Entidade Deletável',
      });

      await EntityService.deleteEntity(tenant1.id, entity.id);

      // Verificar que entidade foi deletada
      await expect(EntityService.getEntityById(tenant1.id, entity.id)).rejects.toThrow(
        'Entidade não encontrada'
      );
    });

    it('deve lançar erro se entidade tem campos associados', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityWithFieldsDelete',
        label: 'Entidade com Campos Delete',
      });

      // Criar campo associado
      await createTestField({
        tenantId: tenant1.id,
        entityId: entity.id,
        name: 'field1',
        label: 'Campo 1',
        type: 'text',
      });

      await expect(EntityService.deleteEntity(tenant1.id, entity.id)).rejects.toThrow(
        'Não é possível deletar entidade com campos associados'
      );
    });

    it('deve lançar erro se entidade não encontrada', async () => {
      await expect(
        EntityService.deleteEntity(tenant1.id, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Entidade não encontrada');
    });

    it('deve lançar erro se entidade pertence a outro tenant (isolamento)', async () => {
      const entity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'IsolatedEntityDelete',
        label: 'Entidade Isolada',
      });

      // Tentar deletar com tenant2 (deve falhar)
      await expect(EntityService.deleteEntity(tenant2.id, entity.id)).rejects.toThrow(
        'Entidade não encontrada'
      );
    });

    it('deve lançar erro se tentar deletar entidade do sistema', async () => {
      const systemEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'SystemEntityDelete',
        label: 'Entidade do Sistema Delete',
        isSystem: true,
      });

      await expect(EntityService.deleteEntity(tenant1.id, systemEntity.id)).rejects.toThrow(
        'Entidades do sistema não podem ser deletadas'
      );
    });
  });
});

