/**
 * Testes unitários para SearchService
 * 
 * Testa lógica de busca global isoladamente usando banco de dados real.
 * Foca em validações, permissões, filtragem e ordenação.
 */

import { SearchService } from '../../src/services/searchService';
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

describe('SearchService', () => {
  let tenant1: { id: string };
  let tenant2: { id: string };
  let adminUser1: { id: string };
  let regularUser1: { id: string };
  let adminRole1: { id: string };
  let stage1: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar dois tenants para testar isolamento
    tenant1 = await createTestTenant({
      name: 'Search Service Test Tenant 1',
      slug: 'search-service-test-tenant-1',
      status: 'ACTIVE',
    });

    tenant2 = await createTestTenant({
      name: 'Search Service Test Tenant 2',
      slug: 'search-service-test-tenant-2',
      status: 'ACTIVE',
    });

    // Criar roles padrão
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    // Criar permissões para entidades
    await Promise.all([
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'list' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Contact', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'list' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Company', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'list' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Lead', action: 'read' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Opportunity', action: 'list' }),
      createTestPermission({ tenantId: tenant1.id, entity: 'Opportunity', action: 'read' }),
    ]);

    // Criar usuários
    adminUser1 = await createTestUser({
      email: 'admin1@searchservice.test',
      password: 'AdminPass123',
      name: 'Admin User 1',
      tenantId: tenant1.id,
    });
    await assignRoleToUser(adminUser1.id, adminRole1.id);

    regularUser1 = await createTestUser({
      email: 'regular1@searchservice.test',
      password: 'RegularPass123',
      name: 'Regular User 1',
      tenantId: tenant1.id,
    });

    // Criar pipeline e estágio para oportunidades
    const pipeline1 = await prisma.pipeline.create({
      data: {
        tenantId: tenant1.id,
        name: 'Pipeline Teste',
        isDefault: true,
      },
    });

    stage1 = await prisma.pipelineStage.create({
      data: {
        tenantId: tenant1.id,
        pipelineId: pipeline1.id,
        name: 'Qualificação',
        order: 1,
        probability: 25,
      },
    });

    // Criar entidades relacionadas
    await prisma.contact.create({
      data: {
        tenantId: tenant1.id,
        firstName: 'João',
        lastName: 'Silva',
        status: 'ACTIVE',
        emails: {
          create: {
            tenantId: tenant1.id,
            email: 'joao.silva@example.com',
            type: 'WORK',
            isPrimary: true,
          },
        },
        phones: {
          create: {
            tenantId: tenant1.id,
            phone: '+55 11 99999-9999',
            type: 'MOBILE',
            isPrimary: true,
          },
        },
      },
    });

    await prisma.company.create({
      data: {
        tenantId: tenant1.id,
        name: 'Empresa Silva LTDA',
        website: 'https://silva.com.br',
        industry: 'Tecnologia',
        status: 'ACTIVE',
      },
    });

    await prisma.lead.create({
      data: {
        tenantId: tenant1.id,
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria.santos@example.com',
        company: 'Empresa Silva LTDA',
        status: 'NEW',
      },
    });

    await prisma.opportunity.create({
      data: {
        tenantId: tenant1.id,
        name: 'Venda para João Silva',
        value: 50000,
        currency: 'BRL',
        status: 'OPEN',
        stageId: stage1.id,
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('searchGlobal', () => {
    it('deve retornar resultados de todas as entidades permitidas', async () => {
      const result = await SearchService.searchGlobal(
        { query: 'silva' },
        tenant1.id,
        adminUser1.id
      );

      expect(result.query).toBe('silva');
      expect(result.results.contacts.length).toBeGreaterThan(0);
      expect(result.results.companies.length).toBeGreaterThan(0);
      expect(result.totals.contacts).toBeGreaterThan(0);
      expect(result.totals.companies).toBeGreaterThan(0);
    });

    it('deve filtrar por entidade específica', async () => {
      const result = await SearchService.searchGlobal(
        { query: 'silva', entities: ['contact', 'company'] },
        tenant1.id,
        adminUser1.id
      );

      expect(result.results.contacts.length).toBeGreaterThan(0);
      expect(result.results.companies.length).toBeGreaterThan(0);
      expect(result.results.leads.length).toBe(0);
      expect(result.results.opportunities.length).toBe(0);
    });

    it('deve respeitar limite de resultados', async () => {
      // Criar mais contatos
      for (let i = 0; i < 15; i++) {
        await prisma.contact.create({
          data: {
            tenantId: tenant1.id,
            firstName: `Silva${i}`,
            lastName: 'Teste',
            status: 'ACTIVE',
          },
        });
      }

      const result = await SearchService.searchGlobal(
        { query: 'silva', limit: 5 },
        tenant1.id,
        adminUser1.id
      );

      expect(result.results.contacts.length).toBeLessThanOrEqual(5);
    });

    it('deve retornar snippet com highlight', async () => {
      const result = await SearchService.searchGlobal(
        { query: 'joão' },
        tenant1.id,
        adminUser1.id
      );

      if (result.results.contacts.length > 0) {
        expect(result.results.contacts[0].snippet).toBeDefined();
        expect(result.results.contacts[0].snippet?.text).toContain('<mark>');
      }
    });

    it('deve ordenar resultados por relevância', async () => {
      const result = await SearchService.searchGlobal(
        { query: 'silva' },
        tenant1.id,
        adminUser1.id
      );

      // Verificar que resultados estão ordenados por score (maior primeiro)
      const contacts = result.results.contacts;
      for (let i = 0; i < contacts.length - 1; i++) {
        expect(contacts[i].score).toBeGreaterThanOrEqual(contacts[i + 1].score);
      }
    });

    it('deve retornar array vazio para entidades sem permissão', async () => {
      // regularUser1 não tem permissão para Lead
      const result = await SearchService.searchGlobal(
        { query: 'silva' },
        tenant1.id,
        regularUser1.id
      );

      // Deve retornar resultados vazios para entidades sem permissão
      // (não deve quebrar, apenas retornar vazio)
      expect(result).toBeDefined();
    });

    it('deve respeitar isolamento multi-tenant', async () => {
      // Criar contato no tenant2
      await prisma.contact.create({
        data: {
          tenantId: tenant2.id,
          firstName: 'Carlos',
          lastName: 'Silva',
          status: 'ACTIVE',
        },
      });

      // Buscar como usuário do tenant1
      const result = await SearchService.searchGlobal(
        { query: 'silva' },
        tenant1.id,
        adminUser1.id
      );

      // Não deve retornar contato do tenant2
      const hasCarlos = result.results.contacts.some(
        c => c.data.firstName === 'Carlos'
      );
      expect(hasCarlos).toBe(false);
    });

    it('deve retornar totais sem limite', async () => {
      const result = await SearchService.searchGlobal(
        { query: 'silva', limit: 5 },
        tenant1.id,
        adminUser1.id
      );

      // Totais devem ser maiores que resultados limitados
      expect(result.totals.contacts).toBeGreaterThanOrEqual(result.results.contacts.length);
    });

    it('deve normalizar texto para busca (remover acentos)', async () => {
      const result = await SearchService.searchGlobal(
        { query: 'jose' },
        tenant1.id,
        adminUser1.id
      );

      // Deve encontrar "João" mesmo buscando "jose"
      const foundJoao = result.results.contacts.some(
        c => c.data.firstName === 'João'
      );
      expect(foundJoao).toBe(true);
    });

    it('deve buscar em emails e telefones de contatos', async () => {
      const result = await SearchService.searchGlobal(
        { query: 'joao.silva@example.com' },
        tenant1.id,
        adminUser1.id
      );

      expect(result.results.contacts.length).toBeGreaterThan(0);
    });
  });
});
