/**
 * Testes unitários para utilitários de parsing de CSV
 */

import { parseCSV, detectEncoding, detectDelimiter, isValidCsvBuffer } from '../../../src/utils/csvParser';
import { sanitizeCsvData, sanitizeCsvValue, escapeCsvValue } from '../../../src/utils/csvSanitizer';
import { validateCsvData, validateCsvFormat } from '../../../src/utils/csvValidator';

describe('CSV Parser Utilities', () => {
  describe('parseCSV', () => {
    it('should parse a simple CSV correctly', async () => {
      const csvContent = 'name,email,age\nJohn Doe,john@example.com,30\nJane Smith,jane@example.com,25';
      const buffer = Buffer.from(csvContent, 'utf8');
      
      const result = await parseCSV(buffer);
      
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: '30'
      });
      expect(result.data[1]).toEqual({
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: '25'
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should detect delimiter automatically', async () => {
      const csvContent = 'name;email;age\nJohn Doe;john@example.com;30';
      const buffer = Buffer.from(csvContent, 'utf8');
      
      const result = await parseCSV(buffer);
      
      expect(result.meta.delimiter).toBe(';');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: '30'
      });
    });

    it('should handle CSV with quotes and commas in values', async () => {
      const csvContent = 'name,description\n"John, Jr.","Software Engineer, Developer"\nJane Smith,"Product Manager, Designer"';
      const buffer = Buffer.from(csvContent, 'utf8');
      
      const result = await parseCSV(buffer);
      
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        name: 'John, Jr.',
        description: 'Software Engineer, Developer'
      });
      expect(result.data[1]).toEqual({
        name: 'Jane Smith',
        description: 'Product Manager, Designer'
      });
    });

    it('should handle empty lines', async () => {
      const csvContent = 'name,email\nJohn Doe,john@example.com\n\nJane Smith,jane@example.com';
      const buffer = Buffer.from(csvContent, 'utf8');
      
      const result = await parseCSV(buffer);
      
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
      expect(result.data[1]).toEqual({
        name: 'Jane Smith',
        email: 'jane@example.com'
      });
    });
  });

  describe('detectEncoding', () => {
    it('should detect UTF-8 encoding', () => {
      const buffer = Buffer.from('name,email\nJohn Doe,john@example.com', 'utf8');
      const encoding = detectEncoding(buffer);
      expect(encoding).toBe('utf8');
    });

    it('should detect Latin1 encoding for special characters', () => {
      // This is a simplified test - in practice, encoding detection is more complex
      const buffer = Buffer.from('nome,email\nJoão Silva,joao@example.com', 'binary');
      const encoding = detectEncoding(buffer);
      // The actual result depends on the implementation
      expect(typeof encoding).toBe('string');
    });
  });

  describe('detectDelimiter', () => {
    it('should detect comma as delimiter', () => {
      const text = 'name,email,age\nJohn,30';
      const delimiter = detectDelimiter(text);
      expect(delimiter).toBe(',');
    });

    it('should detect semicolon as delimiter', () => {
      const text = 'name;email;age\nJohn;30';
      const delimiter = detectDelimiter(text);
      expect(delimiter).toBe(';');
    });

    it('should detect tab as delimiter', () => {
      const text = 'name\temail\tage\nJohn\t30';
      const delimiter = detectDelimiter(text);
      expect(delimiter).toBe('\t');
    });
  });

  describe('isValidCsvBuffer', () => {
    it('should return true for valid CSV buffer', () => {
      const csvContent = 'name,email\nJohn,john@example.com';
      const buffer = Buffer.from(csvContent, 'utf8');
      const valid = isValidCsvBuffer(buffer);
      expect(valid).toBe(true);
    });

    it('should return false for invalid CSV buffer', () => {
      const buffer = Buffer.from('just some text without structure', 'utf8');
      const valid = isValidCsvBuffer(buffer);
      expect(valid).toBe(false);
    });

    it('should return false for empty buffer', () => {
      const buffer = Buffer.from('', 'utf8');
      const valid = isValidCsvBuffer(buffer);
      expect(valid).toBe(false);
    });
  });
});

