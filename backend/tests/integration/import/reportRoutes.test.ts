/**
 * Testes de integração para GET /api/import/:importId/report (spec itens 154-171).
 *
 * Valida: (1) relatório de importação retorna 200 com totalRows, successCount,
 * errorCount, errors no formato { row, errors: [] }[], warnings; (2) erros
 * agrupados por linha refletem os dados do result original.
 */

import request from 'supertest';
import { Prisma } from '@prisma/client';
import { app } from '../../../src/index';
import { prisma } from '../../../src/utils/prisma';
import { cleanDatabase, createTestTenant, createTestUser, closeDatabase } from '../../helpers/db';

describe('GET /api/import/:importId/report - Integration Tests', () => {
  let tenantId: string;
  let userId: string;
  let authToken: string;
  const password = 'ReportTestPassword123';

  beforeAll(async () => {
    await cleanDatabase();

    const tenant = await createTestTenant({
      name: 'Report Test Tenant',
      slug: 'report-test-tenant',
      status: 'ACTIVE',
    });
    tenantId = tenant.id;

    const user = await createTestUser({
      email: 'report-test@example.com',
      password,
      name: 'Report Test User',
      tenantId,
      status: 'ACTIVE',
    });
    userId = user.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-Id', tenantId)
      .send({ email: user.email, password });
    if (loginRes.status !== 200 || !loginRes.body?.token) {
      throw new Error('Login failed in test setup');
    }
    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    await prisma.importJob.deleteMany({ where: { tenantId } });
    await cleanDatabase();
    await closeDatabase();
  });

  beforeEach(async () => {
    await prisma.importJob.deleteMany({ where: { tenantId } });
  });

  describe('Teste: relatório de importação funciona (spec 169)', () => {
    it('retorna 200 e body com totalRows, successCount, errorCount, errors [{ row, errors }], warnings', async () => {
      const job = await prisma.importJob.create({
        data: {
          tenantId,
          userId,
          fileId: 'file-report-test',
          entityType: 'Contact',
          status: 'COMPLETED',
          progress: 100,
          totalRows: 10,
          processedRows: 10,
          successCount: 8,
          errorCount: 2,
          duplicateCount: 0,
          result: {
            importId: 'will-be-overwritten',
            totalRows: 10,
            successCount: 8,
            errorCount: 2,
            skippedCount: 0,
            duplicateCount: 0,
            processedCount: 10,
            errors: [
              { row: 3, code: 'ERR_A', message: 'Erro linha 3', severity: 'error' },
              { row: 7, code: 'ERR_B', message: 'Erro linha 7', severity: 'error' },
            ],
            warnings: [{ row: 2, code: 'WARN_1', message: 'Aviso linha 2' }],
            processingTime: 100,
            status: 'partial',
          },
          retries: 0,
          priority: 'NORMAL',
        },
      });

      const res = await request(app)
        .get(`/api/import/${job.id}/report`)
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalRows', 10);
      expect(res.body).toHaveProperty('successCount', 8);
      expect(res.body).toHaveProperty('errorCount', 2);
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors).toHaveLength(2);
      expect(res.body.errors[0]).toMatchObject({ row: 3, errors: expect.any(Array) });
      expect(res.body.errors[1]).toMatchObject({ row: 7, errors: expect.any(Array) });
      expect(res.body.errors[0].errors).toHaveLength(1);
      expect(res.body.errors[0].errors[0]).toMatchObject({
        code: 'ERR_A',
        message: 'Erro linha 3',
        severity: 'error',
      });
      expect(Array.isArray(res.body.warnings)).toBe(true);
      expect(res.body.warnings).toHaveLength(1);
      expect(res.body.warnings[0]).toMatchObject({ row: 2, message: 'Aviso linha 2' });
    });
  });

  describe('Teste: erros são reportados corretamente (spec 170-171)', () => {
    it('errors na resposta vêm agrupados por linha e refletem row/code/message do result original', async () => {
      const job = await prisma.importJob.create({
        data: {
          tenantId,
          userId,
          fileId: 'file-errors-test',
          entityType: 'Contact',
          status: 'COMPLETED',
          progress: 100,
          totalRows: 5,
          processedRows: 5,
          successCount: 3,
          errorCount: 2,
          duplicateCount: 0,
          result: {
            importId: 'err-test',
            totalRows: 5,
            successCount: 3,
            errorCount: 2,
            skippedCount: 0,
            duplicateCount: 0,
            processedCount: 5,
            errors: [
              { row: 1, code: 'VALIDATION_ERROR', message: 'Email inválido', field: 'email', severity: 'error' },
              { row: 1, code: 'REQUIRED_FIELD', message: 'Nome obrigatório', field: 'firstName', severity: 'error' },
              { row: 4, code: 'DUPLICATE', message: 'Registro duplicado', severity: 'error' },
            ],
            warnings: [],
            processingTime: 50,
            status: 'partial',
          },
          retries: 0,
          priority: 'NORMAL',
        },
      });

      const res = await request(app)
        .get(`/api/import/${job.id}/report`)
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.errors).toHaveLength(2);

      const byRow1 = res.body.errors.find((e: { row: number }) => e.row === 1);
      const byRow4 = res.body.errors.find((e: { row: number }) => e.row === 4);
      expect(byRow1).toBeDefined();
      expect(byRow4).toBeDefined();
      expect(byRow1.errors).toHaveLength(2);
      expect(byRow4.errors).toHaveLength(1);

      expect(byRow1.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'VALIDATION_ERROR', message: 'Email inválido', field: 'email', severity: 'error' }),
          expect.objectContaining({ code: 'REQUIRED_FIELD', message: 'Nome obrigatório', field: 'firstName', severity: 'error' }),
        ])
      );
      expect(byRow4.errors[0]).toMatchObject({ code: 'DUPLICATE', message: 'Registro duplicado', severity: 'error' });
    });
  });

  describe('Comportamento de acesso e erros', () => {
    it('retorna 404 quando importId (job) não existe', async () => {
      const res = await request(app)
        .get('/api/import/00000000-0000-0000-0000-000000000000/report')
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/não encontrado|não disponível/i);
    });

    it('retorna 404 quando job existe mas result é null', async () => {
      const job = await prisma.importJob.create({
        data: {
          tenantId,
          userId,
          fileId: 'file-no-result',
          entityType: 'Contact',
          status: 'PROCESSING',
          progress: 50,
          totalRows: 10,
          processedRows: 5,
          successCount: 5,
          errorCount: 0,
          duplicateCount: 0,
          result: Prisma.JsonNull,
          retries: 0,
          priority: 'NORMAL',
        },
      });
      const res = await request(app)
        .get(`/api/import/${job.id}/report`)
        .set('X-Tenant-Id', tenantId)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/não disponível|não encontrado/i);
    });

    it('retorna 401 quando não há token', async () => {
      const job = await prisma.importJob.create({
        data: {
          tenantId,
          userId,
          fileId: 'f',
          entityType: 'Contact',
          status: 'COMPLETED',
          progress: 100,
          totalRows: 1,
          processedRows: 1,
          successCount: 1,
          errorCount: 0,
          duplicateCount: 0,
          result: { importId: 'x', totalRows: 1, successCount: 1, errorCount: 0, skippedCount: 0, duplicateCount: 0, processedCount: 1, errors: [], warnings: [], processingTime: 0, status: 'completed' },
          retries: 0,
          priority: 'NORMAL',
        },
      });
      const res = await request(app)
        .get(`/api/import/${job.id}/report`)
        .set('X-Tenant-Id', tenantId);
      expect(res.status).toBe(401);
    });
  });
});
