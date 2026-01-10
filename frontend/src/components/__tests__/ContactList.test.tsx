/**
 * Testes para componente ContactList
 * Teste obrigatório 1: listagem de contatos funciona
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactList } from '../ContactList';
import { useContacts } from '../../hooks/useContacts';

// Mock do hook
vi.mock('../../hooks/useContacts');

describe('ContactList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve exibir lista de contatos', async () => {
    // Mock de dados
    const mockContacts = [
      {
        id: '1',
        tenantId: 'tenant-1',
        firstName: 'João',
        lastName: 'Silva',
        emails: [{ id: '1', email: 'joao@example.com', isPrimary: true, type: 'WORK', createdAt: '2024-01-01', updatedAt: '2024-01-01' }],
        phones: [],
        tags: [],
        status: 'ACTIVE',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    // Mock do hook
    vi.mocked(useContacts).mockReturnValue({
      contacts: mockContacts,
      loading: false,
      error: null,
      pagination: { total: 1, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: vi.fn(),
    });

    render(<ContactList />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    // Verificar que colunas são exibidas
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Telefone')).toBeInTheDocument();
    expect(screen.getByText('Empresa')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('deve exibir loading durante carregamento', () => {
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      loading: true,
      error: null,
      pagination: { total: 0, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: vi.fn(),
    });

    render(<ContactList />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('deve exibir erro quando ocorrer falha', () => {
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      loading: false,
      error: 'Erro ao carregar contatos',
      pagination: { total: 0, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: vi.fn(),
    });

    render(<ContactList />);
    expect(screen.getByText('Erro ao carregar contatos')).toBeInTheDocument();
  });

  it('deve exibir mensagem quando não há contatos', () => {
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      loading: false,
      error: null,
      pagination: { total: 0, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: vi.fn(),
    });

    render(<ContactList />);
    expect(screen.getByText('Nenhum contato encontrado')).toBeInTheDocument();
  });
});

