/**
 * Teste obrigatório 1: criar lead funciona
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';;
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadForm } from '../LeadForm';
import { createLead } from '../../services/leadService';

vi.mock('../../services/leadService', () => ({
  getLeadById: vi.fn(),
  createLead: vi.fn(),
  updateLead: vi.fn(),
}));

vi.mock('../../services/tagService', () => ({
  listTags: vi.fn().mockResolvedValue([]),
}));

describe('LeadForm - Criar Lead', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar lead com dados válidos', async () => {
    vi.mocked(createLead).mockResolvedValue({
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
      tags: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    } as any);

    render(<LeadForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'João' } });
    fireEvent.change(screen.getByLabelText(/sobrenome/i), { target: { value: 'Silva' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'joao@example.com' } });
    fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '11999999999' } });
    fireEvent.change(screen.getByLabelText(/empresa/i), { target: { value: 'Empresa A' } });
    fireEvent.change(screen.getByLabelText(/origem/i), { target: { value: 'Website' } });
    
    const submitButton = screen.getByText(/criar lead/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Verificar que dados foram passados corretamente
    const callArgs = mockOnSubmit.mock.calls[0][0];
    expect(callArgs.firstName).toBe('João');
    expect(callArgs.lastName).toBe('Silva');
    expect(callArgs.email).toBe('joao@example.com');
    expect(callArgs.phone).toBe('11999999999');
    expect(callArgs.company).toBe('Empresa A');
    expect(callArgs.source).toBe('Website');
    expect(callArgs.status).toBe('NEW');
  });

  it('deve validar que pelo menos nome ou sobrenome é obrigatório', async () => {
    render(<LeadForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByText(/criar lead/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nome ou sobrenome é obrigatório/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('deve validar formato de email', async () => {
    render(<LeadForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'João' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'email-invalido' } });
    
    const submitButton = screen.getByText(/criar lead/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/formato de email inválido/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('deve validar formato de telefone', async () => {
    render(<LeadForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'João' } });
    fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '123' } });
    
    const submitButton = screen.getByText(/criar lead/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/formato de telefone inválido/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('deve desabilitar botão durante submit', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(createLead).mockReturnValue(promise as any);

    render(<LeadForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'João' } });
    
    const submitButton = screen.getByText(/criar lead/i);
    fireEvent.click(submitButton);

    // Verificar que botão está desabilitado durante submit
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // Resolver a promise para completar o teste
    resolvePromise!({
      id: '1',
      tenantId: 'tenant-1',
      firstName: 'João',
      status: 'NEW',
      converted: false,
      tags: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    });

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('deve exibir erro do backend quando API retorna erro', async () => {
    const backendError = new Error('Email já está em uso');
    vi.mocked(createLead).mockRejectedValue(backendError);

    render(<LeadForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'João' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'joao@example.com' } });
    
    const submitButton = screen.getByText(/criar lead/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email já está em uso/i)).toBeInTheDocument();
    });
  });
});
