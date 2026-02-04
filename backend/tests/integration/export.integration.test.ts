/**
 * Testes de integração para exportação completa
 * 
 * Testa o fluxo completo de exportação de dados para CSV/Excel
 */

import request from 'supertest';
import { app } from '../../../src/index';
import { prisma } from '../../../src/utils/prisma';
import { Contact } from '@prisma/client';

describe('Exportação Completa - Testes de Integração', () => {
  const mockTenantId = 'test-tenant-export';
  const mockUserId = 'test-user-export';

  beforeAll(async () => {
    // Criar tenant de teste
    await prisma.tenant.upsert({
      where: { id: mockTenantId },
      update: {},
      create: {
        id: mockTenantId,
        name: 'Test Tenant Export',
        slug: 'test-tenant-export',
        status: 'ACTIVE'
      }
    });

    // Criar usuário de teste
    await prisma.user.upsert({
      where: { id: mockUserId },
      update: {},
      create: {
        id: mockUserId,
        email: 'test-export@example.com',
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'Export',
        status: 'ACTIVE',
        tenantId: mockTenantId
      }
    });
  });

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.contact.deleteMany({
      where: { tenantId: mockTenantId }
    });
    
    await prisma.user.deleteMany({
      where: { tenantId: mockTenantId }
    });
    
    await prisma.tenant.delete({
      where: { id: mockTenantId }
    });

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Limpar contatos antes de cada teste
    await prisma.contact.deleteMany({
      where: { tenantId: mockTenantId }
    });
    
    // Criar contatos de teste
    await prisma.contact.createMany({
      data: [
        {
          tenantId: mockTenantId,
          firstName: 'João',
          lastName: 'Silva',
          email: 'joao.silva@example.com',
          phone: '+5511999999999',
          status: 'ACTIVE'
        },
        {
          tenantId: mockTenantId,
          firstName: 'Maria',
          lastName: 'Souza',
          email: 'maria.souza@example.com',
          phone: '+5511888888888',
          status: 'ACTIVE'
        }
      ]
    });
  });

  afterEach(async () => {
    // Limpar quaisquer contatos adicionais criados durante os testes
    await prisma.contact.deleteMany({
      where: { tenantId: mockTenantId, firstName: { in: ['Teste', 'Novo'] } }
    });
  });

  it('deve exportar contatos para CSV com sucesso', async () => {
    // Fazer requisição de exportação para CSV
    const response = await request(app)
      .get('/api/export/Contact')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .query({
        format: 'csv',
        fields: ['firstName', 'lastName', 'email', 'phone']
      })
      .expect(200);

    // Verificar se o conteúdo é CSV
    expect(response.header['content-type']).toContain('text/csv');
    expect(response.header['content-disposition']).toContain('.csv');

    // Verificar se o CSV contém os cabeçalhos e dados esperados
    const csvContent = response.text;
    expect(csvContent).toContain('firstName,lastName,email,phone');
    expect(csvContent).toContain('João,Silva,joao.silva@example.com,+5511999999999');
    expect(csvContent).toContain('Maria,Souza,maria.souza@example.com,+5511888888888');
  });

  it('deve exportar contatos para Excel com sucesso', async () => {
    // Fazer requisição de exportação para Excel
    const response = await request(app)
      .get('/api/export/Contact')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .query({
        format: 'excel',
        fields: ['firstName', 'lastName', 'email']
      })
      .expect(200);

    // Verificar se o conteúdo é Excel (binário)
    expect(response.header['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.header['content-disposition']).toContain('.xlsx');

    // Verificar se o buffer tem conteúdo (não vazio)
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('deve exportar apenas os campos selecionados', async () => {
    // Fazer requisição de exportação com campos específicos
    const response = await request(app)
      .get('/api/export/Contact')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .query({
        format: 'csv',
        fields: ['firstName', 'email']
      })
      .expect(200);

    // Verificar se o CSV contém apenas os campos solicitados
    const csvContent = response.text;
    expect(csvContent).toContain('firstName,email');
    expect(csvContent).not.toContain('lastName');
    expect(csvContent).not.toContain('phone');
    expect(csvContent).toContain('João,joao.silva@example.com');
    expect(csvContent).toContain('Maria,maria.souza@example.com');
  });

  it('deve aplicar filtros corretamente na exportação', async () => {
    // Adicionar um contato extra com status diferente
    await prisma.contact.create({
      data: {
        tenantId: mockTenantId,
        firstName: 'José',
        lastName: 'Almeida',
        email: 'jose.almeida@example.com',
        status: 'INACTIVE'
      }
    });

    // Fazer requisição de exportação com filtro
    const response = await request(app)
      .get('/api/export/Contact')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .query({
        format: 'csv',
        fields: ['firstName', 'lastName', 'email', 'status'],
        filters: JSON.stringify([{ field: 'status', operator: 'equals', value: 'ACTIVE' }])
      })
      .expect(200);

    // Verificar se o CSV contém apenas contatos com status ACTIVE
    const csvContent = response.text;
    expect(csvContent).toContain('João,Silva,joao.silva@example.com,ACTIVE');
    expect(csvContent).toContain('Maria,Souza,maria.souza@example.com,ACTIVE');
    expect(csvContent).not.toContain('José,Almeida,jose.almeida@example.com,INACTIVE');
  });

  it('deve respeitar o limite de exportação', async () => {
    // Criar mais contatos para testar o limite
    const additionalContacts = Array.from({ length: 10001 }, (_, i) => ({
      tenantId: mockTenantId,
      firstName: `Contato ${i}`,
      lastName: 'Teste',
      email: `contato${i}@test.com`,
      status: 'ACTIVE'
    }));
    
    await prisma.contact.createMany({
      data: additionalContacts
    });

    // Fazer requisição de exportação - deve respeitar o limite de 10.000
    const response = await request(app)
      .get('/api/export/Contact')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .query({
        format: 'csv',
        fields: ['firstName', 'lastName', 'email']
      })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.message).toContain('limite');
  });

  it('deve exportar para diferentes entidades', async () => {
    // Criar uma empresa de teste
    await prisma.company.create({
      data: {
        tenantId: mockTenantId,
        name: 'Empresa Teste',
        website: 'http://empresa-teste.com',
        industry: 'Technology',
        size: 'SMALL',
        status: 'ACTIVE'
      }
    });

    // Fazer requisição de exportação de empresa
    const response = await request(app)
      .get('/api/export/Company')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .query({
        format: 'csv',
        fields: ['name', 'website', 'industry', 'size']
      })
      .expect(200);

    // Verificar se o CSV contém os dados da empresa
    const csvContent = response.text;
    expect(csvContent).toContain('name,website,industry,size');
    expect(csvContent).toContain('Empresa Teste,http://empresa-teste.com,Technology,SMALL');
  });

  it('deve retornar erro para formato inválido', async () => {
    // Fazer requisição com formato inválido
    const response = await request(app)
      .get('/api/export/Contact')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .query({
        format: 'xml', // Formato não suportado
        fields: ['firstName', 'lastName']
      })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.message).toContain('xml');
  });

  it('deve retornar erro para entidade inválida', async () => {
    // Fazer requisição com entidade não suportada
    const response = await request(app)
      .get('/api/export/Produto') // Entidade não suportada
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .query({
        format: 'csv',
        fields: ['nome']
      })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.message).toContain('Produto');
  });
});