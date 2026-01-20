/**
 * Testes unitários para helpers de busca por entidade
 *
 * Testa funções de construção de condições, validação e sanitização isoladamente.
 */

import {
  buildSearchConditions,
  validateSearchQuery,
  isSearchableEntity,
  getSearchableFields,
  getSearchableRelations,
} from '../../src/utils/entitySearchHelpers';
import { SearchError } from '../../src/types/search.types';

describe('entitySearchHelpers', () => {
  describe('buildSearchConditions', () => {
    it('deve construir condições para contato', () => {
      const conditions = buildSearchConditions('contact', 'joão');

      expect(conditions).toHaveLength(6); // firstName, lastName, title, notes, email, phone
      expect(conditions[0]).toEqual({
        firstName: { contains: 'joão', mode: 'insensitive' },
      });
      expect(conditions[1]).toEqual({
        lastName: { contains: 'joão', mode: 'insensitive' },
      });
      expect(conditions[4]).toEqual({
        emails: {
          some: {
            email: { contains: 'joão', mode: 'insensitive' },
          },
        },
      });
      expect(conditions[5]).toEqual({
        phones: {
          some: {
            phone: { contains: 'joão', mode: 'insensitive' },
          },
        },
      });
    });

    it('deve construir condições para empresa', () => {
      const conditions = buildSearchConditions('company', 'tech');

      expect(conditions).toHaveLength(3); // name, website, industry
      expect(conditions[0]).toEqual({
        name: { contains: 'tech', mode: 'insensitive' },
      });
      expect(conditions[1]).toEqual({
        website: { contains: 'tech', mode: 'insensitive' },
      });
      expect(conditions[2]).toEqual({
        industry: { contains: 'tech', mode: 'insensitive' },
      });
    });

    it('deve construir condições para lead', () => {
      const conditions = buildSearchConditions('lead', 'maria');

      expect(conditions).toHaveLength(6); // firstName, lastName, email, phone, company, source
      expect(conditions[0]).toEqual({
        firstName: { contains: 'maria', mode: 'insensitive' },
      });
      expect(conditions[1]).toEqual({
        lastName: { contains: 'maria', mode: 'insensitive' },
      });
    });

    it('deve construir condições para oportunidade', () => {
      const conditions = buildSearchConditions('opportunity', 'venda');

      expect(conditions).toHaveLength(1); // name
      expect(conditions[0]).toEqual({
        name: { contains: 'venda', mode: 'insensitive' },
      });
    });

    it('deve lançar erro para entidade desconhecida', () => {
      expect(() => buildSearchConditions('unknown', 'test'))
        .toThrow(SearchError);
      expect(() => buildSearchConditions('unknown', 'test'))
        .toThrow('Entidade "unknown" não suporta busca');
    });

    it('deve retornar array vazio para query vazia', () => {
      const conditions = buildSearchConditions('contact', '   ');

      expect(conditions).toHaveLength(0);
    });

    it('deve trim espaços da query', () => {
      const conditions = buildSearchConditions('contact', '  joão  ');

      expect(conditions[0]).toEqual({
        firstName: { contains: 'joão', mode: 'insensitive' },
      });
    });
  });

  describe('validateSearchQuery', () => {
    it('deve retornar undefined para query não fornecida', () => {
      expect(validateSearchQuery(undefined)).toBeUndefined();
      expect(validateSearchQuery(null)).toBeUndefined();
      expect(validateSearchQuery('')).toBeUndefined();
    });

    it('deve retornar query sanitizada para string válida', () => {
      expect(validateSearchQuery('joão')).toBe('joão');
      expect(validateSearchQuery('  joão  ')).toBe('joão');
    });

    it('deve sanitizar caracteres HTML perigosos', () => {
      expect(validateSearchQuery('joão<script>')).toBe('joãoscript');
      expect(validateSearchQuery('joão>teste')).toBe('joãoteste');
    });

    it('deve lançar erro para query não string', () => {
      expect(() => validateSearchQuery(123 as any))
        .toThrow(SearchError);
      expect(() => validateSearchQuery(123 as any))
        .toThrow('Query deve ser uma string');

      expect(() => validateSearchQuery({} as any))
        .toThrow(SearchError);
    });

    it('deve lançar erro para query muito longa', () => {
      const longQuery = 'a'.repeat(501);
      expect(() => validateSearchQuery(longQuery))
        .toThrow(SearchError);
      expect(() => validateSearchQuery(longQuery))
        .toThrow('Query não pode exceder 500 caracteres');
    });

    it('deve limitar query a 500 caracteres', () => {
      const longQuery = 'a'.repeat(600);
      const sanitized = validateSearchQuery(longQuery.substring(0, 500));
      expect(sanitized).toBe('a'.repeat(500));
    });
  });

  describe('isSearchableEntity', () => {
    it('deve retornar true para entidades pesquisáveis', () => {
      expect(isSearchableEntity('contact')).toBe(true);
      expect(isSearchableEntity('company')).toBe(true);
      expect(isSearchableEntity('lead')).toBe(true);
      expect(isSearchableEntity('opportunity')).toBe(true);
    });

    it('deve retornar false para entidades não pesquisáveis', () => {
      expect(isSearchableEntity('user')).toBe(false);
      expect(isSearchableEntity('role')).toBe(false);
      expect(isSearchableEntity('unknown')).toBe(false);
    });
  });

  describe('getSearchableFields', () => {
    it('deve retornar campos de contato', () => {
      const fields = getSearchableFields('contact');

      expect(fields).toContain('firstName');
      expect(fields).toContain('lastName');
      expect(fields).toContain('title');
      expect(fields).toContain('notes');
      expect(fields).not.toContain('email'); // email está em relacionamento
      expect(fields).not.toContain('phone'); // phone está em relacionamento
    });

    it('deve retornar campos de empresa', () => {
      const fields = getSearchableFields('company');

      expect(fields).toContain('name');
      expect(fields).toContain('website');
      expect(fields).toContain('industry');
    });

    it('deve retornar array vazio para entidade desconhecida', () => {
      const fields = getSearchableFields('unknown');

      expect(fields).toHaveLength(0);
    });
  });

  describe('getSearchableRelations', () => {
    it('deve retornar relacionamentos de contato', () => {
      const relations = getSearchableRelations('contact');

      expect(relations).toHaveLength(2);
      expect(relations).toContainEqual({ model: 'emails', field: 'email' });
      expect(relations).toContainEqual({ model: 'phones', field: 'phone' });
    });

    it('deve retornar array vazio para entidades sem relacionamentos pesquisáveis', () => {
      const companyRelations = getSearchableRelations('company');
      const leadRelations = getSearchableRelations('lead');
      const opportunityRelations = getSearchableRelations('opportunity');

      expect(companyRelations).toHaveLength(0);
      expect(leadRelations).toHaveLength(0);
      expect(opportunityRelations).toHaveLength(0);
    });
  });
});
