/**
 * Testes para hook useLeads
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLeads } from '../useLeads';
import { listLeads } from '../../services/leadService';
import type { Lead, LeadFilters, LeadPaginationParams, LeadStatus } from '../../types/lead';

// Mock do serviço
vi.mock('../../services/leadService', () => ({
  listLeads: vi.fn(),
}));

describe('useLeads', () => {
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
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
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
      converted: false,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      tags: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Estado inicial', () => {
    it('deve retornar loading: true inicialmente', () => {
      vi.mocked(listLeads).mockImplementation(
        () => new Promise(() => {}) // Promise que nunca resolve para manter loading
      );

      const { result } = renderHook(() => useLeads());

      expect(result.current.loading).toBe(true);
    });

    it('deve retornar leads: [] inicialmente', () => {
      vi.mocked(listLeads).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useLeads());

      expect(result.current.leads).toEqual([]);
    });

    it('deve retornar error: null inicialmente', () => {
      vi.mocked(listLeads).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useLeads());

      expect(result.current.error).toBe(null);
    });

    it('deve retornar paginação inicial correta', () => {
      vi.mocked(listLeads).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useLeads());

      expect(result.current.pagination).toEqual({
        total: 0,
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('Carregamento de dados', () => {
    it('deve chamar listLeads com filtros corretos', async () => {
      const mockFilters: LeadFilters = { status: 'NEW' };
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      renderHook(() => useLeads(mockFilters));

      await waitFor(() => {
        expect(listLeads).toHaveBeenCalledWith(
          mockFilters,
          expect.any(Object)
        );
      });
    });

    it('deve chamar listLeads com paginação correta', async () => {
      const mockPagination: LeadPaginationParams = {
        limit: 10,
        offset: 20,
        orderBy: 'firstName',
        order: 'asc',
      };
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: { total: 2, limit: 10, offset: 20 },
      });

      renderHook(() => useLeads(undefined, mockPagination));

      await waitFor(() => {
        expect(listLeads).toHaveBeenCalledWith(
          undefined,
          mockPagination
        );
      });
    });

    it('deve atualizar leads quando dados chegam', async () => {
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useLeads());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.leads).toEqual(mockLeads);
    });

    it('deve atualizar loading: false após carregamento', async () => {
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useLeads());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('deve atualizar pagination com dados da resposta', async () => {
      const mockPagination = { total: 25, limit: 20, offset: 0 };
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: mockPagination,
      });

      const { result } = renderHook(() => useLeads());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.pagination).toEqual(mockPagination);
    });
  });

  describe('Tratamento de erros', () => {
    it('deve atualizar error quando API retorna erro', async () => {
      const errorMessage = 'Erro ao carregar leads';
      vi.mocked(listLeads).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useLeads());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('deve manter leads: [] quando há erro', async () => {
      vi.mocked(listLeads).mockRejectedValue(new Error('Erro'));

      const { result } = renderHook(() => useLeads());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.leads).toEqual([]);
    });

    it('deve atualizar loading: false mesmo com erro', async () => {
      vi.mocked(listLeads).mockRejectedValue(new Error('Erro'));

      const { result } = renderHook(() => useLeads());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Filtros', () => {
    it('deve atualizar filtros quando setFilters é chamado', async () => {
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useLeads());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newFilters: LeadFilters = { status: 'QUALIFIED' };
      result.current.setFilters(newFilters);

      await waitFor(() => {
        expect(listLeads).toHaveBeenCalledWith(
          newFilters,
          expect.any(Object)
        );
      });
    });

    it('deve resetar offset quando filtros mudam', async () => {
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: { total: 2, limit: 20, offset: 20 },
      });

      const { result } = renderHook(() => useLeads(undefined, { limit: 20, offset: 20 }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.setFilters({ status: 'NEW' });

      await waitFor(() => {
        expect(listLeads).toHaveBeenCalledWith(
          { status: 'NEW' },
          expect.objectContaining({ offset: 0 })
        );
      });
    });

    it('deve fazer refetch automático quando filtros mudam', async () => {
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useLeads());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = vi.mocked(listLeads).mock.calls.length;

      result.current.setFilters({ status: 'NEW' });

      await waitFor(() => {
        expect(listLeads).toHaveBeenCalledTimes(initialCallCount + 1);
      });
    });
  });

  describe('Paginação', () => {
    it('deve atualizar paginação quando setPagination é chamado', async () => {
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useLeads());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newPagination: LeadPaginationParams = { offset: 20 };
      result.current.setPagination(newPagination);

      await waitFor(() => {
        expect(listLeads).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({ offset: 20 })
        );
      });
    });

    it('deve fazer refetch automático quando paginação muda', async () => {
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useLeads());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = vi.mocked(listLeads).mock.calls.length;

      result.current.setPagination({ offset: 20 });

      await waitFor(() => {
        expect(listLeads).toHaveBeenCalledTimes(initialCallCount + 1);
      });
    });

    it('deve manter filtros ao mudar paginação', async () => {
      const filters: LeadFilters = { status: 'NEW' };
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useLeads(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.setPagination({ offset: 20 });

      await waitFor(() => {
        expect(listLeads).toHaveBeenCalledWith(
          filters,
          expect.objectContaining({ offset: 20 })
        );
      });
    });
  });

  describe('Refetch manual', () => {
    it('deve recarregar dados quando refetch é chamado', async () => {
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: { total: 2, limit: 20, offset: 0 },
      });

      const { result } = renderHook(() => useLeads());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = vi.mocked(listLeads).mock.calls.length;

      await result.current.refetch();

      await waitFor(() => {
        expect(listLeads).toHaveBeenCalledTimes(initialCallCount + 1);
      });
    });

    it('deve manter filtros e paginação atuais ao fazer refetch', async () => {
      const filters: LeadFilters = { status: 'NEW' };
      const pagination: LeadPaginationParams = { offset: 20 };
      vi.mocked(listLeads).mockResolvedValue({
        data: mockLeads,
        pagination: { total: 2, limit: 20, offset: 20 },
      });

      const { result } = renderHook(() => useLeads(filters, pagination));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(listLeads).toHaveBeenCalledWith(filters, pagination);
      });
    });
  });
});
