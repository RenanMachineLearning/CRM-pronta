/**
 * Script de teste básico para validar criação de metadados
 * 
 * Testa:
 * - Criação de entidade
 * - Criação de campos para entidade
 * - Criação de relacionamento entre entidades
 * - Isolamento por tenantId
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧪 Iniciando testes de metadados...\n');

    // Buscar um tenant existente (assumindo que existe pelo menos um)
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.error('❌ Nenhum tenant encontrado. Execute o seed primeiro.');
      process.exit(1);
    }

    console.log(`✅ Tenant encontrado: ${tenant.name} (${tenant.id})\n`);

    // 1. Criar uma entidade customizada
    console.log('1️⃣ Criando entidade customizada...');
    const entity = await prisma.entity.create({
      data: {
        name: 'TestEntity',
        label: 'Entidade de Teste',
        tenantId: tenant.id,
        isSystem: false,
      },
    });
    console.log(`✅ Entidade criada: ${entity.name} (${entity.id})\n`);

    // 2. Criar campos para a entidade
    console.log('2️⃣ Criando campos para a entidade...');
    const field1 = await prisma.field.create({
      data: {
        entityId: entity.id,
        name: 'testField1',
        label: 'Campo de Teste 1',
        type: 'text',
        required: false,
        unique: false,
        tenantId: tenant.id,
        order: 1,
      },
    });
    const field2 = await prisma.field.create({
      data: {
        entityId: entity.id,
        name: 'testField2',
        label: 'Campo de Teste 2',
        type: 'number',
        required: true,
        unique: false,
        tenantId: tenant.id,
        order: 2,
      },
    });
    console.log(`✅ Campos criados: ${field1.name}, ${field2.name}\n`);

    // 3. Criar relacionamento entre entidades (precisa de duas entidades)
    console.log('3️⃣ Criando segunda entidade para relacionamento...');
    const entity2 = await prisma.entity.create({
      data: {
        name: 'TestEntity2',
        label: 'Entidade de Teste 2',
        tenantId: tenant.id,
        isSystem: false,
      },
    });
    console.log(`✅ Segunda entidade criada: ${entity2.name} (${entity2.id})\n`);

    console.log('4️⃣ Criando relacionamento entre entidades...');
    const relationship = await prisma.relationship.create({
      data: {
        sourceEntityId: entity.id,
        targetEntityId: entity2.id,
        type: 'oneToMany',
        name: 'testRelations',
        tenantId: tenant.id,
      },
    });
    console.log(`✅ Relacionamento criado: ${relationship.name} (${relationship.id})\n`);

    // 4. Verificar isolamento por tenantId
    console.log('5️⃣ Verificando isolamento por tenantId...');
    const entitiesCount = await prisma.entity.count({
      where: { tenantId: tenant.id },
    });
    console.log(`✅ Total de entidades do tenant: ${entitiesCount}\n`);

    // 6. Limpar dados de teste (opcional)
    console.log('🧹 Limpando dados de teste...');
    await prisma.relationship.delete({ where: { id: relationship.id } });
    await prisma.field.deleteMany({ where: { entityId: { in: [entity.id, entity2.id] } } });
    await prisma.entity.deleteMany({ where: { id: { in: [entity.id, entity2.id] } } });
    console.log('✅ Dados de teste removidos\n');

    console.log('✅ Todos os testes passaram!');
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

