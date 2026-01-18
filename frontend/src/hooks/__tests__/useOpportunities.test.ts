/**
 * Testes para hook useOpportunities
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOpportunities } from '../useOpportunities';
import { listOpportunities } from '../../services/opportunityService';
import type { Opportunity, OpportunityFilters, OpportunityPaginationParams, OpportunityStatus } from '../../types/opportunity';

// Mock do serviço
vi.mock('../../services/opportunityService', () => ({
  listOpportunities: vi.fn(),
}));

describe('useOpportunities', () => {
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
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Estado inicial', () => {
    it('deve retornar loading: true inicialmente', () => {
      vi.mocked(listOpportunities).mockImplementation(
        () => new Promise(() => {}) // Promise que nunca resolve para manter loading
      );

      const { result } = renderHook(() => useOpportunities());

      expect(result.current.loading).toBe(true);
    });

    it('deve retornar opportunities: [] inicialmente', () => {
      vi.mocked(listOpportunities).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useOpportunities());

      expect(result.current.opportunities).toEqual([]);
    });

    it('deve retornar error: null inicialmente', () => {
      vi.mocked(listOpportunities).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useOpportunities());

      expect(result.current.error).toBe(null);
    });

    it('deve retornar paginação inicial correta', () => {
      vi.mocked(listOpportunities).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useOpportunities());

      expect(result.current.pagination).toEqual({
        total: 0,
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('Carregamento de dados', () => {
    it('deve chamar listOpportunities com filtros corretos', async () => {
      const mockFilters: OpportunityFilters = { status: 'OPEN' };
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      renderHook(() => useOpportunities(mockFilters));

      await waitFor(() => {
        expect(listOpportunities).toHaveBeenCalledWith(
          mockFilters,
          expect.any(Object)
        );
      });
    });

    it('deve chamar listOpportunities com paginação correta', async () => {
      const mockPagination: OpportunityPaginationParams = {
        limit: 10,
        offset: 20,
        orderBy: 'value',
        order: 'asc',
      };
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: { total: 2, limit: 10, offset: 20 },
      });

      renderHook(() => useOpportunities(undefined, mockPagination));

      await waitFor(() => {
        expect(listOpportunities).toHaveBeenCalledWith(
          undefined,
          mockPagination
        );
      });
    });

    it('deve atualizar opportunities quando dados chegam', async () => {
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.opportunities).toEqual(mockOpportunities);
    });

    it('deve atualizar loading: false após carregamento', async () => {
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('deve atualizar pagination com dados da resposta', async () => {
      const mockPagination = { total: 25, limit: 20, offset: 0 };
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: mockPagination,
      });

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.pagination).toEqual(mockPagination);
    });
  });

  describe('Tratamento de erros', () => {
    it('deve atualizar error quando API retorna erro', async () => {
      const errorMessage = 'Erro ao carregar oportunidades';
      vi.mocked(listOpportunities).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('deve manter opportunities: [] quando há erro', async () => {
      vi.mocked(listOpportunities).mockRejectedValue(new Error('Erro'));

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.opportunities).toEqual([]);
    });

    it('deve atualizar loading: false mesmo com erro', async () => {
      vi.mocked(listOpportunities).mockRejectedValue(new Error('Erro'));

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Filtros', () => {
    it('deve atualizar filtros quando setFilters é chamado', async () => {
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newFilters: OpportunityFilters = { status: 'WON' };
      result.current.setFilters(newFilters);

      await waitFor(() => {
        expect(listOpportunities).toHaveBeenCalledWith(
          newFilters,
          expect.any(Object)
        );
      });
    });

    it('deve resetar offset quando filtros mudam', async () => {
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: { total: 2, limit: 20, offset: 20 },
      });

      const { result } = renderHook(() => useOpportunities(undefined, { limit: 20, offset: 20 }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.setFilters({ status: 'OPEN' });

      await waitFor(() => {
        expect(listOpportunities).toHaveBeenCalledWith(
          { status: 'OPEN' },
          expect.objectContaining({ offset: 0 })
        );
      });
    });

    it('deve fazer refetch automático quando filtros mudam', async () => {
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = vi.mocked(listOpportunities).mock.calls.length;

      result.current.setFilters({ status: 'OPEN' });

      await waitFor(() => {
        expect(listOpportunities).toHaveBeenCalledTimes(initialCallCount + 1);
      });
    });
  });

  describe('Paginação', () => {
    it('deve atualizar paginação quando setPagination é chamado', async () => {
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newPagination: OpportunityPaginationParams = { offset: 20 };
      result.current.setPagination(newPagination);

      await waitFor(() => {
        expect(listOpportunities).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({ offset: 20 })
        );
      });
    });

    it('deve fazer refetch automático quando paginação muda', async () => {
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = vi.mocked(listOpportunities).mock.calls.length;

      result.current.setPagination({ offset: 20 });

      await waitFor(() => {
        expect(listOpportunities).toHaveBeenCalledTimes(initialCallCount + 1);
      });
    });

    it('deve manter filtros ao mudar paginação', async () => {
      const filters: OpportunityFilters = { status: 'OPEN' };
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useOpportunities(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.setPagination({ offset: 20 });

      await waitFor(() => {
        expect(listOpportunities).toHaveBeenCalledWith(
          filters,
          expect.objectContaining({ offset: 20 })
        );
      });
    });
  });

  describe('Refetch manual', () => {
    it('deve recarregar dados quando refetch é chamado', async () => {
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = vi.mocked(listOpportunities).mock.calls.length;

      await result.current.refetch();

      await waitFor(() => {
        expect(listOpportunities).toHaveBeenCalledTimes(initialCallCount + 1);
      });
    });

    it('deve manter filtros e paginação atuais ao fazer refetch', async () => {
      const filters: OpportunityFilters = { status: 'OPEN' };
      const pagination: OpportunityPaginationParams = { offset: 20 };
      vi.mocked(listOpportunities).mockResolvedValue({
        data: mockOpportunities,
        pagination: { total: 2, limit: 20, offset: 20 },
      });

      const { result } = renderHook(() => useOpportunities(filters, pagination));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(listOpportunities).toHaveBeenCalledWith(filters, pagination);
      });
    });
  });
});
