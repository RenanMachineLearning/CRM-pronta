/**
 * Teste obrigatório 1: criar oportunidade funciona
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpportunityForm } from '../OpportunityForm';
import { createOpportunity } from '../../services/opportunityService';
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

describe('OpportunityForm - Criar Oportunidade', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDefaultPipeline).mockResolvedValue(mockPipeline);
  });

  it('deve criar oportunidade com dados válidos', async () => {
    vi.mocked(createOpportunity).mockResolvedValue({
      id: '1',
      tenantId: 'tenant-1',
      name: 'Oportunidade Teste',
      value: 50000,
      currency: 'BRL',
      stageId: 'stage-1',
      status: 'OPEN',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    } as any);

    render(<OpportunityForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/nome da oportunidade/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/nome da oportunidade/i), {
      target: { value: 'Oportunidade Teste' },
    });
    fireEvent.change(screen.getByLabelText(/valor/i), {
      target: { value: '50000' },
    });
    fireEvent.change(screen.getByLabelText(/estágio/i), {
      target: { value: 'stage-1' },
    });

    const submitButton = screen.getByText(/criar oportunidade/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Verificar que dados foram passados corretamente
    const callArgs = mockOnSubmit.mock.calls[0][0];
    expect(callArgs.name).toBe('Oportunidade Teste');
    expect(callArgs.value).toBe(50000);
    expect(callArgs.stageId).toBe('stage-1');
    expect(callArgs.status).toBe('OPEN');
  });

  it('deve validar que nome é obrigatório', async () => {
    render(<OpportunityForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/nome da oportunidade/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByText(/criar oportunidade/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('deve validar que valor é obrigatório', async () => {
    render(<OpportunityForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/nome da oportunidade/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/nome da oportunidade/i), {
      target: { value: 'Oportunidade Teste' },
    });

    const submitButton = screen.getByText(/criar oportunidade/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/valor é obrigatório/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('deve validar que valor deve ser positivo', async () => {
    render(<OpportunityForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/nome da oportunidade/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/nome da oportunidade/i), {
      target: { value: 'Oportunidade Teste' },
    });
    fireEvent.change(screen.getByLabelText(/valor/i), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByLabelText(/estágio/i), {
      target: { value: 'stage-1' },
    });

    const submitButton = screen.getByText(/criar oportunidade/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/valor.*positivo/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('deve validar que estágio é obrigatório', async () => {
    render(<OpportunityForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/nome da oportunidade/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/nome da oportunidade/i), {
      target: { value: 'Oportunidade Teste' },
    });
    fireEvent.change(screen.getByLabelText(/valor/i), {
      target: { value: '50000' },
    });

    const submitButton = screen.getByText(/criar oportunidade/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/estágio é obrigatório/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('deve validar que data não pode ser no passado', async () => {
    render(<OpportunityForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/nome da oportunidade/i)).toBeInTheDocument();
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    fireEvent.change(screen.getByLabelText(/nome da oportunidade/i), {
      target: { value: 'Oportunidade Teste' },
    });
    fireEvent.change(screen.getByLabelText(/valor/i), {
      target: { value: '50000' },
    });
    fireEvent.change(screen.getByLabelText(/estágio/i), {
      target: { value: 'stage-1' },
    });
    fireEvent.change(screen.getByLabelText(/data de fechamento/i), {
      target: { value: yesterdayStr },
    });

    const submitButton = screen.getByText(/criar oportunidade/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/data não pode ser no passado/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('deve validar que probabilidade deve estar entre 0 e 100', async () => {
    render(<OpportunityForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/nome da oportunidade/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/nome da oportunidade/i), {
      target: { value: 'Oportunidade Teste' },
    });
    fireEvent.change(screen.getByLabelText(/valor/i), {
      target: { value: '50000' },
    });
    fireEvent.change(screen.getByLabelText(/estágio/i), {
      target: { value: 'stage-1' },
    });
    fireEvent.change(screen.getByLabelText(/probabilidade/i), {
      target: { value: '150' },
    });

    const submitButton = screen.getByText(/criar oportunidade/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/probabilidade deve estar entre 0 e 100/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('deve exibir erro se pipeline não encontrado', async () => {
    vi.mocked(getDefaultPipeline).mockResolvedValue(null);

    render(<OpportunityForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(
        screen.getByText(/pipeline padrão não encontrado/i)
      ).toBeInTheDocument();
    });

    const submitButton = screen.getByText(/criar oportunidade/i);
    expect(submitButton).toBeDisabled();
  });

  it('deve exibir erro se pipeline não tem estágios', async () => {
    vi.mocked(getDefaultPipeline).mockResolvedValue({
      ...mockPipeline,
      stages: [],
    });

    render(<OpportunityForm onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(
        screen.getByText(/pipeline padrão não encontrado/i)
      ).toBeInTheDocument();
    });

    const submitButton = screen.getByText(/criar oportunidade/i);
    expect(submitButton).toBeDisabled();
  });
});
