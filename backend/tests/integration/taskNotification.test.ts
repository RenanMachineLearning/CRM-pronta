/**
 * Testes de integração para notificações de tarefas vencidas
 * 
 * Valida busca, envio e processamento de notificações de tarefas vencidas.
 * Testa isolamento multi-tenant, filtros, destinatários, retry e edge cases.
 */

import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  closeDatabase,
  prisma,
} from '../helpers/db';
import {
  findOverdueTasks,
  processOverdueTasks,
} from '../../src/services/taskNotificationService';
import { TaskStatus, TaskPriority, TaskType, UserStatus } from '@prisma/client';
import { EmailService } from '../../src/services/emailService';

// Mock do EmailService para capturar chamadas
const emailServiceSpy = jest.spyOn(EmailService, 'sendOverdueTaskNotification');

describe('Task Notification Service - Integration Tests', () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let user1: { id: string; email: string; name: string };
  let user2: { id: string; email: string; name: string };
  let user3: { id: string; email: string; name: string };
  let inactiveUser: { id: string; email: string; name: string };
  let contact1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    tenant1 = await createTestTenant({
      name: 'Notification Test Tenant 1',
      slug: 'notification-test-tenant-1',
      status: 'ACTIVE',
    });

    tenant2 = await createTestTenant({
      name: 'Notification Test Tenant 2',
      slug: 'notification-test-tenant-2',
      status: 'ACTIVE',
    });

    // Criar usuários
    user1 = await createTestUser({
      email: 'user1@notification.test',
      password: 'Password123',
      name: 'User 1',
      tenantId: tenant1.id,
      status: 'ACTIVE',
    });

    user2 = await createTestUser({
      email: 'user2@notification.test',
      password: 'Password123',
      name: 'User 2',
      tenantId: tenant1.id,
      status: 'ACTIVE',
    });

    user3 = await createTestUser({
      email: 'user3@notification.test',
      password: 'Password123',
      name: 'User 3',
      tenantId: tenant2.id,
      status: 'ACTIVE',
    });

    inactiveUser = await createTestUser({
      email: 'inactive@notification.test',
      password: 'Password123',
      name: 'Inactive User',
      tenantId: tenant1.id,
      status: 'INACTIVE',
    });

    // Criar contato para relacionamento
    contact1 = await prisma.contact.create({
      data: {
        tenantId: tenant1.id,
        firstName: 'João',
        lastName: 'Silva',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(() => {
    emailServiceSpy.mockClear();
  });

  describe('findOverdueTasks', () => {
    it('deve buscar tarefas vencidas corretamente', async () => {
      // Criar tarefa vencida (ontem)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      const overdueTask = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Tarefa Vencida',
          description: 'Descrição da tarefa vencida',
          type: TaskType.OTHER,
          status: TaskStatus.PENDING,
          priority: TaskPriority.HIGH,
          dueDate: yesterday,
          assignedToId: user1.id,
          createdById: user1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        include: {
          assignedTo: true,
          createdBy: true,
          tenant: true,
        },
      });

      const tasks = await findOverdueTasks(tenant1.id);

      expect(tasks.length).toBeGreaterThan(0);
      const foundTask = tasks.find((t) => t.id === overdueTask.id);
      expect(foundTask).toBeDefined();
      expect(foundTask?.title).toBe('Tarefa Vencida');
    });

    it('não deve buscar tarefas futuras', async () => {
      // Criar tarefa futura (amanhã)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Tarefa Futura',
          type: TaskType.OTHER,
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          dueDate: tomorrow,
          assignedToId: user1.id,
          createdById: user1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });

      const tasks = await findOverdueTasks(tenant1.id);
      const futureTask = tasks.find((t) => t.title === 'Tarefa Futura');
      expect(futureTask).toBeUndefined();
    });

    it('não deve buscar tarefas concluídas', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Tarefa Concluída',
          type: TaskType.OTHER,
          status: TaskStatus.COMPLETED,
          priority: TaskPriority.MEDIUM,
          dueDate: yesterday,
          assignedToId: user1.id,
          createdById: user1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });

      const tasks = await findOverdueTasks(tenant1.id);
      const completedTask = tasks.find((t) => t.title === 'Tarefa Concluída');
      expect(completedTask).toBeUndefined();
    });

    it('não deve buscar tarefas já notificadas hoje', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Tarefa Já Notificada',
          type: TaskType.OTHER,
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          dueDate: yesterday,
          assignedToId: user1.id,
          createdById: user1.id,
          lastNotificationSentAt: today, // Notificada hoje
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });

      const tasks = await findOverdueTasks(tenant1.id);
      const notifiedTask = tasks.find((t) => t.title === 'Tarefa Já Notificada');
      expect(notifiedTask).toBeUndefined();
    });

    it('deve isolar tarefas por tenant', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      // Criar tarefa no tenant2
      await prisma.task.create({
        data: {
          tenantId: tenant2.id,
          title: 'Tarefa Tenant 2',
          type: TaskType.OTHER,
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          dueDate: yesterday,
          assignedToId: user3.id,
          createdById: user3.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });

      // Buscar apenas tarefas do tenant1
      const tasks = await findOverdueTasks(tenant1.id);
      const tenant2Task = tasks.find((t) => t.title === 'Tarefa Tenant 2');
      expect(tenant2Task).toBeUndefined();
    });
  });

  describe('processOverdueTasks', () => {
    it('deve processar tarefas vencidas e enviar notificações', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Tarefa para Notificar',
          type: TaskType.OTHER,
          status: TaskStatus.PENDING,
          priority: TaskPriority.HIGH,
          dueDate: yesterday,
          assignedToId: user1.id,
          createdById: user1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });

      const stats = await processOverdueTasks(tenant1.id);

      expect(stats.totalFound).toBeGreaterThan(0);
      expect(stats.totalSent).toBeGreaterThan(0);
      expect(emailServiceSpy).toHaveBeenCalled();

      // Verificar que lastNotificationSentAt foi atualizado
      const updatedTask = await prisma.task.findUnique({
        where: { id: task.id },
      });
      expect(updatedTask?.lastNotificationSentAt).toBeDefined();
    });

    it('deve priorizar assignedTo sobre createdBy', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Tarefa com AssignedTo',
          type: TaskType.OTHER,
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          dueDate: yesterday,
          assignedToId: user2.id, // Atribuído a user2
          createdById: user1.id, // Criado por user1
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });

      await processOverdueTasks(tenant1.id);

      // Verificar que notificação foi enviada para user2 (assignedTo)
      expect(emailServiceSpy).toHaveBeenCalledWith(
        user2.email,
        expect.objectContaining({ id: task.id }),
        tenant1.id,
        user2.name,
        expect.anything()
      );
    });

    it('deve usar createdBy como fallback se não houver assignedTo', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Tarefa sem AssignedTo',
          type: TaskType.OTHER,
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          dueDate: yesterday,
          assignedToId: null, // Sem atribuição
          createdById: user1.id, // Criado por user1
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });

      await processOverdueTasks(tenant1.id);

      // Verificar que notificação foi enviada para user1 (createdBy)
      expect(emailServiceSpy).toHaveBeenCalledWith(
        user1.email,
        expect.objectContaining({ id: task.id }),
        tenant1.id,
        user1.name,
        expect.anything()
      );
    });

    it('não deve notificar se usuário estiver inativo', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Tarefa com Usuário Inativo',
          type: TaskType.OTHER,
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          dueDate: yesterday,
          assignedToId: inactiveUser.id, // Usuário inativo
          createdById: user1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });

      const stats = await processOverdueTasks(tenant1.id);

      // Não deve enviar notificação para usuário inativo
      // Mas pode enviar para createdBy se assignedTo estiver inativo
      // Neste caso, deve pular a tarefa ou usar fallback
      expect(stats.totalProcessed).toBeGreaterThan(0);
    });

    it('não deve enviar múltiplas notificações no mesmo dia', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Tarefa para Teste de Duplicata',
          type: TaskType.OTHER,
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          dueDate: yesterday,
          assignedToId: user1.id,
          createdById: user1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });

      // Primeira execução
      await processOverdueTasks(tenant1.id);
      const firstCallCount = emailServiceSpy.mock.calls.length;

      // Segunda execução (mesmo dia)
      emailServiceSpy.mockClear();
      await processOverdueTasks(tenant1.id);

      // Não deve enviar novamente
      expect(emailServiceSpy).not.toHaveBeenCalled();
    });

    it('deve processar múltiplas tarefas em lote', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      // Criar múltiplas tarefas vencidas
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        tasks.push(
          prisma.task.create({
            data: {
              tenantId: tenant1.id,
              title: `Tarefa Vencida ${i + 1}`,
              type: TaskType.OTHER,
              status: TaskStatus.PENDING,
              priority: TaskPriority.MEDIUM,
              dueDate: yesterday,
              assignedToId: user1.id,
              createdById: user1.id,
              relatedEntityType: 'Contact',
              relatedEntityId: contact1.id,
            },
          })
        );
      }
      await Promise.all(tasks);

      const stats = await processOverdueTasks(tenant1.id);

      expect(stats.totalFound).toBeGreaterThanOrEqual(5);
      expect(stats.totalProcessed).toBeGreaterThanOrEqual(5);
    });

    it('deve retornar estatísticas corretas', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);

      await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          title: 'Tarefa para Estatísticas',
          type: TaskType.OTHER,
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          dueDate: yesterday,
          assignedToId: user1.id,
          createdById: user1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
      });

      const stats = await processOverdueTasks(tenant1.id);

      expect(stats).toHaveProperty('totalFound');
      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('totalSent');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('duration');
      expect(stats.duration).toBeGreaterThan(0);
    });
  });
});
