/**
 * Testes unitários para FieldService
 * 
 * Testa lógica de negócio isoladamente usando banco de dados real.
 * Foca em validações, regras de negócio e transformações de dados.
 */

import {
  FieldService,
  CreateFieldData,
  UpdateFieldData,
  SUPPORTED_FIELD_TYPES,
} from '../../src/services/fieldService';
import {
  cleanDatabase,
  createTestTenant,
  createTestEntity,
  createTestField,
  closeDatabase,
  prisma,
} from '../helpers/db';

describe('FieldService', () => {
  let tenant1: { id: string };
  let tenant2: { id: string };
  let entity1: { id: string };
  let entity2: { id: string };
  let systemEntity: { id: string };

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

  describe('createField', () => {
    it('deve criar campo customizado com sucesso', async () => {
      const data: CreateFieldData = {
        name: 'testField',
        label: 'Campo de Teste',
        type: 'text',
      };

      const field = await FieldService.createField(tenant1.id, entity1.id, data);

      expect(field).toBeDefined();
      expect(field.name).toBe('testField');
      expect(field.label).toBe('Campo de Teste');
      expect(field.type).toBe('text');
      expect(field.tenantId).toBe(tenant1.id);
      expect(field.entityId).toBe(entity1.id);
      expect(field.required).toBe(false);
      expect(field.unique).toBe(false);
      expect(field.isDeleted).toBe(false);
      expect(field.id).toBeDefined();
      expect(field.createdAt).toBeInstanceOf(Date);
      expect(field.updatedAt).toBeInstanceOf(Date);
    });

    it('deve validar tipos de campo suportados', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForTypesTest',
        label: 'Entidade para Teste Tipos',
        isSystem: false,
      });

      for (const type of SUPPORTED_FIELD_TYPES) {
        const data: CreateFieldData = {
          name: `field${type}${Date.now()}`, // Nome único para evitar duplicatas
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

        const field = await FieldService.createField(tenant1.id, testEntity.id, data);
        expect(field.type).toBe(type);
      }
    });

    it('deve rejeitar tipo de campo inválido', async () => {
      const data: CreateFieldData = {
        name: 'invalidField',
        label: 'Campo Inválido',
        type: 'invalidType' as any,
      };

      await expect(FieldService.createField(tenant1.id, entity1.id, data)).rejects.toThrow(
        'Tipo de campo inválido'
      );
    });

    it('deve validar que nome deve começar com letra', async () => {
      const data: CreateFieldData = {
        name: '123Invalid',
        label: 'Nome Inválido',
        type: 'text',
      };

      await expect(FieldService.createField(tenant1.id, entity1.id, data)).rejects.toThrow(
        'Nome do campo deve começar com letra e conter apenas letras e números'
      );
    });

    it('deve validar que nome contém apenas letras e números', async () => {
      const data: CreateFieldData = {
        name: 'test-field',
        label: 'Nome Inválido',
        type: 'text',
      };

      await expect(FieldService.createField(tenant1.id, entity1.id, data)).rejects.toThrow(
        'Nome do campo deve começar com letra e conter apenas letras e números'
      );
    });

    it('deve validar que nome é único por entidade', async () => {
      const data: CreateFieldData = {
        name: 'uniqueField',
        label: 'Campo Único',
        type: 'text',
      };

      // Criar primeiro campo
      await FieldService.createField(tenant1.id, entity1.id, data);

      // Tentar criar outro com mesmo nome na mesma entidade (deve falhar)
      await expect(FieldService.createField(tenant1.id, entity1.id, data)).rejects.toThrow(
        'Nome do campo já existe nesta entidade'
      );
    });

    it('deve permitir mesmo nome em entidades diferentes', async () => {
      const data: CreateFieldData = {
        name: 'sharedField',
        label: 'Campo Compartilhado',
        type: 'text',
      };

      // Criar em entity1
      const field1 = await FieldService.createField(tenant1.id, entity1.id, data);
      expect(field1.name).toBe('sharedField');

      // Criar em entity2 com mesmo nome (deve funcionar)
      const field2 = await FieldService.createField(tenant1.id, entity2.id, data);
      expect(field2.name).toBe('sharedField');
      expect(field2.entityId).toBe(entity2.id);
      expect(field2.id).not.toBe(field1.id);
    });

    it('deve validar opções para campos select', async () => {
      const data: CreateFieldData = {
        name: 'selectField',
        label: 'Campo Select',
        type: 'select',
        options: [
          { value: 'option1', label: 'Opção 1' },
          { value: 'option2', label: 'Opção 2' },
        ],
      };

      const field = await FieldService.createField(tenant1.id, entity1.id, data);
      expect(field.type).toBe('select');
      expect(field.options).toBeDefined();
    });

    it('deve rejeitar campo select sem opções', async () => {
      const data: CreateFieldData = {
        name: 'selectFieldNoOptions',
        label: 'Campo Select Sem Opções',
        type: 'select',
      };

      await expect(FieldService.createField(tenant1.id, entity1.id, data)).rejects.toThrow(
        'Campos do tipo select devem ter pelo menos uma opção'
      );
    });

    it('deve rejeitar campo select com opções vazias', async () => {
      const data: CreateFieldData = {
        name: 'selectFieldEmpty',
        label: 'Campo Select Vazio',
        type: 'select',
        options: [],
      };

      await expect(FieldService.createField(tenant1.id, entity1.id, data)).rejects.toThrow(
        'Campos do tipo select devem ter pelo menos uma opção'
      );
    });

    it('deve validar formato das opções (value e label obrigatórios)', async () => {
      const data: CreateFieldData = {
        name: 'selectFieldInvalid',
        label: 'Campo Select Inválido',
        type: 'select',
        options: [{ value: 'option1' } as any], // falta label
      };

      await expect(FieldService.createField(tenant1.id, entity1.id, data)).rejects.toThrow(
        'Opções devem ter campo "label" do tipo string'
      );
    });

    it('deve rejeitar valores duplicados nas opções', async () => {
      const data: CreateFieldData = {
        name: 'selectFieldDuplicate',
        label: 'Campo Select Duplicado',
        type: 'select',
        options: [
          { value: 'option1', label: 'Opção 1' },
          { value: 'option1', label: 'Opção 1 Duplicada' },
        ],
      };

      await expect(FieldService.createField(tenant1.id, entity1.id, data)).rejects.toThrow(
        'Valor duplicado nas opções: option1'
      );
    });

    it('deve calcular order automaticamente se não fornecido', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForOrderTest',
        label: 'Entidade para Teste Order',
        isSystem: false,
      });

      // Criar alguns campos
      await FieldService.createField(tenant1.id, testEntity.id, {
        name: 'field1',
        label: 'Campo 1',
        type: 'text',
        order: 0,
      });

      await FieldService.createField(tenant1.id, testEntity.id, {
        name: 'field2',
        label: 'Campo 2',
        type: 'text',
        order: 1,
      });

      // Criar campo sem order (deve ser 2)
      const field3 = await FieldService.createField(tenant1.id, testEntity.id, {
        name: 'field3',
        label: 'Campo 3',
        type: 'text',
      });

      expect(field3.order).toBe(2);
    });

    it('deve lançar erro se entidade não encontrada', async () => {
      const data: CreateFieldData = {
        name: 'field',
        label: 'Campo',
        type: 'text',
      };

      await expect(
        FieldService.createField(tenant1.id, '00000000-0000-0000-0000-000000000000', data)
      ).rejects.toThrow('Entidade não encontrada');
    });

    it('deve lançar erro se entidade pertence a outro tenant (isolamento)', async () => {
      const entityOtherTenant = await createTestEntity({
        tenantId: tenant2.id,
        name: 'OtherTenantEntity',
        label: 'Entidade Outro Tenant',
      });

      const data: CreateFieldData = {
        name: 'field',
        label: 'Campo',
        type: 'text',
      };

      // Tentar criar campo com tenant1 mas entidade de tenant2 (deve falhar)
      await expect(FieldService.createField(tenant1.id, entityOtherTenant.id, data)).rejects.toThrow(
        'Entidade não encontrada'
      );
    });
  });

  describe('listFields', () => {
    it('deve listar campos de uma entidade ordenados por order', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForListTest',
        label: 'Entidade para Teste List',
        isSystem: false,
      });

      // Criar campos em ordem diferente
      const field3 = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'field3',
        label: 'Campo 3',
        type: 'text',
        order: 3,
      });
      const field1 = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'field1',
        label: 'Campo 1',
        type: 'text',
        order: 1,
      });
      const field2 = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'field2',
        label: 'Campo 2',
        type: 'text',
        order: 2,
      });

      const fields = await FieldService.listFields(tenant1.id, testEntity.id);

      expect(fields.length).toBeGreaterThanOrEqual(3);
      const foundFields = fields.filter((f) =>
        [field1.id, field2.id, field3.id].includes(f.id)
      );
      expect(foundFields.length).toBe(3);
      expect(foundFields[0].id).toBe(field1.id);
      expect(foundFields[1].id).toBe(field2.id);
      expect(foundFields[2].id).toBe(field3.id);
    });

    it('deve excluir campos deletados por padrão (soft delete)', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForSoftDeleteTest',
        label: 'Entidade para Teste Soft Delete',
        isSystem: false,
      });

      // Criar campo normal
      const activeField = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'activeField',
        label: 'Campo Ativo',
        type: 'text',
      });

      // Criar campo deletado
      const deletedField = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'deletedField',
        label: 'Campo Deletado',
        type: 'text',
      });

      // Marcar como deletado
      await prisma.field.update({
        where: { id: deletedField.id },
        data: { isDeleted: true },
      });

      const fields = await FieldService.listFields(tenant1.id, testEntity.id);

      expect(fields.some((f) => f.id === activeField.id)).toBe(true);
      expect(fields.some((f) => f.id === deletedField.id)).toBe(false);
    });

    it('deve incluir campos deletados se includeDeleted = true', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForIncludeDeletedTest',
        label: 'Entidade para Teste Include Deleted',
        isSystem: false,
      });

      const deletedField = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'deletedField2',
        label: 'Campo Deletado 2',
        type: 'text',
      });

      // Marcar como deletado
      await prisma.field.update({
        where: { id: deletedField.id },
        data: { isDeleted: true },
      });

      const fields = await FieldService.listFields(tenant1.id, testEntity.id, true);

      expect(fields.some((f) => f.id === deletedField.id)).toBe(true);
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

      const tenant1Fields = await FieldService.listFields(tenant1.id, entity1.id);
      const tenant2Fields = await FieldService.listFields(tenant2.id, entity2Tenant2.id);

      expect(tenant1Fields.some((f) => f.id === field1.id)).toBe(true);
      expect(tenant1Fields.some((f) => f.id === field2.id)).toBe(false);
      expect(tenant2Fields.some((f) => f.id === field2.id)).toBe(true);
      expect(tenant2Fields.some((f) => f.id === field1.id)).toBe(false);
    });

    it('deve lançar erro se entidade não encontrada', async () => {
      await expect(
        FieldService.listFields(tenant1.id, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Entidade não encontrada');
    });
  });

  describe('getFieldById', () => {
    it('deve obter campo por ID com informações da entidade', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForGetTest',
        label: 'Entidade para Teste Get',
        isSystem: false,
      });

      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'getField',
        label: 'Campo Get',
        type: 'text',
      });

      const result = await FieldService.getFieldById(tenant1.id, field.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(field.id);
      expect(result.name).toBe('getField');
      expect(result.entity).toBeDefined();
      if (result.entity) {
        expect(result.entity.id).toBe(testEntity.id);
        expect(result.entity.name).toBe('EntityForGetTest');
      }
    });

    it('deve lançar erro se campo não encontrado', async () => {
      await expect(
        FieldService.getFieldById(tenant1.id, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Campo não encontrado');
    });

    it('deve lançar erro se campo pertence a outro tenant (isolamento)', async () => {
      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: entity1.id,
        name: 'isolatedField',
        label: 'Campo Isolado',
        type: 'text',
      });

      // Tentar buscar com tenant2 (deve falhar)
      await expect(FieldService.getFieldById(tenant2.id, field.id)).rejects.toThrow(
        'Campo não encontrado'
      );
    });
  });

  describe('updateField', () => {
    it('deve atualizar campo customizado', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForUpdateTest',
        label: 'Entidade para Teste Update',
        isSystem: false,
      });

      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'updatableField',
        label: 'Campo Atualizável',
        type: 'text',
        required: false,
        unique: false,
      });

      const data: UpdateFieldData = {
        label: 'Label Atualizado',
        required: true,
        unique: true,
      };

      const updated = await FieldService.updateField(tenant1.id, field.id, data);

      expect(updated.id).toBe(field.id);
      expect(updated.name).toBe('updatableField'); // name não muda
      expect(updated.label).toBe('Label Atualizado');
      expect(updated.required).toBe(true);
      expect(updated.unique).toBe(true);
      expect(updated.type).toBe('text'); // type não muda
    });

    it('não deve permitir alterar type', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForFixedTypeTest',
        label: 'Entidade para Teste Tipo Fixo',
        isSystem: false,
      });

      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'fixedTypeField',
        label: 'Campo Tipo Fixo',
        type: 'text',
      });

      const data: UpdateFieldData = {
        label: 'Novo Label',
      };

      const updated = await FieldService.updateField(tenant1.id, field.id, data);

      // type deve permanecer o mesmo
      expect(updated.type).toBe('text');
    });

    it('deve atualizar opções de campo select', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForSelectOptionsTest',
        label: 'Entidade para Teste Opções Select',
        isSystem: false,
      });

      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'selectField',
        label: 'Campo Select',
        type: 'select',
        options: [
          { value: 'option1', label: 'Opção 1' },
          { value: 'option2', label: 'Opção 2' },
        ],
      });

      const data: UpdateFieldData = {
        options: [
          { value: 'option1', label: 'Opção 1 Atualizada' },
          { value: 'option3', label: 'Opção 3 Nova' },
        ],
      };

      const updated = await FieldService.updateField(tenant1.id, field.id, data);

      expect(updated.options).toBeDefined();
      expect(Array.isArray(updated.options)).toBe(true);
    });

    it('deve lançar erro se campo não encontrado', async () => {
      const data: UpdateFieldData = {
        label: 'Novo Label',
      };

      await expect(
        FieldService.updateField(tenant1.id, '00000000-0000-0000-0000-000000000000', data)
      ).rejects.toThrow('Campo não encontrado');
    });

    it('deve lançar erro se campo pertence a outro tenant (isolamento)', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForIsolationUpdateTest',
        label: 'Entidade para Teste Isolamento Update',
        isSystem: false,
      });

      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'isolatedField',
        label: 'Campo Isolado',
        type: 'text',
      });

      const data: UpdateFieldData = {
        label: 'Novo Label',
      };

      // Tentar atualizar com tenant2 (deve falhar)
      await expect(FieldService.updateField(tenant2.id, field.id, data)).rejects.toThrow(
        'Campo não encontrado'
      );
    });

    it('deve lançar erro se tentar atualizar campo de entidade do sistema', async () => {
      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: systemEntity.id,
        name: 'systemField',
        label: 'Campo do Sistema',
        type: 'text',
      });

      const data: UpdateFieldData = {
        label: 'Novo Label',
      };

      await expect(FieldService.updateField(tenant1.id, field.id, data)).rejects.toThrow(
        'Campos de entidades do sistema não podem ser alterados'
      );
    });

    it('deve validar opções ao atualizar campo select', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForSelectValidationTest',
        label: 'Entidade para Teste Validação Select',
        isSystem: false,
      });

      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'selectFieldValidation',
        label: 'Campo Select',
        type: 'select',
        options: [
          { value: 'option1', label: 'Opção 1' },
        ],
      });

      const data: UpdateFieldData = {
        options: [], // opções vazias
      };

      await expect(FieldService.updateField(tenant1.id, field.id, data)).rejects.toThrow(
        'Campos do tipo select devem ter pelo menos uma opção'
      );
    });
  });

  describe('deleteField', () => {
    it('deve fazer soft delete do campo (marcar isDeleted: true)', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForDeleteTest',
        label: 'Entidade para Teste Delete',
        isSystem: false,
      });

      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'deletableField',
        label: 'Campo Deletável',
        type: 'text',
      });

      await FieldService.deleteField(tenant1.id, field.id);

      // Verificar que campo foi marcado como deletado
      const deleted = await prisma.field.findUnique({
        where: { id: field.id },
      });

      expect(deleted).toBeDefined();
      expect(deleted?.isDeleted).toBe(true);
    });

    it('deve lançar erro se campo não encontrado', async () => {
      await expect(
        FieldService.deleteField(tenant1.id, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Campo não encontrado');
    });

    it('deve lançar erro se campo pertence a outro tenant (isolamento)', async () => {
      // Criar entidade específica para este teste
      const testEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'EntityForIsolationDeleteTest',
        label: 'Entidade para Teste Isolamento Delete',
        isSystem: false,
      });

      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: testEntity.id,
        name: 'isolatedField',
        label: 'Campo Isolado',
        type: 'text',
      });

      // Tentar deletar com tenant2 (deve falhar)
      await expect(FieldService.deleteField(tenant2.id, field.id)).rejects.toThrow(
        'Campo não encontrado'
      );
    });

    it('deve lançar erro se tentar deletar campo de entidade do sistema', async () => {
      // Criar entidade do sistema específica para este teste
      const testSystemEntity = await createTestEntity({
        tenantId: tenant1.id,
        name: 'SystemEntityForDeleteTest',
        label: 'Entidade do Sistema para Teste Delete',
        isSystem: true,
      });

      const field = await createTestField({
        tenantId: tenant1.id,
        entityId: testSystemEntity.id,
        name: 'systemField',
        label: 'Campo do Sistema',
        type: 'text',
      });

      await expect(FieldService.deleteField(tenant1.id, field.id)).rejects.toThrow(
        'Campos de entidades do sistema não podem ser deletados'
      );
    });
  });
});

