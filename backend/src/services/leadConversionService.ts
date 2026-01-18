/**
 * Serviço para conversão de leads em contatos e/ou oportunidades
 * 
 * Lógica de negócio para conversão de leads.
 * Regra de ouro: Controller orquestra, Service decide.
 */

import { PrismaClient } from '@prisma/client';
import { ContactService, CreateContactData } from './contactService';
import { OpportunityService, CreateOpportunityData } from './opportunityService';
import { logAudit } from '../utils/auditLog';
import { validateEmail, validatePhone, validatePositiveNumber, validateProbability, validateDateNotPast } from '../utils/validators';

const prisma = new PrismaClient();

// Interface para dados de conversão
export interface ConvertLeadData {
  createContact: boolean; // Se deve criar contato
  createOpportunity: boolean; // Se deve criar oportunidade
  opportunityData?: {
    name?: string; // Nome da oportunidade (default: nome do lead ou "Oportunidade de [Lead]")
    value?: number | string; // Valor da oportunidade (obrigatório se createOpportunity = true)
    currency?: string; // Moeda (default: "BRL")
    stageId?: string; // ID do estágio (opcional, usa primeiro estágio do pipeline padrão se não fornecido)
    closeDate?: Date | string; // Data de fechamento esperada
    probability?: number; // Probabilidade (0-100, usa do estágio se não fornecido)
  };
}

// Interface para resposta de conversão
export interface ConvertLeadResponse {
  lead: {
    id: string;
    converted: boolean;
    convertedAt: Date | null;
    convertedToContactId: string | null;
    convertedToOpportunityId: string | null;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null; // Email primário do contato (se criado a partir do lead)
  } | null;
  opportunity?: {
    id: string;
    name: string;
    value: number;
    stageId: string;
  } | null;
}

