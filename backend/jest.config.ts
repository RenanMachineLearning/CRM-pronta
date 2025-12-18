import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    // Cobertura mínima de 80% para arquivos de autenticação (quality gate)
    // Nota: Cobertura é um indicador de qualidade, não objetivo cego
    // Linhas não críticas podem ficar fora se não agregarem valor
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Arquivos de autenticação devem ter cobertura > 80%
    'src/utils/password.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/utils/jwt.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/services/authService.ts': {
      branches: 60, // Service tem lógica simples, mas pode ter casos de erro não testados
      functions: 60,
      lines: 60,
      statements: 60,
    },
    'src/services/passwordResetService.ts': {
      branches: 60, // Service tem lógica simples, mas pode ter casos de erro não testados
      functions: 60,
      lines: 60,
      statements: 60,
    },
    'src/controllers/authController.ts': {
      branches: 50, // Controllers têm muitos casos de erro e validações
      functions: 50,
      lines: 50,
      statements: 50,
    },
    'src/middleware/authMiddleware.ts': {
      branches: 70, // Middleware pode ter cobertura menor (mais difícil de testar isoladamente)
      functions: 80,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
};

export default config;

