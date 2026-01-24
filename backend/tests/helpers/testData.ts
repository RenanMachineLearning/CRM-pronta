/**
 * Helpers reutilizáveis para criação de dados de teste
 * 
 * Funções auxiliares para criar dados de teste de forma consistente
 * e reutilizável em múltiplos arquivos de teste.
 */

import { prisma } from '../../src/utils/prisma';

/**
 * Cria dados de teste para busca
 * 
 * @param tenantId - ID do tenant
 * @param count - Número de registros a criar (padrão: 10)
 * @returns IDs dos registros criados
 */
export async function createSearchTestData(tenantId: string, count: number = 10) {
  const contactIds: string[] = [];
  const companyIds: string[] = [];
  const leadIds: string[] = [];
  const opportunityIds: string[] = [];

  // Criar contatos
  const contacts = [];
  for (let i = 1; i <= count; i++) {
    contacts.push({
      tenantId,
      firstName: `Search${i}`,
      lastName: `Test${i}`,
      status: 'ACTIVE' as const,
    });
  }
  const createdContacts = await prisma.contact.createMany({ data: contacts });
  const contactsData = await prisma.contact.findMany({
    where: { tenantId, firstName: { startsWith: 'Search' } },
    select: { id: true },
  });
  contactIds.push(...contactsData.map(c => c.id));

  // Criar empresas
  const companies = [];
  for (let i = 1; i <= count; i++) {
    companies.push({
      tenantId,
      name: `Search Company ${i}`,
      status: 'ACTIVE' as const,
    });
  }
  await prisma.company.createMany({ data: companies });
  const companiesData = await prisma.company.findMany({
    where: { tenantId, name: { startsWith: 'Search Company' } },
    select: { id: true },
  });
  companyIds.push(...companiesData.map(c => c.id));

  // Criar leads
  const leads = [];
  for (let i = 1; i <= count; i++) {
    leads.push({
      tenantId,
      firstName: `Search${i}`,
      lastName: `Lead${i}`,
      email: `search${i}@test.com`,
      status: 'NEW' as const,
    });
  }
  await prisma.lead.createMany({ data: leads });
  const leadsData = await prisma.lead.findMany({
    where: { tenantId, firstName: { startsWith: 'Search' } },
    select: { id: true },
  });
  leadIds.push(...leadsData.map(l => l.id));

  return {
    contactIds,
    companyIds,
    leadIds,
    opportunityIds,
  };
}

/**
 * Cria dados específicos para testes de filtros
 * 
 * @param tenantId - ID do tenant
 * @returns IDs dos registros criados
 */
export async function createFilterTestData(tenantId: string) {
  const company = await prisma.company.create({
    data: {
      tenantId,
      name: 'Filter Test Company',
      status: 'ACTIVE',
    },
  });

  const contact1 = await prisma.contact.create({
    data: {
      tenantId,
      firstName: 'Filter',
      lastName: 'Active',
      status: 'ACTIVE',
      companyId: company.id,
    },
  });

  const contact2 = await prisma.contact.create({
    data: {
      tenantId,
      firstName: 'Filter',
      lastName: 'Inactive',
      status: 'INACTIVE',
    },
  });

  return {
    companyId: company.id,
    contactIds: [contact1.id, contact2.id],
  };
}

/**
 * Cria grandes volumes de dados para testes de performance
 * 
 * @param tenantId - ID do tenant
 * @param volume - Número de registros por entidade
 * @param stageId - ID do estágio para oportunidades (opcional)
 * @returns IDs dos registros criados
 */
export async function createVolumeTestData(
  tenantId: string,
  volume: number,
  stageId?: string
) {
  const batchSize = 100;
  const contactIds: string[] = [];
  const companyIds: string[] = [];
  const leadIds: string[] = [];
  const opportunityIds: string[] = [];

  // Criar contatos em lotes
  for (let batch = 0; batch < volume / batchSize; batch++) {
    const contacts = [];
    for (let i = 0; i < batchSize; i++) {
      const index = batch * batchSize + i;
      contacts.push({
        tenantId,
        firstName: `Volume${index}`,
        lastName: `Test${index}`,
        status: index % 2 === 0 ? 'ACTIVE' : 'INACTIVE' as const,
      });
    }
    await prisma.contact.createMany({ data: contacts });
  }

  // Criar empresas em lotes
  for (let batch = 0; batch < volume / batchSize; batch++) {
    const companies = [];
    for (let i = 0; i < batchSize; i++) {
      const index = batch * batchSize + i;
      companies.push({
        tenantId,
        name: `Volume Company ${index}`,
        status: 'ACTIVE' as const,
      });
    }
    await prisma.company.createMany({ data: companies });
  }

  // Criar leads em lotes
  for (let batch = 0; batch < volume / batchSize; batch++) {
    const leads = [];
    for (let i = 0; i < batchSize; i++) {
      const index = batch * batchSize + i;
      leads.push({
        tenantId,
        firstName: `Volume${index}`,
        lastName: `Lead${index}`,
        email: `volume${index}@test.com`,
        status: 'NEW' as const,
      });
    }
    await prisma.lead.createMany({ data: leads });
  }

  // Criar oportunidades em lotes (se stageId fornecido)
  if (stageId) {
    for (let batch = 0; batch < volume / batchSize; batch++) {
      const opportunities = [];
      for (let i = 0; i < batchSize; i++) {
        const index = batch * batchSize + i;
        opportunities.push({
          tenantId,
          name: `Volume Opportunity ${index}`,
          value: 1000 * index,
          stageId,
          status: 'OPEN' as const,
        });
      }
      await prisma.opportunity.createMany({ data: opportunities });
    }
  }

  return {
    contactIds,
    companyIds,
    leadIds,
    opportunityIds,
  };
}

/**
 * Limpa dados de teste criados
 * 
 * @param tenantId - ID do tenant
 * @param prefix - Prefixo usado nos nomes dos registros (ex: 'Search', 'Filter', 'Volume')
 */
export async function cleanupTestData(tenantId: string, prefix: string) {
  await prisma.contact.deleteMany({
    where: {
      tenantId,
      OR: [
        { firstName: { startsWith: prefix } },
        { lastName: { startsWith: prefix } },
      ],
    },
  });

  await prisma.company.deleteMany({
    where: {
      tenantId,
      name: { startsWith: prefix },
    },
  });

  await prisma.lead.deleteMany({
    where: {
      tenantId,
      OR: [
        { firstName: { startsWith: prefix } },
        { lastName: { startsWith: prefix } },
      ],
    },
  });

  await prisma.opportunity.deleteMany({
    where: {
      tenantId,
      name: { startsWith: prefix },
    },
  });
}
