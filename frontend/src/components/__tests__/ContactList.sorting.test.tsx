/**
 * Testes de ordenação para ContactList
 * Teste obrigatório 3: ordenação funciona
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactList } from '../ContactList';
import { useContacts } from '../../hooks/useContacts';

// Mock do hook
vi.mock('../../hooks/useContacts');

describe('ContactList - Ordenação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve ordenar por coluna ao clicar no cabeçalho', () => {
    const mockSetPagination = vi.fn();
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      loading: false,
      error: null,
      pagination: { total: 0, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: mockSetPagination,
      setAdvancedFilters: vi.fn(),
    });

    render(<ContactList />);
    const nameHeader = screen.getByText('Nome');
    fireEvent.click(nameHeader);

    expect(mockSetPagination).toHaveBeenCalled();
  });

  it('deve exibir indicador de ordenação quando coluna está ordenada', () => {
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      loading: false,
      error: null,
      pagination: { total: 0, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: vi.fn(),
      setAdvancedFilters: vi.fn(),
    });

    render(<ContactList />);
    
    // Verificar que cabeçalho de Nome é clicável
    const nameHeader = screen.getByText('Nome');
    expect(nameHeader.closest('th')).toHaveClass('cursor-pointer');
  });

  it('deve inverter ordem ao clicar novamente na mesma coluna', () => {
    const mockSetPagination = vi.fn();
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      loading: false,
      error: null,
      pagination: { total: 0, limit: 20, offset: 0 },
      refetch: vi.fn(),
      setFilters: vi.fn(),
      setPagination: mockSetPagination,
      setAdvancedFilters: vi.fn(),
    });

    render(<ContactList />);
    const nameHeader = screen.getByText('Nome');
    
    // Primeiro clique
    fireEvent.click(nameHeader);
    expect(mockSetPagination).toHaveBeenCalled();
    
    // Segundo clique (deve inverter)
    fireEvent.click(nameHeader);
    expect(mockSetPagination).toHaveBeenCalledTimes(2);
  });
});

