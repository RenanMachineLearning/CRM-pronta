/**
 * Teste obrigatório 2: editar lead funciona
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';;
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadForm } from '../LeadForm';
import { getLeadById, updateLead } from '../../services/leadService';

vi.mock('../../services/leadService', () => ({
  getLeadById: vi.fn(),
  createLead: vi.fn(),
  updateLead: vi.fn(),
}));

vi.mock('../../services/tagService', () => ({
  listTags: vi.fn().mockResolvedValue([]),
}));

describe('LeadForm - Editar Lead', () => {
  const mockOnSubmit = vi.fn();
  const mockLead = {
    id: '1',
    tenantId: 'tenant-1',
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao@example.com',
    phone: '11999999999',
    company: 'Empresa A',
    source: 'Website',
    status: 'NEW',
    converted: false,
    tags: [{ id: 'tag-1', name: 'Cliente', color: '#3B82F6' }],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLeadById).mockResolvedValue(mockLead);
  });

  it('deve carregar dados do lead ao editar', async () => {
    render(<LeadForm leadId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(getLeadById).toHaveBeenCalledWith('1');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('João')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Silva')).toBeInTheDocument();
      expect(screen.getByDisplayValue('joao@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('11999999999')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Empresa A')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Website')).toBeInTheDocument();
    });
  });

  it('deve atualizar lead com dados modificados', async () => {
    vi.mocked(updateLead).mockResolvedValue({ ...mockLead, firstName: 'Maria' } as any);

    render(<LeadForm leadId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('João')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/nome/i);
    fireEvent.change(nameInput, { target: { value: 'Maria' } });
    
    const submitButton = screen.getByText(/atualizar lead/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Verificar que dados modificados foram passados
    const callArgs = mockOnSubmit.mock.calls[0][0];
    expect(callArgs.firstName).toBe('Maria');
  });

  it('deve desabilitar campo status quando lead está convertido', async () => {
    const convertedLead = { ...mockLead, converted: true, status: 'CONVERTED' as const };
    vi.mocked(getLeadById).mockResolvedValue(convertedLead);

    render(<LeadForm leadId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('João')).toBeInTheDocument();
    });

    // Verificar que campo status está desabilitado
    const statusSelect = screen.getByLabelText(/status/i);
    expect(statusSelect).toBeDisabled();
  });

  it('deve exibir erro quando lead não é encontrado (404)', async () => {
    vi.mocked(getLeadById).mockRejectedValue(new Error('Lead não encontrado'));

    render(<LeadForm leadId="999" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByText(/lead não encontrado/i)).toBeInTheDocument();
    });
  });
});
