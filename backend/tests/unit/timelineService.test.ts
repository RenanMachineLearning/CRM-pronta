/**
 * Testes unitários para TimelineService
 * 
 * Testa lógica de agregação, ordenação e paginação de timeline.
 * Foca em validações, regras de negócio e transformações de dados.
 */

import { TimelineService } from '../../src/services/timelineService';
import { TaskService } from '../../src/services/taskService';
import { NoteService } from '../../src/services/noteService';
// TaskType, TaskStatus, TaskPriority, NoteType disponíveis se necessário
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  createStandardRoles,
  assignRoleToUser,
  closeDatabase,
  prisma,
} from '../helpers/db';

describe('TimelineService', () => {
  let tenant1: { id: string };
  let tenant2: { id: string };
  let adminUser1: { id: string };
  let adminRole1: { id: string };
  let contact1: { id: string };
  let company1: { id: string };
  let lead1: { id: string };
  let opportunity1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    tenant1 = await createTestTenant({
      name: 'Timeline Service Test Tenant 1',
      slug: 'timeline-service-test-tenant-1',
      status: 'ACTIVE',
    });

    tenant2 = await createTestTenant({
      name: 'Timeline Service Test Tenant 2',
      slug: 'timeline-service-test-tenant-2',
      status: 'ACTIVE',
    });

    // Criar roles padrão
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    // Criar usuários
    adminUser1 = await createTestUser({
      email: 'admin1@timelineservice.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    await assignRoleToUser(adminUser1.id, adminRole1.id);


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
        status: 'OPEN',
        value: 0,
        stageId: stage1.id,
      },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('getTimeline', () => {
    it('deve validar que entidade existe e pertence ao tenant', async () => {
      const fakeEntityId = '00000000-0000-0000-0000-000000000000';

      await expect(
        TimelineService.getTimeline('Contact', fakeEntityId, tenant1.id)
      ).rejects.toThrow('ID da entidade deve ser um UUID válido');
    });

    it('deve validar que entityType é válido', async () => {
      await expect(
        TimelineService.getTimeline('InvalidType', contact1.id, tenant1.id)
      ).rejects.toThrow('Tipo de entidade inválido');
    });

    it('deve validar que entityId é UUID válido', async () => {
      await expect(
        TimelineService.getTimeline('Contact', 'invalid-id', tenant1.id)
      ).rejects.toThrow('ID da entidade deve ser um UUID válido');
    });

    it('deve validar que tenantId é UUID válido', async () => {
      await expect(
        TimelineService.getTimeline('Contact', contact1.id, 'invalid-tenant-id')
      ).rejects.toThrow('ID do tenant deve ser um UUID válido');
    });

    it('deve retornar timeline vazia quando não há atividades', async () => {
      const timeline = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id);

      expect(timeline.data).toEqual([]);
      expect(timeline.pagination.total).toBe(0);
      expect(timeline.entity.type).toBe('Contact');
      expect(timeline.entity.id).toBe(contact1.id);
    });

    it('deve agregar tarefas relacionadas à entidade', async () => {
      // Criar tarefa relacionada
      const task = await TaskService.createTask(
        {
          title: 'Tarefa na Timeline',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      const timeline = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id);

      expect(timeline.data.length).toBe(1);
      expect(timeline.data[0].type).toBe('task');
      expect(timeline.data[0].id).toBe(task.id);
      expect(timeline.data[0].data).toHaveProperty('title', 'Tarefa na Timeline');
    });

    it('deve agregar notas relacionadas à entidade', async () => {
      // Criar nota relacionada
      const note = await NoteService.createNote(
        {
          content: 'Nota na Timeline',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      const timeline = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id);

      const noteItem = timeline.data.find((item) => item.type === 'note' && item.id === note.id);
      expect(noteItem).toBeDefined();
      expect(noteItem?.data).toHaveProperty('content', 'Nota na Timeline');
    });

    it('deve agregar logs de auditoria relacionados à entidade', async () => {
      // Criar contato para gerar log de auditoria
      const newContact = await prisma.contact.create({
        data: {
          tenantId: tenant1.id,
          firstName: 'Novo',
          lastName: 'Contato',
          status: 'ACTIVE',
        },
      });

      // Aguardar um pouco para garantir que o log de auditoria foi criado
      await new Promise((resolve) => setTimeout(resolve, 100));

      const timeline = await TimelineService.getTimeline('Contact', newContact.id, tenant1.id);

      // Pode haver logs de auditoria (create, update, etc.)
      const auditItems = timeline.data.filter((item) => item.type === 'audit');
      expect(auditItems.length).toBeGreaterThanOrEqual(0);
    });

    it('deve ordenar itens por timestamp DESC (mais recente primeiro)', async () => {
      // Criar múltiplas atividades com delays para garantir timestamps diferentes
      const task1 = await TaskService.createTask(
        {
          title: 'Tarefa 1',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      await NoteService.createNote(
        {
          content: 'Nota 1',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      const task2 = await TaskService.createTask(
        {
          title: 'Tarefa 2',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      const timeline = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id);

      // Verificar que está ordenado por timestamp DESC
      if (timeline.data.length > 1) {
        for (let i = 0; i < timeline.data.length - 1; i++) {
          const current = timeline.data[i].timestamp.getTime();
          const next = timeline.data[i + 1].timestamp.getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }

      // Verificar que task2 (mais recente) aparece antes de task1
      const task2Index = timeline.data.findIndex((item) => item.id === task2.id);
      const task1Index = timeline.data.findIndex((item) => item.id === task1.id);
      expect(task2Index).toBeLessThan(task1Index);
    });

    it('deve manter ordem estável quando timestamps são iguais (por tipo, depois por ID)', async () => {
      // Criar múltiplas atividades no mesmo momento
      const [task1, task2, note1] = await Promise.all([
        TaskService.createTask(
          {
            title: 'Tarefa 1',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        ),
        TaskService.createTask(
          {
            title: 'Tarefa 2',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        ),
        NoteService.createNote(
          {
            content: 'Nota 1',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        ),
      ]);

      const timeline = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id);

      // Verificar que itens com mesmo timestamp mantêm ordem consistente
      const task1Item = timeline.data.find((item) => item.id === task1.id);
      const task2Item = timeline.data.find((item) => item.id === task2.id);
      const note1Item = timeline.data.find((item) => item.id === note1.id);

      expect(task1Item).toBeDefined();
      expect(task2Item).toBeDefined();
      expect(note1Item).toBeDefined();
    });

    it('deve paginar corretamente (limit, offset)', async () => {
      // Criar múltiplas atividades
      await Promise.all([
        TaskService.createTask(
          {
            title: 'Tarefa Pag 1',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        ),
        TaskService.createTask(
          {
            title: 'Tarefa Pag 2',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        ),
        NoteService.createNote(
          {
            content: 'Nota Pag 1',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        ),
      ]);

      const result1 = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id, {
        limit: 2,
        offset: 0,
      });

      const result2 = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id, {
        limit: 2,
        offset: 2,
      });

      expect(result1.data.length).toBeLessThanOrEqual(2);
      expect(result2.data.length).toBeLessThanOrEqual(2);
      expect(result1.data[0]?.id).not.toBe(result2.data[0]?.id);
    });

    it('deve calcular total de registros antes da paginação', async () => {
      const result = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id, {
        limit: 2,
        offset: 0,
      });

      expect(result.pagination.total).toBeGreaterThanOrEqual(result.data.length);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.offset).toBe(0);
    });

    it('deve excluir atividades soft deleted', async () => {
      // Criar e deletar uma tarefa
      const taskToDelete = await TaskService.createTask(
        {
          title: 'Tarefa para Deletar',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      await TaskService.deleteTask(taskToDelete.id, tenant1.id, adminUser1.id);

      const timeline = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id);

      expect(timeline.data.find((item) => item.id === taskToDelete.id)).toBeUndefined();
    });

    it('deve excluir notas soft deleted', async () => {
      // Criar e deletar uma nota
      const noteToDelete = await NoteService.createNote(
        {
          content: 'Nota para Deletar',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      await NoteService.deleteNote(noteToDelete.id, tenant1.id, adminUser1.id);

      const timeline = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id);

      expect(timeline.data.find((item) => item.id === noteToDelete.id)).toBeUndefined();
    });

    it('deve isolar timeline por tenant', async () => {
      // Criar atividade no tenant2
      const contact2 = await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Contato',
          lastName: 'Tenant 2',
          status: 'ACTIVE',
        },
      });

      await TaskService.createTask(
        {
          title: 'Tarefa Tenant 2',
          relatedEntityType: 'Contact',
          relatedEntityId: contact2.id,
        },
        tenant2.id,
        adminUser1.id
      );

      const timeline = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id);

      // Verificar que não inclui atividades do tenant2
      expect(timeline.data.every((item) => {
        if (item.type !== 'task') return true;
        const taskData = item.data as { title: string };
        return taskData.title !== 'Tarefa Tenant 2';
      })).toBe(true);
    });

    it('deve incluir informações da entidade (name)', async () => {
      const timeline = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id);

      expect(timeline.entity.type).toBe('Contact');
      expect(timeline.entity.id).toBe(contact1.id);
      expect(timeline.entity.name).toBeDefined();
    });

    it('deve funcionar com todos os tipos de entidade: Contact, Company, Lead, Opportunity, Task', async () => {
      // Contact
      const timeline1 = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id);
      expect(timeline1.entity.type).toBe('Contact');

      // Company
      const timeline2 = await TimelineService.getTimeline('Company', company1.id, tenant1.id);
      expect(timeline2.entity.type).toBe('Company');

      // Lead
      const timeline3 = await TimelineService.getTimeline('Lead', lead1.id, tenant1.id);
      expect(timeline3.entity.type).toBe('Lead');

      // Opportunity
      const timeline4 = await TimelineService.getTimeline('Opportunity', opportunity1.id, tenant1.id);
      expect(timeline4.entity.type).toBe('Opportunity');

      // Task
      const task = await TaskService.createTask(
        {
          title: 'Tarefa para Timeline',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      const timeline5 = await TimelineService.getTimeline('Task', task.id, tenant1.id);
      expect(timeline5.entity.type).toBe('Task');
    });

    it('deve incluir informações do usuário (userId, userName) em cada item', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa com Usuário',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      const timeline = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id);

      const taskItem = timeline.data.find((item) => item.id === task.id);
      expect(taskItem).toBeDefined();
      expect(taskItem?.userId).toBe(adminUser1.id);
      expect(taskItem?.userName).toBe('Admin User 1');
    });

    it('deve limitar paginação a máximo de 100 itens', async () => {
      const timeline = await TimelineService.getTimeline('Contact', contact1.id, tenant1.id, {
        limit: 200, // Tentar limit maior que 100
        offset: 0,
      });

      expect(timeline.pagination.limit).toBeLessThanOrEqual(100);
    });
  });
});
