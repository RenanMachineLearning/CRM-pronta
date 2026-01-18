/**
 * Script de validação para Task e Note
 * 
 * Valida que os modelos Task e Note foram criados corretamente no schema Prisma.
 * 
 * Uso: npx ts-node scripts/validate-tasks-notes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateTasksNotes() {
  console.log('🔍 Validando estrutura de Task e Note...\n');

  try {
    // 1. Verificar que enums existem
    console.log('1. Verificando enums...');
    // Testar criação com cada enum
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('   ⚠️  Nenhum tenant encontrado. Execute o seed primeiro.');
      return;
    }

    const user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
    if (!user) {
      console.log('   ⚠️  Nenhum usuário encontrado. Execute o seed primeiro.');
      return;
    }

    // 2. Testar criação de Task
    console.log('2. Testando criação de Task...');
    const task = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        title: 'Tarefa de Validação',
        type: 'CALL',
        status: 'PENDING',
        priority: 'MEDIUM',
        createdById: user.id,
        relatedEntityType: 'Contact',
        relatedEntityId: '00000000-0000-0000-0000-000000000000', // UUID fictício para teste
      },
    });
    console.log('   ✅ Task criada com sucesso:', task.id);

    // 3. Testar criação de Note
    console.log('3. Testando criação de Note...');
    const note = await prisma.note.create({
      data: {
        tenantId: tenant.id,
        content: 'Nota de Validação',
        type: 'NOTE',
        createdById: user.id,
        relatedEntityType: 'Task',
        relatedEntityId: task.id,
      },
    });
    console.log('   ✅ Note criada com sucesso:', note.id);

    // 4. Testar relacionamentos
    console.log('4. Testando relacionamentos...');
    const taskWithRelations = await prisma.task.findUnique({
      where: { id: task.id },
      include: { createdBy: true, assignedTo: true, tenant: true },
    });
    if (taskWithRelations && taskWithRelations.createdBy && taskWithRelations.tenant) {
      console.log('   ✅ Relacionamentos de Task funcionando');
    } else {
      throw new Error('Relacionamentos de Task não funcionam corretamente');
    }

    const noteWithRelations = await prisma.note.findUnique({
      where: { id: note.id },
      include: { createdBy: true, tenant: true },
    });
    if (noteWithRelations && noteWithRelations.createdBy && noteWithRelations.tenant) {
      console.log('   ✅ Relacionamentos de Note funcionando');
    } else {
      throw new Error('Relacionamentos de Note não funcionam corretamente');
    }

    // 5. Testar soft delete
    console.log('5. Testando soft delete...');
    await prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: new Date() },
    });
    const deletedTask = await prisma.task.findFirst({
      where: { id: task.id, deletedAt: null },
    });
    if (!deletedTask) {
      console.log('   ✅ Soft delete funcionando (task não aparece em listagem)');
    } else {
      throw new Error('Soft delete não está funcionando corretamente');
    }

    // 6. Limpar dados de teste
    console.log('6. Limpando dados de teste...');
    await prisma.note.delete({ where: { id: note.id } });
    await prisma.task.delete({ where: { id: task.id } });
    console.log('   ✅ Dados de teste removidos');

    console.log('\n✅ Todas as validações passaram!');
  } catch (error) {
    console.error('❌ Erro na validação:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

validateTasksNotes();
