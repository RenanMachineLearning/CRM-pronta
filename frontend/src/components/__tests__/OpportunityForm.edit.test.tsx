/**
 * Teste obrigatório 2: editar oportunidade funciona
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';;
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpportunityForm } from '../OpportunityForm';
import { getOpportunityById, updateOpportunity } from '../../services/opportunityService';
import { getDefaultPipeline } from '../../services/pipelineService';

vi.mock('../../services/opportunityService', () => ({
  getOpportunityById: vi.fn(),
  createOpportunity: vi.fn(),
  updateOpportunity: vi.fn(),
}));

vi.mock('../../services/pipelineService', () => ({
  getDefaultPipeline: vi.fn(),
}));

vi.mock('../../services/tagService', () => ({
  listTags: vi.fn().mockResolvedValue([]),
}));

describe('OpportunityForm - Editar Oportunidade', () => {
  const mockOnSubmit = vi.fn();
  const mockPipeline = {
    id: 'pipeline-1',
    tenantId: 'tenant-1',
    name: 'Pipeline de Vendas',
    isDefault: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    stages: [
      {
        id: 'stage-1',
        pipelineId: 'pipeline-1',
        tenantId: 'tenant-1',
        name: 'Qualificação',
        order: 1,
        probability: 20,
        color: '#3B82F6',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'stage-2',
        pipelineId: 'pipeline-1',
        tenantId: 'tenant-1',
        name: 'Proposta',
        order: 2,
        probability: 50,
        color: '#10B981',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
  };

  const mockOpportunity = {
    id: '1',
    tenantId: 'tenant-1',
    name: 'Oportunidade Teste',
    value: 50000,
    currency: 'BRL',
    stageId: 'stage-1',
    status: 'OPEN',
    closeDate: '2024-12-31T00:00:00.000Z',
    probability: 75,
    contactId: 'contact-1',
    contact: {
      id: 'contact-1',
      firstName: 'João',
      lastName: 'Silva',
    },
    companyId: 'company-1',
    company: {
      id: 'company-1',
      name: 'Empresa XYZ',
    },
    tags: [
      { id: 'tag-1', name: 'Cliente', color: '#3B82F6' },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDefaultPipeline).mockResolvedValue(mockPipeline);
    vi.mocked(getOpportunityById).mockResolvedValue(mockOpportunity as any);
  });

  it('deve carregar dados da oportunidade ao editar', async () => {
    render(<OpportunityForm opportunityId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(getOpportunityById).toHaveBeenCalledWith('1');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Oportunidade Teste')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('stage-1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('OPEN')).toBeInTheDocument();
  });

  it('deve atualizar oportunidade com dados modificados', async () => {
    vi.mocked(updateOpportunity).mockResolvedValue({
      ...mockOpportunity,
      name: 'Oportunidade Atualizada',
    } as any);

    render(<OpportunityForm opportunityId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Oportunidade Teste')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/nome da oportunidade/i);
    fireEvent.change(nameInput, { target: { value: 'Oportunidade Atualizada' } });

    const submitButton = screen.getByText(/atualizar oportunidade/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Verificar que dados modificados foram passados
    const callArgs = mockOnSubmit.mock.calls[0][0];
    expect(callArgs.name).toBe('Oportunidade Atualizada');
  });

  it('deve formatar data de fechamento corretamente no modo edição', async () => {
    render(<OpportunityForm opportunityId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Oportunidade Teste')).toBeInTheDocument();
    });

    // Verificar que data está formatada como YYYY-MM-DD (formato do input type="date")
    const dateInput = screen.getByLabelText(/data de fechamento/i) as HTMLInputElement;
    expect(dateInput.value).toBe('2024-12-31');
  });

  it('deve exibir contato no ContactLookup no modo edição', async () => {
    render(<OpportunityForm opportunityId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Oportunidade Teste')).toBeInTheDocument();
    });

    // Verificar que ContactLookup recebe o nome do contato
    const contactInput = screen.getByPlaceholderText(/buscar contato/i) as HTMLInputElement;
    expect(contactInput.value).toBe('João Silva');
  });

  it('deve exibir empresa no CompanyLookup no modo edição', async () => {
    render(<OpportunityForm opportunityId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Oportunidade Teste')).toBeInTheDocument();
    });

    // Verificar que CompanyLookup recebe o nome da empresa
    const companyInput = screen.getByPlaceholderText(/buscar empresa/i) as HTMLInputElement;
    expect(companyInput.value).toBe('Empresa XYZ');
  });

  it('deve exibir erro se oportunidade não encontrada', async () => {
    vi.mocked(getOpportunityById).mockRejectedValue(new Error('Oportunidade não encontrada'));

    render(<OpportunityForm opportunityId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar oportunidade/i)).toBeInTheDocument();
    });
  });
});
