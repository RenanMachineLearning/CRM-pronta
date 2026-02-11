/**
 * Script para criar usuário administrador
 * 
 * Cria um usuário admin para o tenant demo com:
 * - Email: admin@demo.com
 * - Senha: Admin123!
 * - Role: Admin (acesso total)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Configurações do usuário admin
const ADMIN_EMAIL = 'admin@demo.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Administrador';

async function createAdminUser() {
  console.log('🔧 Iniciando criação do usuário administrador...\n');

  try {
    // 1. Buscar tenant demo
    console.log('1️⃣ Buscando tenant "demo"...');
    const tenant = await prisma.tenant.findUnique({
      where: { slug: 'demo' }
    });

    if (!tenant) {
      console.error('❌ Tenant "demo" não encontrado! Execute o seed primeiro.');
      process.exit(1);
    }
    console.log(`   ✅ Tenant encontrado: ${tenant.name} (ID: ${tenant.id})\n`);

    // 2. Buscar role Admin
    console.log('2️⃣ Buscando role "Admin"...');
    const adminRole = await prisma.role.findFirst({
      where: {
        name: 'Admin',
        tenantId: tenant.id
      }
    });

    if (!adminRole) {
      console.error('❌ Role "Admin" não encontrada para o tenant demo!');
      process.exit(1);
    }
    console.log(`   ✅ Role Admin encontrada (ID: ${adminRole.id})\n`);

    // 3. Verificar se usuário já existe
    console.log('3️⃣ Verificando se usuário já existe...');
    const existingUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: ADMIN_EMAIL
        }
      }
    });

    if (existingUser) {
      console.log(`   ℹ️ Usuário ${ADMIN_EMAIL} já existe!`);
      console.log(`   📝 ID: ${existingUser.id}`);
      console.log(`   📝 Nome: ${existingUser.name}`);
      console.log(`   📝 Status: ${existingUser.status}\n`);
      
      // Verificar se já tem role Admin
      const existingUserRole = await prisma.userRole.findFirst({
        where: {
          userId: existingUser.id,
          roleId: adminRole.id
        }
      });

      if (!existingUserRole) {
        console.log('   🔄 Associando role Admin ao usuário existente...');
        await prisma.userRole.create({
          data: {
            userId: existingUser.id,
            roleId: adminRole.id
          }
        });
        console.log('   ✅ Role Admin associada com sucesso!\n');
      } else {
        console.log('   ℹ️ Usuário já possui role Admin\n');
      }

      console.log('✨ Usuário administrador já está configurado!');
      return;
    }
    console.log('   ✅ Usuário não existe, prosseguindo com criação...\n');

    // 4. Gerar hash da senha
    console.log('4️⃣ Gerando hash da senha...');
    const SALT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    console.log(`   ✅ Hash gerado (${passwordHash.substring(0, 20)}...)\n`);

    // 5. Criar usuário admin
    console.log('5️⃣ Criando usuário administrador...');
    const adminUser = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash: passwordHash,
        name: ADMIN_NAME,
        tenantId: tenant.id,
        status: 'ACTIVE'
      }
    });
    console.log(`   ✅ Usuário criado com sucesso!`);
    console.log(`   📝 ID: ${adminUser.id}`);
    console.log(`   📝 Email: ${adminUser.email}`);
    console.log(`   📝 Nome: ${adminUser.name}\n`);

    // 6. Associar usuário à role Admin
    console.log('6️⃣ Associando usuário à role Admin...');
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    });
    console.log('   ✅ Usuário associado à role Admin\n');

    // 7. Resumo final
    console.log('='.repeat(60));
    console.log('✅ USUÁRIO ADMINISTRADOR CRIADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📋 Dados de acesso:');
    console.log(`   📧 Email: ${ADMIN_EMAIL}`);
    console.log(`   🔑 Senha: ${ADMIN_PASSWORD}`);
    console.log(`   🏢 Tenant: demo`);
    console.log(`   👤 Nome: ${ADMIN_NAME}`);
    console.log(`   🛡️ Role: Admin`);
    console.log('');
    console.log('🌐 URL de acesso:');
    console.log('   Frontend: http://localhost:5173');
    console.log('   API: http://localhost:5000');
    console.log('');
    console.log('📖 Instruções:');
    console.log('   1. Acesse http://localhost:5173');
    console.log('   2. Selecione o tenant "demo"');
    console.log(`   3. Faça login com email: ${ADMIN_EMAIL}`);
    console.log(`   4. Senha: ${ADMIN_PASSWORD}`);
    console.log('');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro ao criar usuário administrador:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar script
createAdminUser();
