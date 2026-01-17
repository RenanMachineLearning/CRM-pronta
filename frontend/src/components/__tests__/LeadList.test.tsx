/**
 * Testes para componente LeadList
 * Teste obrigatório 1: listagem de leads funciona
 * Teste obrigatório 2: filtros funcionam
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { LeadList } from '../LeadList';
import { useLeads } from '../../hooks/useLeads';
import type { Lead, LeadStatus } from '../../types/lead';

// Mock do hook
vi.mock('../../hooks/useLeads');

describe('LeadList', () => {
  const mockSetFilters = vi.fn();
  const mockSetPagination = vi.fn();
  const mockRefetch = vi.fn();

  const mockLeads: Lead[] = [
    {
      id: '1',
      tenantId: 'tenant1',
      firstName: 'João',
      lastName: 'Silva',
      email: 'joao@example.com',
      phone: null,
      company: 'Empresa A',
      source: 'Website',
      status: 'NEW' as LeadStatus,
      converted: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      tags: [],
    },
    {
      id: '2',
      tenantId: 'tenant1',
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria@example.com',
      phone: null,
      company: 'Empresa B',
      source: 'Referência',
      status: 'QUALIFIED' as LeadStatus,
      converted: true,
      convertedAt: '2024-01-02T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      tags: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TESTE OBRIGATÓRIO 1: listagem de leads funciona
  it('deve exibir lista de leads', async () => {
    vi.mocked(useLeads).mockReturnValue({
      leads: mockLeads,
      loading: false,
      error: null,
      pagination: { total: 2, limit: 20, offset: 0 },
      refetch: mockRefetch,
      setFilters: mockSetFilters,
      setPagination: mockSetPagination,
    });

    render(<LeadList />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    // Verificar que colunas são exibidas
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Empresa')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Origem')).toBeInTheDocument();
    expect(screen.getByText('Ações')).toBeInTheDocument();

    // Verificar que dados são exibidos
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@example.com')).toBeInTheDocument();
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('Novo')).toBeInTheDocument(); // Status traduzido

    // Verificar segundo lead
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('Qualificado')).toBeInTheDocument(); // Status traduzido
  });

  it('deve exibir loading durante carregamento', () => {
    vi.mocked(useLeads).mockReturnValue({
      leads: [],
      loading: true,
      error: null,
      pagination: { total: 0, limit: 20, offset: 0 },
      refetch: mockRefetch,
      setFilters: mockSetFilters,
      setPagination: mockSetPagination,
    });

    render(<LeadList />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('deve exibir erro quando ocorrer falha', () => {
    vi.mocked(useLeads).mockReturnValue({
      leads: [],
      loading: false,
      error: 'Erro ao carregar leads',
      pagination: { total: 0, limit: 20, offset: 0 },
      refetch: mockRefetch,
      setFilters: mockSetFilters,
      setPagination: mockSetPagination,
    });

    render(<LeadList />);
    expect(screen.getByText('Erro ao carregar leads')).toBeInTheDocument();
  });

  it('deve exibir mensagem quando não há leads', () => {
    vi.mocked(useLeads).mockReturnValue({
      leads: [],
      loading: false,
      error: null,
      pagination: { total: 0, limit: 20, offset: 0 },
      refetch: mockRefetch,
      setFilters: mockSetFilters,
      setPagination: mockSetPagination,
    });

    render(<LeadList />);
    expect(screen.getByText('Nenhum lead encontrado')).toBeInTheDocument();
  });

  it('deve exibir botão "Converter" apenas para leads não convertidos', () => {
    vi.mocked(useLeads).mockReturnValue({
      leads: mockLeads,
      loading: false,
      error: null,
      pagination: { total: 2, limit: 20, offset: 0 },
      refetch: mockRefetch,
      setFilters: mockSetFilters,
      setPagination: mockSetPagination,
    });

    const handleConvert = vi.fn();
    render(<LeadList onConvertLead={handleConvert} />);

    // Deve ter botão "Converter" para lead não convertido (João)
    const convertButtons = screen.getAllByText('Converter');
    expect(convertButtons.length).toBe(1); // Apenas um lead não convertido

    // Lead convertido (Maria) não deve ter botão
    expect(screen.queryByText('Maria Santos')).toBeInTheDocument();
  });

  // TESTE OBRIGATÓRIO 2: filtros funcionam
  it('deve aplicar filtro de status', async () => {
    const user = userEvent.setup();

    vi.mocked(useLeads).mockReturnValue({
      leads: [mockLeads[0]], // Apenas lead com status NEW
      loading: false,
      error: null,
      pagination: { total: 1, limit: 20, offset: 0 },
      refetch: mockRefetch,
      setFilters: mockSetFilters,
      setPagination: mockSetPagination,
    });

    render(<LeadList />);

    // Encontrar select de status
    const statusSelect = screen.getByDisplayValue('Todos os status');

    // Selecionar filtro "Novo"
    await user.selectOptions(statusSelect, 'NEW');

    // Verificar que setFilters foi chamado com status NEW
    await waitFor(() => {
      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'NEW' })
      );
    });
  });

  it('deve aplicar filtro de origem', async () => {
    const user = userEvent.setup();

    vi.mocked(useLeads).mockReturnValue({
      leads: mockLeads,
      loading: false,
      error: null,
      pagination: { total: 2, limit: 20, offset: 0 },
      refetch: mockRefetch,
      setFilters: mockSetFilters,
      setPagination: mockSetPagination,
    });

    render(<LeadList />);

    // Encontrar input de origem
    const sourceInput = screen.getByPlaceholderText('Origem...');

    // Digitar no filtro de origem
    await user.type(sourceInput, 'Website');

    // Verificar que setFilters foi chamado com source
    await waitFor(() => {
      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Website' })
      );
    });
  });

  it('deve aplicar filtro de convertido', async () => {
    const user = userEvent.setup();

    vi.mocked(useLeads).mockReturnValue({
      leads: [mockLeads[1]], // Apenas lead convertido
      loading: false,
      error: null,
      pagination: { total: 1, limit: 20, offset: 0 },
      refetch: mockRefetch,
      setFilters: mockSetFilters,
      setPagination: mockSetPagination,
    });

    render(<LeadList />);

    // Encontrar select de convertido
    const convertedSelect = screen.getByDisplayValue('Todos');

    // Selecionar filtro "Convertidos"
    await user.selectOptions(convertedSelect, 'true');

    // Verificar que setFilters foi chamado com converted: true
    await waitFor(() => {
      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({ converted: true })
      );
    });
  });

  it('deve chamar onConvertLead quando botão Converter é clicado', async () => {
    const user = userEvent.setup();
    const handleConvert = vi.fn();

    vi.mocked(useLeads).mockReturnValue({
      leads: [mockLeads[0]], // Lead não convertido
      loading: false,
      error: null,
      pagination: { total: 1, limit: 20, offset: 0 },
      refetch: mockRefetch,
      setFilters: mockSetFilters,
      setPagination: mockSetPagination,
    });

    render(<LeadList onConvertLead={handleConvert} />);

    const convertButton = screen.getByText('Converter');
    await user.click(convertButton);

    expect(handleConvert).toHaveBeenCalledWith('1');
  });

  it('deve chamar onNewLead quando botão Novo Lead é clicado', async () => {
    const user = userEvent.setup();
    const handleNewLead = vi.fn();

    vi.mocked(useLeads).mockReturnValue({
      leads: mockLeads,
      loading: false,
      error: null,
      pagination: { total: 2, limit: 20, offset: 0 },
      refetch: mockRefetch,
      setFilters: mockSetFilters,
      setPagination: mockSetPagination,
    });

    render(<LeadList onNewLead={handleNewLead} />);

    const newLeadButton = screen.getByText('Novo Lead');
    await user.click(newLeadButton);

    expect(handleNewLead).toHaveBeenCalled();
  });
});
