/**
 * Teste obrigatório 2 (edição): criar/editar empresa funciona
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompanyForm } from '../CompanyForm';
import { getCompanyById, updateCompany } from '../../services/companyService';

vi.mock('../../services/companyService', () => ({
  getCompanyById: vi.fn(),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
}));

vi.mock('../../services/tagService', () => ({
  listTags: vi.fn().mockResolvedValue([]),
}));

describe('CompanyForm - Editar Empresa', () => {
  const mockOnSubmit = vi.fn();
  const mockCompany = {
    id: '1',
    name: 'Empresa XYZ',
    website: 'https://example.com',
    industry: 'Tecnologia',
    size: 'MEDIUM',
    status: 'ACTIVE',
    addresses: [
      {
        id: 'addr-1',
        street: 'Rua X',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        country: 'Brasil',
        type: 'BILLING',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ],
    tags: [{ id: 'tag-1', name: 'Cliente', color: '#3B82F6' }],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCompanyById).mockResolvedValue(mockCompany);
  });

  it('deve carregar dados da empresa ao editar', async () => {
    render(<CompanyForm companyId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(getCompanyById).toHaveBeenCalledWith('1');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Empresa XYZ')).toBeInTheDocument();
    });
  });

  it('deve atualizar empresa com dados modificados', async () => {
    vi.mocked(updateCompany).mockResolvedValue({ ...mockCompany, name: 'Empresa ABC' } as any);

    render(<CompanyForm companyId="1" onSubmit={mockOnSubmit} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Empresa XYZ')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/nome/i);
    fireEvent.change(nameInput, { target: { value: 'Empresa ABC' } });
    
    const submitButton = screen.getByText(/atualizar empresa/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Verificar que dados modificados foram passados
    const callArgs = mockOnSubmit.mock.calls[0][0];
    expect(callArgs.name).toBe('Empresa ABC');
  });
});

