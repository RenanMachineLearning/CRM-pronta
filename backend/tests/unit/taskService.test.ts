/**
 * Testes unitários para TaskService
 * 
 * Testa lógica de negócio isoladamente usando banco de dados real.
 * Foca em validações, regras de negócio e transformações de dados.
 */

import { TaskService, CreateTaskData, UpdateTaskData } from '../../src/services/taskService';
import { TaskType, TaskStatus, TaskPriority } from '@prisma/client';
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

describe('TaskService', () => {
  let tenant1: { id: string };
  let tenant2: { id: string };
  let adminUser1: { id: string };
  let regularUser1: { id: string };
  let assignedUser1: { id: string };
  let adminRole1: { id: string };
  let contact1: { id: string };
  let company1: { id: string };
  let lead1: { id: string };
  let opportunity1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    tenant1 = await createTestTenant({
      name: 'Task Service Test Tenant 1',
      slug: 'task-service-test-tenant-1',
      status: 'ACTIVE',
    });

    tenant2 = await createTestTenant({
      name: 'Task Service Test Tenant 2',
      slug: 'task-service-test-tenant-2',
      status: 'ACTIVE',
    });

    // Criar roles padrão
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    // Criar permissões para Task
    await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'list' }),
    ]);

    // Criar usuários
    adminUser1 = await createTestUser({
      email: 'admin1@taskservice.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    regularUser1 = await createTestUser({
      email: 'regular1@taskservice.test',
      password: 'RegularPass123',
      name: 'Regular User 1',
      tenantId: tenant1.id,
    });

    assignedUser1 = await createTestUser({
      email: 'assigned1@taskservice.test',
      password: 'AssignedPass123',
      name: 'Assigned User 1',
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

  describe('createTask', () => {
    it('deve criar tarefa com dados válidos completos', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const data: CreateTaskData = {
        title: 'Tarefa Completa',
        description: 'Descrição da tarefa',
        type: TaskType.MEETING,
        status: TaskStatus.PENDING,
        dueDate: tomorrow,
        priority: TaskPriority.HIGH,
        assignedToId: assignedUser1.id,
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const task = await TaskService.createTask(data, tenant1.id, adminUser1.id);

      expect(task).toBeDefined();
      expect(task.title).toBe('Tarefa Completa');
      expect(task.description).toBe('Descrição da tarefa');
      expect(task.type).toBe(TaskType.MEETING);
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.priority).toBe(TaskPriority.HIGH);
      expect(task.assignedToId).toBe(assignedUser1.id);
      expect(task.createdById).toBe(adminUser1.id);
      expect(task.relatedEntityType).toBe('Contact');
      expect(task.relatedEntityId).toBe(contact1.id);
      expect(task.dueDate).toBeDefined();
    });

    it('deve criar tarefa apenas com campos obrigatórios', async () => {
      const data: CreateTaskData = {
        title: 'Tarefa Mínima',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const task = await TaskService.createTask(data, tenant1.id, adminUser1.id);

      expect(task).toBeDefined();
      expect(task.title).toBe('Tarefa Mínima');
      expect(task.type).toBe(TaskType.OTHER); // Valor padrão
      expect(task.status).toBe(TaskStatus.PENDING); // Valor padrão
      expect(task.priority).toBe(TaskPriority.MEDIUM); // Valor padrão
      expect(task.assignedToId).toBeNull();
      expect(task.dueDate).toBeNull();
    });

    it('deve usar valores padrão para campos não fornecidos', async () => {
      const data: CreateTaskData = {
        title: 'Tarefa com Padrões',
        relatedEntityType: 'Company',
        relatedEntityId: company1.id,
      };

      const task = await TaskService.createTask(data, tenant1.id, adminUser1.id);

      expect(task.type).toBe(TaskType.OTHER);
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.priority).toBe(TaskPriority.MEDIUM);
    });

    it('deve validar que title é obrigatório', async () => {
      const data: CreateTaskData = {
        title: '',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      await expect(
        TaskService.createTask(data, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Título da tarefa é obrigatório');
    });

    it('deve validar que dueDate não é passada', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const data: CreateTaskData = {
        title: 'Tarefa com Data Passada',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
        dueDate: yesterday,
      };

      await expect(
        TaskService.createTask(data, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Data de vencimento não pode ser passada');
    });

    it('deve validar que assignedToId existe e pertence ao tenant', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      const data: CreateTaskData = {
        title: 'Tarefa com Usuário Inválido',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
        assignedToId: fakeUserId,
      };

      await expect(
        TaskService.createTask(data, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Usuário não encontrado ou não pertence ao seu tenant');
    });

    it('deve validar que relatedEntityId existe e pertence ao tenant', async () => {
      const fakeEntityId = '00000000-0000-0000-0000-000000000000';

      const data: CreateTaskData = {
        title: 'Tarefa com Entidade Inválida',
        relatedEntityType: 'Contact',
        relatedEntityId: fakeEntityId,
      };

      await expect(
        TaskService.createTask(data, tenant1.id, adminUser1.id)
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

      const data: CreateTaskData = {
        title: 'Tarefa com Entidade Deletada',
        relatedEntityType: 'Contact',
        relatedEntityId: contactToDelete.id,
      };

      await expect(
        TaskService.createTask(data, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Contato não encontrado, não pertence ao seu tenant ou foi deletado');
    });

    it('deve definir createdById com requestingUserId', async () => {
      const data: CreateTaskData = {
        title: 'Tarefa Criada por Usuário',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const task = await TaskService.createTask(data, tenant1.id, regularUser1.id);

      expect(task.createdById).toBe(regularUser1.id);
      expect(task.createdBy.id).toBe(regularUser1.id);
    });

    it('deve lançar erro se relatedEntityType inválido', async () => {
      const data: CreateTaskData = {
        title: 'Tarefa com Tipo Inválido',
        relatedEntityType: 'InvalidType' as any,
        relatedEntityId: contact1.id,
      };

      await expect(
        TaskService.createTask(data, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Tipo de entidade relacionada inválido');
    });

    it('deve criar tarefa com todos os tipos de entidade relacionada', async () => {
      // Contact
      const task1 = await TaskService.createTask(
        {
          title: 'Tarefa Contact',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task1.relatedEntityType).toBe('Contact');

      // Company
      const task2 = await TaskService.createTask(
        {
          title: 'Tarefa Company',
          relatedEntityType: 'Company',
          relatedEntityId: company1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task2.relatedEntityType).toBe('Company');

      // Lead
      const task3 = await TaskService.createTask(
        {
          title: 'Tarefa Lead',
          relatedEntityType: 'Lead',
          relatedEntityId: lead1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task3.relatedEntityType).toBe('Lead');

      // Opportunity
      const task4 = await TaskService.createTask(
        {
          title: 'Tarefa Opportunity',
          relatedEntityType: 'Opportunity',
          relatedEntityId: opportunity1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task4.relatedEntityType).toBe('Opportunity');
    });
  });

  describe('updateTask', () => {
    let taskToUpdate: { id: string };

    beforeEach(async () => {
      // Criar tarefa para atualizar
      const data: CreateTaskData = {
        title: 'Tarefa para Atualizar',
        description: 'Descrição original',
        type: TaskType.OTHER,
        status: TaskStatus.PENDING,
        priority: TaskPriority.LOW,
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const task = await TaskService.createTask(data, tenant1.id, adminUser1.id);
      taskToUpdate = { id: task.id };
    });

    it('deve atualizar tarefa com dados válidos', async () => {
      const updateData: UpdateTaskData = {
        title: 'Tarefa Atualizada',
        description: 'Nova descrição',
        status: TaskStatus.IN_PROGRESS,
      };

      const updated = await TaskService.updateTask(
        taskToUpdate.id,
        updateData,
        tenant1.id,
        adminUser1.id
      );

      expect(updated.title).toBe('Tarefa Atualizada');
      expect(updated.description).toBe('Nova descrição');
      expect(updated.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('deve atualizar apenas campos fornecidos (partial update)', async () => {
      const updateData: UpdateTaskData = {
        title: 'Apenas Título Atualizado',
      };

      const updated = await TaskService.updateTask(
        taskToUpdate.id,
        updateData,
        tenant1.id,
        adminUser1.id
      );

      expect(updated.title).toBe('Apenas Título Atualizado');
      expect(updated.description).toBe('Descrição original'); // Mantido
      expect(updated.status).toBe(TaskStatus.PENDING); // Mantido
    });

    it('deve definir completedAt automaticamente quando status muda para COMPLETED', async () => {
      const updateData: UpdateTaskData = {
        status: TaskStatus.COMPLETED,
      };

      const updated = await TaskService.updateTask(
        taskToUpdate.id,
        updateData,
        tenant1.id,
        adminUser1.id
      );

      expect(updated.status).toBe(TaskStatus.COMPLETED);
      expect(updated.completedAt).toBeDefined();
      expect(updated.completedAt).toBeInstanceOf(Date);
    });

    it('deve limpar completedAt quando status sai de COMPLETED', async () => {
      // Primeiro completar a tarefa
      await TaskService.updateTask(
        taskToUpdate.id,
        { status: TaskStatus.COMPLETED },
        tenant1.id,
        adminUser1.id
      );

      // Depois mudar para IN_PROGRESS
      const updated = await TaskService.updateTask(
        taskToUpdate.id,
        { status: TaskStatus.IN_PROGRESS },
        tenant1.id,
        adminUser1.id
      );

      expect(updated.status).toBe(TaskStatus.IN_PROGRESS);
      expect(updated.completedAt).toBeNull();
    });

    it('deve validar que dueDate não é passada se fornecida', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const updateData: UpdateTaskData = {
        dueDate: yesterday,
      };

      await expect(
        TaskService.updateTask(taskToUpdate.id, updateData, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Data de vencimento não pode ser passada');
    });

    it('deve permitir null para assignedToId (remover atribuição)', async () => {
      // Primeiro atribuir
      await TaskService.updateTask(
        taskToUpdate.id,
        { assignedToId: assignedUser1.id },
        tenant1.id,
        adminUser1.id
      );

      // Depois remover atribuição
      const updated = await TaskService.updateTask(
        taskToUpdate.id,
        { assignedToId: null },
        tenant1.id,
        adminUser1.id
      );

      expect(updated.assignedToId).toBeNull();
    });

    it('deve lançar erro ao tentar atualizar tarefa de outro tenant', async () => {
      const updateData: UpdateTaskData = {
        title: 'Tentativa de Atualizar',
      };

      await expect(
        TaskService.updateTask(taskToUpdate.id, updateData, tenant2.id, adminUser1.id)
      ).rejects.toThrow('Tarefa não encontrada, não pertence ao seu tenant ou foi deletada');
    });

    it('deve lançar erro ao tentar atualizar tarefa soft deleted', async () => {
      // Deletar tarefa
      await TaskService.deleteTask(taskToUpdate.id, tenant1.id, adminUser1.id);

      const updateData: UpdateTaskData = {
        title: 'Tentativa de Atualizar Deletada',
      };

      await expect(
        TaskService.updateTask(taskToUpdate.id, updateData, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Tarefa não encontrada, não pertence ao seu tenant ou foi deletada');
    });

    it('deve lançar erro ao tentar atualizar title para vazio', async () => {
      const updateData: UpdateTaskData = {
        title: '',
      };

      await expect(
        TaskService.updateTask(taskToUpdate.id, updateData, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Título da tarefa é obrigatório');
    });
  });

  describe('deleteTask', () => {
    let taskToDelete: { id: string };

    beforeEach(async () => {
      const data: CreateTaskData = {
        title: 'Tarefa para Deletar',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const task = await TaskService.createTask(data, tenant1.id, adminUser1.id);
      taskToDelete = { id: task.id };
    });

    it('deve fazer soft delete (marcar deletedAt com timestamp atual)', async () => {
      await TaskService.deleteTask(taskToDelete.id, tenant1.id, adminUser1.id);

      const deletedTask = await prisma.task.findUnique({
        where: { id: taskToDelete.id },
      });

      expect(deletedTask).toBeDefined();
      expect(deletedTask?.deletedAt).toBeDefined();
      expect(deletedTask?.deletedAt).toBeInstanceOf(Date);
    });

    it('deve lançar erro ao tentar deletar tarefa inexistente', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';

      await expect(
        TaskService.deleteTask(fakeTaskId, tenant1.id, adminUser1.id)
      ).rejects.toThrow('ID da tarefa inválido');
    });

    it('deve lançar erro ao tentar deletar tarefa de outro tenant', async () => {
      await expect(
        TaskService.deleteTask(taskToDelete.id, tenant2.id, adminUser1.id)
      ).rejects.toThrow('Tarefa não encontrada, não pertence ao seu tenant ou foi deletada');
    });

    it('deve lançar erro ao tentar deletar tarefa já soft deleted', async () => {
      // Deletar primeira vez
      await TaskService.deleteTask(taskToDelete.id, tenant1.id, adminUser1.id);

      // Tentar deletar novamente
      await expect(
        TaskService.deleteTask(taskToDelete.id, tenant1.id, adminUser1.id)
      ).rejects.toThrow('Tarefa não encontrada, não pertence ao seu tenant ou foi deletada');
    });

    it('deve preservar tarefa no banco (não remover fisicamente)', async () => {
      await TaskService.deleteTask(taskToDelete.id, tenant1.id, adminUser1.id);

      const deletedTask = await prisma.task.findUnique({
        where: { id: taskToDelete.id },
      });

      expect(deletedTask).toBeDefined();
      expect(deletedTask?.id).toBe(taskToDelete.id);
    });
  });

  describe('getTaskById', () => {
    let task: { id: string };

    beforeEach(async () => {
      const data: CreateTaskData = {
        title: 'Tarefa para Buscar',
        relatedEntityType: 'Contact',
        relatedEntityId: contact1.id,
      };

      const created = await TaskService.createTask(data, tenant1.id, adminUser1.id);
      task = { id: created.id };
    });

    it('deve retornar tarefa específica quando encontrada', async () => {
      const found = await TaskService.getTaskById(task.id, tenant1.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(task.id);
      expect(found.title).toBe('Tarefa para Buscar');
    });

    it('deve retornar erro quando tarefa não existe', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';

      await expect(
        TaskService.getTaskById(fakeTaskId, tenant1.id)
      ).rejects.toThrow('ID da tarefa inválido');
    });

    it('deve retornar erro quando tarefa pertence a outro tenant', async () => {
      await expect(
        TaskService.getTaskById(task.id, tenant2.id)
      ).rejects.toThrow('Tarefa não encontrada, não pertence ao seu tenant ou foi deletada');
    });

    it('deve retornar erro quando tarefa está soft deleted', async () => {
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);

      await expect(
        TaskService.getTaskById(task.id, tenant1.id)
      ).rejects.toThrow('Tarefa não encontrada, não pertence ao seu tenant ou foi deletada');
    });

    it('deve incluir relacionamentos: assignedTo, createdBy, relatedEntity', async () => {
      const found = await TaskService.getTaskById(task.id, tenant1.id);

      expect(found.createdBy).toBeDefined();
      expect(found.createdBy.id).toBe(adminUser1.id);
      expect(found.relatedEntity).toBeDefined();
    });
  });

  describe('listTasks', () => {
    beforeEach(async () => {
      // Criar várias tarefas para testar listagem
      await Promise.all([
        TaskService.createTask(
          {
            title: 'Tarefa 1',
            status: TaskStatus.PENDING,
            type: TaskType.CALL,
            priority: TaskPriority.HIGH,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        ),
        TaskService.createTask(
          {
            title: 'Tarefa 2',
            status: TaskStatus.IN_PROGRESS,
            type: TaskType.EMAIL,
            priority: TaskPriority.MEDIUM,
            relatedEntityType: 'Company',
            relatedEntityId: company1.id,
            assignedToId: assignedUser1.id,
          },
          tenant1.id,
          adminUser1.id
        ),
        TaskService.createTask(
          {
            title: 'Tarefa 3',
            status: TaskStatus.COMPLETED,
            type: TaskType.MEETING,
            priority: TaskPriority.LOW,
            relatedEntityType: 'Lead',
            relatedEntityId: lead1.id,
          },
          tenant1.id,
          adminUser1.id
        ),
      ]);
    });

    it('deve listar tarefas do tenant atual (filtrar por tenantId)', async () => {
      const result = await TaskService.listTasks(tenant1.id);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((task) => task.tenantId === tenant1.id)).toBe(true);
    });

    it('deve aplicar filtro de status', async () => {
      const result = await TaskService.listTasks(tenant1.id, { status: TaskStatus.PENDING });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((task) => task.status === TaskStatus.PENDING)).toBe(true);
    });

    it('deve aplicar filtro de type', async () => {
      const result = await TaskService.listTasks(tenant1.id, { type: TaskType.CALL });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((task) => task.type === TaskType.CALL)).toBe(true);
    });

    it('deve aplicar filtro de assignedToId', async () => {
      const result = await TaskService.listTasks(tenant1.id, {
        assignedToId: assignedUser1.id,
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((task) => task.assignedToId === assignedUser1.id)).toBe(true);
    });

    it('deve aplicar filtro de relatedEntityType', async () => {
      const result = await TaskService.listTasks(tenant1.id, {
        relatedEntityType: 'Contact',
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((task) => task.relatedEntityType === 'Contact')).toBe(true);
    });

    it('deve aplicar filtro de relatedEntityId', async () => {
      const result = await TaskService.listTasks(tenant1.id, {
        relatedEntityId: contact1.id,
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((task) => task.relatedEntityId === contact1.id)).toBe(true);
    });

    it('deve aplicar filtro de overdue (tarefas vencidas não concluídas)', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Criar tarefa vencida
      await TaskService.createTask(
        {
          title: 'Tarefa Vencida',
          status: TaskStatus.PENDING,
          dueDate: yesterday,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      const result = await TaskService.listTasks(tenant1.id, { overdue: true });

      expect(result.data.length).toBeGreaterThan(0);
      expect(
        result.data.every(
          (task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED
        )
      ).toBe(true);
    });

    it('deve aplicar filtro de completed', async () => {
      const result = await TaskService.listTasks(tenant1.id, { completed: true });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((task) => task.status === TaskStatus.COMPLETED)).toBe(true);
    });

    it('deve aplicar filtros de range de datas: dueDateFrom, dueDateTo', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Criar tarefa com dueDate no range
      await TaskService.createTask(
        {
          title: 'Tarefa no Range',
          dueDate: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000), // 2 dias
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      const result = await TaskService.listTasks(tenant1.id, {
        dueDateFrom: tomorrow,
        dueDateTo: nextWeek,
      });

      expect(result.data.length).toBeGreaterThan(0);
    });

    it('deve ordenar por campo especificado: dueDate, priority, createdAt, title', async () => {
      // Testar ordenação por priority
      const result1 = await TaskService.listTasks(tenant1.id, undefined, {
        orderBy: 'priority',
        order: 'desc',
      });

      if (result1.data.length > 1) {
        const priorities = result1.data.map((t) => t.priority);
        expect(priorities[0] === TaskPriority.HIGH || priorities[0] === TaskPriority.MEDIUM).toBe(true);
      }

      // Testar ordenação por createdAt
      const result2 = await TaskService.listTasks(tenant1.id, undefined, {
        orderBy: 'createdAt',
        order: 'desc',
      });

      expect(result2.data.length).toBeGreaterThan(0);
    });

    it('deve ordenar em ordem ascendente ou descendente', async () => {
      const resultAsc = await TaskService.listTasks(tenant1.id, undefined, {
        orderBy: 'title',
        order: 'asc',
      });

      const resultDesc = await TaskService.listTasks(tenant1.id, undefined, {
        orderBy: 'title',
        order: 'desc',
      });

      expect(resultAsc.data.length).toBe(resultDesc.data.length);
      if (resultAsc.data.length > 1) {
        expect(resultAsc.data[0].title <= resultAsc.data[1].title).toBe(true);
        expect(resultDesc.data[0].title >= resultDesc.data[1].title).toBe(true);
      }
    });

    it('deve paginar corretamente (limit, offset)', async () => {
      const result1 = await TaskService.listTasks(tenant1.id, undefined, {
        limit: 2,
        offset: 0,
      });

      const result2 = await TaskService.listTasks(tenant1.id, undefined, {
        limit: 2,
        offset: 2,
      });

      expect(result1.data.length).toBeLessThanOrEqual(2);
      expect(result2.data.length).toBeLessThanOrEqual(2);
      expect(result1.data[0]?.id).not.toBe(result2.data[0]?.id);
    });

    it('deve calcular total de registros antes da paginação', async () => {
      const result = await TaskService.listTasks(tenant1.id, undefined, {
        limit: 2,
        offset: 0,
      });

      expect(result.pagination.total).toBeGreaterThanOrEqual(result.data.length);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.offset).toBe(0);
    });

    it('deve excluir tarefas soft deleted (deletedAt IS NOT NULL)', async () => {
      // Criar e deletar uma tarefa
      const taskToDelete = await TaskService.createTask(
        {
          title: 'Tarefa para Deletar da Lista',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      await TaskService.deleteTask(taskToDelete.id, tenant1.id, adminUser1.id);

      const result = await TaskService.listTasks(tenant1.id);

      expect(result.data.find((t) => t.id === taskToDelete.id)).toBeUndefined();
    });

    it('deve incluir relacionamentos: assignedTo, createdBy, relatedEntity', async () => {
      const result = await TaskService.listTasks(tenant1.id);

      if (result.data.length > 0) {
        const task = result.data[0];
        expect(task.createdBy).toBeDefined();
        expect(task.createdBy.id).toBeDefined();
        expect(task.relatedEntity).toBeDefined();
      }
    });

    it('deve isolar tarefas por tenant', async () => {
      // Criar tarefa no tenant2
      await TaskService.createTask(
        {
          title: 'Tarefa Tenant 2',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant2.id,
        adminUser1.id
      );

      const result = await TaskService.listTasks(tenant1.id);

      expect(result.data.every((task) => task.tenantId === tenant1.id)).toBe(true);
      expect(result.data.find((task) => task.title === 'Tarefa Tenant 2')).toBeUndefined();
    });
  });
});
