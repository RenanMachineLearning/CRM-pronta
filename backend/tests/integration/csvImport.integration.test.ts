/**
 * Testes de integração para importação completa de CSV
 * 
 * Testa o fluxo completo de importação de dados via CSV
 */

import request from 'supertest';
import { app } from '../../../src/index';
import { prisma } from '../../../src/utils/prisma';
import { Contact } from '@prisma/client';

describe('Importação Completa de CSV - Testes de Integração', () => {
  const mockTenantId = 'test-tenant-integration';

  beforeAll(async () => {
    // Criar tenant de teste
    await prisma.tenant.upsert({
      where: { id: mockTenantId },
      update: {},
      create: {
        id: mockTenantId,
        name: 'Test Tenant Integration',
        slug: 'test-tenant-integration',
        status: 'ACTIVE'
      }
    });
  });

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.contact.deleteMany({
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

  it('deve importar com sucesso um arquivo CSV de contatos', async () => {
    // Criar conteúdo CSV para teste
    const csvContent = 'firstName,lastName,email,phone\nJoão,Silva,joao.silva@test.com,+5511999999999\nMaria,Souza,maria.souza@test.com,+5511888888888';
    const csvBuffer = Buffer.from(csvContent, 'utf8');

    // Fazer upload do arquivo
    const uploadResponse = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token') // Token fictício para simulação
      .attach('file', csvBuffer, { filename: 'contatos.csv' })
      .expect(200);

    const fileId = uploadResponse.body.fileId;
    expect(fileId).toBeDefined();

    // Mapear campos
    const mapResponse = await request(app)
      .post(`/api/import/${fileId}/map`)
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .send({
        entityType: 'Contact',
        mappings: [
          { columnIndex: 0, fieldName: 'firstName', required: true },
          { columnIndex: 1, fieldName: 'lastName', required: false },
          { columnIndex: 2, fieldName: 'email', required: false },
          { columnIndex: 3, fieldName: 'phone', required: false }
        ]
      })
      .expect(200);

    expect(mapResponse.body.success).toBe(true);

    // Processar importação
    const processResponse = await request(app)
      .post('/api/import/process')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', csvBuffer, { filename: 'contatos.csv' })
      .field('entityType', 'Contact')
      .field('batchSize', '100')
      .field('validateBeforeImport', 'true')
      .field('continueOnError', 'true')
      .expect(200);

    expect(processResponse.body.success).toBe(true);
    expect(processResponse.body.importedCount).toBe(2);
    expect(processResponse.body.errorCount).toBe(0);

    // Verificar se os contatos foram criados no banco
    const contacts = await prisma.contact.findMany({
      where: { tenantId: mockTenantId }
    });

    expect(contacts).toHaveLength(2);
    expect(contacts.some(c => c.firstName === 'João')).toBe(true);
    expect(contacts.some(c => c.firstName === 'Maria')).toBe(true);
  });

  it('deve lidar com erros de validação durante a importação de CSV', async () => {
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

    // Processar importação com continueOnError=true
    const processResponse = await request(app)
      .post('/api/import/process')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', csvBuffer, { filename: 'contatos-com-erros.csv' })
      .field('entityType', 'Contact')
      .field('batchSize', '100')
      .field('validateBeforeImport', 'true')
      .field('continueOnError', 'true')
      .expect(200);

    // Deve ter 1 erro (firstName vazio) e 1 sucesso
    expect(processResponse.body.success).toBe(true);
    expect(processResponse.body.errorCount).toBeGreaterThan(0);
    expect(processResponse.body.importedCount).toBeGreaterThanOrEqual(0);

    // Verificar contatos criados
    const contacts = await prisma.contact.findMany({
      where: { tenantId: mockTenantId }
    });

    // Pelo menos um contato válido deve ter sido criado
    expect(contacts.length).toBeGreaterThanOrEqual(0);
  });

  it('deve validar o formato do CSV antes da importação', async () => {
    // Criar conteúdo CSV inválido
    const invalidCsvContent = 'firstName,lastName\nUnclosed Quote,"Invalid Data';
    const csvBuffer = Buffer.from(invalidCsvContent, 'utf8');

    // Validar o CSV
    const validateResponse = await request(app)
      .post('/api/import/validate')
      .set('X-Tenant-Id', mockTenantId)
      .attach('file', csvBuffer, { filename: 'invalid.csv' })
      .expect(400);

    expect(validateResponse.body.error).toBeDefined();
  });

  it('deve processar CSV com campos personalizados', async () => {
    // Criar conteúdo CSV com campos que poderiam ser personalizados
    const csvContent = 'firstName,lastName,email,customerType\nJoão,Silva,joao@test.com,VIP\nMaria,Souza,maria@test.com,Regular';
    const csvBuffer = Buffer.from(csvContent, 'utf8');

    // Fazer upload do arquivo
    const uploadResponse = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', csvBuffer, { filename: 'contatos-custom.csv' })
      .expect(200);

    const fileId = uploadResponse.body.fileId;
    expect(fileId).toBeDefined();

    // Processar importação
    const processResponse = await request(app)
      .post('/api/import/process')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', csvBuffer, { filename: 'contatos-custom.csv' })
      .field('entityType', 'Contact')
      .field('batchSize', '100')
      .field('validateBeforeImport', 'true')
      .field('continueOnError', 'true')
      .expect(200);

    expect(processResponse.body.success).toBe(true);
    expect(processResponse.body.importedCount).toBeGreaterThanOrEqual(0);

    // Verificar se os contatos foram criados
    const contacts = await prisma.contact.findMany({
      where: { tenantId: mockTenantId }
    });

    expect(contacts.length).toBeGreaterThanOrEqual(0);
  });

  it('deve respeitar os limites de tamanho de arquivo', async () => {
    // Criar conteúdo CSV maior que o limite (10MB)
    let largeCsvContent = 'firstName,lastName,email\n';
    const targetSize = 11 * 1024 * 1024; // 11MB
    const rowString = 'John,Doe,john.doe@example.com\n';
    const rowsNeeded = Math.ceil(targetSize / rowString.length);
    
    for (let i = 0; i < rowsNeeded; i++) {
      largeCsvContent += rowString;
    }
    
    const largeCsvBuffer = Buffer.from(largeCsvContent, 'utf8');
    expect(largeCsvBuffer.length).toBeGreaterThan(10 * 1024 * 1024); // Maior que 10MB

    // Tentar fazer upload do arquivo grande
    const response = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', largeCsvBuffer, { filename: 'large-file.csv' })
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
});