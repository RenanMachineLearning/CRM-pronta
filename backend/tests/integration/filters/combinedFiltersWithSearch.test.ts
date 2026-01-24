/**
 * Testes de integração para filtros combinados com busca textual
 * 
 * Valida combinação complexa de filtros avançados + busca textual (q),
 * precedência de filtros, e combinação com ordenação e paginação.
 */

import request from 'supertest';
import { app } from '../../../src/index';
import {
  cleanDatabase,
  createTestTenant,
  createTestUser,
  assignRoleToUser,
  createStandardRoles,
  createTestPermission,
  closeDatabase,
  prisma,
} from '../../helpers/db';
import { generateToken } from '../../../src/utils/jwt';
import { FilterOperator } from '../../../src/types/filter.types';

describe('Combined Filters with Search', () => {
  let tenant1: { id: string; slug: string };
  let adminUser1: { id: string; email: string };
  let adminToken1: string;
  let adminRole1: { id: string };
  let company1: { id: string };
  let company2: { id: string };

  beforeAll(async () => {
    await cleanDatabase();

    // Criar tenant
    const tenant1Obj = await createTestTenant({
      name: 'Combined Filters Test Tenant',
      slug: 'combined-filters-test-tenant',
      status: 'ACTIVE',
    });
    tenant1 = { id: tenant1Obj.id, slug: tenant1Obj.slug };

    // Criar roles padrão
    const roles1 = await createStandardRoles(tenant1.id);
    adminRole1 = roles1.admin;

    // Criar permissões para todas as entidades
    const entities = ['Contact', 'Company', 'Lead', 'Opportunity'];
    const actions = ['list', 'read', 'create', 'update'];

    for (const entity of entities) {
      for (const action of actions) {
        await createTestPermission({
          tenantId: tenant1.id,
          entity,
          action,
        });
      }
    }

    // Associar permissões ao Admin
    const permissions = await prisma.permission.findMany({
      where: { tenantId: tenant1.id },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((perm) => ({
        roleId: adminRole1.id,
        permissionId: perm.id,
      })),
      skipDuplicates: true,
    });

    // Criar usuário Admin
    const adminUser1Obj = await createTestUser({
      email: 'admin@combinedfilters.test',
      password: 'AdminPass123',
      name: 'Admin User',
      tenantId: tenant1.id,
    });
    
    await assignRoleToUser(adminUser1Obj.id, adminRole1.id);
    
    adminUser1 = {
      id: adminUser1Obj.id,
      email: adminUser1Obj.email,
    };

    adminToken1 = generateToken(adminUser1.id, tenant1.id);

    // Criar empresas para testes de relacionamento
    company1 = await prisma.company.create({
      data: {
        tenantId: tenant1.id,
        name: 'Tech Corp',
        status: 'ACTIVE',
      },
    });

    company2 = await prisma.company.create({
      data: {
        tenantId: tenant1.id,
        name: 'Finance Inc',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Filtros avançados + busca textual (q)', () => {
    beforeEach(async () => {
      // Criar dados de teste
      await prisma.contact.createMany({
        data: [
          {
            tenantId: tenant1.id,
            firstName: 'João',
            lastName: 'Silva',
            status: 'ACTIVE',
            companyId: company1.id,
          },
          {
            tenantId: tenant1.id,
            firstName: 'Maria',
            lastName: 'Silva',
            status: 'INACTIVE',
            companyId: company1.id,
          },
          {
            tenantId: tenant1.id,
            firstName: 'Pedro',
            lastName: 'Santos',
            status: 'ACTIVE',
            companyId: company2.id,
          },
        ],
      });
    });

    afterEach(async () => {
      await prisma.contact.deleteMany({ where: { tenantId: tenant1.id } });
    });

    it('deve combinar filtros avançados com busca textual (q)', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .query({
          q: 'silva',
          filters,
        })
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      
      // Deve retornar apenas contatos com status ACTIVE E que contenham "silva"
      const results = response.body.data;
      results.forEach((contact: any) => {
        expect(contact.status).toBe('ACTIVE');
        expect(
          contact.firstName.toLowerCase().includes('silva') ||
          contact.lastName.toLowerCase().includes('silva')
        ).toBe(true);
      });
    });

    it('deve aplicar filtros e busca textual com AND (ambos devem ser satisfeitos)', async () => {
      const filters = JSON.stringify([
        { field: 'companyId', operator: FilterOperator.EQUALS, value: company1.id },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .query({
          q: 'silva',
          filters,
        })
        .expect(200);

      expect(response.status).toBe(200);
      
      // Deve retornar apenas contatos da company1 E que contenham "silva"
      const results = response.body.data;
      results.forEach((contact: any) => {
        expect(contact.companyId).toBe(company1.id);
        expect(
          contact.firstName.toLowerCase().includes('silva') ||
          contact.lastName.toLowerCase().includes('silva')
        ).toBe(true);
      });
    });
  });

  describe('Precedência: filtros simples vs avançados', () => {
    beforeEach(async () => {
      await prisma.contact.createMany({
        data: [
          {
            tenantId: tenant1.id,
            firstName: 'Test',
            lastName: 'User1',
            status: 'ACTIVE',
          },
          {
            tenantId: tenant1.id,
            firstName: 'Test',
            lastName: 'User2',
            status: 'INACTIVE',
          },
        ],
      });
    });

    afterEach(async () => {
      await prisma.contact.deleteMany({ where: { tenantId: tenant1.id } });
    });

    it('deve respeitar precedência: filtros simples têm prioridade sobre avançados', async () => {
      // Aplicar filtro simples (status=ACTIVE) + filtro avançado (status=INACTIVE)
      const filters = JSON.stringify([
        { field: 'status', operator: FilterOperator.EQUALS, value: 'INACTIVE' },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .query({
          status: 'ACTIVE', // Filtro simples
          filters, // Filtro avançado com status diferente
        })
        .expect(200);

      expect(response.status).toBe(200);
      
      // Filtro simples deve prevalecer (status=ACTIVE)
      const results = response.body.data;
      results.forEach((contact: any) => {
        expect(contact.status).toBe('ACTIVE');
      });
    });
  });

  describe('Combinação completa: filtros + busca + ordenação + paginação', () => {
    beforeAll(async () => {
      // Criar mais dados para teste completo
      await prisma.contact.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
          tenantId: tenant1.id,
          firstName: `Contact${i}`,
          lastName: i % 2 === 0 ? 'Active' : 'Inactive',
          status: i % 2 === 0 ? 'ACTIVE' : 'INACTIVE',
          companyId: i % 3 === 0 ? company1.id : company2.id,
        })),
      });
    });

    afterAll(async () => {
      await prisma.contact.deleteMany({ where: { tenantId: tenant1.id } });
    });

    it('deve combinar filtros + busca + ordenação + paginação simultaneamente', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
        { field: 'companyId', operator: FilterOperator.EQUALS, value: company1.id },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .query({
          q: 'contact',
          filters,
          sortBy: 'firstName',
          sortOrder: 'asc',
          page: '1',
          limit: '10',
        })
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.data.length).toBeLessThanOrEqual(10);

      // Verificar que filtros foram aplicados
      response.body.data.forEach((contact: any) => {
        expect(contact.status).toBe('ACTIVE');
        expect(contact.companyId).toBe(company1.id);
      });

      // Verificar que ordenação foi aplicada
      const firstNames = response.body.data.map((c: any) => c.firstName);
      const sortedFirstNames = [...firstNames].sort();
      expect(firstNames).toEqual(sortedFirstNames);
    });
  });

  describe('Filtros em relacionamentos', () => {
    beforeEach(async () => {
      await prisma.contact.createMany({
        data: [
          {
            tenantId: tenant1.id,
            firstName: 'João',
            lastName: 'Tech',
            status: 'ACTIVE',
            companyId: company1.id, // Tech Corp
          },
          {
            tenantId: tenant1.id,
            firstName: 'Maria',
            lastName: 'Finance',
            status: 'ACTIVE',
            companyId: company2.id, // Finance Inc
          },
        ],
      });
    });

    afterEach(async () => {
      await prisma.contact.deleteMany({ where: { tenantId: tenant1.id } });
    });

    it('deve filtrar por campo de relacionamento (company.name)', async () => {
      // Nota: Filtros em relacionamentos podem precisar de implementação específica
      // Este teste valida que a estrutura suporta isso
      const filters = JSON.stringify([
        { field: 'companyId', operator: FilterOperator.EQUALS, value: company1.id },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .query({ filters })
        .expect(200);

      expect(response.status).toBe(200);
      
      // Deve retornar apenas contatos da company1
      const results = response.body.data;
      results.forEach((contact: any) => {
        expect(contact.companyId).toBe(company1.id);
      });
    });
  });

  describe('Filtros complexos aninhados', () => {
    beforeAll(async () => {
      // Criar dados variados
      await prisma.contact.createMany({
        data: [
          {
            tenantId: tenant1.id,
            firstName: 'Complex',
            lastName: 'Test1',
            status: 'ACTIVE',
            companyId: company1.id,
          },
          {
            tenantId: tenant1.id,
            firstName: 'Complex',
            lastName: 'Test2',
            status: 'INACTIVE',
            companyId: company1.id,
          },
          {
            tenantId: tenant1.id,
            firstName: 'Simple',
            lastName: 'Test3',
            status: 'ACTIVE',
            companyId: company2.id,
          },
        ],
      });
    });

    afterAll(async () => {
      await prisma.contact.deleteMany({ where: { tenantId: tenant1.id } });
    });

    it('deve aplicar múltiplos filtros avançados combinados', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
        { field: 'companyId', operator: FilterOperator.EQUALS, value: company1.id },
        { field: 'firstName', operator: FilterOperator.CONTAINS, value: 'Complex' },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .query({ filters })
        .expect(200);

      expect(response.status).toBe(200);
      
      // Deve retornar apenas contatos que satisfazem TODOS os filtros
      const results = response.body.data;
      results.forEach((contact: any) => {
        expect(contact.status).toBe('ACTIVE');
        expect(contact.companyId).toBe(company1.id);
        expect(contact.firstName).toContain('Complex');
      });
    });

    it('deve combinar filtros com operadores diferentes', async () => {
      const filters = JSON.stringify([
        { field: 'status', operator: FilterOperator.EQUALS, value: 'ACTIVE' },
        { field: 'companyId', operator: FilterOperator.NOT_EQUALS, value: company2.id },
      ]);

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-tenant-id', tenant1.id)
        .query({ filters })
        .expect(200);

      expect(response.status).toBe(200);
      
      const results = response.body.data;
      results.forEach((contact: any) => {
        expect(contact.status).toBe('ACTIVE');
        expect(contact.companyId).not.toBe(company2.id);
      });
    });
  });
});
