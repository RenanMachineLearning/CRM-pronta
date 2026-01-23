/**
 * Singleton do PrismaClient
 * Garante que apenas uma instância seja criada e reutilizada
 * Importante para evitar múltiplas conexões ao banco de dados
 */

import { PrismaClient } from '@prisma/client';

// Singleton pattern para PrismaClient
// Em desenvolvimento, reutiliza a instância entre hot reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Nota: Prisma não suporta timeout direto via configuração
    // O timeout será aplicado via wrapper withQueryTimeout
  });

// Em desenvolvimento, preservar instância entre hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
