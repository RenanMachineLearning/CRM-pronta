/**
 * Testes para componente TaskList
 * Testes obrigatórios: listagem funciona, filtros funcionam, concluir funciona
 */

import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../../test/test-utils';;
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskList } from '../TaskList';
import { useTasks } from '../../hooks/useTasks';
import { updateTask } from '../../services/taskService';

// Mock do hook
vi.mock('../../hooks/useTasks');

// Mock do hook useSortPaginationUrlSync
vi.mock('../../hooks/useSortPaginationUrlSync', () => ({
  useSortPaginationUrlSync: vi.fn(() => {}),
}));
vi.mock('../../services/taskService');

describe('TaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Listagem de tarefas funciona', () => {
    it('deve exibir lista de tarefas', async () => {
      const mockTasks = [
        {
          id: '1',
          tenantId: 'tenant-1',
          title: 'Ligar para cliente',
          description: 'Ligar para discutir proposta',
          type: 'CALL' as const,
          status: 'PENDING' as const,
          priority: 'HIGH' as const,
          dueDate: '2024-12-31T00:00:00Z',
          assignedToId: 'user-1',
          assignedTo: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(useTasks).mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<TaskList />);

      await waitFor(() => {
        expect(screen.getByText('Ligar para cliente')).toBeInTheDocument();
      });

      // Verificar que colunas são exibidas
      expect(screen.getByText('Título')).toBeInTheDocument();
      expect(screen.getByText('Tipo')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Atribuído a')).toBeInTheDocument();
      expect(screen.getByText('Vencimento')).toBeInTheDocument();
      expect(screen.getByText('Prioridade')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });

    it('deve exibir todas as colunas corretamente', async () => {
      const mockTasks = [
        {
          id: '1',
          tenantId: 'tenant-1',
          title: 'Enviar proposta',
          description: null,
          type: 'EMAIL' as const,
          status: 'IN_PROGRESS' as const,
          priority: 'MEDIUM' as const,
          dueDate: '2024-12-15T00:00:00Z',
          assignedToId: 'user-2',
          assignedTo: { id: 'user-2', name: 'Maria Santos', email: 'maria@example.com' },
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          relatedEntityType: 'Lead' as const,
          relatedEntityId: 'lead-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(useTasks).mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<TaskList />);

      await waitFor(() => {
        expect(screen.getByText('Enviar proposta')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Em Andamento')).toBeInTheDocument();
        expect(screen.getByText('Maria Santos')).toBeInTheDocument();
        expect(screen.getByText('Média')).toBeInTheDocument();
      });
    });

    it('deve mostrar estado vazio quando não há tarefas', () => {
      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<TaskList />);
      expect(screen.getByText('Nenhuma tarefa encontrada')).toBeInTheDocument();
    });

    it('deve chamar onTaskClick ao clicar em uma tarefa', async () => {
      const mockTasks = [
        {
          id: '1',
          tenantId: 'tenant-1',
          title: 'Reunião com cliente',
          description: null,
          type: 'MEETING' as const,
          status: 'PENDING' as const,
          priority: 'HIGH' as const,
          dueDate: null,
          assignedToId: null,
          assignedTo: null,
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const onTaskClick = vi.fn();

      vi.mocked(useTasks).mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<TaskList onTaskClick={onTaskClick} />);

      await waitFor(() => {
        expect(screen.getByText('Reunião com cliente')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Reunião com cliente').closest('tr')!);
      expect(onTaskClick).toHaveBeenCalledWith('1');
    });

    it('deve renderizar loading state corretamente', () => {
      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        loading: true,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<TaskList />);
      expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    });

    it('deve renderizar error state corretamente', () => {
      const refetch = vi.fn();
      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        loading: false,
        error: 'Erro ao carregar tarefas',
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch,
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      render(<TaskList />);
      expect(screen.getByText('Erro ao carregar tarefas')).toBeInTheDocument();
      expect(screen.getByText('Tentar novamente')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Tentar novamente'));
      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('Filtros funcionam', () => {
    it('deve filtrar por status', async () => {
      const setFilters = vi.fn();
      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters,
        setPagination: vi.fn(),
      });

      render(<TaskList />);

      const statusSelect = screen.getByDisplayValue('Todos os status');
      fireEvent.change(statusSelect, { target: { value: 'PENDING' } });

      await waitFor(() => {
        expect(setFilters).toHaveBeenCalled();
      });
    });

    it('deve filtrar por tipo', async () => {
      const setFilters = vi.fn();
      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters,
        setPagination: vi.fn(),
      });

      render(<TaskList />);

      const typeSelect = screen.getByDisplayValue('Todos os tipos');
      fireEvent.change(typeSelect, { target: { value: 'CALL' } });

      await waitFor(() => {
        expect(setFilters).toHaveBeenCalled();
      });
    });

    it('deve filtrar por prioridade', async () => {
      const setFilters = vi.fn();
      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters,
        setPagination: vi.fn(),
      });

      render(<TaskList />);

      const prioritySelect = screen.getByDisplayValue('Todas as prioridades');
      fireEvent.change(prioritySelect, { target: { value: 'HIGH' } });

      await waitFor(() => {
        expect(setFilters).toHaveBeenCalled();
      });
    });

    it('deve filtrar por vencidas', async () => {
      const setFilters = vi.fn();
      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters,
        setPagination: vi.fn(),
      });

      render(<TaskList />);

      const overdueSelect = screen.getByDisplayValue('Todas');
      fireEvent.change(overdueSelect, { target: { value: 'true' } });

      await waitFor(() => {
        expect(setFilters).toHaveBeenCalled();
      });
    });

    it('deve limpar filtros quando clicar em "Limpar filtros"', async () => {
      const setFilters = vi.fn();
      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        loading: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters,
        setPagination: vi.fn(),
      });

      render(<TaskList initialFilters={{ status: 'PENDING' }} />);

      const clearButton = screen.getByText('Limpar filtros');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(setFilters).toHaveBeenCalledWith({});
      });
    });
  });

  describe('Concluir tarefa funciona', () => {
    it('deve mostrar botão "Concluir" apenas para tarefas pendentes/em andamento', async () => {
      const mockTasks = [
        {
          id: '1',
          tenantId: 'tenant-1',
          title: 'Tarefa Pendente',
          description: null,
          type: 'OTHER' as const,
          status: 'PENDING' as const,
          priority: 'MEDIUM' as const,
          dueDate: null,
          assignedToId: null,
          assignedTo: null,
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          tenantId: 'tenant-1',
          title: 'Tarefa Concluída',
          description: null,
          type: 'OTHER' as const,
          status: 'COMPLETED' as const,
          priority: 'MEDIUM' as const,
          dueDate: null,
          assignedToId: null,
          assignedTo: null,
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const refetch = vi.fn();
      vi.mocked(useTasks).mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        refetch,
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      vi.mocked(updateTask).mockResolvedValue({
        ...mockTasks[0],
        status: 'COMPLETED' as const,
      });

      render(<TaskList />);

      await waitFor(() => {
        expect(screen.getByText('Tarefa Pendente')).toBeInTheDocument();
        expect(screen.getByText('Tarefa Concluída')).toBeInTheDocument();
      });

      // Deve ter apenas um botão "Concluir" (para a tarefa pendente)
      const completeButtons = screen.getAllByText('Concluir');
      expect(completeButtons.length).toBe(1);
    });

    it('deve atualizar status para COMPLETED ao clicar em "Concluir"', async () => {
      const mockTasks = [
        {
          id: '1',
          tenantId: 'tenant-1',
          title: 'Tarefa Pendente',
          description: null,
          type: 'OTHER' as const,
          status: 'PENDING' as const,
          priority: 'MEDIUM' as const,
          dueDate: null,
          assignedToId: null,
          assignedTo: null,
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const refetch = vi.fn();
      vi.mocked(useTasks).mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch,
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      vi.mocked(updateTask).mockResolvedValue({
        ...mockTasks[0],
        status: 'COMPLETED' as const,
      });

      render(<TaskList />);

      await waitFor(() => {
        expect(screen.getByText('Tarefa Pendente')).toBeInTheDocument();
      });

      const completeButton = screen.getByText('Concluir');
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(updateTask).toHaveBeenCalledWith('1', { status: 'COMPLETED' });
        expect(refetch).toHaveBeenCalled();
      });
    });

    it('deve tratar erros ao concluir tarefa', async () => {
      const mockTasks = [
        {
          id: '1',
          tenantId: 'tenant-1',
          title: 'Tarefa Pendente',
          description: null,
          type: 'OTHER' as const,
          status: 'PENDING' as const,
          priority: 'MEDIUM' as const,
          dueDate: null,
          assignedToId: null,
          assignedTo: null,
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const refetch = vi.fn();
      vi.mocked(useTasks).mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch,
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      vi.mocked(updateTask).mockRejectedValue(new Error('Erro ao atualizar tarefa'));

      render(<TaskList />);

      await waitFor(() => {
        expect(screen.getByText('Tarefa Pendente')).toBeInTheDocument();
      });

      const completeButton = screen.getByText('Concluir');
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText('Erro ao concluir tarefa')).toBeInTheDocument();
      });
    });

    it('deve mostrar loading durante atualização', async () => {
      const mockTasks = [
        {
          id: '1',
          tenantId: 'tenant-1',
          title: 'Tarefa Pendente',
          description: null,
          type: 'OTHER' as const,
          status: 'PENDING' as const,
          priority: 'MEDIUM' as const,
          dueDate: null,
          assignedToId: null,
          assignedTo: null,
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(useTasks).mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      // Simular delay na atualização
      vi.mocked(updateTask).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockTasks[0] as any), 100))
      );

      render(<TaskList />);

      await waitFor(() => {
        expect(screen.getByText('Tarefa Pendente')).toBeInTheDocument();
      });

      const completeButton = screen.getByText('Concluir');
      fireEvent.click(completeButton);

      // Deve mostrar "Concluindo..." durante o loading
      await waitFor(() => {
        expect(screen.getByText('Concluindo...')).toBeInTheDocument();
      });
    });

    it('deve desabilitar botão durante atualização', async () => {
      const mockTasks = [
        {
          id: '1',
          tenantId: 'tenant-1',
          title: 'Tarefa Pendente',
          description: null,
          type: 'OTHER' as const,
          status: 'PENDING' as const,
          priority: 'MEDIUM' as const,
          dueDate: null,
          assignedToId: null,
          assignedTo: null,
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
          relatedEntityType: 'Contact' as const,
          relatedEntityId: 'contact-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(useTasks).mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        refetch: vi.fn(),
        setFilters: vi.fn(),
        setPagination: vi.fn(),
      });

      vi.mocked(updateTask).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockTasks[0] as any), 100))
      );

      render(<TaskList />);

      await waitFor(() => {
        expect(screen.getByText('Tarefa Pendente')).toBeInTheDocument();
      });

      const completeButton = screen.getByText('Concluir');
      fireEvent.click(completeButton);

      // Botão deve estar desabilitado durante atualização
      await waitFor(() => {
        expect(completeButton).toBeDisabled();
      });
    });
  });
});
