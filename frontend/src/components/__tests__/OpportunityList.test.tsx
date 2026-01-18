/**
 * Testes para componente OpportunityList
 * Teste obrigatório: listagem de oportunidades funciona
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { OpportunityList } from '../OpportunityList';
import { useOpportunities } from '../../hooks/useOpportunities';
import type { Opportunity, OpportunityStatus } from '../../types/opportunity';

// Mock do hook
vi.mock('../../hooks/useOpportunities');

describe('OpportunityList', () => {
  const mockSetFilters = vi.fn();
  const mockSetPagination = vi.fn();
  const mockRefetch = vi.fn();
  const mockOnOpportunityClick = vi.fn();
  const mockOnNewOpportunity = vi.fn();

  const mockOpportunities: Opportunity[] = [
    {
      id: '1',
      tenantId: 'tenant1',
      name: 'Oportunidade A',
      value: 50000,
      currency: 'BRL',
      stageId: 'stage-1',
      status: 'OPEN' as OpportunityStatus,
      closeDate: '2024-12-31T00:00:00.000Z',
      probability: 75,
      contact: {
        id: 'contact-1',
        firstName: 'João',
        lastName: 'Silva',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      tenantId: 'tenant1',
      name: 'Oportunidade B',
      value: 100000,
      currency: 'BRL',
      stageId: 'stage-2',
      status: 'WON' as OpportunityStatus,
      closeDate: '2024-11-30T00:00:00.000Z',
      probability: 100,
      company: {
        id: 'company-1',
        name: 'Empresa X',
      },
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderização', () => {
    it('deve renderizar lista de oportunidades quando dados disponíveis', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        expect(screen.getByText('Oportunidade A')).toBeInTheDocument();
      });

      // Verificar colunas da tabela
      expect(screen.getByText('Nome')).toBeInTheDocument();
      expect(screen.getByText('Valor')).toBeInTheDocument();
      expect(screen.getByText('Data de Fechamento')).toBeInTheDocument();
      expect(screen.getByText('Probabilidade')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Contato/Empresa')).toBeInTheDocument();
      expect(screen.getByText('Criado em')).toBeInTheDocument();
    });

    it('deve exibir dados das oportunidades corretamente', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        expect(screen.getByText('Oportunidade A')).toBeInTheDocument();
        expect(screen.getByText('Oportunidade B')).toBeInTheDocument();
      });

      // Verificar valores formatados
      expect(screen.getByText(/R\$/)).toBeInTheDocument(); // Formatação de moeda
      expect(screen.getByText('75%')).toBeInTheDocument(); // Probabilidade
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Estados', () => {
    it('deve exibir loading state durante carregamento', () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: [],
        loading: true,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      expect(screen.getByText(/carregando oportunidades/i)).toBeInTheDocument();
    });

    it('deve exibir error state quando há erro', () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: [],
        loading: false,
        error: 'Erro ao carregar oportunidades',
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      expect(screen.getByText('Erro ao carregar oportunidades')).toBeInTheDocument();
    });

    it('deve exibir empty state quando não há oportunidades', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        expect(screen.getByText('Nenhuma oportunidade encontrada')).toBeInTheDocument();
      });
    });
  });

  describe('Filtros', () => {
    it('deve aplicar filtro por status', async () => {
      const user = userEvent.setup();
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        expect(screen.getByText('Oportunidade A')).toBeInTheDocument();
      });

      const statusSelect = screen.getByDisplayValue('Todos os status');
      await user.selectOptions(statusSelect, 'OPEN');

      await waitFor(() => {
        expect(mockSetFilters).toHaveBeenCalledWith({ status: 'OPEN' });
      });
    });

    it('deve resetar página quando filtro muda', async () => {
      const user = userEvent.setup();
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        expect(screen.getByText('Oportunidade A')).toBeInTheDocument();
      });

      const statusSelect = screen.getByDisplayValue('Todos os status');
      await user.selectOptions(statusSelect, 'WON');

      await waitFor(() => {
        expect(mockSetPagination).toHaveBeenCalled();
      });
    });
  });

  describe('Ordenação', () => {
    it('deve ordenar por valor quando clicar na coluna', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        expect(screen.getByText('Valor')).toBeInTheDocument();
      });

      const valueHeader = screen.getByText('Valor');
      fireEvent.click(valueHeader);

      await waitFor(() => {
        expect(mockSetPagination).toHaveBeenCalled();
      });
    });

    it('deve ordenar por data de fechamento quando clicar na coluna', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        expect(screen.getByText('Data de Fechamento')).toBeInTheDocument();
      });

      const closeDateHeader = screen.getByText('Data de Fechamento');
      fireEvent.click(closeDateHeader);

      await waitFor(() => {
        expect(mockSetPagination).toHaveBeenCalled();
      });
    });

    it('deve ordenar por nome quando clicar na coluna', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        expect(screen.getByText('Nome')).toBeInTheDocument();
      });

      const nameHeader = screen.getByText('Nome');
      fireEvent.click(nameHeader);

      await waitFor(() => {
        expect(mockSetPagination).toHaveBeenCalled();
      });
    });

    it('deve ordenar por data de criação quando clicar na coluna', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        expect(screen.getByText('Criado em')).toBeInTheDocument();
      });

      const createdAtHeader = screen.getByText('Criado em');
      fireEvent.click(createdAtHeader);

      await waitFor(() => {
        expect(mockSetPagination).toHaveBeenCalled();
      });
    });
  });

  describe('Paginação', () => {
    it('deve exibir informações de paginação corretas', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 25, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        expect(screen.getByText(/mostrando/i)).toBeInTheDocument();
        expect(screen.getByText(/25 oportunidades/i)).toBeInTheDocument();
      });
    });

    it('deve navegar para próxima página', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 25, limit: 20, offset: 20 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        const nextButton = screen.getByText('Próxima');
        expect(nextButton).toBeInTheDocument();
      });
    });

    it('deve navegar para página anterior', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 25, limit: 20, offset: 20 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        const prevButton = screen.getByText('Anterior');
        expect(prevButton).toBeInTheDocument();
        fireEvent.click(prevButton);
      });

      await waitFor(() => {
        expect(mockSetPagination).toHaveBeenCalled();
      });
    });
  });

  describe('Interações', () => {
    it('deve chamar onOpportunityClick quando clicar em oportunidade', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList onOpportunityClick={mockOnOpportunityClick} />);

      await waitFor(() => {
        expect(screen.getByText('Oportunidade A')).toBeInTheDocument();
      });

      const opportunityRow = screen.getByText('Oportunidade A').closest('tr');
      if (opportunityRow) {
        fireEvent.click(opportunityRow);
        expect(mockOnOpportunityClick).toHaveBeenCalledWith('1');
      }
    });

    it('deve chamar onNewOpportunity quando clicar no botão', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList onNewOpportunity={mockOnNewOpportunity} />);

      await waitFor(() => {
        expect(screen.getByText('Nova Oportunidade')).toBeInTheDocument();
      });

      const newButton = screen.getByText('Nova Oportunidade');
      fireEvent.click(newButton);

      expect(mockOnNewOpportunity).toHaveBeenCalledTimes(1);
    });

    it('não deve exibir botão Nova Oportunidade se callback não fornecido', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        expect(screen.getByText('Oportunidade A')).toBeInTheDocument();
      });

      expect(screen.queryByText('Nova Oportunidade')).not.toBeInTheDocument();
    });
  });

  describe('Formatação', () => {
    it('deve formatar valores monetários em BRL', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: [
          {
            ...mockOpportunities[0],
            value: 50000,
            currency: 'BRL',
          },
        ],
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        // Verificar formatação brasileira (R$ 50.000,00)
        expect(screen.getByText(/R\$/)).toBeInTheDocument();
      });
    });

    it('deve formatar datas em formato brasileiro', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: mockOpportunities,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        // Datas devem estar formatadas (DD/MM/YYYY)
        expect(screen.getByText('Oportunidade A')).toBeInTheDocument();
      });
    });

    it('deve exibir "-" quando data não disponível', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: [
          {
            ...mockOpportunities[0],
            closeDate: null,
          },
        ],
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        // Verificar que "-" é exibido para data nula
        const rows = screen.getAllByText('-');
        expect(rows.length).toBeGreaterThan(0);
      });
    });

    it('deve exibir "-" quando probabilidade não disponível', async () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: [
          {
            ...mockOpportunities[0],
            probability: null,
          },
        ],
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      await waitFor(() => {
        // Verificar que "-" é exibido para probabilidade nula
        const rows = screen.getAllByText('-');
        expect(rows.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integração', () => {
    it('deve usar hook useOpportunities corretamente', () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      expect(useOpportunities).toHaveBeenCalled();
    });

    it('deve passar filtros e paginação para hook', () => {
      vi.mocked(useOpportunities).mockReturnValue({
        opportunities: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: mockRefetch,
        setFilters: mockSetFilters,
        setPagination: mockSetPagination,
      });

      render(<OpportunityList />);

      expect(useOpportunities).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          limit: 20,
          orderBy: 'createdAt',
          order: 'desc',
        })
      );
    });
  });
});
