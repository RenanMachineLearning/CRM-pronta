/**
 * Testes E2E para validação de atributos únicos
 * 
 * Valida estrutura de validação, erros e preparação para quando dados existirem.
 * 
 * Nota: Como as tabelas de dados ainda não existem (serão criadas nas Etapas 5-7),
 * os testes focam em validação de estrutura, não em busca de dados reais.
 */

import {
  cleanDatabase,
  createTestTenant,
  createTestEntity,
  createTestField,
  closeDatabase,
} from '../helpers/db';
import {
  validateUniqueField,
  UniqueFieldValidationError,
} from '../../src/utils/uniqueFieldValidator';

describe('Unique Field Validation - E2E Tests', () => {
  let tenant: { id: string };
  let contactEntity: { id: string };
  let customEntity: { id: string };
  let uniqueField: { id: string; name: string };
  let nonUniqueField: { id: string; name: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Unique Validation Test Tenant',
      slug: 'unique-validation-test-tenant',
      status: 'ACTIVE',
    });
    tenant = { id: tenantObj.id };

    // Criar entidades de teste
    contactEntity = await createTestEntity({
      tenantId: tenant.id,
      name: 'Contact',
      label: 'Contato',
      isSystem: true,
    });

    customEntity = await createTestEntity({
      tenantId: tenant.id,
      name: 'CustomEntity',
      label: 'Entidade Customizada',
      isSystem: false,
    });

    // Criar campos de teste
    uniqueField = await createTestField({
      tenantId: tenant.id,
      entityId: contactEntity.id,
      name: 'email',
      label: 'Email',
      type: 'text',
      required: true,
      unique: true,
      order: 1,
    });

    nonUniqueField = await createTestField({
      tenantId: tenant.id,
      entityId: contactEntity.id,
      name: 'phone',
      label: 'Telefone',
      type: 'text',
      required: false,
      unique: false,
      order: 2,
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('validateUniqueField', () => {
    it('deve validar estrutura de campo único com sucesso (implementação preparatória)', async () => {
      // Por enquanto, apenas valida estrutura (não busca dados reais)
      await expect(
        validateUniqueField(
          tenant.id,
          contactEntity.id,
          uniqueField.id,
          'test@example.com'
        )
      ).resolves.not.toThrow();
    });

    it('deve validar estrutura com recordId (atualização)', async () => {
      // Por enquanto, apenas valida estrutura (não busca dados reais)
      await expect(
        validateUniqueField(
          tenant.id,
          contactEntity.id,
          uniqueField.id,
          'test@example.com',
          'record-id-123'
        )
      ).resolves.not.toThrow();
    });

    it('deve permitir valores null em campos únicos', async () => {
      // Valores null são permitidos mesmo em campos únicos (comportamento padrão SQL)
      await expect(
        validateUniqueField(
          tenant.id,
          contactEntity.id,
          uniqueField.id,
          null
        )
      ).resolves.not.toThrow();
    });

    it('deve permitir valores undefined em campos únicos', async () => {
      // Valores undefined são tratados como null
      await expect(
        validateUniqueField(
          tenant.id,
          contactEntity.id,
          uniqueField.id,
          undefined
        )
      ).resolves.not.toThrow();
    });

    it('deve falhar se campo não está marcado como único', async () => {
      await expect(
        validateUniqueField(
          tenant.id,
          contactEntity.id,
          nonUniqueField.id,
          'value'
        )
      ).rejects.toThrow(UniqueFieldValidationError);

      try {
        await validateUniqueField(
          tenant.id,
          contactEntity.id,
          nonUniqueField.id,
          'value'
        );
      } catch (error: any) {
        expect(error).toBeInstanceOf(UniqueFieldValidationError);
        expect(error.message).toContain('não está marcado como único');
        expect(error.fieldName).toBe(nonUniqueField.name);
      }
    });

    it('deve falhar se campo não existe', async () => {
      await expect(
        validateUniqueField(
          tenant.id,
          contactEntity.id,
          '00000000-0000-0000-0000-000000000000',
          'value'
        )
      ).rejects.toThrow(UniqueFieldValidationError);

      try {
        await validateUniqueField(
          tenant.id,
          contactEntity.id,
          '00000000-0000-0000-0000-000000000000',
          'value'
        );
      } catch (error: any) {
        expect(error).toBeInstanceOf(UniqueFieldValidationError);
        expect(error.message).toContain('não encontrado');
      }
    });

    it('deve falhar se entidade não existe', async () => {
      await expect(
        validateUniqueField(
          tenant.id,
          '00000000-0000-0000-0000-000000000000',
          uniqueField.id,
          'value'
        )
      ).rejects.toThrow('Entidade não encontrada');
    });

    it('deve falhar se campo pertence a outra entidade', async () => {
      // Criar campo em outra entidade
      const otherField = await createTestField({
        tenantId: tenant.id,
        entityId: customEntity.id,
        name: 'otherField',
        label: 'Outro Campo',
        type: 'text',
        unique: true,
      });

      // Tentar validar campo de outra entidade
      await expect(
        validateUniqueField(
          tenant.id,
          contactEntity.id, // Entidade diferente
          otherField.id, // Campo pertence a customEntity
          'value'
        )
      ).rejects.toThrow(UniqueFieldValidationError);
    });

    it('deve falhar se campo está deletado (soft delete)', async () => {
      // Criar campo e deletar
      const fieldToDelete = await createTestField({
        tenantId: tenant.id,
        entityId: contactEntity.id,
        name: 'deletedField',
        label: 'Campo Deletado',
        type: 'text',
        unique: true,
      });

      // Soft delete
      const { prisma } = await import('../helpers/db');
      await prisma.field.update({
        where: { id: fieldToDelete.id },
        data: { isDeleted: true },
      });

      // Tentar validar campo deletado
      await expect(
        validateUniqueField(
          tenant.id,
          contactEntity.id,
          fieldToDelete.id,
          'value'
        )
      ).rejects.toThrow(UniqueFieldValidationError);
    });

    it('deve validar para entidades customizadas', async () => {
      // Criar campo único em entidade customizada
      const customUniqueField = await createTestField({
        tenantId: tenant.id,
        entityId: customEntity.id,
        name: 'customUnique',
        label: 'Campo Único Customizado',
        type: 'text',
        unique: true,
      });

      // Por enquanto, apenas valida estrutura (não busca dados reais)
      await expect(
        validateUniqueField(
          tenant.id,
          customEntity.id,
          customUniqueField.id,
          'custom-value'
        )
      ).resolves.not.toThrow();
    });

    it('deve validar isolamento por tenant (preparatório)', async () => {
      // Criar outro tenant
      const otherTenant = await createTestTenant({
        name: 'Other Tenant',
        slug: 'other-tenant',
        status: 'ACTIVE',
      });

      // Criar campo único no outro tenant
      const otherField = await createTestField({
        tenantId: otherTenant.id,
        entityId: contactEntity.id,
        name: 'otherEmail',
        label: 'Email Outro Tenant',
        type: 'text',
        unique: true,
      });

      // Validar que campos de tenants diferentes não interferem
      // (por enquanto apenas valida estrutura, mas quando dados existirem,
      // valores do outro tenant não devem interferir)
      await expect(
        validateUniqueField(
          tenant.id,
          contactEntity.id,
          uniqueField.id,
          'same-value'
        )
      ).resolves.not.toThrow();

      await expect(
        validateUniqueField(
          otherTenant.id,
          contactEntity.id,
          otherField.id,
          'same-value'
        )
      ).resolves.not.toThrow();

      // Limpar
      await cleanDatabase();
    });
  });

  describe('Estrutura Preparatória', () => {
    it('deve estar preparado para busca real quando tabelas existirem', async () => {
      // Por enquanto, apenas valida estrutura
      // Quando tabelas existirem (Etapas 5-7 para sistema, seção 10 para customizadas),
      // a busca real será implementada e este teste validará duplicação real

      // Teste preparatório: validar que estrutura está correta
      await expect(
        validateUniqueField(
          tenant.id,
          contactEntity.id,
          uniqueField.id,
          'test@example.com'
        )
      ).resolves.not.toThrow();

      // Quando dados existirem, este teste deve ser atualizado para:
      // 1. Criar registro com valor único
      // 2. Tentar criar outro registro com mesmo valor → deve falhar
      // 3. Tentar atualizar registro mantendo valor → deve funcionar
      // 4. Tentar atualizar outro registro com valor existente → deve falhar
    });
  });
});

