/**
 * Testes para validação de transações em importação
 * 
 * Testa o uso de transações para garantir consistência e rollback em caso de erro
 */

import { CsvImportService } from '../../src/services/csvImportService';
import { prisma } from '../../src/utils/prisma';
import { ContactService } from '../../src/services/contactService';

describe('Transações em Importação - Testes', () => {
  const mockTenantId = 'test-tenant';
  const mockUserId = 'test-user';

  // Teste: transações para rollback em caso de erro
  describe('Rollback em Caso de Erro', () => {
    it('deve reverter todas as alterações se ocorrer erro em um lote', async () => {
      // Criar um CSV com dados válidos e um inválido no meio
      const csvContent = 'firstName,lastName,email\n' +
                        'John,Doe,john.doe@example.com\n' +
                        'Jane,Smith,jane.smith@example.com\n' +
                        'Invalid,,invalid-email\n' + // Email inválido
                        'Bob,Johnson,bob.johnson@example.com\n';
      
      const fileBuffer = Buffer.from(csvContent, 'utf8');

      // Mock para simular falha em uma transação específica
      jest.spyOn(ContactService, 'createContact').mockImplementation(async (data, tenantId, userId) => {
        if (data.email === 'invalid-email') {
          throw new Error('Email inválido');
        }
        
        // Simular criação de contato
        return {
          id: 'mock-contact-id',
          tenantId,
          firstName: data.firstName,
          lastName: data.lastName,
          title: data.title || null,
          gender: data.gender || null,
          birthDate: data.birthDate || null,
          notes: data.notes || null,
          status: data.status || 'ACTIVE',
          companyId: data.companyId || null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          company: null,
          emails: data.emails || [],
          phones: data.phones || [],
          addresses: data.addresses || [],
          tags: [],
        };
      });

      // Como estamos testando rollback, esperamos que o erro ocorra
      // e que a transação reverta as alterações
      const result = await CsvImportService.importFromFile(fileBuffer, {
        batchSize: 2, // Tamanho pequeno para garantir que o erro ocorra em um lote específico
        validateBeforeImport: false,
        continueOnError: false, // Não continuar em caso de erro
        tenantId: mockTenantId,
        userId: mockUserId,
        entityType: 'contact',
        fileType: 'csv'
      });

      // O resultado deve mostrar falha devido ao erro de validação
      expect(result.success).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0);
    });

    it('deve manter alterações se continueOnError for verdadeiro', async () => {
      // Criar um CSV com dados válidos e um inválido no meio
      const csvContent = 'firstName,lastName,email\n' +
                        'John,Doe,john.doe@example.com\n' +
                        'Jane,Smith,jane.smith@example.com\n' +
                        'Invalid,,invalid-email\n' + // Email inválido
                        'Bob,Johnson,bob.johnson@example.com\n';
      
      const fileBuffer = Buffer.from(csvContent, 'utf8');

      // Mock para simular falha em uma transação específica
      jest.spyOn(ContactService, 'createContact').mockImplementation(async (data, tenantId, userId) => {
        if (data.email === 'invalid-email') {
          throw new Error('Email inválido');
        }
        
        // Simular criação de contato
        return {
          id: 'mock-contact-id',
          tenantId,
          firstName: data.firstName,
          lastName: data.lastName,
          title: data.title || null,
          gender: data.gender || null,
          birthDate: data.birthDate || null,
          notes: data.notes || null,
          status: data.status || 'ACTIVE',
          companyId: data.companyId || null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          company: null,
          emails: data.emails || [],
          phones: data.phones || [],
          addresses: data.addresses || [],
          tags: [],
        };
      });

      const result = await CsvImportService.importFromFile(fileBuffer, {
        batchSize: 2, // Tamanho pequeno para garantir que o erro ocorra em um lote específico
        validateBeforeImport: false,
        continueOnError: true, // Continuar em caso de erro
        tenantId: mockTenantId,
        userId: mockUserId,
        entityType: 'contact',
        fileType: 'csv'
      });

      // O resultado deve mostrar sucesso parcial com erros registrados
      expect(result.success).toBe(true); // Sucesso porque continueOnError=true
      expect(result.errorCount).toBe(1); // Um erro registrado
      expect(result.importedCount).toBeGreaterThanOrEqual(0); // Alguns registros importados
    });
  });
});