/**
 * Testes unitários para utilitário de hash e comparação de senhas
 * Testa as funções hashPassword, comparePassword e validatePasswordPolicy isoladamente
 */

import { hashPassword, comparePassword, validatePasswordPolicy, validatePasswordStrength } from '../../src/utils/password';

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('deve gerar hash diferente da senha original', async () => {
      const password = 'minhaSenha123';
      const hash = await hashPassword(password);

      // Hash deve ser diferente da senha original
      expect(hash).not.toBe(password);
      
      // Hash deve ser uma string
      expect(typeof hash).toBe('string');
      
      // Hash deve ter comprimento adequado (bcrypt gera hash de ~60 caracteres)
      expect(hash.length).toBeGreaterThan(50);
      
      // Hash deve começar com $2b$ (formato bcrypt)
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/);
    });

    it('deve gerar hashes diferentes para a mesma senha (salt único)', async () => {
      const password = 'minhaSenha123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Cada hash deve ser único devido ao salt aleatório
      expect(hash1).not.toBe(hash2);
      
      // Mas ambos devem validar a mesma senha corretamente
      expect(await comparePassword(password, hash1)).toBe(true);
      expect(await comparePassword(password, hash2)).toBe(true);
    });

    it('deve lançar erro com mensagem clara se senha for vazia', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must not be empty');
    });

    it('deve lançar erro com mensagem clara se senha for apenas espaços', async () => {
      await expect(hashPassword('   ')).rejects.toThrow('Password must not be empty');
      await expect(hashPassword('\t\n')).rejects.toThrow('Password must not be empty');
    });

    it('deve validar mensagem de erro: "Password must not be empty"', async () => {
      try {
        await hashPassword('');
        // Se não lançou erro, o teste falha
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Password must not be empty');
      }
    });
  });

  describe('comparePassword', () => {
    it('deve retornar true para senha correta', async () => {
      const password = 'minhaSenha123';
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('deve retornar false para senha incorreta', async () => {
      const password = 'minhaSenha123';
      const hash = await hashPassword(password);

      const isValid = await comparePassword('senhaErrada', hash);
      expect(isValid).toBe(false);
    });

    it('deve retornar false se senha for vazia', async () => {
      const hash = await hashPassword('minhaSenha123');
      
      const isValid = await comparePassword('', hash);
      expect(isValid).toBe(false);
    });

    it('deve retornar false se senha for apenas espaços', async () => {
      const hash = await hashPassword('minhaSenha123');
      
      const isValid = await comparePassword('   ', hash);
      expect(isValid).toBe(false);
    });

    it('deve retornar false se hash for vazio', async () => {
      const isValid = await comparePassword('minhaSenha123', '');
      expect(isValid).toBe(false);
    });

    it('deve retornar false se hash for apenas espaços', async () => {
      const isValid = await comparePassword('minhaSenha123', '   ');
      expect(isValid).toBe(false);
    });

    it('deve funcionar com diferentes hashes da mesma senha (valida que salt funciona)', async () => {
      const password = 'minhaSenha123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Ambos os hashes devem validar a mesma senha corretamente
      expect(await comparePassword(password, hash1)).toBe(true);
      expect(await comparePassword(password, hash2)).toBe(true);
      
      // Mas hashes diferentes não devem validar entre si
      expect(await comparePassword('outraSenha', hash1)).toBe(false);
    });

    it('deve retornar false para hash inválido (formato incorreto)', async () => {
      const isValid = await comparePassword('minhaSenha123', 'hash-invalido');
      expect(isValid).toBe(false);
    });

    it('nunca deve lançar erro, apenas retornar false', async () => {
      // Testa que comparePassword nunca lança erro, mesmo com entradas inválidas
      await expect(comparePassword('', '')).resolves.toBe(false);
      await expect(comparePassword('senha', 'hash-invalido')).resolves.toBe(false);
      await expect(comparePassword('', 'hash-valido')).resolves.toBe(false);
    });
  });

  describe('validatePasswordPolicy', () => {
    it('deve aceitar senha forte com todos os requisitos', () => {
      const result = validatePasswordPolicy('StrongPass123');
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.requirements.minLength).toBe(true);
      expect(result.requirements.hasUpperCase).toBe(true);
      expect(result.requirements.hasLowerCase).toBe(true);
      expect(result.requirements.hasNumber).toBe(true);
    });

    it('deve aceitar senha forte com caractere especial', () => {
      const result = validatePasswordPolicy('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('deve rejeitar senha sem maiúscula', () => {
      const result = validatePasswordPolicy('weakpass123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A senha deve conter pelo menos uma letra maiúscula');
      expect(result.requirements.hasUpperCase).toBe(false);
    });

    it('deve rejeitar senha sem minúscula', () => {
      const result = validatePasswordPolicy('WEAKPASS123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A senha deve conter pelo menos uma letra minúscula');
      expect(result.requirements.hasLowerCase).toBe(false);
    });

    it('deve rejeitar senha sem número', () => {
      const result = validatePasswordPolicy('WeakPass');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A senha deve conter pelo menos um número');
      expect(result.requirements.hasNumber).toBe(false);
    });

    it('deve rejeitar senha muito curta (< 8 caracteres)', () => {
      const result = validatePasswordPolicy('Weak1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A senha deve ter no mínimo 8 caracteres');
      expect(result.requirements.minLength).toBe(false);
    });

    it('deve rejeitar senha vazia', () => {
      const result = validatePasswordPolicy('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A senha é obrigatória');
    });

    it('deve rejeitar senha apenas com espaços', () => {
      const result = validatePasswordPolicy('   ');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A senha é obrigatória');
    });

    it('deve detectar múltiplos erros simultâneos', () => {
      const result = validatePasswordPolicy('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('A senha deve ter no mínimo 8 caracteres');
      expect(result.errors).toContain('A senha deve conter pelo menos uma letra maiúscula');
      expect(result.errors).toContain('A senha deve conter pelo menos um número');
    });

    it('não deve exigir caractere especial por padrão (V1)', () => {
      const result = validatePasswordPolicy('StrongPass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain('A senha deve conter pelo menos um caractere especial');
    });

    it('deve exigir caractere especial quando requireSpecialChar=true', () => {
      const result = validatePasswordPolicy('StrongPass123', true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A senha deve conter pelo menos um caractere especial');
    });

    it('deve aceitar senha com caractere especial quando requireSpecialChar=true', () => {
      const result = validatePasswordPolicy('StrongPass123!', true);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('deve retornar lista de erros específicos', () => {
      const result = validatePasswordPolicy('weak');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      result.errors.forEach(error => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
      });
    });

    it('deve retornar objeto requirements com todos os campos booleanos', () => {
      const result = validatePasswordPolicy('StrongPass123');
      expect(result.requirements).toHaveProperty('minLength');
      expect(result.requirements).toHaveProperty('hasUpperCase');
      expect(result.requirements).toHaveProperty('hasLowerCase');
      expect(result.requirements).toHaveProperty('hasNumber');
      expect(result.requirements).toHaveProperty('hasSpecialChar');
      expect(typeof result.requirements.minLength).toBe('boolean');
      expect(typeof result.requirements.hasUpperCase).toBe('boolean');
      expect(typeof result.requirements.hasLowerCase).toBe('boolean');
      expect(typeof result.requirements.hasNumber).toBe('boolean');
      expect(typeof result.requirements.hasSpecialChar).toBe('boolean');
    });
  });

  describe('validatePasswordStrength (compatibilidade)', () => {
    it('deve retornar true para senha válida', () => {
      expect(validatePasswordStrength('StrongPass123')).toBe(true);
    });

    it('deve retornar false para senha inválida', () => {
      expect(validatePasswordStrength('weak')).toBe(false);
      expect(validatePasswordStrength('weakpass')).toBe(false);
      expect(validatePasswordStrength('WEAKPASS')).toBe(false);
      expect(validatePasswordStrength('WeakPass')).toBe(false);
    });

    it('deve retornar false para senha vazia', () => {
      expect(validatePasswordStrength('')).toBe(false);
    });
  });
});

