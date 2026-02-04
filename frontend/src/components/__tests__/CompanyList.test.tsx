/**
 * Testes para componente CompanyList
 * Teste obrigatório 1: listagem de empresas funciona
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompanyList } from '../CompanyList';
import { useCompanies } from '../../hooks/useCompanies';

// Mock do hook
vi.mock('../../hooks/useCompanies');

describe('CompanyList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve exibir lista de empresas', async () => {
    // Mock de dados
    const mockCompanies = [
      {
        id: '1',
        name: 'Empresa XYZ',
        website: 'https://example.com',
        industry: 'Tecnologia',
        size: 'MEDIUM' as const,
        status: 'ACTIVE' as const,
        contactsCount: 5,
        tags: [{ id: 'tag-1', name: 'Cliente', color: '#3B82F6' }],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    // Mock do hook
    vi.mocked(useCompanies).mockReturnValue({
      companies: mockCompanies,
      loading: false,
      error: null,
      pagination: { total: 1, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: vi.fn(),
      setAdvancedFilters: vi.fn(),
    });

    render(<CompanyList />);

    await waitFor(() => {
      expect(screen.getByText('Empresa XYZ')).toBeInTheDocument();
    });

    // Verificar que colunas são exibidas
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('Indústria')).toBeInTheDocument();
    expect(screen.getByText('Tamanho')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Contatos')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('deve exibir loading durante carregamento', () => {
    vi.mocked(useCompanies).mockReturnValue({
      companies: [],
      loading: true,
      error: null,
      pagination: { total: 0, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: vi.fn(),
      setAdvancedFilters: vi.fn(),
    });

    render(<CompanyList />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('deve exibir erro quando ocorrer falha', () => {
    vi.mocked(useCompanies).mockReturnValue({
      companies: [],
      loading: false,
      error: 'Erro ao carregar empresas',
      pagination: { total: 0, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: vi.fn(),
      setAdvancedFilters: vi.fn(),
    });

    render(<CompanyList />);
    expect(screen.getByText('Erro ao carregar empresas')).toBeInTheDocument();
  });

  it('deve exibir mensagem quando não há empresas', () => {
    vi.mocked(useCompanies).mockReturnValue({
      companies: [],
      loading: false,
      error: null,
      pagination: { total: 0, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: vi.fn(),
      setAdvancedFilters: vi.fn(),
    });

    render(<CompanyList />);
    expect(screen.getByText('Nenhuma empresa encontrada')).toBeInTheDocument();
  });
});

