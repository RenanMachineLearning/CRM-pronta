/**
 * Script de validação das entidades core criadas no seed
 * 
 * Valida:
 * - Entidades foram criadas com isSystem: true
 * - Campos foram criados corretamente
 * - Ordem dos campos está correta
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Validando entidades core do sistema...\n');

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo' },
    });

    if (!tenant) {
      console.error('❌ Tenant não encontrado');
      process.exit(1);
    }

    const coreEntityNames = ['Contact', 'Company', 'Lead', 'Opportunity', 'Task', 'Note'];

    for (const entityName of coreEntityNames) {
      console.log(`\n📋 Validando entidade: ${entityName}`);

      const entity = await prisma.entity.findFirst({
        where: {
          tenantId: tenant.id,
          name: entityName,
        },
        include: {
          fields: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!entity) {
        console.error(`   ❌ Entidade ${entityName} não encontrada`);
        continue;
      }

      // Validar isSystem
      if (!entity.isSystem) {
        console.error(`   ❌ Entidade ${entityName} não está marcada como isSystem: true`);
      } else {
        console.log(`   ✅ isSystem: true`);
      }

      // Validar campos
      console.log(`   📝 Campos encontrados: ${entity.fields.length}`);
      entity.fields.forEach((field, index) => {
        const expectedOrder = index + 1;
        if (field.order !== expectedOrder) {
          console.error(`   ⚠️  Campo ${field.name}: ordem esperada ${expectedOrder}, encontrada ${field.order}`);
        } else {
          console.log(`      ✅ ${field.name} (${field.type}) - ordem: ${field.order}`);
        }
      });
    }

    console.log('\n✅ Validação concluída!');
  } catch (error) {
    console.error('❌ Erro durante validação:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

