/**
 * Teste obrigatório 2 (criação): criar/editar empresa funciona
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompanyForm } from '../CompanyForm';
import { createCompany } from '../../services/companyService';

vi.mock('../../services/companyService', () => ({
  getCompanyById: vi.fn(),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
}));

vi.mock('../../services/tagService', () => ({
  listTags: vi.fn().mockResolvedValue([]),
}));

describe('CompanyForm - Criar Empresa', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar empresa com dados válidos', async () => {
    vi.mocked(createCompany).mockResolvedValue({
      id: '1',
      name: 'Empresa XYZ',
      status: 'ACTIVE',
      addresses: [],
      tags: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    } as any);

    render(<CompanyForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Empresa XYZ' } });
    
    const submitButton = screen.getByText(/criar empresa/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Verificar que dados foram passados corretamente
    const callArgs = mockOnSubmit.mock.calls[0][0];
    expect(callArgs.name).toBe('Empresa XYZ');
    expect(callArgs.status).toBe('ACTIVE');
  });
});

