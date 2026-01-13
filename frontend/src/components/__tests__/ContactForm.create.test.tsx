/**
 * Teste obrigatório 1: criar contato funciona
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactForm } from '../ContactForm';
import { createContact } from '../../services/contactService';

vi.mock('../../services/contactService', () => ({
  getContactById: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
}));

vi.mock('../../services/tagService', () => ({
  listTags: vi.fn().mockResolvedValue([]),
}));

describe('ContactForm - Criar Contato', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar contato com dados válidos', async () => {
    vi.mocked(createContact).mockResolvedValue({
      id: '1',
      tenantId: 'tenant-1',
      firstName: 'João',
      lastName: 'Silva',
      status: 'ACTIVE',
      emails: [],
      phones: [],
      tags: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    } as any);

    render(<ContactForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'João' } });
    fireEvent.change(screen.getByLabelText(/sobrenome/i), { target: { value: 'Silva' } });
    
    const submitButton = screen.getByText(/criar contato/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Verificar que dados foram passados corretamente
    const callArgs = mockOnSubmit.mock.calls[0][0];
    expect(callArgs.firstName).toBe('João');
    expect(callArgs.lastName).toBe('Silva');
    expect(callArgs.status).toBe('ACTIVE');
  });
});

