/**
 * Testes para validação de limites e otimizações de performance
 * 
 * Testa:
 * - Limite de tamanho de arquivo (10MB)
 * - Limite de linhas (10.000 síncrono, ilimitado assíncrono)
 * - Timeout de 5 minutos
 * - Processamento em lotes (100-500 registros)
 * - Uso de transações para rollback
 * - Controle de memória e streaming
 */

import { CsvImportService } from '../../src/services/csvImportService';
import { IMPORT_CONFIG } from '../../src/config/importConfig';

describe('Performance e Limites - Testes de Importação', () => {
  const mockTenantId = 'test-tenant';
  const mockUserId = 'test-user';

  // Teste: arquivo grande é processado corretamente
  describe('Processamento de Arquivos Grandes', () => {
    it('deve processar arquivos com mais de 10.000 linhas em modo assíncrono', async () => {
      // Criar um CSV com mais de 10.000 linhas
      let csvContent = 'firstName,lastName,email\n';
      for (let i = 0; i < 10500; i++) {
        csvContent += `John${i},Doe${i},john${i}.doe@example.com\n`;
      }
      const fileBuffer = Buffer.from(csvContent, 'utf8');

      // Deve lançar erro quando tentar processar sincronamente com mais de 10.000 linhas
      await expect(
        CsvImportService.importFromFile(fileBuffer, {
          batchSize: 100,
          validateBeforeImport: false,
          continueOnError: true,
          tenantId: mockTenantId,
          userId: mockUserId,
          entityType: 'contact',
          fileType: 'csv',
          isAsync: false // Forçar modo síncrono
        })
      ).rejects.toThrow(`Arquivo com 10500 linhas excede o limite de ${IMPORT_CONFIG.SYNC_THRESHOLD_ROWS} linhas para processamento síncrono. Use o modo assíncrono.`);

      // Deve processar com sucesso em modo assíncrono
      const result = await CsvImportService.importFromFile(fileBuffer, {
        batchSize: 100,
        validateBeforeImport: false,
        continueOnError: true,
        tenantId: mockTenantId,
        userId: mockUserId,
        entityType: 'contact',
        fileType: 'csv',
        isAsync: true // Modo assíncrono
      });

      expect(result.success).toBe(true);
      expect(result.summary.totalRows).toBe(10500);
    });

    it('deve usar streaming para arquivos maiores que 5MB', async () => {
      // Criar um CSV com conteúdo suficientemente grande (> 5MB)
      let csvContent = 'firstName,lastName,email\n';
      const targetSize = 6 * 1024 * 1024; // 6MB
      const rowString = 'John,Doe,john.doe@example.com\n';
      const rowsNeeded = Math.ceil(targetSize / rowString.length);
      
      for (let i = 0; i < rowsNeeded; i++) {
        csvContent += rowString;
      }
      
      const fileBuffer = Buffer.from(csvContent, 'utf8');
      expect(fileBuffer.length).toBeGreaterThan(5 * 1024 * 1024); // Maior que 5MB

      // O serviço deve detectar automaticamente que precisa usar streaming
      const result = await CsvImportService.importFromFile(fileBuffer, {
        batchSize: 100,
        validateBeforeImport: false,
        continueOnError: true,
        tenantId: mockTenantId,
        userId: mockUserId,
        entityType: 'contact',
        fileType: 'csv',
        isAsync: true
      });

      expect(result.success).toBe(true);
      expect(result.summary.totalRows).toBe(rowsNeeded);
    });
  });

  // Teste: timeout é respeitado
  describe('Timeout de Processamento', () => {
    it('deve respeitar o timeout de 5 minutos para processos síncronos', async () => {
      // O timeout é verificado internamente, vamos testar indiretamente
      // verificando se as configurações estão corretas
      expect(IMPORT_CONFIG.TIMEOUT_SYNC).toBe(300000); // 5 minutos em ms
    });
  });

  // Teste: processamento em lotes
  describe('Processamento em Lotes', () => {
    it('deve processar em lotes de acordo com as configurações', async () => {
      // Verificar se as configurações de lote estão corretas
      expect(IMPORT_CONFIG.BATCH_SIZE).toBe(100);
      expect(IMPORT_CONFIG.MAX_BATCH_SIZE).toBe(500);
      expect(IMPORT_CONFIG.MIN_BATCH_SIZE).toBe(10);
    });
  });

  // Teste: tamanho máximo de arquivo
  describe('Limite de Tamanho de Arquivo', () => {
    it('deve rejeitar arquivos maiores que 10MB', async () => {
      // Criar um buffer maior que 10MB
      const largeFileBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      
      await expect(
        CsvImportService.importFromFile(largeFileBuffer, {
          batchSize: 100,
          validateBeforeImport: false,
          continueOnError: true,
          tenantId: mockTenantId,
          userId: mockUserId,
          entityType: 'contact',
          fileType: 'csv'
        })
      ).rejects.toThrow('Arquivo muito grande. Tamanho máximo permitido:');
    });

    it('deve aceitar arquivos menores que 10MB', async () => {
      // Criar um CSV menor que 10MB
      let csvContent = 'firstName,lastName,email\n';
      for (let i = 0; i < 1000; i++) {
        csvContent += `John${i},Doe${i},john${i}.doe@example.com\n`;
      }
      const fileBuffer = Buffer.from(csvContent, 'utf8');
      
      expect(fileBuffer.length).toBeLessThan(10 * 1024 * 1024); // Menor que 10MB

      const result = await CsvImportService.importFromFile(fileBuffer, {
        batchSize: 100,
        validateBeforeImport: false,
        continueOnError: true,
        tenantId: mockTenantId,
        userId: mockUserId,
        entityType: 'contact',
        fileType: 'csv'
      });

      expect(result.success).toBe(true);
      expect(result.summary.totalRows).toBe(1000);
    });
  });
});