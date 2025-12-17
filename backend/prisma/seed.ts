/**
 * Script de seed para popular o banco de dados com dados iniciais
 * 
 * Cria um tenant de demonstração que será usado para testes e desenvolvimento.
 * Este script é idempotente - pode ser executado múltiplas vezes sem criar duplicados.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Verificar se o tenant já existe antes de criar
  const existingTenant = await prisma.tenant.findUnique({
    where: {
      slug: 'demo',
    },
  });

  // Criar tenant de demonstração usando upsert (idempotente)
  // Se não existir, cria; se já existir, não altera
  const demoTenant = await prisma.tenant.upsert({
    where: {
      slug: 'demo',
    },
    update: {
      // Não atualiza se já existir - mantém dados existentes
    },
    create: {
      name: 'Demo Company',
      slug: 'demo',
      status: 'ACTIVE',
      subdomain: null, // Não utilizado nesta fase - feature desligada
    },
  });

  // Exibir mensagem apropriada baseada se já existia ou foi criado
  if (existingTenant) {
    console.log('ℹ️  Tenant de demonstração já existe no banco de dados.');
    console.log(`   ID: ${demoTenant.id}`);
    console.log(`   Nome: ${demoTenant.name}`);
    console.log(`   Slug: ${demoTenant.slug}`);
    console.log(`   Status: ${demoTenant.status}`);
  } else {
    console.log('✅ Tenant de demonstração criado com sucesso!');
    console.log(`   ID: ${demoTenant.id}`);
    console.log(`   Nome: ${demoTenant.name}`);
    console.log(`   Slug: ${demoTenant.slug}`);
    console.log(`   Status: ${demoTenant.status}`);
  }

  console.log('✨ Seed concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

