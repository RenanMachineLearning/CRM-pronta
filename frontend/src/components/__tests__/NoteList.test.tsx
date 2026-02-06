/**
 * Testes para componente NoteList
 * Testes obrigatórios: criar funciona, editar funciona, listar funciona
 */

import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../../test/test-utils';;
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteList } from '../NoteList';
import { useNotes } from '../../hooks/useNotes';
import { deleteNote } from '../../services/noteService';

// Mock do hook e serviço
vi.mock('../../hooks/useNotes');

// Mock do hook useSortPaginationUrlSync
vi.mock('../../hooks/useSortPaginationUrlSync', () => ({
  useSortPaginationUrlSync: vi.fn(() => {}),
}));
vi.mock('../../services/noteService');

describe('NoteList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm
    window.confirm = vi.fn(() => true);
  });

  describe('Listagem de notas funciona', () => {
    it('deve exibir lista de notas', async () => {
      const mockNotes = [
        {
          id: '1',
          tenantId: 'tenant-1',
          content: 'Esta é uma nota de teste',
          type: 'NOTE' as const,
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          relatedEntity: { id: 'contact-1', firstName: 'João', lastName: 'Silva' },
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(useNotes).mockReturnValue({
        notes: mockNotes,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<NoteList />);

      await waitFor(() => {
        expect(screen.getByText(/Esta é uma nota de teste/)).toBeInTheDocument();
      });

      // Verificar que colunas são exibidas
      expect(screen.getByText('Conteúdo')).toBeInTheDocument();
      expect(screen.getByText('Tipo')).toBeInTheDocument();
      expect(screen.getByText('Entidade Relacionada')).toBeInTheDocument();
      expect(screen.getByText('Criado por')).toBeInTheDocument();
      expect(screen.getByText('Data')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });

    it('deve exibir todas as colunas corretamente', async () => {
      const mockNotes = [
        {
          id: '1',
          tenantId: 'tenant-1',
          content: 'Comentário sobre o lead',
          type: 'COMMENT' as const,
          relatedEntityType: 'Lead' as const,
          relatedEntityId: 'lead-1',
          relatedEntity: { id: 'lead-1', firstName: 'Maria', lastName: 'Santos' },
          createdById: 'user-2',
          createdBy: { id: 'user-2', name: 'Maria Santos', email: 'maria@example.com' },
          createdAt: '2024-01-01T10:30:00Z',
          updatedAt: '2024-01-01T10:30:00Z',
        },
      ];

      vi.mocked(useNotes).mockReturnValue({
        notes: mockNotes,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<NoteList />);

      await waitFor(() => {
        expect(screen.getByText(/Comentário sobre o lead/)).toBeInTheDocument();
        expect(screen.getByText('Comentário')).toBeInTheDocument();
        expect(screen.getByText('Maria Santos')).toBeInTheDocument();
        expect(screen.getByText('Maria Santos')).toBeInTheDocument(); // Criado por
      });
    });

    it('deve mostrar estado vazio quando não há notas', () => {
      vi.mocked(useNotes).mockReturnValue({
        notes: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<NoteList />);
      expect(screen.getByText('Nenhuma nota encontrada')).toBeInTheDocument();
    });

    it('deve chamar onNoteClick ao clicar em Editar', async () => {
      const mockNotes = [
        {
          id: '1',
          tenantId: 'tenant-1',
          content: 'Nota para editar',
          type: 'NOTE' as const,
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          relatedEntity: { id: 'contact-1', firstName: 'João', lastName: 'Silva' },
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const onNoteClick = vi.fn();

      vi.mocked(useNotes).mockReturnValue({
        notes: mockNotes,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<NoteList onNoteClick={onNoteClick} />);

      await waitFor(() => {
        const editButton = screen.getByText('Editar');
        fireEvent.click(editButton);
        expect(onNoteClick).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('Conteúdo truncado', () => {
    it('deve truncar conteúdo longo', async () => {
      const longContent = 'A'.repeat(200);
      const mockNotes = [
        {
          id: '1',
          tenantId: 'tenant-1',
          content: longContent,
          type: 'NOTE' as const,
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          relatedEntity: { id: 'contact-1', firstName: 'João', lastName: 'Silva' },
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(useNotes).mockReturnValue({
        notes: mockNotes,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<NoteList />);

      await waitFor(() => {
        const content = screen.getByText(/A+/);
        expect(content.textContent).toContain('...');
      });
    });

    it('não deve truncar conteúdo curto', async () => {
      const shortContent = 'Nota curta';
      const mockNotes = [
        {
          id: '1',
          tenantId: 'tenant-1',
          content: shortContent,
          type: 'NOTE' as const,
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          relatedEntity: { id: 'contact-1', firstName: 'João', lastName: 'Silva' },
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(useNotes).mockReturnValue({
        notes: mockNotes,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<NoteList />);

      await waitFor(() => {
        expect(screen.getByText('Nota curta')).toBeInTheDocument();
      });
    });
  });

  describe('Filtros', () => {
    it('deve filtrar por tipo', async () => {
      const setFilters = vi.fn();

      vi.mocked(useNotes).mockReturnValue({
        notes: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters,
        setPagination: vi.fn(),
      });

      render(<NoteList />);

      const typeSelect = screen.getByLabelText(/todos os tipos/i) || screen.getByDisplayValue('');
      fireEvent.change(typeSelect, { target: { value: 'COMMENT' } });

      await waitFor(() => {
        expect(setFilters).toHaveBeenCalled();
      });
    });

    it('deve limpar filtros', async () => {
      const setFilters = vi.fn();

      vi.mocked(useNotes).mockReturnValue({
        notes: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters,
        setPagination: vi.fn(),
      });

      render(<NoteList initialFilters={{ type: 'NOTE' }} />);

      const clearButton = screen.getByText('Limpar filtros');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(setFilters).toHaveBeenCalledWith({});
      });
    });
  });

  describe('Ações', () => {
    it('deve deletar nota com confirmação', async () => {
      const mockNotes = [
        {
          id: '1',
          tenantId: 'tenant-1',
          content: 'Nota para deletar',
          type: 'NOTE' as const,
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          relatedEntity: { id: 'contact-1', firstName: 'João', lastName: 'Silva' },
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const refetch = vi.fn();
      vi.mocked(useNotes).mockReturnValue({
        notes: mockNotes,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch,
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      vi.mocked(deleteNote).mockResolvedValue({ message: 'Nota deletada', id: '1' });

      render(<NoteList />);

      await waitFor(() => {
        const deleteButton = screen.getByText('Deletar');
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
        expect(deleteNote).toHaveBeenCalledWith('1');
        expect(refetch).toHaveBeenCalled();
      });
    });

    it('não deve deletar se confirmação for cancelada', async () => {
      window.confirm = vi.fn(() => false);

      const mockNotes = [
        {
          id: '1',
          tenantId: 'tenant-1',
          content: 'Nota para deletar',
          type: 'NOTE' as const,
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          relatedEntity: { id: 'contact-1', firstName: 'João', lastName: 'Silva' },
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(useNotes).mockReturnValue({
        notes: mockNotes,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<NoteList />);

      await waitFor(() => {
        const deleteButton = screen.getByText('Deletar');
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
        expect(deleteNote).not.toHaveBeenCalled();
      });
    });
  });

  describe('Estados', () => {
    it('deve exibir loading state', () => {
      vi.mocked(useNotes).mockReturnValue({
        notes: [],
        loading: true,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<NoteList />);
      expect(screen.getByText(/Carregando notas/)).toBeInTheDocument();
    });

    it('deve exibir error state', () => {
      const refetch = vi.fn();
      vi.mocked(useNotes).mockReturnValue({
        notes: [],
        loading: false,
        error: 'Erro ao carregar notas',
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch,
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<NoteList />);
      expect(screen.getByText('Erro ao carregar notas')).toBeInTheDocument();
    });

    it('deve exibir empty state com filtros', () => {
      vi.mocked(useNotes).mockReturnValue({
        notes: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<NoteList initialFilters={{ type: 'NOTE' }} />);
      expect(screen.getByText(/Nenhuma nota encontrada com os filtros aplicados/)).toBeInTheDocument();
    });
  });

  describe('Paginação', () => {
    it('deve exibir controles de paginação', () => {
      vi.mocked(useNotes).mockReturnValue({
        notes: [],
        loading: false,
        error: null,
        pagination: { total: 50, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<NoteList />);
      expect(screen.getByText(/Mostrando/)).toBeInTheDocument();
      expect(screen.getByText(/50/)).toBeInTheDocument();
    });

    it('deve navegar entre páginas', async () => {
      const setPagination = vi.fn();
      vi.mocked(useNotes).mockReturnValue({
        notes: [],
        loading: false,
        error: null,
        pagination: { total: 50, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination,
      });

      render(<NoteList />);

      await waitFor(() => {
        const nextButton = screen.getByText('Próxima');
        fireEvent.click(nextButton);
        expect(setPagination).toHaveBeenCalled();
      });
    });
  });

  describe('Ordenação', () => {
    it('deve ordenar por data', async () => {
      const setPagination = vi.fn();
      vi.mocked(useNotes).mockReturnValue({
        notes: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination,
      });

      render(<NoteList />);

      await waitFor(() => {
        const dateHeader = screen.getByText('Data');
        fireEvent.click(dateHeader);
        expect(setPagination).toHaveBeenCalled();
      });
    });
  });
});
