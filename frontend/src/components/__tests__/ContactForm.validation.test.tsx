/**
 * Teste obrigatório 3: validação de campos funciona
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';;
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactForm } from '../ContactForm';

vi.mock('../../services/contactService', () => ({
  getContactById: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
}));

vi.mock('../../services/tagService', () => ({
  listTags: vi.fn().mockResolvedValue([]),
}));

describe('ContactForm - Validação', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve exibir erro quando nome e sobrenome estão vazios', async () => {
    render(<ContactForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByText(/criar contato/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nome ou sobrenome é obrigatório/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('deve permitir criar contato apenas com firstName', async () => {
    render(<ContactForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'João' } });
    
    const submitButton = screen.getByText(/criar contato/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('deve permitir criar contato apenas com lastName', async () => {
    render(<ContactForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/sobrenome/i), { target: { value: 'Silva' } });
    
    const submitButton = screen.getByText(/criar contato/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
});

