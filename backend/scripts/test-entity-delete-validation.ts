/**
 * Script de teste para validar deleção de entidade com campos associados
 */

import { PrismaClient } from '@prisma/client';
import { EntityService } from '../src/services/entityService';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧪 Testando validação de deleção de entidade com campos...\n');

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo' },
    });

    if (!tenant) {
      console.error('❌ Tenant demo não encontrado');
      process.exit(1);
    }

    // Criar entidade de teste
    const entity = await EntityService.createEntity(tenant.id, {
      name: 'TestEntityWithFields',
      label: 'Entidade com Campos',
    });
    console.log(`✅ Entidade criada: ${entity.name} (${entity.id})\n`);

    // Criar campo para a entidade
    await prisma.field.create({
      data: {
        entityId: entity.id,
        name: 'testField',
        label: 'Campo de Teste',
        type: 'text',
        required: false,
        unique: false,
        tenantId: tenant.id,
        order: 1,
      },
    });
    console.log('✅ Campo criado para a entidade\n');

    // Tentar deletar entidade com campo (deve falhar)
    console.log('🔍 Tentando deletar entidade com campo associado (deve falhar)...');
    try {
      await EntityService.deleteEntity(tenant.id, entity.id);
      console.log('   ❌ Erro: deveria ter falhado');
    } catch (error: any) {
      if (error.message.includes('campos associados')) {
        console.log('   ✅ Deleção rejeitada corretamente (entidade tem campos associados)');
      } else {
        throw error;
      }
    }

    // Deletar campo primeiro
    await prisma.field.deleteMany({
      where: { entityId: entity.id },
    });
    console.log('✅ Campo deletado\n');

    // Agora deve conseguir deletar a entidade
    console.log('🔍 Tentando deletar entidade sem campos (deve funcionar)...');
    await EntityService.deleteEntity(tenant.id, entity.id);
    console.log('   ✅ Entidade deletada com sucesso\n');

    console.log('✅ Todos os testes de validação passaram!');
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

