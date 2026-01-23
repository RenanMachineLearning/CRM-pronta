/**
 * Perfis de seleção otimizados para queries do Prisma
 * 
 * Define quais campos buscar em listagens (sem campos grandes) vs detalhes (com todos os campos)
 * Isso melhora significativamente a performance ao evitar buscar dados desnecessários
 */

import { Prisma } from '@prisma/client';

export const SELECTION_PROFILES = {
  contact: {
    list: {
      id: true,
      tenantId: true,
      firstName: true,
      lastName: true,
      title: true,
      status: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
      // Não incluir relacionamentos em listagens básicas
    } as Prisma.ContactSelect,
    detail: {
      id: true,
      tenantId: true,
      firstName: true,
      lastName: true,
      title: true,
      status: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
      // Incluir relacionamentos necessários para detalhe
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      emails: true,
      phones: true,
      addresses: true,
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    } as Prisma.ContactSelect,
  },
  note: {
    list: {
      id: true,
      tenantId: true,
      type: true,
      relatedEntityType: true,
      relatedEntityId: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      // NÃO incluir content em listagens (campo grande - até 10.000 caracteres)
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    } as Prisma.NoteSelect,
    detail: {
      id: true,
      tenantId: true,
      content: true, // Incluir content apenas em detalhes
      type: true,
      relatedEntityType: true,
      relatedEntityId: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    } as Prisma.NoteSelect,
  },
  company: {
    list: {
      id: true,
      tenantId: true,
      name: true,
      website: true,
      industry: true,
      size: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    } as Prisma.CompanySelect,
    detail: {
      id: true,
      tenantId: true,
      name: true,
      website: true,
      industry: true,
      size: true,
      status: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      // Incluir relacionamentos necessários
      contacts: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    } as Prisma.CompanySelect,
  },
  lead: {
    list: {
      id: true,
      tenantId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      company: true,
      source: true,
      status: true,
      converted: true,
      createdAt: true,
      updatedAt: true,
    } as Prisma.LeadSelect,
    detail: {
      id: true,
      tenantId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      company: true,
      source: true,
      status: true,
      converted: true,
      convertedAt: true,
      convertedToContactId: true,
      convertedToOpportunityId: true,
      createdAt: true,
      updatedAt: true,
      // Incluir relacionamentos necessários
      convertedToContact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      convertedToOpportunity: {
        select: {
          id: true,
          name: true,
        },
      },
    } as Prisma.LeadSelect,
  },
  opportunity: {
    list: {
      id: true,
      tenantId: true,
      name: true,
      value: true,
      closeDate: true,
      probability: true,
      status: true,
      stageId: true,
      contactId: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
    } as Prisma.OpportunitySelect,
    detail: {
      id: true,
      tenantId: true,
      name: true,
      value: true,
      closeDate: true,
      probability: true,
      status: true,
      stageId: true,
      contactId: true,
      companyId: true,
      leadId: true,
      createdAt: true,
      updatedAt: true,
      // Incluir relacionamentos necessários
      stage: {
        select: {
          id: true,
          name: true,
          order: true,
          probability: true,
          color: true,
          pipelineId: true,
        },
      },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    } as Prisma.OpportunitySelect,
  },
  task: {
    list: {
      id: true,
      tenantId: true,
      title: true,
      // description pode ser grande, mas necessário para preview em listagens
      // Considerar truncar no frontend se necessário
      description: true,
      type: true,
      status: true,
      priority: true,
      dueDate: true,
      assignedToId: true,
      relatedEntityType: true,
      relatedEntityId: true,
      createdAt: true,
      updatedAt: true,
    } as Prisma.TaskSelect,
    detail: {
      id: true,
      tenantId: true,
      title: true,
      description: true,
      type: true,
      status: true,
      priority: true,
      dueDate: true,
      assignedToId: true,
      relatedEntityType: true,
      relatedEntityId: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      // Incluir relacionamentos necessários
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    } as Prisma.TaskSelect,
  },
} as const;

export type SelectionProfile = 'list' | 'detail';
export type EntityName = keyof typeof SELECTION_PROFILES;

/**
 * Obtém perfil de seleção para uma entidade e operação
 * 
 * @param entity - Nome da entidade
 * @param profile - Perfil ('list' ou 'detail')
 * @returns Objeto de seleção do Prisma
 */
export function getSelectionProfile<T extends EntityName>(
  entity: T,
  profile: SelectionProfile
): Prisma.SelectSubset<any, any> {
  const entityProfile = SELECTION_PROFILES[entity];
  if (!entityProfile) {
    throw new Error(`Selection profile not found for entity: ${entity}`);
  }
  const selection = entityProfile[profile];
  if (!selection) {
    throw new Error(`Selection profile '${profile}' not found for entity: ${entity}`);
  }
  return selection;
}
