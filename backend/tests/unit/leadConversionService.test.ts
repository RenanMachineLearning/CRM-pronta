/**
 * Testes unitários para LeadConversionService
 * 
 * Testa lógica de conversão de leads isoladamente usando mocks.
 * Foca em validações, regras de negócio e transformações de dados.
 */

import { LeadConversionService, ConvertLeadData } from '../../src/services/leadConversionService';
import { ContactService } from '../../src/services/contactService';
import { OpportunityService } from '../../src/services/opportunityService';
import { PrismaClient } from '@prisma/client';

// Mock do Prisma - criar instância dentro do mock para evitar problemas de hoisting
jest.mock('@prisma/client', () => {
  const mockInstance = {
    lead: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    pipeline: {
      findFirst: jest.fn(),
    },
    pipelineStage: {
      findFirst: jest.fn(),
    },
    company: {
      findFirst: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockInstance),
  };
});

// Obter referência ao mock através do PrismaClient
const getMockPrisma = () => {
  const PrismaClientMock = PrismaClient as jest.MockedClass<typeof PrismaClient>;
  return new PrismaClientMock() as any;
};

// Mock dos serviços
jest.mock('../../src/services/contactService', () => ({
  ContactService: {
    createContact: jest.fn(),
  },
}));

jest.mock('../../src/services/opportunityService', () => ({
  OpportunityService: {
    createOpportunity: jest.fn(),
  },
}));

// Mock do auditLog
jest.mock('../../src/utils/auditLog', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

describe('LeadConversionService', () => {
  const tenantId = 'tenant-1';
  const requestingUserId = 'user-1';

  const mockLead = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    tenantId,
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao@example.com',
    phone: '11999999999',
    company: 'Empresa A',
    status: 'NEW',
    converted: false,
  };

  // Obter referência ao mock do Prisma
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Obter referência ao mock (todas as instâncias retornam o mesmo mock)
    mockPrisma = getMockPrisma();
  });

  describe('convertLeadToContact', () => {
    it('deve criar contato com dados do lead', async () => {
      const mockContact = {
        id: 'contact-1',
        firstName: 'João',
        lastName: 'Silva',
        emails: [{ email: 'joao@example.com', type: 'WORK', isPrimary: true }],
      };

      (ContactService.createContact as jest.Mock).mockResolvedValue(mockContact as any);

      const result = await LeadConversionService.convertLeadToContact(
        mockLead,
        tenantId,
        requestingUserId
      );

      expect(ContactService.createContact).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'João',
          lastName: 'Silva',
          status: 'ACTIVE',
        }),
        tenantId,
        requestingUserId
      );

      expect(result).toEqual({
        id: 'contact-1',
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao@example.com',
      });
    });

    it('deve criar emails e telefones do lead', async () => {
      const mockContact = {
        id: 'contact-1',
        firstName: 'João',
        lastName: 'Silva',
        emails: [{ email: 'joao@example.com', type: 'WORK', isPrimary: true }],
      };

      (ContactService.createContact as jest.Mock).mockResolvedValue(mockContact as any);

      await LeadConversionService.convertLeadToContact(
        mockLead,
        tenantId,
        requestingUserId
      );

      expect(ContactService.createContact).toHaveBeenCalledWith(
        expect.objectContaining({
          emails: [{
            email: 'joao@example.com',
            type: 'WORK',
            isPrimary: true,
          }],
          phones: [{
            phone: '11999999999',
            type: 'MOBILE',
            isPrimary: true,
          }],
        }),
        tenantId,
        requestingUserId
      );
    });

    it('deve lidar com email/telefone inválidos (não bloquear)', async () => {
      const leadWithInvalidData = {
        ...mockLead,
        email: 'invalid-email',
        phone: '123', // Telefone inválido
      };

      const mockContact = {
        id: 'contact-1',
        firstName: 'João',
        lastName: 'Silva',
        emails: [],
      };

      (ContactService.createContact as jest.Mock).mockResolvedValue(mockContact as any);

      const result = await LeadConversionService.convertLeadToContact(
        leadWithInvalidData,
        tenantId,
        requestingUserId
      );

      // Deve criar contato mesmo com email/telefone inválidos
      expect(ContactService.createContact).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('deve lançar erro se lead não tem firstName', async () => {
      const leadWithoutFirstName = {
        ...mockLead,
        firstName: '',
      };

      await expect(
        LeadConversionService.convertLeadToContact(
          leadWithoutFirstName,
          tenantId,
          requestingUserId
        )
      ).rejects.toThrow('Lead deve ter firstName para criar contato');
    });
  });

  describe('convertLeadToOpportunity', () => {
    const mockPipeline = {
      id: 'pipeline-1',
      tenantId,
      isDefault: true,
    };

    const mockStage = {
      id: '123e4567-e89b-42d3-a456-426614174000',
      pipelineId: 'pipeline-1',
      tenantId,
      order: 1,
      probability: 25,
      pipeline: {
        id: 'pipeline-1',
        tenantId,
      },
    };

    const mockFirstStage = {
      id: '111e4567-e89b-42d3-a456-426614174000',
      pipelineId: 'pipeline-1',
      tenantId,
      order: 1,
      probability: 25,
    };

    it('deve criar oportunidade com dados do lead', async () => {
      const opportunityData: ConvertLeadData['opportunityData'] = {
        value: 50000,
        currency: 'BRL',
      };

      (mockPrisma.pipeline.findFirst as jest.Mock).mockResolvedValue(mockPipeline);
      (mockPrisma.pipelineStage.findFirst as jest.Mock).mockResolvedValue(mockFirstStage);

      const mockOpportunity = {
        id: 'opp-1',
        name: 'Oportunidade de João Silva',
        value: 50000,
        stageId: '111e4567-e89b-42d3-a456-426614174000',
      };

      (OpportunityService.createOpportunity as jest.Mock).mockResolvedValue(mockOpportunity as any);

      const result = await LeadConversionService.convertLeadToOpportunity(
        mockLead,
        opportunityData,
        null,
        null,
        tenantId,
        requestingUserId
      );

      expect(result).toEqual({
        id: 'opp-1',
        name: 'Oportunidade de João Silva',
        value: 50000,
        stageId: '111e4567-e89b-42d3-a456-426614174000',
      });
    });

    it('deve usar primeiro estágio do pipeline padrão se stageId não fornecido', async () => {
      const opportunityData: ConvertLeadData['opportunityData'] = {
        value: 50000,
      };

      (mockPrisma.pipeline.findFirst as jest.Mock).mockResolvedValue(mockPipeline);
      (mockPrisma.pipelineStage.findFirst as jest.Mock).mockResolvedValue(mockFirstStage);

      const mockOpportunity = {
        id: 'opp-1',
        name: 'Oportunidade de João Silva',
        value: 50000,
        stageId: '111e4567-e89b-42d3-a456-426614174000',
      };

      (OpportunityService.createOpportunity as jest.Mock).mockResolvedValue(mockOpportunity as any);

      await LeadConversionService.convertLeadToOpportunity(
        mockLead,
        opportunityData,
        null,
        null,
        tenantId,
        requestingUserId
      );

      expect(mockPrisma.pipeline.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId,
          isDefault: true,
        },
      });

      expect(mockPrisma.pipelineStage.findFirst).toHaveBeenCalledWith({
        where: {
          pipelineId: 'pipeline-1',
          tenantId,
        },
        orderBy: {
          order: 'asc',
        },
      });
    });

    it('deve usar stageId fornecido se fornecido', async () => {
      const opportunityData: ConvertLeadData['opportunityData'] = {
        value: 50000,
        stageId: '123e4567-e89b-42d3-a456-426614174000',
      };

      (mockPrisma.pipelineStage.findFirst as jest.Mock).mockResolvedValue(mockStage);

      const mockOpportunity = {
        id: 'opp-1',
        name: 'Oportunidade de João Silva',
        value: 50000,
        stageId: '123e4567-e89b-42d3-a456-426614174000',
      };

      (OpportunityService.createOpportunity as jest.Mock).mockResolvedValue(mockOpportunity as any);

      await LeadConversionService.convertLeadToOpportunity(
        mockLead,
        opportunityData,
        null,
        null,
        tenantId,
        requestingUserId
      );

      expect(mockPrisma.pipelineStage.findFirst).toHaveBeenCalledWith({
        where: {
          id: '123e4567-e89b-42d3-a456-426614174000',
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
    });

    it('deve associar contato se criado', async () => {
      const opportunityData: ConvertLeadData['opportunityData'] = {
        value: 50000,
      };

      (mockPrisma.pipeline.findFirst as jest.Mock).mockResolvedValue(mockPipeline);
      (mockPrisma.pipelineStage.findFirst as jest.Mock).mockResolvedValue(mockFirstStage);

      const mockOpportunity = {
        id: 'opp-1',
        name: 'Oportunidade de João Silva',
        value: 50000,
        stageId: '111e4567-e89b-42d3-a456-426614174000',
      };

      (OpportunityService.createOpportunity as jest.Mock).mockResolvedValue(mockOpportunity as any);

      await LeadConversionService.convertLeadToOpportunity(
        mockLead,
        opportunityData,
        'contact-1', // contactId fornecido
        null,
        tenantId,
        requestingUserId
      );

      expect(OpportunityService.createOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({
          contactId: 'contact-1',
        }),
        tenantId,
        requestingUserId
      );
    });

    it('deve associar empresa se encontrada', async () => {
      const opportunityData: ConvertLeadData['opportunityData'] = {
        value: 50000,
      };

      (mockPrisma.pipeline.findFirst as jest.Mock).mockResolvedValue(mockPipeline);
      (mockPrisma.pipelineStage.findFirst as jest.Mock).mockResolvedValue(mockFirstStage);

      const mockOpportunity = {
        id: 'opp-1',
        name: 'Oportunidade de João Silva',
        value: 50000,
        stageId: '111e4567-e89b-42d3-a456-426614174000',
      };

      (OpportunityService.createOpportunity as jest.Mock).mockResolvedValue(mockOpportunity as any);

      await LeadConversionService.convertLeadToOpportunity(
        mockLead,
        opportunityData,
        null,
        'company-1', // companyId fornecido
        tenantId,
        requestingUserId
      );

      expect(OpportunityService.createOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'company-1',
        }),
        tenantId,
        requestingUserId
      );
    });

    it('deve lançar erro se value não fornecido', async () => {
      const opportunityData: ConvertLeadData['opportunityData'] = {};

      await expect(
        LeadConversionService.convertLeadToOpportunity(
          mockLead,
          opportunityData,
          null,
          null,
          tenantId,
          requestingUserId
        )
      ).rejects.toThrow('value é obrigatório ao criar oportunidade');
    });

    it('deve lançar erro se pipeline padrão não encontrado', async () => {
      const opportunityData: ConvertLeadData['opportunityData'] = {
        value: 50000,
      };

      (mockPrisma.pipeline.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        LeadConversionService.convertLeadToOpportunity(
          mockLead,
          opportunityData,
          null,
          null,
          tenantId,
          requestingUserId
        )
      ).rejects.toThrow('Nenhum pipeline padrão encontrado');
    });
  });

  describe('convertLead', () => {
    it('deve validar que lead não foi convertido', async () => {
      const convertedLead = {
        ...mockLead,
        converted: true,
      };

      (mockPrisma.lead.findFirst as jest.Mock).mockResolvedValue(convertedLead as any);

      const data: ConvertLeadData = {
        createContact: true,
        createOpportunity: false,
      };

      await expect(
        LeadConversionService.convertLead('550e8400-e29b-41d4-a716-446655440000', data, tenantId, requestingUserId)
      ).rejects.toThrow('Lead já foi convertido anteriormente');
    });

    it('deve validar que pelo menos uma opção está marcada', async () => {
      const data: ConvertLeadData = {
        createContact: false,
        createOpportunity: false,
      };

      await expect(
        LeadConversionService.convertLead('550e8400-e29b-41d4-a716-446655440000', data, tenantId, requestingUserId)
      ).rejects.toThrow('Deve criar pelo menos contato ou oportunidade');
    });

    it('deve atualizar lead com converted = true', async () => {
      (mockPrisma.lead.findFirst as jest.Mock).mockResolvedValue(mockLead as any);

      const mockContact = {
        id: 'contact-1',
        firstName: 'João',
        lastName: 'Silva',
        emails: [],
      };

      (ContactService.createContact as jest.Mock).mockResolvedValue(mockContact as any);

      const updatedLead = {
        ...mockLead,
        converted: true,
        convertedAt: new Date(),
        convertedToContactId: 'contact-1',
        convertedToOpportunityId: null,
        status: 'CONVERTED',
      };

      (mockPrisma.lead.update as jest.Mock).mockResolvedValue(updatedLead as any);

      const data: ConvertLeadData = {
        createContact: true,
        createOpportunity: false,
      };

      const result = await LeadConversionService.convertLead('550e8400-e29b-41d4-a716-446655440000', data, tenantId, requestingUserId);

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          tenantId,
        },
        data: {
          converted: true,
          convertedAt: expect.any(Date),
          convertedToContactId: 'contact-1',
          convertedToOpportunityId: null,
          status: 'CONVERTED',
        },
      });

      expect(result.lead.converted).toBe(true);
    });

    it('deve criar contato e oportunidade quando ambos solicitados', async () => {
      (mockPrisma.lead.findFirst as jest.Mock).mockResolvedValue(mockLead as any);

      const mockContact = {
        id: 'contact-1',
        firstName: 'João',
        lastName: 'Silva',
        emails: [],
      };

      (ContactService.createContact as jest.Mock).mockResolvedValue(mockContact as any);

      const mockPipeline = {
        id: 'pipeline-1',
        tenantId,
        isDefault: true,
      };

      const mockFirstStage = {
        id: '111e4567-e89b-42d3-a456-426614174000',
        pipelineId: 'pipeline-1',
        tenantId,
        order: 1,
        probability: 25,
      };

      (mockPrisma.pipeline.findFirst as jest.Mock).mockResolvedValue(mockPipeline);
      (mockPrisma.pipelineStage.findFirst as jest.Mock).mockResolvedValue(mockFirstStage);

      const mockOpportunity = {
        id: 'opp-1',
        name: 'Oportunidade de João Silva',
        value: 50000,
        stageId: '111e4567-e89b-42d3-a456-426614174000',
      };

      (OpportunityService.createOpportunity as jest.Mock).mockResolvedValue(mockOpportunity as any);

      const updatedLead = {
        ...mockLead,
        converted: true,
        convertedAt: new Date(),
        convertedToContactId: 'contact-1',
        convertedToOpportunityId: 'opp-1',
        status: 'CONVERTED',
      };

      (mockPrisma.lead.update as jest.Mock).mockResolvedValue(updatedLead as any);

      const data: ConvertLeadData = {
        createContact: true,
        createOpportunity: true,
        opportunityData: {
          value: 50000,
        },
      };

      const result = await LeadConversionService.convertLead('550e8400-e29b-41d4-a716-446655440000', data, tenantId, requestingUserId);

      expect(ContactService.createContact).toHaveBeenCalled();
      expect(OpportunityService.createOpportunity).toHaveBeenCalled();
      expect(result.contact).toBeDefined();
      expect(result.opportunity).toBeDefined();
      expect(result.lead.converted).toBe(true);
    });
  });
});
