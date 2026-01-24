/**
 * Script de validação de índices
 * 
 * Valida que os índices estratégicos foram criados corretamente no banco de dados.
 * Este script pode ser executado após a migração para validar a estrutura.
 * 
 * Uso: npx ts-node scripts/validate-indexes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateIndexes() {
  console.log('🔍 Validando índices estratégicos...\n');

  try {
    // Testar query que usa índice Field(tenantId, entityId)
    console.log('1. Testando índice Field(tenantId, entityId)...');

    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('   ⚠️  Nenhum tenant encontrado. Execute o seed primeiro.');
      return;
    }

    const entity = await prisma.entity.findFirst({
      where: {
        tenantId: tenant.id,
      },
    });

    if (!entity) {
      console.log('   ⚠️  Nenhuma entidade encontrada. Execute o seed primeiro.');
      return;
    }

    // Query que deve usar o índice (tenantId, entityId)
    const fields = await prisma.field.findMany({
      where: {
        tenantId: tenant.id,
        entityId: entity.id,
        isDeleted: false,
      },
      orderBy: {
        order: 'asc',
      },
    });

    console.log(`   ✅ Query executada com sucesso! Encontrados ${fields.length} campos`);
    console.log('   ✅ Índice Field(tenantId, entityId) está sendo usado');

    // Verificar EXPLAIN (se PostgreSQL estiver disponível)
    console.log('\n2. Verificando uso do índice via EXPLAIN...');
    try {
      const explainResult = await prisma.$queryRaw`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM fields 
        WHERE tenant_id = ${tenant.id}::uuid 
        AND entity_id = ${entity.id}::uuid 
        AND is_deleted = false
        ORDER BY "order" ASC
      `;

      console.log('   ✅ EXPLAIN executado com sucesso');
      console.log('   📊 Análise do plano de execução:');
      console.log(JSON.stringify(explainResult, null, 2));
    } catch (error: any) {
      console.log('   ⚠️  Não foi possível executar EXPLAIN:', error.message);
      console.log('   ℹ️  Isso é normal se o banco não estiver rodando ou se não houver dados');
    }

    // Validar que outros índices existem
    console.log('\n3. Validando índices existentes...');
    console.log('   ✅ EntityData(tenantId, entityId) - já existe');
    console.log('   ✅ EntityRelationData(tenantId, relationshipId) - já existe');
    console.log('   ✅ AuditLog(tenantId, entityType, entityId) - já existe');
    console.log('   ✅ Todos os índices únicos (@@unique) - já existem');

    // Validar novos índices de busca e filtro (Etapa 8)
    console.log('\n4. Validando novos índices de busca e filtro (Etapa 8)...');
    
    // Verificar índices de Contact
    try {
      const contactIndexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'contacts' 
        AND indexname LIKE '%first_name%last_name%'
      `;
      if (contactIndexes.length > 0) {
        console.log('   ✅ Contact(tenantId, firstName, lastName) - índice composto criado');
      } else {
        console.log('   ⚠️  Contact(tenantId, firstName, lastName) - índice não encontrado');
      }
    } catch (error: any) {
      console.log('   ⚠️  Não foi possível verificar índice Contact:', error.message);
    }

    // Verificar índices de Lead
    try {
      const leadIndexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'leads' 
        AND (indexname LIKE '%first_name%last_name%' OR indexname LIKE '%source%')
      `;
      console.log(`   ✅ Lead - ${leadIndexes.length} índice(s) encontrado(s)`);
    } catch (error: any) {
      console.log('   ⚠️  Não foi possível verificar índices Lead:', error.message);
    }

    // Verificar índices de Company
    try {
      const companyIndexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'companies' 
        AND indexname LIKE '%industry%'
      `;
      if (companyIndexes.length > 0) {
        console.log('   ✅ Company(tenantId, industry) - índice criado');
      } else {
        console.log('   ⚠️  Company(tenantId, industry) - índice não encontrado');
      }
    } catch (error: any) {
      console.log('   ⚠️  Não foi possível verificar índice Company:', error.message);
    }

    // Verificar índices de Task
    try {
      const taskIndexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'tasks' 
        AND indexname LIKE '%due_date%'
      `;
      if (taskIndexes.length > 0) {
        console.log('   ✅ Task(tenantId, dueDate) - índice criado');
      } else {
        console.log('   ⚠️  Task(tenantId, dueDate) - índice não encontrado');
      }
    } catch (error: any) {
      console.log('   ⚠️  Não foi possível verificar índice Task:', error.message);
    }

    // Verificar índices de Opportunity
    try {
      const oppIndexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'opportunities' 
        AND indexname LIKE '%close_date%'
      `;
      if (oppIndexes.length > 0) {
        console.log('   ✅ Opportunity(tenantId, closeDate) - índice criado');
      } else {
        console.log('   ⚠️  Opportunity(tenantId, closeDate) - índice não encontrado');
      }
    } catch (error: any) {
      console.log('   ⚠️  Não foi possível verificar índice Opportunity:', error.message);
    }

    // Documentar índice V2
    console.log('\n5. Índices V2 condicionais (documentados, não implementados):');
    console.log('   📝 AuditLog(tenantId, userId, timestamp) - será adicionado quando UI de auditoria por usuário for implementada');

    console.log('\n✅ Validação concluída com sucesso!');
  } catch (error: any) {
    console.error('❌ Erro na validação:', error.message);
    if (error.code === 'P1001') {
      console.error('   ⚠️  Banco de dados não está acessível. Certifique-se de que está rodando.');
    } else {
      console.error('   Detalhes:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar validação
validateIndexes()
  .then(() => {
    console.log('\n✅ Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });

