/**
 * Testes unitários para auditoria de alterações
 * 
 * Testa a função logAudit isoladamente.
 */

import { logAudit } from '../../src/utils/auditLog';
import { cleanDatabase, createTestTenant, createTestUser, closeDatabase, prisma } from '../helpers/db';

describe('Audit Log Utils', () => {
  let tenant: { id: string };
  let user: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Audit Log Test Tenant',
      slug: 'audit-log-test-tenant',
    });
    tenant = { id: tenantObj.id };

    // Criar usuário
    const userObj = await createTestUser({
      email: 'user@auditlog.test',
      password: 'UserPass123',
      name: 'Test User',
      tenantId: tenant.id,
    });
    user = { id: userObj.id };
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDatabase();
  });

  describe('logAudit', () => {
    it('Registra log de auditoria com dados corretos', async () => {
      const entityId = 'test-entity-123';
      const changes = {
        name: { old: 'Old Name', new: 'New Name' },
        email: { old: 'old@example.com', new: 'new@example.com' },
      };

      await logAudit('User', entityId, 'update', user.id, tenant.id, changes);

      // Verificar se log foi criado
      const logs = await prisma.auditLog.findMany({
        where: {
          tenantId: tenant.id,
          entityType: 'User',
          entityId: entityId,
          action: 'update',
          userId: user.id,
        },
      });

      expect(logs.length).toBeGreaterThan(0);
      const log = logs[0];
      expect(log.entityType).toBe('User');
      expect(log.entityId).toBe(entityId);
      expect(log.action).toBe('update');
      expect(log.userId).toBe(user.id);
      expect(log.tenantId).toBe(tenant.id);
      expect(log.changes).toEqual(changes);
      expect(log.timestamp).toBeInstanceOf(Date);
    });

    it('Não lança erro em caso de falha (não invasivo)', async () => {
      // Tentar registrar com tenantId inválido (não deve lançar erro)
      await expect(
        logAudit('User', 'entity-123', 'create', user.id, 'invalid-tenant-id', undefined)
      ).resolves.not.toThrow();
    });

    it('Valida parâmetros obrigatórios', async () => {
      // Contar logs antes
      const logsBefore = await prisma.auditLog.count({
        where: { tenantId: tenant.id },
      });

      // Tentar registrar sem parâmetros obrigatórios (não deve registrar)
      await logAudit('' as any, '', '' as any, '', '', undefined);

      // Verificar que nenhum log foi criado
      const logsAfter = await prisma.auditLog.count({
        where: { tenantId: tenant.id },
      });

      expect(logsAfter).toBe(logsBefore);
    });

    it('Registra changes corretamente', async () => {
      const entityId = 'test-entity-changes';
      const changes = {
        status: { old: 'ACTIVE', new: 'INACTIVE' },
        name: { old: 'Old', new: 'New' },
      };

      await logAudit('User', entityId, 'update', user.id, tenant.id, changes);

      const logs = await prisma.auditLog.findMany({
        where: {
          tenantId: tenant.id,
          entityId: entityId,
        },
      });

      expect(logs.length).toBeGreaterThan(0);
      const log = logs[0];
      expect(log.changes).toEqual(changes);
    });

    it('Não registra se parâmetros obrigatórios faltarem', async () => {
      const logsBefore = await prisma.auditLog.count({
        where: { tenantId: tenant.id },
      });

      // Tentar registrar sem userId (parâmetro obrigatório)
      await logAudit('User', 'entity-123', 'create', '', tenant.id, undefined);

      const logsAfter = await prisma.auditLog.count({
        where: { tenantId: tenant.id },
      });

      expect(logsAfter).toBe(logsBefore);
    });

    it('Registra log sem changes para create e delete', async () => {
      const entityId = 'test-entity-no-changes';

      // Create sem changes
      await logAudit('User', entityId, 'create', user.id, tenant.id);

      // Delete sem changes
      await logAudit('User', entityId, 'delete', user.id, tenant.id);

      const logs = await prisma.auditLog.findMany({
        where: {
          tenantId: tenant.id,
          entityId: entityId,
        },
        orderBy: { timestamp: 'asc' },
      });

      expect(logs.length).toBe(2);
      expect(logs[0].action).toBe('create');
      expect(logs[0].changes).toBeNull();
      expect(logs[1].action).toBe('delete');
      expect(logs[1].changes).toBeNull();
    });

    it('Registra timestamp automaticamente', async () => {
      const entityId = 'test-entity-timestamp';
      const beforeTime = new Date();

      await logAudit('User', entityId, 'create', user.id, tenant.id);

      const afterTime = new Date();

      const logs = await prisma.auditLog.findMany({
        where: {
          tenantId: tenant.id,
          entityId: entityId,
        },
      });

      expect(logs.length).toBeGreaterThan(0);
      const log = logs[0];
      expect(log.timestamp).toBeInstanceOf(Date);
      expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(log.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});

