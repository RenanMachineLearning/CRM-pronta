/**
 * Script de validação para EntityData
 * 
 * Valida que o modelo EntityData foi criado corretamente no schema Prisma.
 * Este script pode ser executado após a migração para validar a estrutura.
 * 
 * Uso: npx ts-node scripts/validate-entitydata.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateEntityData() {
  console.log('🔍 Validando estrutura de EntityData...\n');

  try {
    // Testar criação de registro EntityData
    console.log('1. Testando criação de registro EntityData...');

    // Buscar um tenant e uma entidade customizada para teste
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('   ⚠️  Nenhum tenant encontrado. Execute o seed primeiro.');
      return;
    }

    const customEntity = await prisma.entity.findFirst({
      where: {
        tenantId: tenant.id,
        isSystem: false,
      },
    });

    if (!customEntity) {
      console.log('   ⚠️  Nenhuma entidade customizada encontrada. Criando entidade de teste...');
      
      // Criar entidade customizada de teste
      const testEntity = await prisma.entity.create({
        data: {
          name: 'TestEntity',
          label: 'Entidade de Teste',
          tenantId: tenant.id,
          isSystem: false,
        },
      });

      // Criar registro EntityData
      const entityData = await prisma.entityData.create({
        data: {
          entityId: testEntity.id,
          tenantId: tenant.id,
          data: {
            field1: 'value1',
            field2: 123,
            field3: true,
          },
        },
      });

      console.log('   ✅ Registro EntityData criado com sucesso!');
      console.log(`   ID: ${entityData.id}`);
      console.log(`   Entity ID: ${entityData.entityId}`);
      console.log(`   Tenant ID: ${entityData.tenantId}`);
      console.log(`   Data: ${JSON.stringify(entityData.data)}`);

      // Testar isolamento por tenant
      console.log('\n2. Testando isolamento por tenant...');
      const allData = await prisma.entityData.findMany({
        where: {
          tenantId: tenant.id,
        },
      });
      console.log(`   ✅ Encontrados ${allData.length} registros para o tenant`);

      // Testar relacionamento com Entity
      console.log('\n3. Testando relacionamento com Entity...');
      const dataWithEntity = await prisma.entityData.findFirst({
        where: {
          id: entityData.id,
        },
        include: {
          entity: true,
        },
      });
      if (dataWithEntity?.entity) {
        console.log(`   ✅ Relacionamento com Entity funcionando`);
        console.log(`   Entity: ${dataWithEntity.entity.name} (${dataWithEntity.entity.label})`);
      }

      // Testar relacionamento com Tenant
      console.log('\n4. Testando relacionamento com Tenant...');
      const dataWithTenant = await prisma.entityData.findFirst({
        where: {
          id: entityData.id,
        },
        include: {
          tenant: true,
        },
      });
      if (dataWithTenant?.tenant) {
        console.log(`   ✅ Relacionamento com Tenant funcionando`);
        console.log(`   Tenant: ${dataWithTenant.tenant.name} (${dataWithTenant.tenant.slug})`);
      }

      // Limpar dados de teste
      console.log('\n5. Limpando dados de teste...');
      await prisma.entityData.delete({
        where: {
          id: entityData.id,
        },
      });
      await prisma.entity.delete({
        where: {
          id: testEntity.id,
        },
      });
      console.log('   ✅ Dados de teste removidos');

      console.log('\n✅ Validação concluída com sucesso!');
    } else {
      // Se já existe entidade customizada, apenas testar criação de EntityData
      const entityData = await prisma.entityData.create({
        data: {
          entityId: customEntity.id,
          tenantId: tenant.id,
          data: {
            testField: 'testValue',
          },
        },
      });

      console.log('   ✅ Registro EntityData criado com sucesso!');
      console.log(`   ID: ${entityData.id}`);

      // Limpar
      await prisma.entityData.delete({
        where: {
          id: entityData.id,
        },
      });
      console.log('   ✅ Dados de teste removidos');
    }
  } catch (error: any) {
    console.error('❌ Erro na validação:', error.message);
    if (error.code === 'P1001') {
      console.error('   ⚠️  Banco de dados não está acessível. Certifique-se de que está rodando.');
    } else if (error.code === 'P2025') {
      console.error('   ⚠️  Registro não encontrado.');
    } else {
      console.error('   Detalhes:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar validação
validateEntityData()
  .then(() => {
    console.log('\n✅ Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });

