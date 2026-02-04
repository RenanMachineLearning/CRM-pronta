/**
 * Testes para componente ConvertLeadModal
 * Teste obrigatório: modal de conversão funciona
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConvertLeadModal } from '../ConvertLeadModal';
import { convertLead } from '../../services/leadService';
import { getDefaultPipeline } from '../../services/pipelineService';
import type { ConvertLeadResponse } from '../../types/lead';
import type { Pipeline } from '../../types/opportunity';

// Mock dos serviços
vi.mock('../../services/leadService', () => ({
  convertLead: vi.fn(),
}));

vi.mock('../../services/pipelineService', () => ({
  getDefaultPipeline: vi.fn(),
}));

describe('ConvertLeadModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const leadId = 'lead-1';
  const leadName = 'João Silva';

  const mockPipeline: Pipeline = {
    id: 'pipeline-1',
    tenantId: 'tenant-1',
    name: 'Pipeline Padrão',
    isDefault: true,
    stages: [
      { id: 'stage-1', pipelineId: 'pipeline-1', tenantId: 'tenant-1', name: 'Qualificação', order: 1, probability: 25, color: '#3B82F6', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'stage-2', pipelineId: 'pipeline-1', tenantId: 'tenant-1', name: 'Proposta', order: 2, probability: 50, color: '#10B981', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDefaultPipeline).mockResolvedValue(mockPipeline);
  });

  describe('Renderização', () => {
    it('não renderiza quando isOpen = false', () => {
      render(
        <ConvertLeadModal
          isOpen={false}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      expect(screen.queryByText(/converter lead/i)).not.toBeInTheDocument();
    });

    it('renderiza quando isOpen = true', async () => {
      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`Converter Lead: ${leadName}`, 'i'))).toBeInTheDocument();
      });
    });

    it('exibe nome do lead no título', async () => {
      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(new RegExp(leadName, 'i'))).toBeInTheDocument();
      });
    });

    it('exibe checkboxes "Criar Contato" e "Criar Oportunidade"', async () => {
      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Contato')).toBeInTheDocument();
        expect(screen.getByText('Criar Oportunidade')).toBeInTheDocument();
      });
    });
  });

  describe('Validação', () => {
    it('exibe erro ao submeter sem nenhum checkbox marcado', async () => {
      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Contato')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Converter');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/selecione pelo menos uma opção/i)).toBeInTheDocument();
      });

      expect(convertLead).not.toHaveBeenCalled();
    });

    it('exibe erro ao submeter com createOpportunity = true sem value', async () => {
      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Oportunidade')).toBeInTheDocument();
      });

      const createOpportunityCheckbox = screen.getByText('Criar Oportunidade').closest('label')?.querySelector('input[type="checkbox"]');
      if (createOpportunityCheckbox) {
        fireEvent.click(createOpportunityCheckbox);
      }

      await waitFor(() => {
        expect(screen.getByLabelText(/valor/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Converter');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/valor é obrigatório/i)).toBeInTheDocument();
      });

      expect(convertLead).not.toHaveBeenCalled();
    });

    it('exibe erro ao submeter com value = 0', async () => {
      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Oportunidade')).toBeInTheDocument();
      });

      const createOpportunityCheckbox = screen.getByText('Criar Oportunidade').closest('label')?.querySelector('input[type="checkbox"]');
      if (createOpportunityCheckbox) {
        fireEvent.click(createOpportunityCheckbox);
      }

      await waitFor(() => {
        const valueInput = screen.getByLabelText(/valor/i);
        fireEvent.change(valueInput, { target: { value: '0' } });
      });

      const submitButton = screen.getByText('Converter');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/valor deve ser um número positivo maior que zero/i)).toBeInTheDocument();
      });

      expect(convertLead).not.toHaveBeenCalled();
    });

    it('exibe erro ao submeter com closeDate no passado', async () => {
      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Oportunidade')).toBeInTheDocument();
      });

      const createOpportunityCheckbox = screen.getByText('Criar Oportunidade').closest('label')?.querySelector('input[type="checkbox"]');
      if (createOpportunityCheckbox) {
        fireEvent.click(createOpportunityCheckbox);
      }

      await waitFor(() => {
        const valueInput = screen.getByLabelText(/valor/i);
        fireEvent.change(valueInput, { target: { value: '1000' } });

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateInput = screen.getByLabelText(/data de fechamento/i);
        fireEvent.change(dateInput, { target: { value: yesterday.toISOString().split('T')[0] } });
      });

      const submitButton = screen.getByText('Converter');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/data não pode ser no passado/i)).toBeInTheDocument();
      });

      expect(convertLead).not.toHaveBeenCalled();
    });

    it('exibe erro ao submeter com probability > 100', async () => {
      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Oportunidade')).toBeInTheDocument();
      });

      const createOpportunityCheckbox = screen.getByText('Criar Oportunidade').closest('label')?.querySelector('input[type="checkbox"]');
      if (createOpportunityCheckbox) {
        fireEvent.click(createOpportunityCheckbox);
      }

      await waitFor(() => {
        const valueInput = screen.getByLabelText(/valor/i);
        fireEvent.change(valueInput, { target: { value: '1000' } });

        const probabilityInput = screen.getByLabelText(/probabilidade/i);
        fireEvent.change(probabilityInput, { target: { value: '150' } });
      });

      const submitButton = screen.getByText('Converter');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/probabilidade deve estar entre 0 e 100/i)).toBeInTheDocument();
      });

      expect(convertLead).not.toHaveBeenCalled();
    });
  });

  describe('Conversão bem-sucedida', () => {
    it('chama convertLead com createContact: true ao marcar apenas "Criar Contato"', async () => {
      const mockResponse: ConvertLeadResponse = {
        lead: {
          id: leadId,
          tenantId: 'tenant-1',
          firstName: 'João',
          lastName: 'Silva',
          status: 'CONVERTED',
          converted: true,
          convertedAt: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        } as any,
        contact: {
          id: 'contact-1',
          firstName: 'João',
          lastName: 'Silva',
        },
      };

      vi.mocked(convertLead).mockResolvedValue(mockResponse);

      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Contato')).toBeInTheDocument();
      });

      const createContactCheckbox = screen.getByText('Criar Contato').closest('label')?.querySelector('input[type="checkbox"]');
      if (createContactCheckbox) {
        fireEvent.click(createContactCheckbox);
      }

      const submitButton = screen.getByText('Converter');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(convertLead).toHaveBeenCalledWith(leadId, {
          createContact: true,
          createOpportunity: false,
          opportunityData: undefined,
        });
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('chama convertLead com createOpportunity: true e opportunityData ao marcar "Criar Oportunidade"', async () => {
      const mockResponse: ConvertLeadResponse = {
        lead: {
          id: leadId,
          tenantId: 'tenant-1',
          firstName: 'João',
          lastName: 'Silva',
          status: 'CONVERTED',
          converted: true,
          convertedAt: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        } as any,
        opportunity: {
          id: 'opp-1',
          name: 'Oportunidade - João Silva',
          value: 5000,
        },
      };

      vi.mocked(convertLead).mockResolvedValue(mockResponse);

      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Oportunidade')).toBeInTheDocument();
      });

      const createOpportunityCheckbox = screen.getByText('Criar Oportunidade').closest('label')?.querySelector('input[type="checkbox"]');
      if (createOpportunityCheckbox) {
        fireEvent.click(createOpportunityCheckbox);
      }

      await waitFor(() => {
        const valueInput = screen.getByLabelText(/valor/i);
        fireEvent.change(valueInput, { target: { value: '5000' } });
      });

      const submitButton = screen.getByText('Converter');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(convertLead).toHaveBeenCalledWith(leadId, expect.objectContaining({
          createContact: false,
          createOpportunity: true,
          opportunityData: expect.objectContaining({
            value: 5000,
          }),
        }));
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Erros do backend', () => {
    it('exibe mensagem específica quando lead já convertido (409)', async () => {
      const error = new Error('Lead já convertido');
      vi.mocked(convertLead).mockRejectedValue(error);

      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Contato')).toBeInTheDocument();
      });

      const createContactCheckbox = screen.getByText('Criar Contato').closest('label')?.querySelector('input[type="checkbox"]');
      if (createContactCheckbox) {
        fireEvent.click(createContactCheckbox);
      }

      const submitButton = screen.getByText('Converter');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/este lead já foi convertido anteriormente/i)).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('exibe mensagem quando lead não encontrado (404)', async () => {
      const error = new Error('Lead não encontrado');
      vi.mocked(convertLead).mockRejectedValue(error);

      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Contato')).toBeInTheDocument();
      });

      const createContactCheckbox = screen.getByText('Criar Contato').closest('label')?.querySelector('input[type="checkbox"]');
      if (createContactCheckbox) {
        fireEvent.click(createContactCheckbox);
      }

      const submitButton = screen.getByText('Converter');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/lead não encontrado/i)).toBeInTheDocument();
      });
    });

    it('exibe erro quando pipeline não encontrado', async () => {
      vi.mocked(getDefaultPipeline).mockResolvedValue(null);

      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/pipeline padrão não encontrado/i)).toBeInTheDocument();
      });

      const createOpportunityCheckbox = screen.getByText('Criar Oportunidade').closest('label')?.querySelector('input[type="checkbox"]');
      expect(createOpportunityCheckbox).toBeDisabled();
    });
  });

  describe('Carregamento de pipeline', () => {
    it('carrega pipeline ao abrir modal', async () => {
      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(getDefaultPipeline).toHaveBeenCalled();
      });
    });

    it('popula estágios no Select de stageId', async () => {
      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Oportunidade')).toBeInTheDocument();
      });

      const createOpportunityCheckbox = screen.getByText('Criar Oportunidade').closest('label')?.querySelector('input[type="checkbox"]');
      if (createOpportunityCheckbox) {
        fireEvent.click(createOpportunityCheckbox);
      }

      await waitFor(() => {
        expect(screen.getByText('Qualificação')).toBeInTheDocument();
        expect(screen.getByText('Proposta')).toBeInTheDocument();
      });
    });
  });

  describe('Sugestão de nome', () => {
    it('preenche sugestão de nome automaticamente quando "Criar Oportunidade" é marcado', async () => {
      render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Oportunidade')).toBeInTheDocument();
      });

      const createOpportunityCheckbox = screen.getByText('Criar Oportunidade').closest('label')?.querySelector('input[type="checkbox"]');
      if (createOpportunityCheckbox) {
        fireEvent.click(createOpportunityCheckbox);
      }

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/nome da oportunidade/i) as HTMLInputElement;
        expect(nameInput.value).toContain('Oportunidade');
        expect(nameInput.value).toContain(leadName);
      });
    });
  });

  describe('Resetar formulário', () => {
    it('reseta formulário ao fechar modal', async () => {
      const { rerender } = render(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Criar Contato')).toBeInTheDocument();
      });

      const createContactCheckbox = screen.getByText('Criar Contato').closest('label')?.querySelector('input[type="checkbox"]');
      if (createContactCheckbox) {
        fireEvent.click(createContactCheckbox);
      }

      // Fechar modal
      rerender(
        <ConvertLeadModal
          isOpen={false}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      // Abrir novamente
      rerender(
        <ConvertLeadModal
          isOpen={true}
          onClose={mockOnClose}
          leadId={leadId}
          leadName={leadName}
        />
      );

      await waitFor(() => {
        const createContactCheckboxAfter = screen.getByText('Criar Contato').closest('label')?.querySelector('input[type="checkbox"]') as HTMLInputElement;
        expect(createContactCheckboxAfter?.checked).toBe(false);
      });
    });
  });
});