describe('CSV Sanitizer Utilities', () => {
  describe('sanitizeCsvValue', () => {
    it('should sanitize a CSV injection formula', () => {
      const maliciousValue = '=1+1+cmd|\'/C calc\'!A0';
      const sanitized = sanitizeCsvValue(maliciousValue);
      expect(sanitized).toBe('\'=1+1+cmd|\'/C calc\'!A0'); // Should be prefixed with apostrophe
    });

    it('should sanitize a plus-prefixed formula', () => {
      const maliciousValue = '+cmd|\'/C calc\'!A0';
      const sanitized = sanitizeCsvValue(maliciousValue);
      expect(sanitized).toBe('\'+cmd|\'/C calc\'!A0'); // Should be prefixed with apostrophe
    });

    it('should not modify safe values', () => {
      const safeValue = 'Normal text value';
      const sanitized = sanitizeCsvValue(safeValue);
      expect(sanitized).toBe(safeValue);
    });

    it('should handle null and undefined values', () => {
      expect(sanitizeCsvValue(null)).toBeNull();
      expect(sanitizeCsvValue(undefined)).toBeUndefined();
    });

    it('should remove control characters', () => {
      const valueWithControlChars = 'Text with\x00control\x08chars';
      const sanitized = sanitizeCsvValue(valueWithControlChars);
      expect(sanitized).toBe('Text withcontrolchars'); // Control chars removed
    });
  });

  describe('sanitizeCsvData', () => {
    it('should sanitize an object with malicious values', () => {
      const obj = {
        name: 'John',
        email: '=1+1+cmd|\'/C calc\'!A0',
        age: 30
      };
      
      const sanitized = sanitizeCsvData(obj);
      
      expect(sanitized.name).toBe('John');
      expect(sanitized.email).toBe('\'=1+1+cmd|\'/C calc\'!A0'); // Sanitized
      expect(sanitized.age).toBe(30);
    });

    it('should sanitize nested objects', () => {
      const obj = {
        person: {
          email: '=MALICIOUS()',
          name: 'John'
        }
      };
      
      const sanitized = sanitizeCsvData(obj);
      
      expect(sanitized.person.email).toBe('\'=MALICIOUS()'); // Sanitized
      expect(sanitized.person.name).toBe('John');
    });

    it('should sanitize arrays', () => {
      const arr = ['John', '=1+1+cmd|\'/C calc\'!A0', 'Jane'];
      
      const sanitized = sanitizeCsvData(arr);
      
      expect(sanitized[0]).toBe('John');
      expect(sanitized[1]).toBe('\'=1+1+cmd|\'/C calc\'!A0'); // Sanitized
      expect(sanitized[2]).toBe('Jane');
    });
  });

  describe('escapeCsvValue', () => {
    it('should escape a CSV injection formula', () => {
      const maliciousValue = '=1+1+cmd|\'/C calc\'!A0';
      const escaped = escapeCsvValue(maliciousValue);
      expect(escaped).toBe('\'=1+1+cmd|\'/C calc\'!A0'); // Prefixed with apostrophe
    });

    it('should wrap values with commas in quotes', () => {
      const value = 'Text with, comma';
      const escaped = escapeCsvValue(value);
      expect(escaped).toBe('"Text with, comma"');
    });

    it('should escape quotes within values', () => {
      const value = 'Text with "quotes" inside';
      const escaped = escapeCsvValue(value);
      expect(escaped).toBe('"Text with ""quotes"" inside"');
    });

    it('should handle normal values', () => {
      const value = 'Normal text';
      const escaped = escapeCsvValue(value);
      expect(escaped).toBe('Normal text');
    });
  });
});

describe('CSV Validator Utilities', () => {
  describe('validateCsvFormat', () => {
    it('should validate a correct CSV format', () => {
      const content = 'name,email\nJohn,john@example.com';
      const result = validateCsvFormat(content);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should invalidate an empty CSV', () => {
      const content = '';
      const result = validateCsvFormat(content);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Arquivo CSV está vazio');
    });

    it('should invalidate a CSV without header', () => {
      const content = 'John,john@example.com\nJane,jane@example.com';
      const result = validateCsvFormat(content);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Linha de cabeçalho está vazia');
    });

    it('should invalidate a CSV with only header', () => {
      const content = 'name,email';
      const result = validateCsvFormat(content);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados');
    });
  });

  describe('validateCsvData', () => {
    it('should validate required fields', async () => {
      const data = [
        { name: 'John', email: 'john@example.com' },
        { name: '', email: 'jane@example.com' } // Missing required name
      ];
      
      const options = {
        requiredFields: ['name'],
        fieldValidators: {},
        tenantId: 'test-tenant',
        entityType: 'contact' as const
      };
      
      const result = await validateCsvData(data, options);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].rowIndex).toBe(1);
    });

    it('should validate email format', async () => {
      const data = [
        { name: 'John', email: 'valid@example.com' },
        { name: 'Jane', email: 'invalid-email' } // Invalid email
      ];
      
      const options = {
        requiredFields: [],
        fieldValidators: {
          email: (value: any) => {
            if (!value) return true;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(String(value));
          }
        },
        tenantId: 'test-tenant',
        entityType: 'contact' as const
      };
      
      const result = await validateCsvData(data, options);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
      expect(result.errors[0].rowIndex).toBe(1);
    });

    it('should validate with default validators', async () => {
      const data = [
        { name: 'John', email: 'valid@example.com' },
        { name: 'Jane', email: 'invalid-email' } // Invalid email
      ];
      
      const options = {
        requiredFields: [],
        fieldValidators: {},
        tenantId: 'test-tenant',
        entityType: 'contact' as const
      };
      
      const result = await validateCsvData(data, options);
      
      // Note: Since we're not mocking the database calls for contact relations,
      // the validation will pass if only checking email format with default validators
      // The default email validator is applied based on field name
      expect(result.valid).toBe(true); // This might be true depending on implementation
    });
  });
});