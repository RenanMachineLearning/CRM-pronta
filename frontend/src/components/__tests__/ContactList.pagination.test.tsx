/**
 * Testes de paginação para ContactList
 * Teste obrigatório 2: paginação funciona
 */

import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test/test-utils';;
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactList } from '../ContactList';
import { useContacts } from '../../hooks/useContacts';

// Mock do hook
vi.mock('../../hooks/useContacts');

// Mock do hook useSortPaginationUrlSync
vi.mock('../../hooks/useSortPaginationUrlSync', () => ({
  useSortPaginationUrlSync: vi.fn(() => {}),
}));

describe('ContactList - Paginação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve exibir controles de paginação', () => {
    const mockSetPagination = vi.fn();
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      loading: false,
      error: null,
      pagination: { total: 50, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: mockSetPagination,
      setAdvancedFilters: vi.fn(),
    });

    render(<ContactList />);
    expect(screen.getByText(/mostrando/i)).toBeInTheDocument();
    expect(screen.getByText(/de 50 contatos/i)).toBeInTheDocument();
  });

  it('deve navegar para próxima página', () => {
    const mockSetPagination = vi.fn();
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      loading: false,
      error: null,
      pagination: { total: 50, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: mockSetPagination,
      setAdvancedFilters: vi.fn(),
    });

    render(<ContactList />);
    const nextButton = screen.getByText('Próxima');
    fireEvent.click(nextButton);

    expect(mockSetPagination).toHaveBeenCalled();
  });

  it('deve navegar para página anterior', () => {
    const mockSetPagination = vi.fn();
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      loading: false,
      error: null,
      pagination: { total: 50, limit: 20, offset: 20 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: mockSetPagination,
      setAdvancedFilters: vi.fn(),
    });

    render(<ContactList />);
    const prevButton = screen.getByText('Anterior');
    fireEvent.click(prevButton);

    expect(mockSetPagination).toHaveBeenCalled();
  });

  it('deve desabilitar botão Anterior na primeira página', () => {
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      loading: false,
      error: null,
      pagination: { total: 50, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: vi.fn(),
      setAdvancedFilters: vi.fn(),
    });

    render(<ContactList />);
    const prevButton = screen.getAllByText('Anterior')[0];
    expect(prevButton).toBeDisabled();
  });

  it('deve desabilitar botão Próxima na última página', () => {
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      loading: false,
      error: null,
      pagination: { total: 50, limit: 20, offset: 40 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: vi.fn(),
      setAdvancedFilters: vi.fn(),
    });

    render(<ContactList />);
    const nextButton = screen.getAllByText('Próxima')[0];
    expect(nextButton).toBeDisabled();
  });

  it('deve exibir informações de paginação corretas', () => {
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      loading: false,
      error: null,
      pagination: { total: 50, limit: 20, offset: 20 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: vi.fn(),
      setAdvancedFilters: vi.fn(),
    });

    render(<ContactList />);
    expect(screen.getByText(/mostrando 21 a 40 de 50 contatos/i)).toBeInTheDocument();
  });
});