export class LeadConversionService {
  /**
   * Converte lead em contato
   * 
   * Cria contato a partir dos dados do lead, incluindo emails e telefones.
   * 
   * @param lead - Dados do lead a ser convertido
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Contato criado
   * @throws Error se validações falharem
   */
  static async convertLeadToContact(
    lead: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string | null;
      email: string | null;
      phone: string | null;
      company: string | null;
    },
    tenantId: string,
    requestingUserId?: string
  ): Promise<{ id: string; firstName: string; lastName: string | null; email: string | null }> {
    // Validar dados do lead
    if (!lead.firstName || lead.firstName.trim().length === 0) {
      throw new Error('Lead deve ter firstName para criar contato');
    }

    // Preparar dados do contato
    const contactData: CreateContactData = {
      firstName: lead.firstName.trim(),
      lastName: lead.lastName?.trim() || undefined,
      status: 'ACTIVE',
      // companyId: null (company do lead é string livre, não FK)
    };

    // Preparar emails (se lead.email existe e é válido)
    if (lead.email && lead.email.trim().length > 0) {
      // Validar email antes de adicionar
      if (validateEmail(lead.email)) {
        contactData.emails = [{
          email: lead.email.trim().toLowerCase(),
          type: 'WORK' as const,
          isPrimary: true,
        }];
      } else {
        // Se email inválido, não adicionar (não bloquear conversão)
        console.warn(`Email inválido do lead ${lead.id}: ${lead.email}`);
      }
    }

    // Preparar telefones (se lead.phone existe e é válido)
    if (lead.phone && lead.phone.trim().length > 0) {
      // Validar telefone antes de adicionar
      if (validatePhone(lead.phone)) {
        contactData.phones = [{
          phone: lead.phone.trim(),
          type: 'MOBILE' as const,
          isPrimary: true,
        }];
      } else {
        // Se telefone inválido, não adicionar (não bloquear conversão)
        console.warn(`Telefone inválido do lead ${lead.id}: ${lead.phone}`);
      }
    }

    // Chamar ContactService.createContact
    const createdContact = await ContactService.createContact(
      contactData,
      tenantId,
      requestingUserId
    );

    // Retornar contato criado
    return {
      id: createdContact.id,
      firstName: createdContact.firstName,
      lastName: createdContact.lastName ?? null,
      email: createdContact.emails?.[0]?.email || null,
    };
  }

  /**
   * Converte lead em oportunidade
   * 
   * Cria oportunidade a partir dos dados do lead, usando pipeline padrão se stageId não fornecido.
   * 
   * @param lead - Dados do lead a ser convertido
   * @param opportunityData - Dados da oportunidade (opcional)
   * @param contactId - ID do contato criado (se createContact = true)
   * @param companyId - ID da empresa (se encontrada pelo nome do lead)
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Oportunidade criada
   * @throws Error se validações falharem
   */
  static async convertLeadToOpportunity(
    lead: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string | null;
      email: string | null;
      phone: string | null;
      company: string | null;
    },
    opportunityData: ConvertLeadData['opportunityData'],
    contactId: string | null, // ID do contato criado (se createContact = true)
    companyId: string | null, // ID da empresa (se encontrada pelo nome do lead)
    tenantId: string,
    requestingUserId?: string
  ): Promise<{ id: string; name: string; value: number; stageId: string }> {
    // Validar que value foi fornecido
    if (!opportunityData?.value) {
      throw new Error('value é obrigatório ao criar oportunidade');
    }
    validatePositiveNumber(opportunityData.value);

    // Obter pipeline padrão e estágio inicial
    let stageId: string;
    let defaultProbability: number | null = null;

    if (opportunityData.stageId) {
      // Validar formato UUID
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opportunityData.stageId)) {
        throw new Error('stageId deve ser um UUID válido');
      }

      // Validar que estágio existe e pertence ao tenant
      const stage = await prisma.pipelineStage.findFirst({
        where: {
          id: opportunityData.stageId,
          tenantId,
        },
        include: {
          pipeline: {
            select: {
              id: true,
              tenantId: true,
            },
          },
        },
      });

      if (!stage || stage.pipeline.tenantId !== tenantId) {
        throw new Error('PipelineStage não encontrado ou não pertence ao tenant');
      }

      stageId = stage.id;
      defaultProbability = stage.probability;
    } else {
      // Buscar pipeline padrão do tenant
      const defaultPipeline = await prisma.pipeline.findFirst({
        where: {
          tenantId,
          isDefault: true,
        },
      });

      if (!defaultPipeline) {
        throw new Error('Nenhum pipeline padrão encontrado. Crie um pipeline padrão antes de converter leads em oportunidades.');
      }

      // Buscar primeiro estágio do pipeline (menor order)
      const firstStage = await prisma.pipelineStage.findFirst({
        where: {
          pipelineId: defaultPipeline.id,
          tenantId,
        },
        orderBy: {
          order: 'asc',
        },
      });

      if (!firstStage) {
        throw new Error('Pipeline padrão não possui estágios. Adicione estágios ao pipeline antes de converter leads.');
      }

      stageId = firstStage.id;
      defaultProbability = firstStage.probability;
    }

    // Preparar nome da oportunidade
    let opportunityName: string;
    if (opportunityData.name && opportunityData.name.trim().length > 0) {
      opportunityName = opportunityData.name.trim();
    } else {
      // Gerar nome a partir do lead
      const leadName = `${lead.firstName} ${lead.lastName || ''}`.trim();
      opportunityName = `Oportunidade de ${leadName}`;
    }

    // Preparar probability
    let probability: number | null = null;
    if (opportunityData.probability !== undefined && opportunityData.probability !== null) {
      validateProbability(opportunityData.probability);
      probability = opportunityData.probability;
    } else {
      probability = defaultProbability;
    }

    // Preparar closeDate
    let closeDate: Date | null = null;
    if (opportunityData.closeDate) {
      closeDate = opportunityData.closeDate instanceof Date
        ? opportunityData.closeDate
        : new Date(opportunityData.closeDate);
      if (isNaN(closeDate.getTime())) {
        throw new Error('closeDate inválida');
      }
      validateDateNotPast(closeDate);
    }

    // Preparar dados da oportunidade
    const opportunityCreateData: CreateOpportunityData = {
      name: opportunityName,
      value: opportunityData.value,
      currency: opportunityData.currency || 'BRL',
      stageId: stageId,
      status: 'OPEN',
      closeDate: closeDate || undefined,
      probability: probability || undefined,
      contactId: contactId || undefined,
      companyId: companyId || undefined,
      leadId: lead.id,
    };

    // Chamar OpportunityService.createOpportunity
    const createdOpportunity = await OpportunityService.createOpportunity(
      opportunityCreateData,
      tenantId,
      requestingUserId
    );

    // Retornar oportunidade criada
    return {
      id: createdOpportunity.id,
      name: createdOpportunity.name,
      value: createdOpportunity.value,
      stageId: createdOpportunity.stageId,
    };
  }

  /**
   * Converte lead em contato e/ou oportunidade
   * 
   * Orquestra a conversão completa do lead, criando contato e/ou oportunidade conforme solicitado.
   * 
   * @param leadId - ID do lead a ser convertido
   * @param data - Dados de conversão (createContact, createOpportunity, opportunityData)
   * @param tenantId - ID do tenant (obrigatório para isolamento)
   * @param requestingUserId - ID do usuário que está fazendo a requisição (opcional, para auditoria)
   * @returns Resposta com lead atualizado, contato e oportunidade criados
   * @throws Error se validações falharem
   */
  static async convertLead(
    leadId: string,
    data: ConvertLeadData,
    tenantId: string,
    requestingUserId?: string
  ): Promise<ConvertLeadResponse> {
    // Validar que pelo menos uma opção está marcada
    if (!data.createContact && !data.createOpportunity) {
      throw new Error('Deve criar pelo menos contato ou oportunidade');
    }

    // Validar formato UUID do leadId
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
      throw new Error('ID do lead inválido');
    }

    // Buscar lead
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        tenantId, // Isolamento multi-tenant obrigatório
        deletedAt: null, // Excluir soft deleted
      },
      // Não precisa incluir relacionamentos para conversão
    });

    if (!lead) {
      throw new Error('Lead não encontrado, não pertence ao tenant ou foi deletado');
    }

    // Validar que não foi convertido anteriormente
    if (lead.converted) {
      throw new Error('Lead já foi convertido anteriormente');
    }

    // Criar contato (se solicitado)
    let contactId: string | null = null;
    let contact: { id: string; firstName: string; lastName: string | null; email: string | null } | null = null;

    if (data.createContact) {
      try {
        contact = await this.convertLeadToContact(lead, tenantId, requestingUserId);
        contactId = contact.id;
      } catch (error) {
        // Se falhar ao criar contato, propagar erro
        throw new Error(`Erro ao criar contato a partir do lead: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }

    // Buscar empresa (se lead.company fornecido)
    let companyId: string | null = null;

    if (lead.company && lead.company.trim().length > 0) {
      // Tentar encontrar empresa pelo nome (busca case-insensitive e parcial)
      const company = await prisma.company.findFirst({
        where: {
          tenantId,
          deletedAt: null, // Apenas empresas não deletadas
          name: {
            contains: lead.company.trim(),
            mode: 'insensitive', // Case-insensitive
          },
        },
        orderBy: {
          createdAt: 'asc', // Se múltiplas, usar a mais antiga
        },
      });

      if (company) {
        companyId = company.id;
      }
      // Se não encontrar, companyId permanece null (não bloquear conversão)
    }

    // Criar oportunidade (se solicitado)
    let opportunityId: string | null = null;
    let opportunity: { id: string; name: string; value: number; stageId: string } | null = null;

    if (data.createOpportunity) {
      // Validar que value foi fornecido
      if (!data.opportunityData?.value) {
        throw new Error('value é obrigatório ao criar oportunidade');
      }

      try {
        opportunity = await this.convertLeadToOpportunity(
          lead,
          data.opportunityData,
          contactId,
          companyId,
          tenantId,
          requestingUserId
        );
        opportunityId = opportunity.id;
      } catch (error) {
        // Se falhar ao criar oportunidade, propagar erro
        throw new Error(`Erro ao criar oportunidade a partir do lead: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }

    // Atualizar lead (não precisa de transação separada, pois contato e oportunidade já foram criados)
    // Nota: Contato e oportunidade já foram criados pelos respectivos services
    // (que já usam transações internamente). Aqui apenas atualizamos o lead.
    const updatedLead = await prisma.lead.update({
      where: {
        id: leadId,
        tenantId, // Garantir isolamento multi-tenant
      },
      data: {
        converted: true,
        convertedAt: new Date(),
        convertedToContactId: contactId,
        convertedToOpportunityId: opportunityId,
        status: 'CONVERTED', // Atualizar status do lead
      },
    });

    // Registrar auditoria
    if (requestingUserId) {
      logAudit('Lead', leadId, 'update', requestingUserId, tenantId, {
        converted: { old: false, new: true },
        convertedAt: { old: null, new: updatedLead.convertedAt },
        convertedToContactId: { old: null, new: contactId },
        convertedToOpportunityId: { old: null, new: opportunityId },
        status: { old: lead.status, new: 'CONVERTED' },
      }).catch(() => {
        // Erro já foi logado no helper, apenas evitar unhandled rejection
      });
    }

    // Retornar resposta
    return {
      lead: {
        id: updatedLead.id,
        converted: updatedLead.converted,
        convertedAt: updatedLead.convertedAt,
        convertedToContactId: updatedLead.convertedToContactId,
        convertedToOpportunityId: updatedLead.convertedToOpportunityId,
      },
      contact,
      opportunity,
    };
  }
}
