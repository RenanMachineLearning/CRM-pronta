/**
 * Testes unitários para NoteService
 * 
 * Testa lógica de negócio isoladamente usando banco de dados real.
 * Foca em validações, regras de negócio e transformações de dados.
 */

import { NoteService, CreateNoteData, UpdateNoteData } from '../../src/services/noteService';
import { NoteType } from '@prisma/client';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  createStandardRoles,
  createTestPermission,
  assignRoleToUser,
  closeDatabase,
  prisma,
} from '../helpers/db';

describe('NoteService', () => {
  let tenant1: { id: string };
  let tenant2: { id: string };
  let adminUser1: { id: string };
  let regularUser1: { id: string };
  let regularUser2: { id: string };
  let adminRole1: { id: string };
  let contact1: { id: string };
  let company1: { id: string };
  let lead1: { id: string };
  let opportunity1: { id: string };
  let task1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    tenant1 = await createTestTenant({
      name: 'Note Service Test Tenant 1',
      slug: 'note-service-test-tenant-1',
      status: 'ACTIVE',
    });

    tenant2 = await createTestTenant({
      name: 'Note Service Test Tenant 2',
      slug: 'note-service-test-tenant-2',
      status: 'ACTIVE',
    });

    // Criar roles padrão
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    // Criar permissões para Note
    await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Note', action: 'list' }),
    ]);

    // Criar usuários
    adminUser1 = await createTestUser({
      email: 'admin1@noteservice.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    regularUser1 = await createTestUser({
      email: 'regular1@noteservice.test',
      password: 'RegularPass123',
      name: 'Regular User 1',
      tenantId: tenant1.id,
    });

    regularUser2 = await createTestUser({
      email: 'regular2@noteservice.test',
      password: 'RegularPass123',
      name: 'Regular User 2',
      tenantId: tenant1.id,
    });

    // Criar entidades relacionadas
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
        name: 'Empresa Teste',
        status: 'ACTIVE',
      },
    });

    lead1 = await prisma.lead.create({
      data: {
        tenantId: tenant1.id,
        firstName: 'Lead',
        lastName: 'Teste',
        status: 'NEW',
      },
    });

    opportunity1 = await prisma.opportunity.create({
      data: {
        tenantId: tenant1.id,
        name: 'Oportunidade Teste',
        status: 'OPEN',
        value: 0,
        stageId: (await prisma.pipelineStage.findFirst({ where: { tenantId: tenant1.id } }))?.id || '',
      },
    });

    // Criar tarefa para testar relacionamento com Task
    const { TaskService } = await import('../../src/services/taskService');
    task1 = await TaskService.createTask(
      {
        title: 'Tarefa para Nota',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      },
      tenant1.id,
      adminUser1.id
    );
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('createNote', () => {
    it('deve criar nota com dados válidos completos', async () => {
      const data: CreateNoteData = {
        content: 'Conteúdo da nota completo',
        type: NoteType.COMMENT,
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const note = await NoteService.createNote(data, tenant1.id, adminUser1.id);

      expect(note).toBeDefined();
      expect(note.content).toBe('Conteúdo da nota completo');
      expect(note.type).toBe(NoteType.COMMENT);
      expect(note.createdById).toBe(adminUser1.id);
      expect(note.relatedEntityType).toBe('Contact');
      expect(note.relatedEntityId).toBe(contact1.id);
    });

    it('deve criar nota apenas com campos obrigatórios', async () => {
      const data: CreateNoteData = {
        content: 'Conteúdo mínimo',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const note = await NoteService.createNote(data, tenant1.id, adminUser1.id);

      expect(note).toBeDefined();
      expect(note.content).toBe('Conteúdo mínimo');
      expect(note.type).toBe(NoteType.NOTE); // Valor padrão
    });

    it('deve usar valor padrão para type se não fornecido: type=NOTE', async () => {
      const data: CreateNoteData = {
        content: 'Nota sem tipo especificado',
        relatedEntityType: 'Company',
        relatedEntityId: company1.id,
      };

      const note = await NoteService.createNote(data, tenant1.id, adminUser1.id);

      expect(note.type).toBe(NoteType.NOTE);
    });

    it('deve validar que content é obrigatório', async () => {
      const data: CreateNoteData = {
        content: '',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      await expect(
        NoteService.createNote(data, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Conteúdo da nota é obrigatório');
    });

    it('deve validar que content tem limite de 10.000 caracteres', async () => {
      const longContent = 'A'.repeat(10001);

      const data: CreateNoteData = {
        content: longContent,
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      await expect(
        NoteService.createNote(data, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Conteúdo da nota não pode exceder 10.000 caracteres');
    });

    it('deve validar que content não é apenas espaços em branco', async () => {
      const data: CreateNoteData = {
        content: '   ',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      await expect(
        NoteService.createNote(data, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Conteúdo da nota é obrigatório');
    });

    it('deve validar que relatedEntityId existe e pertence ao tenant', async () => {
      const fakeEntityId = '00000000-0000-0000-0000-000000000000';

      const data: CreateNoteData = {
        content: 'Nota com entidade inválida',
        relatedEntityType: 'Contact',
        relatedEntityId: fakeEntityId,
      };

      await expect(
        NoteService.createNote(data, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Contato não encontrado, não pertence ao seu tenant ou foi deletado');
    });

    it('deve validar que relatedEntityId não está soft deleted', async () => {
      // Criar e deletar um contato
      const contactToDelete = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Contato',
          lastName: 'Para Deletar',
          status: 'ACTIVE',
        },
      });

      await prisma.contact.update({
        where: { id: contactToDelete.id },
        data: { deletedAt: new Date() },
      });

      const data: CreateNoteData = {
        content: 'Nota com entidade deletada',
        relatedEntityType: 'Contact',
        relatedEntityId: contactToDelete.id,
      };

      await expect(
        NoteService.createNote(data, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Contato não encontrado, não pertence ao seu tenant ou foi deletado');
    });

    it('deve validar que type é válido (NOTE, COMMENT, ANNOTATION)', async () => {
      const data: CreateNoteData = {
        content: 'Nota válida',
        type: NoteType.NOTE,
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const note = await NoteService.createNote(data, tenant1.id, adminUser1.id);
      expect(note.type).toBe(NoteType.NOTE);
    });

    it('deve definir createdById com requestingUserId', async () => {
      const data: CreateNoteData = {
        content: 'Nota criada por usuário',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const note = await NoteService.createNote(data, tenant1.id, regularUser1.id);

      expect(note.createdById).toBe(regularUser1.id);
      expect(note.createdBy.id).toBe(regularUser1.id);
    });

    it('deve criar nota com todos os tipos de entidade relacionada', async () => {
      // Contact
      const note1 = await NoteService.createNote(
        {
          content: 'Nota Contact',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note1.relatedEntityType).toBe('Contact');

      // Company
      const note2 = await NoteService.createNote(
        {
          content: 'Nota Company',
          relatedEntityType: 'Company',
          relatedEntityId: company1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note2.relatedEntityType).toBe('Company');

      // Lead
      const note3 = await NoteService.createNote(
        {
          content: 'Nota Lead',
          relatedEntityType: 'Lead',
          relatedEntityId: lead1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note3.relatedEntityType).toBe('Lead');

      // Opportunity
      const note4 = await NoteService.createNote(
        {
          content: 'Nota Opportunity',
          relatedEntityType: 'Opportunity',
          relatedEntityId: opportunity1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note4.relatedEntityType).toBe('Opportunity');

      // Task
      const note5 = await NoteService.createNote(
        {
          content: 'Nota Task',
          relatedEntityType: 'Task',
          relatedEntityId: task1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(note5.relatedEntityType).toBe('Task');
    });
  });

  describe('updateNote', () => {
    let noteToUpdate: { id: string; createdById: string };

    beforeEach(async () => {
      const data: CreateNoteData = {
        content: 'Conteúdo original',
        type: NoteType.NOTE,
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const note = await NoteService.createNote(data, tenant1.id, regularUser1.id);
      noteToUpdate = { id: note.id, createdById: note.createdById };
    });

    it('deve atualizar nota com dados válidos quando usuário é criador', async () => {
      const updateData: UpdateNoteData = {
        content: 'Conteúdo atualizado',
        type: NoteType.COMMENT,
      };

      const updated = await NoteService.updateNote(
        noteToUpdate.id,
        updateData,
        tenant1.id,
        regularUser1.id
      );

      expect(updated.content).toBe('Conteúdo atualizado');
      expect(updated.type).toBe(NoteType.COMMENT);
    });

    it('deve atualizar nota quando usuário tem role Admin', async () => {
      const updateData: UpdateNoteData = {
        content: 'Atualizado por Admin',
      };

      const updated = await NoteService.updateNote(
        noteToUpdate.id,
        updateData,
        tenant1.id,
        adminUser1.id
      );

      expect(updated.content).toBe('Atualizado por Admin');
    });

    it('deve atualizar apenas campos fornecidos (partial update)', async () => {
      const updateData: UpdateNoteData = {
        content: 'Apenas conteúdo atualizado',
      };

      const updated = await NoteService.updateNote(
        noteToUpdate.id,
        updateData,
        tenant1.id,
        regularUser1.id
      );

      expect(updated.content).toBe('Apenas conteúdo atualizado');
      expect(updated.type).toBe(NoteType.NOTE); // Mantido
    });

    it('deve validar que content tem limite de 10.000 caracteres se atualizado', async () => {
      const longContent = 'A'.repeat(10001);

      const updateData: UpdateNoteData = {
        content: longContent,
      };

      await expect(
        NoteService.updateNote(noteToUpdate.id, updateData, tenant1.id, regularUser1.id)
      ).rejects.toThrow('Conteúdo da nota não pode exceder 10.000 caracteres');
    });

    it('deve validar que type é válido se atualizado', async () => {
      const updateData: UpdateNoteData = {
        type: NoteType.ANNOTATION,
      };

      const updated = await NoteService.updateNote(
        noteToUpdate.id,
        updateData,
        tenant1.id,
        regularUser1.id
      );

      expect(updated.type).toBe(NoteType.ANNOTATION);
    });

    it('deve lançar erro ao tentar atualizar nota de outro usuário (não criador e não Admin)', async () => {
      const updateData: UpdateNoteData = {
        content: 'Tentativa de atualizar',
      };

      await expect(
        NoteService.updateNote(noteToUpdate.id, updateData, tenant1.id, regularUser2.id)
      ).rejects.toThrow('Você não tem permissão para editar esta nota');
    });

    it('deve lançar erro ao tentar atualizar nota de outro tenant', async () => {
      const updateData: UpdateNoteData = {
        content: 'Tentativa de atualizar',
      };

      await expect(
        NoteService.updateNote(noteToUpdate.id, updateData, tenant2.id, adminUser1.id)
      ).rejects.toThrow('Nota não encontrada, não pertence ao seu tenant ou foi deletada');
    });

    it('deve lançar erro ao tentar atualizar nota soft deleted', async () => {
      // Deletar nota
      await NoteService.deleteNote(noteToUpdate.id, tenant1.id, regularUser1.id);

      const updateData: UpdateNoteData = {
        content: 'Tentativa de atualizar deletada',
      };

      await expect(
        NoteService.updateNote(noteToUpdate.id, updateData, tenant1.id, regularUser1.id)
      ).rejects.toThrow('Nota não encontrada, não pertence ao seu tenant ou foi deletada');
    });

    it('deve lançar erro ao tentar atualizar content para vazio', async () => {
      const updateData: UpdateNoteData = {
        content: '',
      };

      await expect(
        NoteService.updateNote(noteToUpdate.id, updateData, tenant1.id, regularUser1.id)
      ).rejects.toThrow('Conteúdo da nota não pode ser vazio');
    });

    it('deve lançar erro ao tentar atualizar content para espaços em branco', async () => {
      const updateData: UpdateNoteData = {
        content: '   ',
      };

      await expect(
        NoteService.updateNote(noteToUpdate.id, updateData, tenant1.id, regularUser1.id)
      ).rejects.toThrow('Conteúdo da nota não pode ser vazio');
    });
  });

  describe('deleteNote', () => {
    let noteToDelete: { id: string; createdById: string };

    beforeEach(async () => {
      const data: CreateNoteData = {
        content: 'Nota para deletar',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const note = await NoteService.createNote(data, tenant1.id, regularUser1.id);
      noteToDelete = { id: note.id, createdById: note.createdById };
    });

    it('deve fazer soft delete quando usuário é criador', async () => {
      await NoteService.deleteNote(noteToDelete.id, tenant1.id, regularUser1.id);

      const deletedNote = await prisma.note.findUnique({
        where: { id: noteToDelete.id },
      });

      expect(deletedNote).toBeDefined();
      expect(deletedNote?.deletedAt).toBeDefined();
      expect(deletedNote?.deletedAt).toBeInstanceOf(Date);
    });

    it('deve fazer soft delete quando usuário tem role Admin', async () => {
      // Criar nota de outro usuário
      const note = await NoteService.createNote(
        {
          content: 'Nota de outro usuário',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        regularUser2.id
      );

      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);

      const deletedNote = await prisma.note.findUnique({
        where: { id: note.id },
      });

      expect(deletedNote?.deletedAt).toBeDefined();
    });

    it('deve lançar erro ao tentar deletar nota inexistente', async () => {
      const fakeNoteId = '00000000-0000-0000-0000-000000000000';

      await expect(
        NoteService.deleteNote(fakeNoteId, tenant1.id, regularUser1.id)
      ).rejects.toThrow('ID da nota inválido');
    });

    it('deve lançar erro ao tentar deletar nota de outro usuário (não criador e não Admin)', async () => {
      // Criar nota de outro usuário
      const note = await NoteService.createNote(
        {
          content: 'Nota de outro usuário',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        regularUser2.id
      );

      await expect(
        NoteService.deleteNote(note.id, tenant1.id, regularUser1.id)
      ).rejects.toThrow('Você não tem permissão para deletar esta nota');
    });

    it('deve lançar erro ao tentar deletar nota de outro tenant', async () => {
      await expect(
        NoteService.deleteNote(noteToDelete.id, tenant2.id, regularUser1.id)
      ).rejects.toThrow('Nota não encontrada, não pertence ao seu tenant ou foi deletada');
    });

    it('deve lançar erro ao tentar deletar nota já soft deleted', async () => {
      // Deletar primeira vez
      await NoteService.deleteNote(noteToDelete.id, tenant1.id, regularUser1.id);

      // Tentar deletar novamente
      await expect(
        NoteService.deleteNote(noteToDelete.id, tenant1.id, regularUser1.id)
      ).rejects.toThrow('Nota não encontrada, não pertence ao seu tenant ou foi deletada');
    });

    it('deve preservar nota no banco (não remover fisicamente)', async () => {
      await NoteService.deleteNote(noteToDelete.id, tenant1.id, regularUser1.id);

      const deletedNote = await prisma.note.findUnique({
        where: { id: noteToDelete.id },
      });

      expect(deletedNote).toBeDefined();
      expect(deletedNote?.id).toBe(noteToDelete.id);
    });
  });

  describe('getNoteById', () => {
    let note: { id: string };

    beforeEach(async () => {
      const data: CreateNoteData = {
        content: 'Nota para buscar',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const created = await NoteService.createNote(data, tenant1.id, adminUser1.id);
      note = { id: created.id };
    });

    it('deve retornar nota específica quando encontrada', async () => {
      const found = await NoteService.getNoteById(note.id, tenant1.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(note.id);
      expect(found.content).toBe('Nota para buscar');
    });

    it('deve retornar erro quando nota não existe', async () => {
      const fakeNoteId = '00000000-0000-0000-0000-000000000000';

      await expect(
        NoteService.getNoteById(fakeNoteId, tenant1.id)
      ).rejects.toThrow('ID da nota inválido');
    });

    it('deve retornar erro quando nota pertence a outro tenant', async () => {
      await expect(
        NoteService.getNoteById(note.id, tenant2.id)
      ).rejects.toThrow('Nota não encontrada, não pertence ao seu tenant ou foi deletada');
    });

    it('deve retornar erro quando nota está soft deleted', async () => {
      await NoteService.deleteNote(note.id, tenant1.id, adminUser1.id);

      await expect(
        NoteService.getNoteById(note.id, tenant1.id)
      ).rejects.toThrow('Nota não encontrada, não pertence ao seu tenant ou foi deletada');
    });

    it('deve incluir relacionamentos: createdBy, relatedEntity', async () => {
      const found = await NoteService.getNoteById(note.id, tenant1.id);

      expect(found.createdBy).toBeDefined();
      expect(found.createdBy.id).toBe(adminUser1.id);
      expect(found.relatedEntity).toBeDefined();
    });
  });

  describe('listNotes', () => {
    beforeEach(async () => {
      // Criar várias notas para testar listagem
      await Promise.all([
        NoteService.createNote(
          {
            content: 'Nota 1',
            type: NoteType.NOTE,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        ),
        NoteService.createNote(
          {
            content: 'Nota 2',
            type: NoteType.COMMENT,
            relatedEntityType: 'Company',
            relatedEntityId: company1.id,
          },
          tenant1.id,
          adminUser1.id
        ),
        NoteService.createNote(
          {
            content: 'Nota 3',
            type: NoteType.ANNOTATION,
            relatedEntityType: 'Lead',
            relatedEntityId: lead1.id,
          },
          tenant1.id,
          adminUser1.id
        ),
      ]);
    });

    it('deve listar notas do tenant atual (filtrar por tenantId)', async () => {
      const result = await NoteService.listNotes(tenant1.id);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((note) => note.tenantId === tenant1.id)).toBe(true);
    });

    it('deve aplicar filtro de type', async () => {
      const result = await NoteService.listNotes(tenant1.id, { type: NoteType.NOTE });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((note) => note.type === NoteType.NOTE)).toBe(true);
    });

    it('deve aplicar filtro de relatedEntityType', async () => {
      const result = await NoteService.listNotes(tenant1.id, {
        relatedEntityType: 'Contact',
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((note) => note.relatedEntityType === 'Contact')).toBe(true);
    });

    it('deve aplicar filtro de relatedEntityId', async () => {
      const result = await NoteService.listNotes(tenant1.id, {
        relatedEntityId: contact1.id,
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((note) => note.relatedEntityId === contact1.id)).toBe(true);
    });

    it('deve ordenar por createdAt DESC (mais recente primeiro)', async () => {
      const result = await NoteService.listNotes(tenant1.id, undefined, {
        orderBy: 'createdAt',
        order: 'desc',
      });

      if (result.data.length > 1) {
        const dates = result.data.map((n) => n.createdAt.getTime());
        expect(dates[0] >= dates[1]).toBe(true);
      }
    });

    it('deve paginar corretamente (limit, offset)', async () => {
      const result1 = await NoteService.listNotes(tenant1.id, undefined, {
        limit: 2,
        offset: 0,
      });

      const result2 = await NoteService.listNotes(tenant1.id, undefined, {
        limit: 2,
        offset: 2,
      });

      expect(result1.data.length).toBeLessThanOrEqual(2);
      expect(result2.data.length).toBeLessThanOrEqual(2);
    });

    it('deve calcular total de registros antes da paginação', async () => {
      const result = await NoteService.listNotes(tenant1.id, undefined, {
        limit: 2,
        offset: 0,
      });

      expect(result.pagination.total).toBeGreaterThanOrEqual(result.data.length);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.offset).toBe(0);
    });

    it('deve excluir notas soft deleted (deletedAt IS NOT NULL)', async () => {
      // Criar e deletar uma nota
      const noteToDelete = await NoteService.createNote(
        {
          content: 'Nota para deletar da lista',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      await NoteService.deleteNote(noteToDelete.id, tenant1.id, adminUser1.id);

      const result = await NoteService.listNotes(tenant1.id);

      expect(result.data.find((n) => n.id === noteToDelete.id)).toBeUndefined();
    });

    it('deve incluir relacionamentos: createdBy, relatedEntity', async () => {
      const result = await NoteService.listNotes(tenant1.id);

      if (result.data.length > 0) {
        const note = result.data[0];
        expect(note.createdBy).toBeDefined();
        expect(note.createdBy.id).toBeDefined();
        expect(note.relatedEntity).toBeDefined();
      }
    });

    it('deve isolar notas por tenant', async () => {
      // Criar nota no tenant2
      await NoteService.createNote(
        {
          content: 'Nota Tenant 2',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant2.id,
        adminUser1.id
      );

      const result = await NoteService.listNotes(tenant1.id);

      expect(result.data.every((note) => note.tenantId === tenant1.id)).toBe(true);
      expect(result.data.find((note) => note.content === 'Nota Tenant 2')).toBeUndefined();
    });
  });
});
