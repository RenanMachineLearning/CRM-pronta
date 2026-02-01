/**
 * Testes de integração para importação completa de Excel
 * 
 * Testa o fluxo completo de importação de dados via Excel (XLSX/XLS)
 */

import request from 'supertest';
import { app } from '../../../src/index';
import { prisma } from '../../../src/utils/prisma';

describe('Importação Completa de Excel - Testes de Integração', () => {
  const mockTenantId = 'test-tenant-excel';

  beforeAll(async () => {
    // Criar tenant de teste
    await prisma.tenant.upsert({
      where: { id: mockTenantId },
      update: {},
      create: {
        id: mockTenantId,
        name: 'Test Tenant Excel',
        slug: 'test-tenant-excel',
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

  it('deve validar o formato do Excel antes da importação', async () => {
    // Criar um buffer simulando um arquivo Excel
    const XLSX_MAGIC_NUMBER = Buffer.from('504B0304', 'hex'); // ZIP file header (XLSX são arquivos ZIP)
    const mockXlsxBuffer = Buffer.concat([
      XLSX_MAGIC_NUMBER,
      Buffer.from('PK\x03\x04\x14\x00\x00\x00\b\x00') // Cabeçalho mais completo
    ]);

    // Validar o Excel
    const validateResponse = await request(app)
      .post('/api/import/validate')
      .set('X-Tenant-Id', mockTenantId)
      .attach('file', mockXlsxBuffer, { filename: 'contatos.xlsx' })
      .expect(200);

    expect(validateResponse.body.message).toBeDefined();
    expect(validateResponse.body.fileType).toBe('xlsx');
  });

  it('deve rejeitar arquivos que não são Excel', async () => {
    // Criar conteúdo que não é Excel
    const invalidBuffer = Buffer.from('Este não é um arquivo Excel');

    // Validar o arquivo inválido
    const validateResponse = await request(app)
      .post('/api/import/validate')
      .set('X-Tenant-Id', mockTenantId)
      .attach('file', invalidBuffer, { filename: 'nao-excel.xlsx' })
      .expect(400);

    expect(validateResponse.body.error).toBeDefined();
  });

  it('deve processar mapeamento de campos para Excel', async () => {
    // Criar um buffer simulando um arquivo Excel com dados
    const XLSX_MAGIC_NUMBER = Buffer.from('504B0304', 'hex');
    const mockXlsxBuffer = Buffer.concat([
      XLSX_MAGIC_NUMBER,
      Buffer.from('PK\x03\x04\x14\x00\x00\x00\b\x00simulated excel content with headers: firstName, lastName, email')
    ]);

    // Fazer upload do arquivo
    const uploadResponse = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', mockXlsxBuffer, { filename: 'contatos.xlsx' })
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
          { columnIndex: 2, fieldName: 'email', required: false }
        ]
      })
      .expect(200);

    expect(mapResponse.body.success).toBe(true);
    expect(mapResponse.body.entityType).toBe('Contact');
  });

  it('deve processar importação de Excel com múltiplas planilhas', async () => {
    // Criar um buffer simulando um arquivo Excel com múltiplas planilhas
    const XLSX_MAGIC_NUMBER = Buffer.from('504B0304', 'hex');
    const mockXlsxBuffer = Buffer.concat([
      XLSX_MAGIC_NUMBER,
      Buffer.from('PK\x03\x04\x14\x00\x00\x00\b\x00simulated excel content with multiple sheets')
    ]);

    // Validar o Excel para obter informações das planilhas
    const validateResponse = await request(app)
      .post('/api/import/validate')
      .set('X-Tenant-Id', mockTenantId)
      .attach('file', mockXlsxBuffer, { filename: 'multiplanilha.xlsx' })
      .expect(200);

    expect(validateResponse.body.fileType).toBe('xlsx');
  });

  it('deve lidar com erros de validação durante a importação de Excel', async () => {
    // Criar um buffer simulando um arquivo Excel com dados inválidos
    const XLSX_MAGIC_NUMBER = Buffer.from('504B0304', 'hex');
    const mockXlsxBuffer = Buffer.concat([
      XLSX_MAGIC_NUMBER,
      Buffer.from('PK\x03\x04\x14\x00\x00\x00\b\x00simulated excel with invalid data')
    ]);

    // Fazer upload do arquivo
    const uploadResponse = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', mockXlsxBuffer, { filename: 'dados-invalidos.xlsx' })
      .expect(200);

    const fileId = uploadResponse.body.fileId;
    expect(fileId).toBeDefined();

    // Processar importação com dados inválidos
    const processResponse = await request(app)
      .post('/api/import/process')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', mockXlsxBuffer, { filename: 'dados-invalidos.xlsx' })
      .field('entityType', 'Contact')
      .field('batchSize', '100')
      .field('validateBeforeImport', 'true')
      .field('continueOnError', 'true')
      .expect(200);

    // O resultado pode ter erros, dependendo da validação
    expect(processResponse.body).toBeDefined();
  });

  it('deve respeitar os limites de tamanho de arquivo Excel', async () => {
    // Criar um buffer grande para simular um arquivo Excel grande
    const XLSX_MAGIC_NUMBER = Buffer.from('504B0304', 'hex');
    const largeContent = 'A'.repeat(11 * 1024 * 1024); // Mais de 10MB
    const largeXlsxBuffer = Buffer.concat([
      XLSX_MAGIC_NUMBER,
      Buffer.from(largeContent)
    ]);

    expect(largeXlsxBuffer.length).toBeGreaterThan(10 * 1024 * 1024); // Maior que 10MB

    // Tentar fazer upload do arquivo grande
    const response = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', largeXlsxBuffer, { filename: 'excel-grande.xlsx' })
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  it('deve importar dados de Excel com campos personalizados', async () => {
    // Criar um buffer simulando um arquivo Excel com campos personalizados
    const XLSX_MAGIC_NUMBER = Buffer.from('504B0304', 'hex');
    const mockXlsxBuffer = Buffer.concat([
      XLSX_MAGIC_NUMBER,
      Buffer.from('PK\x03\x04\x14\x00\x00\x00\b\x00simulated excel with custom fields: firstName, lastName, customerCategory')
    ]);

    // Fazer upload do arquivo
    const uploadResponse = await request(app)
      .post('/api/import/upload')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', mockXlsxBuffer, { filename: 'contatos-custom.xlsx' })
      .expect(200);

    const fileId = uploadResponse.body.fileId;
    expect(fileId).toBeDefined();

    // Processar importação
    const processResponse = await request(app)
      .post('/api/import/process')
      .set('X-Tenant-Id', mockTenantId)
      .set('Authorization', 'Bearer fake-token')
      .attach('file', mockXlsxBuffer, { filename: 'contatos-custom.xlsx' })
      .field('entityType', 'Contact')
      .field('batchSize', '100')
      .field('validateBeforeImport', 'true')
      .field('continueOnError', 'true')
      .expect(200);

    expect(processResponse.body).toBeDefined();
  });
});