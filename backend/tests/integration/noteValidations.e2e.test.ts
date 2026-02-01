/**
 * Testes E2E para validações de Note via Service
 * 
 * Foca exclusivamente em validações de campos:
 * - Enum (type)
 * - Conteúdo (content - tamanho, vazio, encoding)
 * - Relacionamentos (relatedEntity, createdBy)
 * - Campos obrigatórios (content, requestingUserId)
 * - Permissões de edição (criador ou Admin)
 */

import { NoteService } from '../../src/services/noteService';
import { NoteType, Prisma } from '@prisma/client';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  assignRoleToUser,
  createStandardRoles,
  createTestPermission,
  createTestRole,
  closeDatabase,
  prisma,
} from '../helpers/db';

describe('Note Validations - E2E Tests', () => {
  let tenant1: { id: string };
  let tenant2: { id: string };
  let adminUser1: { id: string };
  let adminUser2: { id: string };
  let regularUser1: { id: string };
  let regularUser2: { id: string };
  let contact1: { id: string };
  let company1: { id: string };
  let lead1: { id: string };
  let opportunity1: { id: string };
  let task1: { id: string };
  let adminRole1: { id: string };
  let adminRole2: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Note Validations Test Tenant 1',
      slug: 'note-validations-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id };

    const tenant2Obj = await createTestTenant({
      name: 'Note Validations Test Tenant 2',
      slug: 'note-validations-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Note
    const notePermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'list' }),
    ]);

    const notePermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Note', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Note', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Note', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Note', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Note', action: 'list' }),
    ]);

    // Associar permissões aos Admins
    await prisma.rolePermission.createMany({
      data: [
        ...notePermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...notePermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários
    const adminUser1Obj = await createTestUser({
      email: 'admin1@notevalidations.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { id: adminUser1Obj.id };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@notevalidations.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { id: adminUser2Obj.id };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    // Criar role para usuários regulares com permissões de Note
    const regularRole = await createTestRole({
      tenantId: tenant1.id,
      name: 'Regular',
      description: 'Role para usuários regulares',
      permissionIds: notePermissions1.map(p => p.id),
    });

    const regularUser1Obj = await createTestUser({
      email: 'regular1@notevalidations.test',
      password: 'RegularPass123',
      name: 'Regular User 1',
      tenantId: tenant1.id,
    });
    regularUser1 = { id: regularUser1Obj.id };
    await assignRoleToUser(regularUser1.id, regularRole.id);

    const regularUser2Obj = await createTestUser({
      email: 'regular2@notevalidations.test',
      password: 'RegularPass123',
      name: 'Regular User 2',
      tenantId: tenant1.id,
    });
    regularUser2 = { id: regularUser2Obj.id };
    await assignRoleToUser(regularUser2.id, regularRole.id);

    // Criar entidades relacionadas para tenant1
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

    // Criar pipeline e estágio para opportunity
    const pipeline1 = await prisma.pipeline.create({
      data: {
        tenantId: tenant1.id,
        name: 'Pipeline de Vendas',
        isDefault: true,
      },
    });

    const stage1 = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline1.id,
        tenantId: tenant1.id,
        name: 'Qualificação',
        order: 1,
        probability: 10,
        color: '#3B82F6',
      },
    });

    opportunity1 = await prisma.opportunity.create({
      data: {
        tenantId: tenant1.id,
        name: 'Oportunidade Teste',
        value: new Prisma.Decimal(50000),
        currency: 'BRL',
        stageId: stage1.id,
        status: 'OPEN',
      },
    });

    // Criar task para testar relacionamento Note -> Task
    task1 = await prisma.task.create({
      data: {
        tenantId: tenant1.id,
        title: 'Tarefa Teste',
        type: 'CALL',
        status: 'PENDING',
        priority: 'MEDIUM',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
        createdById: adminUser1.id,
      },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('Validação de Enum', () => {
    it('deve rejeitar type inválido ao criar nota', async () => {
      await expect(
        NoteService.createNote(
          {
            content: 'Conteúdo da nota',
            type: 'INVALID_TYPE' as NoteType,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Tipo de nota inválido');
    });

    it('deve aceitar todos os valores válidos de type', async () => {
      for (const type of Object.values(NoteType)) {
        const note = await NoteService.createNote(
          {
            content: `Nota ${type}`,
            type,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        );
        expect(note.type).toBe(type);
        // Limpar após teste
        await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
      }
    });

    it('deve usar valor padrão NOTE quando type não é fornecido', async () => {
      const note = await NoteService.createNote(
        {
          content: 'Nota sem tipo',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note.type).toBe(NoteType.NOTE);
      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });

    it('deve rejeitar type inválido ao atualizar nota', async () => {
      const note = await NoteService.createNote(
        {
          content: 'Nota para atualizar',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      await expect(
        NoteService.updateNote(
          note.id,
          {
            type: 'INVALID_TYPE' as NoteType,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Tipo de nota inválido');

      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });
  });

  describe('Validação de Conteúdo', () => {
    it('deve rejeitar content vazio ao criar nota', async () => {
      await expect(
        NoteService.createNote(
          {
            content: '',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Conteúdo da nota é obrigatório');
    });

    it('deve rejeitar content apenas espaços ao criar nota', async () => {
      await expect(
        NoteService.createNote(
          {
            content: '   ',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Conteúdo da nota é obrigatório');
    });

    it('deve rejeitar content apenas tabs/newlines ao criar nota', async () => {
      await expect(
        NoteService.createNote(
          {
            content: '\t\n\r',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Conteúdo da nota é obrigatório');
    });

    it('deve rejeitar content > 10.000 caracteres ao criar nota', async () => {
      const longContent = 'a'.repeat(10001);

      await expect(
        NoteService.createNote(
          {
            content: longContent,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('não pode exceder 10.000 caracteres');
    });

    it('deve aceitar content exatamente 10.000 caracteres ao criar nota', async () => {
      const exactContent = 'a'.repeat(10000);

      const note = await NoteService.createNote(
        {
          content: exactContent,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note.content).toBeDefined();
      expect(note.content!.length).toBe(10000);
      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });

    it('deve aceitar content < 10.000 caracteres ao criar nota', async () => {
      const shortContent = 'Conteúdo da nota';

      const note = await NoteService.createNote(
        {
          content: shortContent,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note.content).toBeDefined();
      expect(note.content!.length).toBeLessThan(10000);
      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });

    it('deve aceitar content com caracteres especiais/Unicode ao criar nota', async () => {
      const unicodeContent = 'Nota com emojis 😀 🎉 e caracteres especiais: áéíóú ção';

      const note = await NoteService.createNote(
        {
          content: unicodeContent,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note.content).toBe(unicodeContent);
      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });

    it('deve rejeitar content vazio ao atualizar nota', async () => {
      const note = await NoteService.createNote(
        {
          content: 'Nota para atualizar',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      await expect(
        NoteService.updateNote(
          note.id,
          {
            content: '',
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Conteúdo da nota não pode ser vazio');

      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });

    it('deve rejeitar content > 10.000 caracteres ao atualizar nota', async () => {
      const note = await NoteService.createNote(
        {
          content: 'Nota para atualizar',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      const longContent = 'a'.repeat(10001);

      await expect(
        NoteService.updateNote(
          note.id,
          {
            content: longContent,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('não pode exceder 10.000 caracteres');

      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });

    it('deve aceitar content válido após trim ao criar nota', async () => {
      const note = await NoteService.createNote(
        {
          content: '  Conteúdo com espaços  ',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note.content).toBe('Conteúdo com espaços');
      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });
  });

  describe('Validação de Relacionamentos', () => {
    it('deve rejeitar relatedEntityId inexistente ao criar nota', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        NoteService.createNote(
          {
            content: 'Nota com entidade inexistente',
            relatedEntityType: 'Contact',
            relatedEntityId: fakeId,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('não encontrado');
    });

    it('deve rejeitar relatedEntityId de outro tenant ao criar nota', async () => {
      // Criar contact no tenant2
      const contact2 = await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Outro',
          lastName: 'Tenant',
          status: 'ACTIVE',
        },
      });

      await expect(
        NoteService.createNote(
          {
            content: 'Nota com entidade de outro tenant',
            relatedEntityType: 'Contact',
            relatedEntityId: contact2.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('não pertence ao seu tenant');

      // Limpar
      await prisma.contact.delete({ where: { id: contact2.id } });
    });

    it('deve rejeitar relatedEntityId soft deleted ao criar nota', async () => {
      // Criar e deletar contact
      const contact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Deletado',
          lastName: 'Test',
          status: 'ACTIVE',
        },
      });

      await prisma.contact.update({
        where: { id: contact.id },
        data: { deletedAt: new Date() },
      });

      await expect(
        NoteService.createNote(
          {
            content: 'Nota com entidade deletada',
            relatedEntityType: 'Contact',
            relatedEntityId: contact.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('foi deletado');

      // Limpar
      await prisma.contact.delete({ where: { id: contact.id } });
    });

    it('deve rejeitar relatedEntityId com formato UUID inválido', async () => {
      await expect(
        NoteService.createNote(
          {
            content: 'Nota com UUID inválido',
            relatedEntityType: 'Contact',
            relatedEntityId: 'invalid-uuid',
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('ID inválido');
    });

    it('deve aceitar todos os tipos válidos de relatedEntityType', async () => {
      const types = [
        { type: 'Contact' as const, id: contact1.id },
        { type: 'Company' as const, id: company1.id },
        { type: 'Lead' as const, id: lead1.id },
        { type: 'Opportunity' as const, id: opportunity1.id },
        { type: 'Task' as const, id: task1.id },
      ];

      for (const { type, id } of types) {
        const note = await NoteService.createNote(
          {
            content: `Nota ${type}`,
            relatedEntityType: type,
            relatedEntityId: id,
          },
          tenant1.id,
          adminUser1.id
        );
        expect(note.relatedEntityType).toBe(type);
        expect(note.relatedEntityId).toBe(id);
        // Limpar após teste
        await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
      }
    });

    it('deve aceitar relatedEntityType Task (específico para Note)', async () => {
      const note = await NoteService.createNote(
        {
          content: 'Nota relacionada a Task',
          relatedEntityType: 'Task',
          relatedEntityId: task1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note.relatedEntityType).toBe('Task');
      expect(note.relatedEntityId).toBe(task1.id);
      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });

    it('deve rejeitar requestingUserId inexistente ao criar nota', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        NoteService.createNote(
          {
            content: 'Nota com criador inexistente',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          fakeId
        )
      ).rejects.toThrow('Usuário não encontrado');
    });

    it('deve rejeitar requestingUserId de outro tenant ao criar nota', async () => {
      await expect(
        NoteService.createNote(
          {
            content: 'Nota com criador de outro tenant',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser2.id
        )
      ).rejects.toThrow('não pertence ao seu tenant');
    });
  });

  describe('Validação de Campos Obrigatórios', () => {
    it('deve rejeitar content ausente ao criar nota', async () => {
      await expect(
        NoteService.createNote(
          {
            content: undefined as any,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Conteúdo da nota é obrigatório');
    });

    it('deve rejeitar requestingUserId ausente ao criar nota', async () => {
      await expect(
        NoteService.createNote(
          {
            content: 'Nota sem criador',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          undefined
        )
      ).rejects.toThrow('ID do usuário é obrigatório');
    });

    it('deve aceitar campos obrigatórios válidos ao criar nota', async () => {
      const note = await NoteService.createNote(
        {
          content: 'Nota válida',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note.content).toBe('Nota válida');
      expect(note.createdById).toBe(adminUser1.id);
      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });
  });

  describe('Validação de Permissões de Edição', () => {
    it('deve permitir que criador edite nota', async () => {
      const note = await NoteService.createNote(
        {
          content: 'Nota do criador',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        regularUser1.id
      );

      const updatedNote = await NoteService.updateNote(
        note.id,
        {
          content: 'Nota atualizada pelo criador',
        },
        tenant1.id,
        regularUser1.id
      );

      expect(updatedNote.content).toBe('Nota atualizada pelo criador');

      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, regularUser1.id);
    });

    it('deve permitir que criador delete nota', async () => {
      const note = await NoteService.createNote(
        {
          content: 'Nota do criador',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        regularUser1.id
      );

      await expect(
        NoteService.deleteNote(note.id, tenant1.id, regularUser1.id)
      ).resolves.not.toThrow();

      // Verificar que foi soft deleted
      const deletedNote = await prisma.note.findFirst({
        where: { id: note.id, deletedAt: null },
      });
      expect(deletedNote).toBeNull();
    });

    it('deve permitir que Admin edite nota (mesmo não sendo criador)', async () => {
      const note = await NoteService.createNote(
        {
          content: 'Nota do usuário regular',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        regularUser1.id
      );

      const updatedNote = await NoteService.updateNote(
        note.id,
        {
          content: 'Nota atualizada pelo Admin',
        },
        tenant1.id,
        adminUser1.id
      );

      expect(updatedNote.content).toBe('Nota atualizada pelo Admin');

      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });

    it('deve permitir que Admin delete nota (mesmo não sendo criador)', async () => {
      const note = await NoteService.createNote(
        {
          content: 'Nota do usuário regular',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        regularUser1.id
      );

      await expect(
        NoteService.deleteNote(note.id, tenant1.id, adminUser1.id)
      ).resolves.not.toThrow();

      // Verificar que foi soft deleted
      const deletedNote = await prisma.note.findFirst({
        where: { id: note.id, deletedAt: null },
      });
      expect(deletedNote).toBeNull();
    });

    it('deve rejeitar que outro usuário edite nota', async () => {
      const note = await NoteService.createNote(
        {
          content: 'Nota do usuário 1',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        regularUser1.id
      );

      await expect(
        NoteService.updateNote(
          note.id,
          {
            content: 'Tentativa de edição por outro usuário',
          },
          tenant1.id,
          regularUser2.id
        )
      ).rejects.toThrow('não tem permissão para editar esta nota');

      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, regularUser1.id);
    });

    it('deve rejeitar que outro usuário delete nota', async () => {
      const note = await NoteService.createNote(
        {
          content: 'Nota do usuário 1',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        regularUser1.id
      );

      await expect(
        NoteService.deleteNote(note.id, tenant1.id, regularUser2.id)
      ).rejects.toThrow('não tem permissão para deletar esta nota');

      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, regularUser1.id);
    });
  });

  describe('Validação de Casos de Borda', () => {
    it('deve aceitar conteúdo com emojis e caracteres Unicode', async () => {
      const unicodeContent = 'Nota com emojis 😀 🎉 🚀 e caracteres especiais: áéíóú ção ñ';

      const note = await NoteService.createNote(
        {
          content: unicodeContent,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note.content).toBe(unicodeContent);
      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });

    it('deve aceitar conteúdo com quebras de linha múltiplas', async () => {
      const multilineContent = 'Linha 1\n\nLinha 2\n\n\nLinha 3';

      const note = await NoteService.createNote(
        {
          content: multilineContent,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note.content).toBe(multilineContent);
      // Limpar após teste
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);
    });

    it('deve rejeitar múltiplas validações simultâneas (vários campos inválidos)', async () => {
      await expect(
        NoteService.createNote(
          {
            content: '',
            type: 'INVALID_TYPE' as NoteType,
            relatedEntityType: 'Contact',
            relatedEntityId: 'invalid-uuid',
          },
          tenant1.id,
          undefined
        )
      ).rejects.toThrow(); // Pode ser qualquer uma das validações
    });
  });
});
