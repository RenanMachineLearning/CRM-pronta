/**
 * Testes de integração para tratamento de erros
 * 
 * Testa como o sistema lida com diferentes cenários de erro durante importação/exportação
 */

import request from 'supertest';
import { app } from '../../../src/index';
import { prisma } from '../../../src/utils/prisma';

describe('Tratamento de Erros - Testes de Integração', () => {
  const mockTenantId = 'test-tenant-errors';
  const mockUserId = 'test-user-errors';

  beforeAll(async () => {
    // Criar tenant de teste
    await prisma.tenant.upsert({
      where: { id: mockTenantId },
      update: {},
      create: {
        id: mockTenantId,
        name: 'Test Tenant Errors',
        slug: 'test-tenant-errors',
        status: 'ACTIVE'
      }
    });

    // Criar usuário de teste
    await prisma.user.upsert({
      where: { id: mockUserId },
      update: {},
      create: {
        id: mockUserId,
        email: 'test-error@example.com',
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'Error',
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
  });

  it('deve tratar erro de arquivo não suportado', async () => {
    // Tentar fazer upload de um arquivo não suportado
    const txtContent = 'Este é um arquivo de texto';
    const txtBuffer = Buffer.from(txtContent, 'utf8');

    const response = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', txtBuffer, { filename: 'arquivo.txt' })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.message).toContain('suportado');
  });

  it('deve tratar erro de arquivo muito grande', async () => {
    // Criar um buffer maior que o limite (10MB)
    const largeContent = 'A'.repeat(11 * 1024 * 1024); // 11MB
    const largeBuffer = Buffer.from(largeContent, 'utf8');

    expect(largeBuffer.length).toBeGreaterThan(10 * 1024 * 1024); // Maior que 10MB

    const response = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', largeBuffer, { filename: 'arquivo-grande.csv' })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.message).toContain('tamanho máximo');
  });

  it('deve tratar erro de parsing de CSV inválido', async () => {
    // Criar conteúdo CSV com formatação inválida
    const invalidCsvContent = '"unclosed quote, field2\nfield3, "another unclosed quote';
    const invalidCsvBuffer = Buffer.from(invalidCsvContent, 'utf8');

    const response = await request(app)
      .post('/api/import/validate')
      .set('X-Tenant-Id', mockTenantId)
      .attach('file', invalidCsvBuffer, { filename: 'csv-invalido.csv' })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.message).toContain('formato');
  });

  it('deve tratar erro de parsing de Excel inválido', async () => {
    // Tentar fazer upload de um arquivo que não é Excel
    const invalidExcelBuffer = Buffer.from('isto nao eh um arquivo excel');

    const response = await request(app)
      .post('/api/import/validate')
      .set('X-Tenant-Id', mockTenantId)
      .attach('file', invalidExcelBuffer, { filename: 'excel-invalido.xlsx' })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.message).toContain('formato');
  });

  it('deve tratar erro de mapeamento inválido', async () => {
    // Criar conteúdo CSV válido
    const csvContent = 'firstName,lastName,email\nJoão,Silva,joao@email.com';
    const csvBuffer = Buffer.from(csvContent, 'utf8');

    // Fazer upload do arquivo
    const uploadResponse = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', csvBuffer, { filename: 'contato.csv' })
      .expect(200);

    const fileId = uploadResponse.body.fileId;
    expect(fileId).toBeDefined();

    // Tentar mapear com campos inválidos
    const response = await request(app)
      .post(`/api/import/${fileId}/map`)
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .send({
        entityType: 'Contact',
        mappings: [
          { columnIndex: 0, fieldName: 'campo_inexistente', required: true }
        ]
      })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.message).toContain('inválido');
  });

  it('deve tratar erro de validação de dados', async () => {
    // Criar conteúdo CSV com dados inválidos
    const csvContent = 'firstName,lastName,email\n,Invalid,invalid-email\nValid,User,valid@email.com';
    const csvBuffer = Buffer.from(csvContent, 'utf8');

    // Fazer upload do arquivo
    const uploadResponse = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', csvBuffer, { filename: 'contatos-com-erros.csv' })
      .expect(200);

    const fileId = uploadResponse.body.fileId;
    expect(fileId).toBeDefined();

    // Processar importação com validação habilitada
    const response = await request(app)
      .post('/api/import/process')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', csvBuffer, { filename: 'contatos-com-erros.csv' })
      .field('entityType', 'Contact')
      .field('batchSize', '100')
      .field('validateBeforeImport', 'true')
      .field('continueOnError', 'false') // Não continuar com erros
      .expect(200);

    // Deve ter erros de validação
    expect(response.body.errorCount).toBeGreaterThan(0);
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it('deve tratar erro de timeout durante importação', async () => {
    // Criar um CSV com muitas linhas para testar timeout
    let csvContent = 'firstName,lastName,email\n';
    for (let i = 0; i < 15000; i++) { // Mais que o limite síncrono
      csvContent += `Nome${i},Sobrenome${i},email${i}@test.com\n`;
    }
    const csvBuffer = Buffer.from(csvContent, 'utf8');

    // Tentar importação síncrona com mais linhas que o permitido
    const response = await request(app)
      .post('/api/import/process')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', csvBuffer, { filename: 'muitas-linhas.csv' })
      .field('entityType', 'Contact')
      .field('batchSize', '100')
      .field('validateBeforeImport', 'false')
      .field('continueOnError', 'true')
      .expect(400); // Espera-se erro porque excede o limite síncrono

    expect(response.body.error).toBeDefined();
    expect(response.body.message).toContain('síncrono');
  });

  it('deve tratar erro de entidade não suportada', async () => {
    // Criar conteúdo CSV
    const csvContent = 'firstName,lastName,email\nJoão,Silva,joao@email.com';
    const csvBuffer = Buffer.from(csvContent, 'utf8');

    // Tentar importar para uma entidade não suportada
    const response = await request(app)
      .post('/api/import/process')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', csvBuffer, { filename: 'contato.csv' })
      .field('entityType', 'EntidadeNaoSuportada')
      .field('batchSize', '100')
      .field('validateBeforeImport', 'true')
      .field('continueOnError', 'true')
      .expect(500);

    expect(response.body.error).toBeDefined();
  });

  it('deve tratar erro de falta de permissão para importação', async () => {
    // Criar conteúdo CSV
    const csvContent = 'firstName,lastName,email\nJoão,Silva,joao@email.com';
    const csvBuffer = Buffer.from(csvContent, 'utf8');

    // Tentar importação sem token de autorização
    const response = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .attach('file', csvBuffer, { filename: 'contato-sem-permissao.csv' })
      .expect(401);

    expect(response.body.error).toBeDefined();
    expect(response.body.message).toContain('autorizado');
  });

  it('deve tratar erro de falta de permissão para exportação', async () => {
    // Tentar exportação sem token de autorização
    const response = await request(app)
      .get('/api/export/Contact')
      .set('X-Tenant-Id', mockTenantId)
      .query({
        format: 'csv',
        fields: ['firstName', 'lastName']
      })
      .expect(401);

    expect(response.body.error).toBeDefined();
    expect(response.body.message).toContain('autorizado');
  });

  it('deve tratar erro de campos obrigatórios ausentes na importação', async () => {
    // Criar conteúdo CSV com campo obrigatório ausente
    const csvContent = 'firstName,lastName\nJoão,Silva\n,Maria'; // firstName ausente na segunda linha
    const csvBuffer = Buffer.from(csvContent, 'utf8');

    // Fazer upload do arquivo
    const uploadResponse = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', csvBuffer, { filename: 'campos-obrigatorios.csv' })
      .expect(200);

    const fileId = uploadResponse.body.fileId;
    expect(fileId).toBeDefined();

    // Processar importação
    const response = await request(app)
      .post('/api/import/process')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', csvBuffer, { filename: 'campos-obrigatorios.csv' })
      .field('entityType', 'Contact')
      .field('batchSize', '100')
      .field('validateBeforeImport', 'true')
      .field('continueOnError', 'true')
      .expect(200);

    // Deve ter erros devido ao campo obrigatório ausente
    expect(response.body.errorCount).toBeGreaterThan(0);
    expect(response.body.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('obrigatório')
      })
    );
  });
});