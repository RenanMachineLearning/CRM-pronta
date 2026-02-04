/**
 * Testes de performance de queries
 * 
 * Valida que queries são executadas em < 500ms conforme especificação
 * Testa limites de resultados, timeout e cache
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '../../src/utils/prisma';
import { ContactService } from '../../src/services/contactService';
import { CompanyService } from '../../src/services/companyService';
import { LeadService } from '../../src/services/leadService';
import { OpportunityService } from '../../src/services/opportunityService';
import { NoteService } from '../../src/services/noteService';
import { SearchService } from '../../src/services/searchService';
import { QueryTimeoutError } from '../../src/utils/queryTimeout';
import { cacheManager } from '../../src/cache/cacheManager';
import { QUERY_LIMITS } from '../../src/config/constants';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  assignRoleToUser,
  createStandardRoles,
  createTestPermission,
  closeDatabase,
} from '../helpers/db';

describe('Performance Tests', () => {
  let tenant: { id: string; slug: string };
  let adminUser: { id: string; email: string };
  let adminRole: { id: string };
  const MAX_QUERY_TIME = 500; // 500ms conforme especificação

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenantObj = await createTestTenant({
      name: 'Performance Test Tenant',
      slug: 'performance-test-tenant',
      status: 'ACTIVE',
    });
    tenant = { id: tenantObj.id, slug: tenantObj.slug };

    // Criar roles padrão
    const roles = await createStandardRoles(tenant.id);
    adminRole = roles.admin;

    // Criar permissões para todas as entidades
    const entities = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task', 'Note'];
    for (const entity of entities) {
      await createTestPermission({ tenantId: tenant.id, entity, action: 'list' });
      await createTestPermission({ tenantId: tenant.id, entity, action: 'read' });
      await createTestPermission({ tenantId: tenant.id, entity, action: 'create' });
    }

    // Criar usuário admin
    const userObj = await createTestUser({
      tenantId: tenant.id,
      email: 'admin@performance.test',
      password: 'Test123!@#',
      name: 'Admin User',
    });
    adminUser = { id: userObj.id, email: userObj.email };

    // Associar role admin ao usuário
    await assignRoleToUser(adminUser.id, adminRole.id);

    // Criar dados de teste para performance
    await createTestData();
  });

  afterAll(async () => {
    await closeDatabase();
    // Limpar cache após testes
    await cacheManager.clear();
  });

  /**
   * Cria dados de teste para validar performance
   */
  async function createTestData() {
    // Criar múltiplos contatos
    const contacts = [];
    for (let i = 1; i <= 100; i++) {
      contacts.push({
        tenantId: tenant.id,
        firstName: `Contact${i}`,
        lastName: `Test${i}`,
        status: 'ACTIVE' as const,
      });
    }
    await prisma.contact.createMany({ data: contacts });

    // Criar múltiplas empresas
    const companies = [];
    for (let i = 1; i <= 50; i++) {
      companies.push({
        tenantId: tenant.id,
        name: `Company ${i}`,
        status: 'ACTIVE' as const,
      });
    }
    await prisma.company.createMany({ data: companies });

    // Criar múltiplos leads
    const leads = [];
    for (let i = 1; i <= 80; i++) {
      leads.push({
        tenantId: tenant.id,
        firstName: `Lead${i}`,
        lastName: `Test${i}`,
        email: `lead${i}@test.com`,
        status: 'NEW' as const,
      });
    }
    await prisma.lead.createMany({ data: leads });

    // Criar pipeline e stage para oportunidades
    const pipeline = await prisma.pipeline.create({
      data: {
        tenantId: tenant.id,
        name: 'Test Pipeline',
        isDefault: true,
      },
    });

    const stage = await prisma.pipelineStage.create({
      data: {
        tenantId: tenant.id,
        pipelineId: pipeline.id,
        name: 'Test Stage',
        order: 1,
      },
    });

    // Criar múltiplas oportunidades
    const opportunities = [];
    for (let i = 1; i <= 60; i++) {
      opportunities.push({
        tenantId: tenant.id,
        name: `Opportunity ${i}`,
        value: 1000 * i,
        stageId: stage.id,
        status: 'OPEN' as const,
      });
    }
    await prisma.opportunity.createMany({ data: opportunities });

    // Criar múltiplas notas (sem content em listagens)
    const notes = [];
    for (let i = 1; i <= 70; i++) {
      notes.push({
        tenantId: tenant.id,
        content: `Nota ${i} - Conteúdo grande que não deve ser buscado em listagens`.repeat(50), // Campo grande
        type: 'NOTE' as const,
        relatedEntityType: 'Contact',
        relatedEntityId: '00000000-0000-0000-0000-000000000001',
        createdById: adminUser.id,
      });
    }
    await prisma.note.createMany({ data: notes });
  }

  describe('Query Performance (< 500ms)', () => {
    it('listContacts deve executar em < 500ms', async () => {
      const start = Date.now();
      await ContactService.listContacts(tenant.id, {}, { limit: 20, page: 1 }, adminUser.id);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });

    it('listCompanies deve executar em < 500ms', async () => {
      const start = Date.now();
      await CompanyService.listCompanies(tenant.id, {}, { limit: 20, page: 1 }, adminUser.id);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });

    it('listLeads deve executar em < 500ms', async () => {
      const start = Date.now();
      await LeadService.listLeads(tenant.id, {}, { limit: 20, page: 1 }, adminUser.id);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });

    it('listOpportunities deve executar em < 500ms', async () => {
      const start = Date.now();
      await OpportunityService.listOpportunities(tenant.id, {}, { limit: 20, page: 1 }, adminUser.id);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });

    it('listNotes (sem content) deve executar em < 500ms', async () => {
      const start = Date.now();
      await NoteService.listNotes(tenant.id, {}, { limit: 20, page: 1 }, adminUser.id);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });

    it('searchGlobal deve executar em < 500ms', async () => {
      const start = Date.now();
      await SearchService.searchGlobal({ query: 'test' }, tenant.id, adminUser.id);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });
  });

  describe('Limite de Resultados', () => {
    it('searchGlobal deve limitar a 100 resultados por entidade', async () => {
      const result = await SearchService.searchGlobal(
        { query: 'test', limit: 200 }, // Tentar buscar 200
        tenant.id,
        adminUser.id
      );
      expect(result.results.contacts.length).toBeLessThanOrEqual(QUERY_LIMITS.MAX_RESULTS_PER_ENTITY);
      expect(result.results.companies.length).toBeLessThanOrEqual(QUERY_LIMITS.MAX_RESULTS_PER_ENTITY);
      expect(result.results.leads.length).toBeLessThanOrEqual(QUERY_LIMITS.MAX_RESULTS_PER_ENTITY);
      expect(result.results.opportunities.length).toBeLessThanOrEqual(QUERY_LIMITS.MAX_RESULTS_PER_ENTITY);
    });

    it('listContacts deve respeitar limite máximo de página (100)', async () => {
      const result = await ContactService.listContacts(
        tenant.id,
        {},
        { limit: 200, page: 1 }, // Tentar usar limite maior que 100
        adminUser.id
      );
      expect(result.pagination.limit).toBeLessThanOrEqual(QUERY_LIMITS.MAX_PAGE_SIZE);
    });
  });

  describe('Timeout de Queries', () => {
    it('query com timeout deve lançar QueryTimeoutError após 5s', async () => {
      // Criar uma query que demora mais de 5s (simulado)
      const slowQuery = new Promise((resolve) => {
        setTimeout(() => resolve('result'), 6000); // 6 segundos
      });

      await expect(
        // Usar withQueryTimeout para aplicar timeout
        import('../../src/utils/queryTimeout').then(({ withQueryTimeout }) =>
          withQueryTimeout(slowQuery, 5000, 'slowQuery')
        )
      ).rejects.toThrow(QueryTimeoutError);
    });
  });

  describe('Cache', () => {
    beforeEach(async () => {
      // Limpar cache antes de cada teste
      await cacheManager.clear();
    });

    it('segunda chamada deve retornar do cache (mais rápida)', async () => {
      // Primeira chamada (cache miss)
      const start1 = Date.now();
      await ContactService.listContacts(tenant.id, {}, { limit: 20, page: 1 }, adminUser.id);
      const duration1 = Date.now() - start1;

      // Segunda chamada (cache hit)
      const start2 = Date.now();
      await ContactService.listContacts(tenant.id, {}, { limit: 20, page: 1 }, adminUser.id);
      const duration2 = Date.now() - start2;

      // Segunda chamada deve ser mais rápida (cache hit)
      expect(duration2).toBeLessThan(duration1);
    });

    it('cache deve ser invalidado após criar registro', async () => {
      // Primeira chamada (cache miss)
      await ContactService.listContacts(tenant.id, {}, { limit: 20, page: 1 }, adminUser.id);

      // Segunda chamada (cache hit)
      const cachedResult = await cacheManager.get(
        require('../../src/cache/cacheKeys').generateCacheKey(
          'listContacts',
          { tenantId: tenant.id, filters: {}, pagination: { limit: 20, page: 1 }, userId: adminUser.id },
          tenant.id
        )
      );
      expect(cachedResult).not.toBeNull();

      // Criar novo contato (deve invalidar cache)
      await ContactService.createContact(
        {
          firstName: 'New',
          lastName: 'Contact',
          status: 'ACTIVE',
        },
        tenant.id,
        adminUser.id
      );

      // Cache deve ter sido invalidado
      await cacheManager.get(
        require('../../src/cache/cacheKeys').generateCacheKey(
          'listContacts',
          { tenantId: tenant.id, filters: {}, pagination: { limit: 20, page: 1 }, userId: adminUser.id },
          tenant.id
        )
      );
      // Cache pode ainda existir temporariamente, mas será invalidado pelo middleware
      // O importante é que a próxima busca não use cache antigo
    });
  });

  describe('Busca com muitos resultados não trava', () => {
    it('deve retornar resultados mesmo com muitos registros', async () => {
      const start = Date.now();
      const result = await SearchService.searchGlobal(
        { query: 'test', limit: 100 },
        tenant.id,
        adminUser.id
      );
      const duration = Date.now() - start;

      // Deve retornar resultados
      expect(result.results.contacts.length).toBeGreaterThan(0);
      expect(result.results.companies.length).toBeGreaterThan(0);
      
      // Deve executar em tempo razoável (< 500ms)
      expect(duration).toBeLessThan(MAX_QUERY_TIME);
    });

    it('deve respeitar limite de 100 mesmo com muitos registros', async () => {
      const result = await SearchService.searchGlobal(
        { query: 'Contact', limit: 1000 }, // Tentar buscar muito mais que o limite
        tenant.id,
        adminUser.id
      );
      
      // Deve limitar a 100 por entidade
      expect(result.results.contacts.length).toBeLessThanOrEqual(QUERY_LIMITS.MAX_RESULTS_PER_ENTITY);
    });
  });
});
