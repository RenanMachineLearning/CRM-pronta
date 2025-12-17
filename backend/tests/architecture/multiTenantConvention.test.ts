/**
 * Testes de regressão da convenção multi-tenant
 * 
 * Garante que a convenção está documentada e protegida no schema Prisma.
 * Evita que alguém "pule" o padrão no futuro.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Multi-Tenant Convention - Regression Tests', () => {
  const schemaPath = path.join(__dirname, '../../prisma/schema.prisma');

  describe('Convenção multi-tenant está documentada no schema', () => {
    it('deve conter seção "CONVENÇÃO OBRIGATÓRIA: ISOLAMENTO MULTI-TENANT"', () => {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

      expect(schemaContent).toContain('CONVENÇÃO OBRIGATÓRIA: ISOLAMENTO MULTI-TENANT');
    });

    it('deve mencionar "tenantId obrigatório"', () => {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

      expect(schemaContent).toContain('tenantId');
      expect(schemaContent).toContain('obrigatório');
    });

    it('deve mencionar índice composto (tenantId, id)', () => {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

      expect(schemaContent).toContain('@@index([tenantId, id])');
    });
  });

  describe('Nenhum model não comentado existe sem tenantId (exceto Tenant)', () => {
    it('deve verificar que todos os models não comentados têm tenantId ou são Tenant', () => {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

      // Encontrar todos os models não comentados
      const modelRegex = /^model\s+(\w+)/gm;
      const models: string[] = [];
      let match;

      while ((match = modelRegex.exec(schemaContent)) !== null) {
        const modelName = match[1];
        // Verificar se não está em comentário de bloco
        const beforeMatch = schemaContent.substring(0, match.index || 0);
        const blockCommentOpen = (beforeMatch.match(/\/\*/g) || []).length;
        const blockCommentClose = (beforeMatch.match(/\*\//g) || []).length;

        // Se não está em comentário de bloco
        if (blockCommentOpen === blockCommentClose) {
          models.push(modelName);
        }
      }

      // Para cada model (exceto Tenant), verificar se tem tenantId
      models.forEach((modelName) => {
        if (modelName === 'Tenant') {
          return; // Tenant não precisa de tenantId
        }

        // Encontrar o conteúdo do model
        const modelStart = schemaContent.indexOf(`model ${modelName}`);
        if (modelStart === -1) return;

        // Encontrar o próximo model ou fim do arquivo
        const nextModelMatch = schemaContent.substring(modelStart).match(/^model\s+\w+/m);
        const modelEnd = nextModelMatch && nextModelMatch.index !== undefined
          ? modelStart + nextModelMatch.index
          : schemaContent.length;

        const modelContent = schemaContent.substring(modelStart, modelEnd);

        // Verificar se tem tenantId
        expect(modelContent).toContain('tenantId');
        expect(modelContent).toContain('Tenant');
      });
    });

    // ⚠️ Este teste deverá ser ajustado quando entidades de domínio forem criadas (Etapa 2+)
    it('deve ter apenas Tenant como model não comentado (por enquanto)', () => {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

      // Encontrar models não comentados
      const modelRegex = /^model\s+(\w+)/gm;
      const models: string[] = [];
      let match;

      while ((match = modelRegex.exec(schemaContent)) !== null) {
        const modelName = match[1];
        const beforeMatch = schemaContent.substring(0, match.index || 0);
        const blockCommentOpen = (beforeMatch.match(/\/\*/g) || []).length;
        const blockCommentClose = (beforeMatch.match(/\*\//g) || []).length;

        if (blockCommentOpen === blockCommentClose) {
          models.push(modelName);
        }
      }

      // Por enquanto, apenas Tenant deve existir
      // Este teste será ajustado quando entidades de domínio forem criadas
      const nonTenantModels = models.filter((m) => m !== 'Tenant');
      expect(nonTenantModels.length).toBe(0);
    });
  });

  describe('Avisos de "tenantId obrigatório" estão presentes no schema', () => {
    it('deve conter exemplo ilustrativo', () => {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

      expect(schemaContent).toContain('EXEMPLO ILUSTRATIVO');
      expect(schemaContent).toContain('ExampleEntity');
    });

    it('exemplo deve mostrar tenantId obrigatório', () => {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

      // Verificar que exemplo mostra tenantId
      const exampleSection = schemaContent.match(/\/\/ model ExampleEntity[\s\S]*?\/\/ \}/);
      if (exampleSection) {
        expect(exampleSection[0]).toContain('tenantId');
      }
    });

    it('exemplo deve mostrar relacionamento com Tenant', () => {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

      const exampleSection = schemaContent.match(/\/\/ model ExampleEntity[\s\S]*?\/\/ \}/);
      if (exampleSection) {
        expect(exampleSection[0]).toContain('Tenant');
        expect(exampleSection[0]).toContain('@relation');
      }
    });
  });
});

