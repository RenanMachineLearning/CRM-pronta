/**
 * Mocks reutilizáveis para testes
 * 
 * Fornece mocks pré-configurados para serviços e utilitários
 * usados em múltiplos arquivos de teste.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Cria mock do PrismaClient
 * 
 * @returns Mock do PrismaClient com métodos básicos
 */
export function createPrismaMock() {
  return {
    contact: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    company: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    lead: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    opportunity: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    note: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  } as unknown as jest.Mocked<PrismaClient>;
}

/**
 * Cria mock de dados de contato
 */
export function createMockContact(overrides: Partial<any> = {}) {
  return {
    id: 'contact-id-1',
    tenantId: 'tenant-id-1',
    firstName: 'João',
    lastName: 'Silva',
    status: 'ACTIVE',
    companyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Cria mock de dados de empresa
 */
export function createMockCompany(overrides: Partial<any> = {}) {
  return {
    id: 'company-id-1',
    tenantId: 'tenant-id-1',
    name: 'Empresa Teste',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Cria mock de dados de lead
 */
export function createMockLead(overrides: Partial<any> = {}) {
  return {
    id: 'lead-id-1',
    tenantId: 'tenant-id-1',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria@test.com',
    status: 'NEW',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Cria mock de resultado de busca global
 */
export function createMockSearchResult(overrides: Partial<any> = {}) {
  return {
    query: 'test',
    timestamp: new Date().toISOString(),
    results: {
      contacts: [],
      companies: [],
      leads: [],
      opportunities: [],
    },
    totals: {
      contacts: 0,
      companies: 0,
      leads: 0,
      opportunities: 0,
    },
    ...overrides,
  };
}
