/**
 * Testes unitários para importTemplateHelpers (Etapa 9 - Parte 9).
 * Valida: generateImportTemplate produz buffers com headers e linha de exemplo.
 */

import { generateImportTemplate, TEMPLATE_ENTITY_TYPES } from '../../../src/utils/importTemplateHelpers';

describe('importTemplateHelpers.generateImportTemplate', () => {
  describe('Teste: template de importação funciona', () => {
    it('retorna buffer CSV para Contact e formato csv', () => {
      const buf = generateImportTemplate('Contact', 'csv');
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
      const str = buf.toString('utf8');
      expect(str).toMatch(/firstName/);
      expect(str).toMatch(/lastName/);
      expect(str).toMatch(/email/);
      expect(str).toMatch(/Exemplo|email@example\.com/);
    });

    it('retorna buffer Excel para Contact e formato excel', () => {
      const buf = generateImportTemplate('Contact', 'excel');
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
    });

    it('retorna buffer CSV para Company com headers corretos', () => {
      const buf = generateImportTemplate('Company', 'csv');
      const str = buf.toString('utf8');
      expect(str).toMatch(/name/);
      expect(str).toMatch(/email/);
      expect(str).toMatch(/industry/);
    });

    it('retorna buffer CSV para Lead com headers corretos', () => {
      const buf = generateImportTemplate('Lead', 'csv');
      const str = buf.toString('utf8');
      expect(str).toMatch(/firstName/);
      expect(str).toMatch(/status/);
      expect(str).toMatch(/source/);
    });

    it('retorna buffer CSV para Opportunity com headers corretos', () => {
      const buf = generateImportTemplate('Opportunity', 'csv');
      const str = buf.toString('utf8');
      expect(str).toMatch(/name/);
      expect(str).toMatch(/value/);
      expect(str).toMatch(/stageId/);
    });
  });

  describe('Teste: template tem headers corretos', () => {
    it('CSV Contact contém todos os campos padrão na primeira linha', () => {
      const buf = generateImportTemplate('Contact', 'csv');
      const str = buf.toString('utf8');
      const lines = str.split('\n').filter(Boolean);
      expect(lines.length).toBeGreaterThanOrEqual(1);
      const headerLine = lines[0];
      expect(headerLine).toMatch(/firstName/);
      expect(headerLine).toMatch(/lastName/);
      expect(headerLine).toMatch(/email/);
      expect(headerLine).toMatch(/phone/);
      expect(headerLine).toMatch(/title/);
      expect(headerLine).toMatch(/company/);
      expect(headerLine).toMatch(/notes/);
    });

    it('inclui uma linha de exemplo além do header', () => {
      const buf = generateImportTemplate('Contact', 'csv');
      const str = buf.toString('utf8');
      const lines = str.split('\n').filter(Boolean);
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('entidades suportadas', () => {
    it('TEMPLATE_ENTITY_TYPES contém Contact, Company, Lead, Opportunity', () => {
      expect(TEMPLATE_ENTITY_TYPES).toContain('Contact');
      expect(TEMPLATE_ENTITY_TYPES).toContain('Company');
      expect(TEMPLATE_ENTITY_TYPES).toContain('Lead');
      expect(TEMPLATE_ENTITY_TYPES).toContain('Opportunity');
    });

    it('retorna buffer vazio para entityType não suportado', () => {
      const buf = generateImportTemplate('UnknownEntity', 'csv');
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBe(0);
    });
  });
});
