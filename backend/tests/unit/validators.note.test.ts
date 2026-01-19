/**
 * Testes unitários para validadores específicos de Note
 * 
 * Testa validações de enums, campos e relacionamentos de notas.
 * Estes testes são puros (sem dependências externas) e validam lógica fundamental.
 */

import { NoteType } from '@prisma/client';

/**
 * Valida se um valor é um NoteType válido
 */
function isValidNoteType(value: any): boolean {
  return Object.values(NoteType).includes(value);
}

/**
 * Valida conteúdo de nota (não vazio, não nulo, não apenas espaços, máximo 10.000 caracteres)
 */
function validateNoteContent(content: any): void {
  if (content === null || content === undefined) {
    throw new Error('Conteúdo da nota é obrigatório');
  }
  if (typeof content !== 'string') {
    throw new Error('Conteúdo da nota deve ser uma string');
  }
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new Error('Conteúdo da nota não pode ser vazio');
  }
  if (trimmed.length > 10000) {
    throw new Error('Conteúdo da nota não pode exceder 10.000 caracteres');
  }
}

/**
 * Valida encoding UTF-8 de conteúdo
 */
function validateNoteContentEncoding(content: string): boolean {
  try {
    // Tentar decodificar como UTF-8
    const encoded = new TextEncoder().encode(content);
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(encoded);
    return decoded === content;
  } catch {
    return false;
  }
}

/**
 * Valida tipo de entidade relacionada para Note
 */
function isValidNoteRelatedEntityType(value: any): boolean {
  const validTypes = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task'];
  return validTypes.includes(value);
}

describe('Note Validators', () => {
  describe('validateNoteType', () => {
    it('deve validar tipo NOTE', () => {
      expect(isValidNoteType(NoteType.NOTE)).toBe(true);
    });

    it('deve validar tipo COMMENT', () => {
      expect(isValidNoteType(NoteType.COMMENT)).toBe(true);
    });

    it('deve validar tipo ANNOTATION', () => {
      expect(isValidNoteType(NoteType.ANNOTATION)).toBe(true);
    });

    it('deve retornar false para tipo inválido', () => {
      expect(isValidNoteType('INVALID')).toBe(false);
      expect(isValidNoteType('')).toBe(false);
      expect(isValidNoteType(null)).toBe(false);
      expect(isValidNoteType(undefined)).toBe(false);
      expect(isValidNoteType(123)).toBe(false);
    });
  });

  describe('validateNoteContent', () => {
    it('deve validar conteúdo não vazio', () => {
      expect(() => validateNoteContent('Conteúdo válido')).not.toThrow();
      expect(() => validateNoteContent('Outro conteúdo')).not.toThrow();
    });

    it('deve validar conteúdo não nulo', () => {
      expect(() => validateNoteContent('Conteúdo válido')).not.toThrow();
    });

    it('deve validar conteúdo não apenas espaços em branco', () => {
      expect(() => validateNoteContent('Conteúdo com espaços')).not.toThrow();
    });

    it('deve lançar erro para conteúdo vazio', () => {
      expect(() => validateNoteContent('')).toThrow('Conteúdo da nota não pode ser vazio');
    });

    it('deve lançar erro para conteúdo nulo', () => {
      expect(() => validateNoteContent(null)).toThrow('Conteúdo da nota é obrigatório');
    });

    it('deve lançar erro para conteúdo undefined', () => {
      expect(() => validateNoteContent(undefined)).toThrow('Conteúdo da nota é obrigatório');
    });

    it('deve lançar erro para conteúdo com apenas espaços', () => {
      expect(() => validateNoteContent('   ')).toThrow('Conteúdo da nota não pode ser vazio');
      expect(() => validateNoteContent('\t\n')).toThrow('Conteúdo da nota não pode ser vazio');
    });

    it('deve validar limite de 10.000 caracteres', () => {
      const validContent = 'A'.repeat(10000);
      expect(() => validateNoteContent(validContent)).not.toThrow();
    });

    it('deve lançar erro para conteúdo com > 10.000 caracteres', () => {
      const invalidContent = 'A'.repeat(10001);
      expect(() => validateNoteContent(invalidContent)).toThrow('Conteúdo da nota não pode exceder 10.000 caracteres');
    });

    it('deve aceitar conteúdo com exatamente 10.000 caracteres', () => {
      const exactContent = 'A'.repeat(10000);
      expect(() => validateNoteContent(exactContent)).not.toThrow();
    });

    it('deve trimar conteúdo antes de validar', () => {
      expect(() => validateNoteContent('  Conteúdo válido  ')).not.toThrow();
    });

    it('deve lançar erro para conteúdo que não é string', () => {
      expect(() => validateNoteContent(123)).toThrow('Conteúdo da nota deve ser uma string');
      expect(() => validateNoteContent({})).toThrow('Conteúdo da nota deve ser uma string');
      expect(() => validateNoteContent([])).toThrow('Conteúdo da nota deve ser uma string');
    });
  });

  describe('validateNoteContentEncoding', () => {
    it('deve validar encoding UTF-8', () => {
      const content = 'Conteúdo válido';
      expect(validateNoteContentEncoding(content)).toBe(true);
    });

    it('deve aceitar caracteres especiais (acentos, cedilha)', () => {
      const content = 'Ação, coração, maçã, ção';
      expect(validateNoteContentEncoding(content)).toBe(true);
    });

    it('deve aceitar emojis', () => {
      const content = 'Nota com emoji 😀 🎉 ✅';
      expect(validateNoteContentEncoding(content)).toBe(true);
    });

    it('deve aceitar markdown', () => {
      const content = '# Título\n\n**Negrito** e *itálico*\n\n- Item 1\n- Item 2';
      expect(validateNoteContentEncoding(content)).toBe(true);
    });

    it('deve aceitar conteúdo complexo com markdown e emojis', () => {
      const content = '# Nota Importante 😀\n\n**Ação:** Fazer algo\n\n- Item 1 ✅\n- Item 2 ⚠️';
      expect(validateNoteContentEncoding(content)).toBe(true);
    });

    it('deve aceitar caracteres especiais diversos', () => {
      const content = 'Áá Éé Íí Óó Úú Ãã Õõ Çç Àà Èè Ìì Òò Ùù';
      expect(validateNoteContentEncoding(content)).toBe(true);
    });
  });

  describe('validateNoteRelatedEntityType', () => {
    it('deve validar tipo Contact', () => {
      expect(isValidNoteRelatedEntityType('Contact')).toBe(true);
    });

    it('deve validar tipo Company', () => {
      expect(isValidNoteRelatedEntityType('Company')).toBe(true);
    });

    it('deve validar tipo Lead', () => {
      expect(isValidNoteRelatedEntityType('Lead')).toBe(true);
    });

    it('deve validar tipo Opportunity', () => {
      expect(isValidNoteRelatedEntityType('Opportunity')).toBe(true);
    });

    it('deve validar tipo Task', () => {
      expect(isValidNoteRelatedEntityType('Task')).toBe(true);
    });

    it('deve retornar false para tipo inválido', () => {
      expect(isValidNoteRelatedEntityType('Note')).toBe(false);
      expect(isValidNoteRelatedEntityType('INVALID')).toBe(false);
      expect(isValidNoteRelatedEntityType('')).toBe(false);
      expect(isValidNoteRelatedEntityType(null)).toBe(false);
      expect(isValidNoteRelatedEntityType(undefined)).toBe(false);
    });
  });
});
