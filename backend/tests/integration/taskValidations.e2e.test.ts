/**
 * Testes E2E para validações de Task via Service
 * 
 * Foca exclusivamente em validações de campos:
 * - Enums (type, status, priority)
 * - Datas (dueDate, completedAt)
 * - Relacionamentos (relatedEntity, assignedTo, createdBy)
 * - Campos obrigatórios (title, requestingUserId)
 */

import { TaskService } from '../../src/services/taskService';
import { TaskType, TaskStatus, TaskPriority, Prisma } from '@prisma/client';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  assignRoleToUser,
  createStandardRoles,
  createTestPermission,
  closeDatabase,
  prisma,
} from '../helpers/db';

describe('Task Validations - E2E Tests', () => {
  let tenant1: { id: string };
  let tenant2: { id: string };
  let adminUser1: { id: string };
  let adminUser2: { id: string };
  let regularUser1: { id: string };
  let contact1: { id: string };
  let company1: { id: string };
  let lead1: { id: string };
  let opportunity1: { id: string };
  let adminRole1: { id: string };
  let adminRole2: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    const tenant1Obj = await createTestTenant({
      name: 'Task Validations Test Tenant 1',
      slug: 'task-validations-test-tenant-1',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id };

    const tenant2Obj = await createTestTenant({
      name: 'Task Validations Test Tenant 2',
      slug: 'task-validations-test-tenant-2',
      status: 'ACTIVE',
    });
    tenant2 = { id: tenant2Obj.id };

    // Criar roles padrão para cada tenant
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    const roles2 = await createStandardRoles(tenant2.id);
    adminRole2 = roles2.admin;

    // Criar permissões para Task
    const taskPermissions1 = await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'create' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'update' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'delete' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Task', action: 'list' }),
    ]);

    const taskPermissions2 = await Promise.all([
      createTestPermission({ tenantId: tenant2.id, entity: 'Task', action: 'create' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Task', action: 'read' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Task', action: 'update' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Task', action: 'delete' }),
      createTestPermission({ tenantId: tenant2.id, entity: 'Task', action: 'list' }),
    ]);

    // Associar permissões aos Admins
    await prisma.rolePermission.createMany({
      data: [
        ...taskPermissions1.map((perm) => ({
          roleId: adminRole1.id,
          permissionId: perm.id,
        })),
        ...taskPermissions2.map((perm) => ({
          roleId: adminRole2.id,
          permissionId: perm.id,
        })),
      ],
      skipDuplicates: true,
    });

    // Criar usuários
    const adminUser1Obj = await createTestUser({
      email: 'admin1@taskvalidations.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    adminUser1 = { id: adminUser1Obj.id };
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    const adminUser2Obj = await createTestUser({
      email: 'admin2@taskvalidations.test',
      password: 'AdminPass123',
      name: 'Admin User 2',
      tenantId: tenant2.id,
    });
    adminUser2 = { id: adminUser2Obj.id };
    await assignRoleToUser(adminUser2.id, adminRole2.id);

    const regularUser1Obj = await createTestUser({
      email: 'regular1@taskvalidations.test',
      password: 'RegularPass123',
      name: 'Regular User 1',
      tenantId: tenant1.id,
    });
    regularUser1 = { id: regularUser1Obj.id };

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
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('Validação de Enums', () => {
    it('deve rejeitar type inválido ao criar tarefa', async () => {
      await expect(
        TaskService.createTask(
          {
            title: 'Tarefa Teste',
            type: 'INVALID_TYPE' as TaskType,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Tipo de tarefa inválido');
    });

    it('deve rejeitar status inválido ao criar tarefa', async () => {
      await expect(
        TaskService.createTask(
          {
            title: 'Tarefa Teste',
            status: 'INVALID_STATUS' as TaskStatus,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Status inválido');
    });

    it('deve rejeitar priority inválido ao criar tarefa', async () => {
      await expect(
        TaskService.createTask(
          {
            title: 'Tarefa Teste',
            priority: 'INVALID_PRIORITY' as TaskPriority,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Prioridade inválida');
    });

    it('deve aceitar todos os valores válidos de type', async () => {
      for (const type of Object.values(TaskType)) {
        const task = await TaskService.createTask(
          {
            title: `Tarefa ${type}`,
            type,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        );
        expect(task.type).toBe(type);
        // Limpar após teste
        await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
      }
    });

    it('deve aceitar todos os valores válidos de status', async () => {
      for (const status of Object.values(TaskStatus)) {
        const task = await TaskService.createTask(
          {
            title: `Tarefa ${status}`,
            status,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        );
        expect(task.status).toBe(status);
        // Limpar após teste
        await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
      }
    });

    it('deve aceitar todos os valores válidos de priority', async () => {
      for (const priority of Object.values(TaskPriority)) {
        const task = await TaskService.createTask(
          {
            title: `Tarefa ${priority}`,
            priority,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        );
        expect(task.priority).toBe(priority);
        // Limpar após teste
        await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
      }
    });

    it('deve usar valores padrão quando enums não são fornecidos', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa com defaults',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task.type).toBe(TaskType.OTHER);
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.priority).toBe(TaskPriority.MEDIUM);
      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve rejeitar type inválido ao atualizar tarefa', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa para atualizar',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      await expect(
        TaskService.updateTask(
          task.id,
          {
            type: 'INVALID_TYPE' as TaskType,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Tipo de tarefa inválido');

      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });
  });

  describe('Validação de Datas', () => {
    it('deve rejeitar dueDate passada ao criar tarefa', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await expect(
        TaskService.createTask(
          {
            title: 'Tarefa com data passada',
            dueDate: yesterday,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Data de vencimento não pode ser passada');
    });

    it('deve aceitar dueDate futura ao criar tarefa', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const task = await TaskService.createTask(
        {
          title: 'Tarefa com data futura',
          dueDate: tomorrow,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task.dueDate).toBeDefined();
      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve aceitar dueDate hoje ao criar tarefa', async () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const task = await TaskService.createTask(
        {
          title: 'Tarefa com data hoje',
          dueDate: today,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task.dueDate).toBeDefined();
      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve aceitar dueDate null ao criar tarefa', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa sem data',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task.dueDate).toBeNull();
      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve rejeitar formato de data inválido ao criar tarefa', async () => {
      await expect(
        TaskService.createTask(
          {
            title: 'Tarefa com data inválida',
            dueDate: 'invalid-date' as any,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Data de vencimento inválida');
    });

    it('deve aceitar dueDate como string ISO ao criar tarefa', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isoString = tomorrow.toISOString();

      const task = await TaskService.createTask(
        {
          title: 'Tarefa com data ISO',
          dueDate: isoString,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task.dueDate).toBeDefined();
      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve atualizar completedAt quando status muda para COMPLETED', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa para completar',
          status: TaskStatus.PENDING,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      expect(task.completedAt).toBeNull();

      const updatedTask = await TaskService.updateTask(
        task.id,
        {
          status: TaskStatus.COMPLETED,
        },
        tenant1.id,
        adminUser1.id
      );

      expect(updatedTask.status).toBe(TaskStatus.COMPLETED);
      expect(updatedTask.completedAt).not.toBeNull();
      expect(updatedTask.completedAt).toBeInstanceOf(Date);

      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve limpar completedAt quando status muda de COMPLETED para outro', async () => {
      // Criar tarefa com status PENDING
      const task = await TaskService.createTask(
        {
          title: 'Tarefa para completar',
          status: TaskStatus.PENDING,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      expect(task.completedAt).toBeNull();

      // Mudar para COMPLETED (deve preencher completedAt)
      const completedTask = await TaskService.updateTask(
        task.id,
        {
          status: TaskStatus.COMPLETED,
        },
        tenant1.id,
        adminUser1.id
      );

      expect(completedTask.status).toBe(TaskStatus.COMPLETED);
      expect(completedTask.completedAt).not.toBeNull();

      // Mudar de COMPLETED para PENDING (deve limpar completedAt)
      const updatedTask = await TaskService.updateTask(
        task.id,
        {
          status: TaskStatus.PENDING,
        },
        tenant1.id,
        adminUser1.id
      );

      expect(updatedTask.status).toBe(TaskStatus.PENDING);
      expect(updatedTask.completedAt).toBeNull();

      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve rejeitar dueDate passada ao atualizar tarefa', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa para atualizar',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await expect(
        TaskService.updateTask(
          task.id,
          {
            dueDate: yesterday,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Data de vencimento não pode ser passada');

      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve aceitar dueDate null ao atualizar tarefa (remover data)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const task = await TaskService.createTask(
        {
          title: 'Tarefa com data',
          dueDate: tomorrow,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      expect(task.dueDate).not.toBeNull();

      const updatedTask = await TaskService.updateTask(
        task.id,
        {
          dueDate: null,
        },
        tenant1.id,
        adminUser1.id
      );

      expect(updatedTask.dueDate).toBeNull();

      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });
  });

  describe('Validação de Relacionamentos', () => {
    it('deve rejeitar relatedEntityId inexistente ao criar tarefa', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        TaskService.createTask(
          {
            title: 'Tarefa com entidade inexistente',
            relatedEntityType: 'Contact',
            relatedEntityId: fakeId,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('não encontrado');
    });

    it('deve rejeitar relatedEntityId de outro tenant ao criar tarefa', async () => {
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
        TaskService.createTask(
          {
            title: 'Tarefa com entidade de outro tenant',
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

    it('deve rejeitar relatedEntityId soft deleted ao criar tarefa', async () => {
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
        TaskService.createTask(
          {
            title: 'Tarefa com entidade deletada',
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
        TaskService.createTask(
          {
            title: 'Tarefa com UUID inválido',
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
      ];

      for (const { type, id } of types) {
        const task = await TaskService.createTask(
          {
            title: `Tarefa ${type}`,
            relatedEntityType: type,
            relatedEntityId: id,
          },
          tenant1.id,
          adminUser1.id
        );
        expect(task.relatedEntityType).toBe(type);
        expect(task.relatedEntityId).toBe(id);
        // Limpar após teste
        await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
      }
    });

    it('deve rejeitar assignedToId inexistente ao criar tarefa', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        TaskService.createTask(
          {
            title: 'Tarefa com usuário inexistente',
            assignedToId: fakeId,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Usuário não encontrado');
    });

    it('deve rejeitar assignedToId de outro tenant ao criar tarefa', async () => {
      await expect(
        TaskService.createTask(
          {
            title: 'Tarefa com usuário de outro tenant',
            assignedToId: adminUser2.id,
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('não pertence ao seu tenant');
    });

    it('deve aceitar assignedToId null ao criar tarefa', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa sem atribuição',
          assignedToId: null as any,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task.assignedToId).toBeNull();
      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve aceitar assignedToId válido ao criar tarefa', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa atribuída',
          assignedToId: regularUser1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task.assignedToId).toBe(regularUser1.id);
      expect(task.assignedTo).not.toBeNull();
      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve rejeitar requestingUserId inexistente ao criar tarefa', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        TaskService.createTask(
          {
            title: 'Tarefa com criador inexistente',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          fakeId
        )
      ).rejects.toThrow('Usuário não encontrado');
    });

    it('deve rejeitar requestingUserId de outro tenant ao criar tarefa', async () => {
      await expect(
        TaskService.createTask(
          {
            title: 'Tarefa com criador de outro tenant',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser2.id
        )
      ).rejects.toThrow('não pertence ao seu tenant');
    });

    it('deve aceitar assignedToId null ao atualizar tarefa (remover atribuição)', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa atribuída',
          assignedToId: regularUser1.id,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      const updatedTask = await TaskService.updateTask(
        task.id,
        {
          assignedToId: null,
        },
        tenant1.id,
        adminUser1.id
      );

      expect(updatedTask.assignedToId).toBeNull();

      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });
  });

  describe('Validação de Campos Obrigatórios', () => {
    it('deve rejeitar title vazio ao criar tarefa', async () => {
      await expect(
        TaskService.createTask(
          {
            title: '',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Título da tarefa é obrigatório');
    });

    it('deve rejeitar title apenas espaços ao criar tarefa', async () => {
      await expect(
        TaskService.createTask(
          {
            title: '   ',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Título da tarefa é obrigatório');
    });

    it('deve rejeitar title apenas tabs/newlines ao criar tarefa', async () => {
      await expect(
        TaskService.createTask(
          {
            title: '\t\n\r',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Título da tarefa é obrigatório');
    });

    it('deve aceitar title válido após trim ao criar tarefa', async () => {
      const task = await TaskService.createTask(
        {
          title: '  Tarefa com espaços  ',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task.title).toBe('Tarefa com espaços');
      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve rejeitar requestingUserId ausente ao criar tarefa', async () => {
      await expect(
        TaskService.createTask(
          {
            title: 'Tarefa sem criador',
            relatedEntityType: 'Contact',
            relatedEntityId: contact1.id,
          },
          tenant1.id,
          undefined
        )
      ).rejects.toThrow('ID do usuário é obrigatório');
    });

    it('deve rejeitar title vazio ao atualizar tarefa', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa para atualizar',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );

      await expect(
        TaskService.updateTask(
          task.id,
          {
            title: '',
          },
          tenant1.id,
          adminUser1.id
        )
      ).rejects.toThrow('Título da tarefa não pode ser vazio');

      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve aceitar campos obrigatórios válidos ao criar tarefa', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa válida',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task.title).toBe('Tarefa válida');
      expect(task.createdById).toBe(adminUser1.id);
      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });
  });

  describe('Validação de Casos de Borda', () => {
    it('deve aceitar description null ao criar tarefa', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa sem descrição',
          description: null as any,
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task.description).toBeNull();
      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve aceitar description vazio após trim ao criar tarefa (salvo como null)', async () => {
      const task = await TaskService.createTask(
        {
          title: 'Tarefa com descrição vazia',
          description: '   ',
          relatedEntityType: 'Contact',
          relatedEntityId: contact1.id,
        },
        tenant1.id,
        adminUser1.id
      );
      expect(task.description).toBeNull();
      // Limpar após teste
      await TaskService.deleteTask(task.id, tenant1.id, adminUser1.id);
    });

    it('deve rejeitar múltiplas validações simultâneas (vários campos inválidos)', async () => {
      await expect(
        TaskService.createTask(
          {
            title: '',
            type: 'INVALID_TYPE' as TaskType,
            status: 'INVALID_STATUS' as TaskStatus,
            priority: 'INVALID_PRIORITY' as TaskPriority,
            dueDate: new Date('2020-01-01'),
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
