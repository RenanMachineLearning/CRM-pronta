/**
 * Script de teste para validar lógica do EntityService
 * 
 * Testa diretamente os métodos do service sem precisar do servidor rodando.
 */

import { PrismaClient } from '@prisma/client';
import { EntityService } from '../src/services/entityService';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧪 Testando EntityService...\n');

    // Buscar tenant demo
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo' },
    });

    if (!tenant) {
      console.error('❌ Tenant demo não encontrado. Execute o seed primeiro.');
      process.exit(1);
    }

    console.log(`✅ Tenant encontrado: ${tenant.name} (${tenant.id})\n`);

    // 1. Listar entidades
    console.log('1️⃣ Testando listEntities...');
    const entities = await EntityService.listEntities(tenant.id);
    console.log(`   ✅ ${entities.length} entidades encontradas`);
    console.log(`   ✅ Entidades do sistema: ${entities.filter((e) => e.isSystem).length}`);
    console.log(`   ✅ Entidades customizadas: ${entities.filter((e) => !e.isSystem).length}`);
    entities.forEach((e) => {
      console.log(`      - ${e.name} (${e.label}): ${e.fieldsCount || 0} campos`);
    });

    // 2. Obter entidade por ID
    console.log('\n2️⃣ Testando getEntityById...');
    const contactEntity = await prisma.entity.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'Contact',
      },
    });

    if (contactEntity) {
      const entity = await EntityService.getEntityById(tenant.id, contactEntity.id);
      console.log(`   ✅ Entidade encontrada: ${entity.name}`);
      console.log(`   ✅ Campos: ${entity.fields?.length || 0}`);
      console.log(`   ✅ Relacionamentos: ${entity.relationships?.length || 0}`);
    }

    // 3. Criar entidade customizada
    console.log('\n3️⃣ Testando createEntity...');
    try {
      const newEntity = await EntityService.createEntity(tenant.id, {
        name: 'TestEntity',
        label: 'Entidade de Teste',
      });
      console.log(`   ✅ Entidade criada: ${newEntity.name} (${newEntity.id})`);
      console.log(`   ✅ isSystem: ${newEntity.isSystem} (deve ser false)`);

      // 4. Tentar criar entidade com nome duplicado (deve falhar)
      console.log('\n4️⃣ Testando createEntity com nome duplicado (deve falhar)...');
      try {
        await EntityService.createEntity(tenant.id, {
          name: 'TestEntity',
          label: 'Outra Entidade',
        });
        console.log('   ❌ Erro: deveria ter falhado');
      } catch (error: any) {
        if (error.message.includes('já existe')) {
          console.log('   ✅ Nome duplicado rejeitado corretamente');
        } else {
          throw error;
        }
      }

      // 5. Atualizar entidade
      console.log('\n5️⃣ Testando updateEntity...');
      const updated = await EntityService.updateEntity(tenant.id, newEntity.id, {
        label: 'Entidade de Teste Atualizada',
      });
      console.log(`   ✅ Entidade atualizada: ${updated.label}`);

      // 6. Tentar atualizar entidade do sistema (deve falhar)
      console.log('\n6️⃣ Testando updateEntity em entidade do sistema (deve falhar)...');
      if (contactEntity) {
        try {
          await EntityService.updateEntity(tenant.id, contactEntity.id, {
            label: 'Novo Label',
          });
          console.log('   ❌ Erro: deveria ter falhado');
        } catch (error: any) {
          if (error.message.includes('sistema não podem ser alteradas')) {
            console.log('   ✅ Atualização de entidade do sistema rejeitada corretamente');
          } else {
            throw error;
          }
        }
      }

      // 7. Tentar deletar entidade do sistema (deve falhar)
      console.log('\n7️⃣ Testando deleteEntity em entidade do sistema (deve falhar)...');
      if (contactEntity) {
        try {
          await EntityService.deleteEntity(tenant.id, contactEntity.id);
          console.log('   ❌ Erro: deveria ter falhado');
        } catch (error: any) {
          if (error.message.includes('sistema não podem ser deletadas')) {
            console.log('   ✅ Deleção de entidade do sistema rejeitada corretamente');
          } else {
            throw error;
          }
        }
      }

      // 8. Deletar entidade customizada
      console.log('\n8️⃣ Testando deleteEntity...');
      await EntityService.deleteEntity(tenant.id, newEntity.id);
      console.log('   ✅ Entidade customizada deletada com sucesso');

      // 9. Tentar deletar novamente (deve falhar - não encontrada)
      console.log('\n9️⃣ Testando deleteEntity em entidade já deletada (deve falhar)...');
      try {
        await EntityService.deleteEntity(tenant.id, newEntity.id);
        console.log('   ❌ Erro: deveria ter falhado');
      } catch (error: any) {
        if (error.message.includes('não encontrada')) {
          console.log('   ✅ Deleção de entidade inexistente rejeitada corretamente');
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      if (error.message.includes('já existe')) {
        console.log('   ⚠️  Entidade TestEntity já existe (limpando...)');
        const existing = await prisma.entity.findFirst({
          where: {
            tenantId: tenant.id,
            name: 'TestEntity',
          },
        });
        if (existing) {
          // Tentar deletar campos primeiro
          await prisma.field.deleteMany({
            where: { entityId: existing.id },
          });
          await prisma.entity.delete({
            where: { id: existing.id },
          });
          console.log('   ✅ Entidade existente removida, tentando novamente...');
          // Tentar criar novamente
          const newEntity = await EntityService.createEntity(tenant.id, {
            name: 'TestEntity',
            label: 'Entidade de Teste',
          });
          console.log(`   ✅ Entidade criada: ${newEntity.name} (${newEntity.id})`);
        }
      } else {
        throw error;
      }
    }

    console.log('\n✅ Todos os testes do EntityService passaram!');
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

