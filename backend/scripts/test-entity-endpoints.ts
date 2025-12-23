/**
 * Script de teste básico para endpoints de entidades
 * 
 * Testa:
 * - Listar entidades
 * - Obter entidade por ID
 * - Criar entidade customizada
 * - Atualizar entidade
 * - Deletar entidade
 * - Validações de negócio
 */

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Configurações
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function getAuthToken(): Promise<string> {
  // Buscar tenant demo
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'demo' },
  });

  if (!tenant) {
    throw new Error('Tenant demo não encontrado');
  }

  // Buscar usuário com role Admin
  const user = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      userRoles: {
        some: {
          role: {
            name: 'Admin',
            tenantId: tenant.id,
            isActive: true,
          },
        },
      },
    },
  });

  if (!user) {
    // Criar usuário admin temporário para testes
    const { hashPassword } = await import('../src/utils/password');
    const passwordHash = await hashPassword('AdminPass123');
    
    const adminRole = await prisma.role.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'Admin',
      },
    });

    if (!adminRole) {
      throw new Error('Role Admin não encontrada. Execute o seed primeiro.');
    }

    const newUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        passwordHash,
        name: 'Admin Test',
        tenantId: tenant.id,
        status: 'ACTIVE',
        userRoles: {
          create: {
            roleId: adminRole.id,
          },
        },
      },
    });

    // Gerar token JWT
    const token = jwt.sign(
      {
        userId: newUser.id,
        tenantId: tenant.id,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return token;
  }

  // Gerar token JWT
  const token = jwt.sign(
    {
      userId: user.id,
      tenantId: tenant.id,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return token;
}

async function testEndpoints() {
  try {
    console.log('🧪 Testando endpoints de entidades...\n');

    const token = await getAuthToken();
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo' },
    });

    if (!tenant) {
      throw new Error('Tenant demo não encontrado');
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Tenant-Id': tenant.id,
    };

    // 1. Listar entidades
    console.log('1️⃣ Testando GET /api/entities...');
    const listResponse = await fetch(`${BASE_URL}/api/entities`, {
      method: 'GET',
      headers,
    });

    if (listResponse.ok) {
      const entities = await listResponse.json();
      console.log(`   ✅ Listagem retornou ${entities.length} entidades`);
      console.log(`   ✅ Entidades do sistema: ${entities.filter((e: any) => e.isSystem).length}`);
      console.log(`   ✅ Entidades customizadas: ${entities.filter((e: any) => !e.isSystem).length}`);
    } else {
      console.error(`   ❌ Erro: ${listResponse.status} ${listResponse.statusText}`);
      const error = await listResponse.json();
      console.error(`   ${JSON.stringify(error, null, 2)}`);
    }

    // 2. Obter entidade por ID (usar Contact que deve existir)
    console.log('\n2️⃣ Testando GET /api/entities/:id...');
    const contactEntity = await prisma.entity.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'Contact',
      },
    });

    if (contactEntity) {
      const getResponse = await fetch(`${BASE_URL}/api/entities/${contactEntity.id}`, {
        method: 'GET',
        headers,
      });

      if (getResponse.ok) {
        const entity = await getResponse.json();
        console.log(`   ✅ Entidade encontrada: ${entity.name}`);
        console.log(`   ✅ Campos: ${entity.fields?.length || 0}`);
        console.log(`   ✅ Relacionamentos: ${entity.relationships?.length || 0}`);
      } else {
        console.error(`   ❌ Erro: ${getResponse.status} ${getResponse.statusText}`);
      }
    } else {
      console.log('   ⚠️  Entidade Contact não encontrada (execute o seed)');
    }

    // 3. Criar entidade customizada
    console.log('\n3️⃣ Testando POST /api/entities...');
    const createResponse = await fetch(`${BASE_URL}/api/entities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'TestEntity',
        label: 'Entidade de Teste',
      }),
    });

    let createdEntityId: string | null = null;
    if (createResponse.ok) {
      const entity = await createResponse.json();
      createdEntityId = entity.id;
      console.log(`   ✅ Entidade criada: ${entity.name} (${entity.id})`);
    } else {
      const error = await createResponse.json();
      if (error.message?.includes('já existe')) {
        console.log(`   ⚠️  Entidade já existe (esperado se executar múltiplas vezes)`);
        // Buscar entidade existente
        const existing = await prisma.entity.findFirst({
          where: {
            tenantId: tenant.id,
            name: 'TestEntity',
          },
        });
        if (existing) {
          createdEntityId = existing.id;
        }
      } else {
        console.error(`   ❌ Erro: ${createResponse.status} ${createResponse.statusText}`);
        console.error(`   ${JSON.stringify(error, null, 2)}`);
      }
    }

    // 4. Atualizar entidade (se foi criada)
    if (createdEntityId) {
      console.log('\n4️⃣ Testando PUT /api/entities/:id...');
      const updateResponse = await fetch(`${BASE_URL}/api/entities/${createdEntityId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          label: 'Entidade de Teste Atualizada',
        }),
      });

      if (updateResponse.ok) {
        const entity = await updateResponse.json();
        console.log(`   ✅ Entidade atualizada: ${entity.label}`);
      } else {
        const error = await updateResponse.json();
        console.error(`   ❌ Erro: ${updateResponse.status} ${updateResponse.statusText}`);
        console.error(`   ${JSON.stringify(error, null, 2)}`);
      }

      // 5. Tentar deletar entidade do sistema (deve falhar)
      console.log('\n5️⃣ Testando DELETE /api/entities/:id (entidade do sistema - deve falhar)...');
      if (contactEntity) {
        const deleteSystemResponse = await fetch(`${BASE_URL}/api/entities/${contactEntity.id}`, {
          method: 'DELETE',
          headers,
        });

        if (deleteSystemResponse.status === 400) {
          console.log(`   ✅ Deleção de entidade do sistema rejeitada corretamente (400)`);
        } else {
          console.error(`   ❌ Erro: deveria retornar 400, mas retornou ${deleteSystemResponse.status}`);
        }
      }

      // 6. Deletar entidade customizada
      console.log('\n6️⃣ Testando DELETE /api/entities/:id (entidade customizada)...');
      const deleteResponse = await fetch(`${BASE_URL}/api/entities/${createdEntityId}`, {
        method: 'DELETE',
        headers,
      });

      if (deleteResponse.ok) {
        console.log(`   ✅ Entidade customizada deletada com sucesso`);
      } else {
        const error = await deleteResponse.json();
        console.error(`   ❌ Erro: ${deleteResponse.status} ${deleteResponse.statusText}`);
        console.error(`   ${JSON.stringify(error, null, 2)}`);
      }
    }

    console.log('\n✅ Testes concluídos!');
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testEndpoints();

