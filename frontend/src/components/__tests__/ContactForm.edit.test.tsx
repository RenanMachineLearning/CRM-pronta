/**
 * Teste obrigatório 2: editar contato funciona
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactForm } from '../ContactForm';
import { getContactById, updateContact } from '../../services/contactService';

vi.mock('../../services/contactService', () => ({
  getContactById: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
}));

vi.mock('../../services/tagService', () => ({
  listTags: vi.fn().mockResolvedValue([]),
}));

describe('ContactForm - Editar Contato', () => {
  const mockOnSubmit = vi.fn();
  const mockContact = {
    id: '1',
    tenantId: 'tenant-1',
    firstName: 'João',
    lastName: 'Silva',
    title: 'Gerente',
    status: 'ACTIVE',
    companyId: 'company-1',
    company: { id: 'company-1', name: 'Empresa XYZ' },
    emails: [{ id: '1', email: 'joao@example.com', type: 'WORK', isPrimary: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' }],
    phones: [{ id: '1', phone: '11999999999', type: 'MOBILE', isPrimary: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' }],
    tags: [{ id: 'tag-1', name: 'Cliente', color: '#3B82F6' }],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getContactById).mockResolvedValue(mockContact);
  });

  it('deve carregar dados do contato ao editar', async () => {
    render(<ContactForm contactId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(getContactById).toHaveBeenCalledWith('1');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('João')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Silva')).toBeInTheDocument();
    });
  });

  it('deve atualizar contato com dados modificados', async () => {
    vi.mocked(updateContact).mockResolvedValue({ ...mockContact, firstName: 'Maria' } as any);

    render(<ContactForm contactId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('João')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/nome/i);
    fireEvent.change(nameInput, { target: { value: 'Maria' } });
    
    const submitButton = screen.getByText(/atualizar contato/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Verificar que dados modificados foram passados
    const callArgs = mockOnSubmit.mock.calls[0][0];
    expect(callArgs.firstName).toBe('Maria');
  });
});

