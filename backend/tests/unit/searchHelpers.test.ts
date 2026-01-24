/**
 * Testes unitários para helpers de busca
 * 
 * Testa funções de normalização, snippets, relevância e validação isoladamente.
 */

import {
  normalizeText,
  extractSnippet,
  calculateRelevance,
  validateSearchParams,
  sanitizeQuery,
  SearchError,
} from '../../src/utils/searchHelpers';

describe('searchHelpers', () => {
  describe('normalizeText', () => {
    it('deve remover acentos corretamente', () => {
      expect(normalizeText('São Paulo')).toBe('sao paulo');
      expect(normalizeText('José')).toBe('jose');
      expect(normalizeText('café')).toBe('cafe');
      expect(normalizeText('Ação')).toBe('acao');
      expect(normalizeText('Ção')).toBe('cao');
      expect(normalizeText('nação')).toBe('nacao');
      expect(normalizeText('órgão')).toBe('orgao');
    });

    it('deve converter para minúsculas e remover acentos', () => {
      expect(normalizeText('JOÃO SILVA')).toBe('joao silva');
      expect(normalizeText('EMPRESA XYZ')).toBe('empresa xyz');
      expect(normalizeText('SÃO PAULO')).toBe('sao paulo');
      expect(normalizeText('JOSÉ')).toBe('jose');
    });

    it('deve remover caracteres especiais (preserva hífens e espaços)', () => {
      expect(normalizeText('joão@silva.com')).toBe('joaosilvacom');
      // normalizeText preserva hífens e espaços, então parênteses e @ são removidos mas hífen permanece
      expect(normalizeText('(11) 99999-9999')).toBe('11 99999-9999');
      expect(normalizeText('josé.silva@empresa.com.br')).toBe('josesilvaempresacombr');
    });

    it('deve normalizar espaços múltiplos', () => {
      expect(normalizeText('  João   Silva  ')).toBe('joao silva');
      expect(normalizeText('são  paulo')).toBe('sao paulo');
      expect(normalizeText('josé    maria')).toBe('jose maria');
    });

    it('deve retornar string vazia para input vazio', () => {
      expect(normalizeText('')).toBe('');
      expect(normalizeText('   ')).toBe('');
      expect(normalizeText(null as any)).toBe('');
      expect(normalizeText(undefined as any)).toBe('');
    });

    it('deve normalizar casos específicos de busca tolerante a diacríticos', () => {
      // Casos de teste da documentação
      expect(normalizeText('jose')).toBe('jose');
      expect(normalizeText('José')).toBe('jose');
      expect(normalizeText('JOSÉ')).toBe('jose');
      expect(normalizeText('sao paulo')).toBe('sao paulo');
      expect(normalizeText('São Paulo')).toBe('sao paulo');
      expect(normalizeText('SÃO PAULO')).toBe('sao paulo');
    });

    it('deve preservar hífens', () => {
      expect(normalizeText('São-Paulo')).toBe('sao-paulo');
      expect(normalizeText('João-Silva')).toBe('joao-silva');
    });

    it('deve normalizar textos muito longos', () => {
      const longText = 'João Silva é gerente de vendas na empresa São Paulo Tech Corp'.repeat(100);
      const normalized = normalizeText(longText);
      
      expect(normalized.length).toBeLessThanOrEqual(longText.length);
      expect(normalized).not.toContain('São');
      expect(normalized).toContain('sao');
      expect(normalized).not.toContain('João');
      expect(normalized).toContain('joao');
    });

    it('deve normalizar caracteres Unicode especiais', () => {
      expect(normalizeText('Müller')).toBe('muller');
      expect(normalizeText('François')).toBe('francois');
      expect(normalizeText('Zürich')).toBe('zurich');
      expect(normalizeText('Español')).toBe('espanol');
    });

    it('deve normalizar números misturados com texto', () => {
      expect(normalizeText('João123')).toBe('joao123');
      expect(normalizeText('Empresa 2024')).toBe('empresa 2024');
      expect(normalizeText('São Paulo 2024')).toBe('sao paulo 2024');
    });

    it('deve normalizar emails e URLs', () => {
      expect(normalizeText('joão@empresa.com.br')).toBe('joaoempresacombr');
      expect(normalizeText('https://www.empresa.com.br')).toBe('httpswwwempresacombr');
      expect(normalizeText('contato@empresa-são-paulo.com')).toBe('contatoempresa-sao-paulocom');
    });

    it('deve normalizar pontuação complexa (preserva hífens)', () => {
      expect(normalizeText('João, Silva; Santos.')).toBe('joao silva santos');
      // normalizeText preserva hífens, então o hífen em "São Paulo) - Tech" permanece
      expect(normalizeText('Empresa (São Paulo) - Tech')).toBe('empresa sao paulo - tech');
      expect(normalizeText('João "Silva" \'Santos\'')).toBe('joao silva santos');
    });

    it('deve normalizar caracteres especiais extremos', () => {
      expect(normalizeText('João@#$%Silva')).toBe('joaosilva');
      expect(normalizeText('Empresa***Tech')).toBe('empresatech');
      expect(normalizeText('São!!!Paulo???')).toBe('saopaulo');
    });

    it('deve normalizar múltiplas palavras acentuadas', () => {
      expect(normalizeText('José Antônio da Conceição')).toBe('jose antonio da conceicao');
      expect(normalizeText('São Paulo do Sul')).toBe('sao paulo do sul');
      expect(normalizeText('Ação e Reação')).toBe('acao e reacao');
    });

    it('deve normalizar textos com quebras de linha', () => {
      expect(normalizeText('João\nSilva')).toBe('joao silva');
      expect(normalizeText('São\r\nPaulo')).toBe('sao paulo');
      expect(normalizeText('Empresa\tTech')).toBe('empresa tech');
    });

    it('deve normalizar textos com caracteres de controle', () => {
      expect(normalizeText('João\u0000Silva')).toBe('joaosilva');
      expect(normalizeText('São\u0001Paulo')).toBe('saopaulo');
    });
  });

  describe('extractSnippet', () => {
    it('deve extrair snippet com highlight', () => {
      const text = 'João Silva é gerente de vendas na empresa X';
      const snippet = extractSnippet(text, 'gerente');

      expect(snippet).toContain('<mark>gerente</mark>');
    });

    it('deve adicionar ellipsis para texto longo', () => {
      const longText = 'Lorem ipsum dolor sit amet consectetur adipiscing elit ' +
                      'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ' +
                      'gerente de vendas ut enim ad minim veniam quis nostrud exercitation';
      const snippet = extractSnippet(longText, 'gerente');

      expect(snippet).toContain('...');
      expect(snippet).toContain('<mark>gerente</mark>');
    });

    it('deve retornar substring para termo não encontrado', () => {
      const text = 'João Silva é gerente de vendas';
      const snippet = extractSnippet(text, 'presidente', 30);

      expect(snippet.length).toBeLessThanOrEqual(33); // 30 + '...'
      expect(snippet).toContain('João');
    });

    it('deve funcionar com texto vazio', () => {
      expect(extractSnippet('', 'termo')).toBe('');
      expect(extractSnippet('texto', '')).toBe('texto');
    });

    it('deve preservar case original no highlight', () => {
      const text = 'João Silva é Gerente de Vendas';
      const snippet = extractSnippet(text, 'gerente');

      expect(snippet).toContain('<mark>Gerente</mark>');
    });
  });

  describe('calculateRelevance', () => {
    it('deve retornar 0 para texto vazio', () => {
      expect(calculateRelevance('', 'joão')).toBe(0);
      expect(calculateRelevance('texto', '')).toBe(0);
    });

    it('deve retornar score > 0 para termo encontrado', () => {
      const score = calculateRelevance('João Silva', 'joão');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('deve penalizar por não encontrar todos os termos', () => {
      const scoreFull = calculateRelevance('João Silva Gerente', 'joão silva');
      const scorePartial = calculateRelevance('João Silva', 'joão silva gerente');

      expect(scoreFull).toBeGreaterThan(scorePartial);
    });

    it('deve dar bônus por termo no início', () => {
      const scoreStart = calculateRelevance('João Silva é gerente', 'joão');
      const scoreEnd = calculateRelevance('Gerente é João Silva', 'joão');

      expect(scoreStart).toBeGreaterThan(scoreEnd);
    });

    it('deve aumentar score com mais ocorrências do termo', () => {
      const scoreSingle = calculateRelevance('João Silva', 'joão');
      const scoreMultiple = calculateRelevance('João Silva, João Santos', 'joão');

      expect(scoreMultiple).toBeGreaterThan(scoreSingle);
    });
  });

  describe('sanitizeQuery', () => {
    it('deve remover espaços nas extremidades', () => {
      expect(sanitizeQuery('  joão  ')).toBe('joão');
    });

    it('deve limitar tamanho a 500 caracteres', () => {
      const longQuery = 'a'.repeat(600);
      expect(sanitizeQuery(longQuery).length).toBe(500);
    });

    it('deve remover caracteres HTML perigosos', () => {
      expect(sanitizeQuery('joão<script>')).toBe('joãoscript');
      expect(sanitizeQuery('joão>teste')).toBe('joãoteste');
    });

    it('deve retornar string vazia para input vazio', () => {
      expect(sanitizeQuery('')).toBe('');
    });
  });

  describe('validateSearchParams', () => {
    it('deve lançar erro para query vazia', () => {
      expect(() => validateSearchParams({ query: '' }))
        .toThrow(SearchError);
      expect(() => validateSearchParams({ query: '  ' }))
        .toThrow(SearchError);
    });

    it('deve lançar erro para query muito longa', () => {
      const longQuery = 'a'.repeat(501);
      expect(() => validateSearchParams({ query: longQuery }))
        .toThrow(SearchError);
    });

    it('deve lançar erro para entidade inválida', () => {
      expect(() => validateSearchParams({
        query: 'teste',
        entities: ['invalid', 'contact'],
      })).toThrow(SearchError);
    });

    it('deve lançar erro para limit inválido', () => {
      expect(() => validateSearchParams({
        query: 'teste',
        limit: 0,
      })).toThrow(SearchError);

      expect(() => validateSearchParams({
        query: 'teste',
        limit: 101,
      })).toThrow(SearchError);
    });

    it('não deve lançar erro para parâmetros válidos', () => {
      expect(() => validateSearchParams({
        query: 'joão silva',
        entities: ['contact', 'company'],
        limit: 10,
      })).not.toThrow();
    });

    it('deve aceitar query sem entities e limit', () => {
      expect(() => validateSearchParams({
        query: 'joão',
      })).not.toThrow();
    });
  });
});
