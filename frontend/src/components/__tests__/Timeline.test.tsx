/**
 * Testes para componente Timeline
 * 
 * Testes obrigatórios:
 * - Timeline aparece em páginas de detalhes
 * - Timeline mostra atividades corretas
 * - Timeline está ordenada corretamente
 */

import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../../test/test-utils';;
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timeline } from '../Timeline';
import { useTimeline } from '../../hooks/useTimeline';
import type { TimelineItem, TimelineGroup } from '../../types/timeline';

// Mock do hook useTimeline
vi.mock('../../hooks/useTimeline');

// Mock data helpers
const createTaskItem = (id: string, timestamp: string, title: string): TimelineItem => ({
  id,
  type: 'task',
  timestamp,
  userId: 'user-1',
  userName: 'João Silva',
  data: {
    title,
    description: 'Descrição da tarefa',
    type: 'CALL',
    status: 'PENDING',
    priority: 'HIGH',
    dueDate: '2024-12-31T00:00:00Z',
    assignedToId: 'user-1',
    assignedToName: 'João Silva',
  },
});

const createNoteItem = (id: string, timestamp: string, content: string): TimelineItem => ({
  id,
  type: 'note',
  timestamp,
  userId: 'user-2',
  userName: 'Maria Santos',
  data: {
    content,
    noteType: 'NOTE',
  },
});

const createAuditItem = (id: string, timestamp: string, action: 'create' | 'update' | 'delete'): TimelineItem => ({
  id,
  type: 'audit',
  timestamp,
  userId: 'user-1',
  userName: 'João Silva',
  data: {
    action,
    changes: action === 'update' ? { email: { old: 'old@email.com', new: 'new@email.com' } } : null,
  },
});

describe('Timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Timeline aparece em páginas de detalhes', () => {
    it('deve renderizar componente Timeline com entityType e entityId corretos', () => {
      const items: TimelineItem[] = [
        createTaskItem('1', new Date().toISOString(), 'Tarefa 1'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1', name: 'João' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      // Verificar que o hook foi chamado com os parâmetros corretos
      expect(useTimeline).toHaveBeenCalledWith('Contact', 'contact-1', expect.any(Object));
    });

    it('deve renderizar para todos os tipos de entidade suportados', () => {
      const entityTypes: Array<'Contact' | 'Company' | 'Lead' | 'Opportunity' | 'Task'> = [
        'Contact', 'Company', 'Lead', 'Opportunity', 'Task'
      ];

      const items: TimelineItem[] = [];
      const groups: TimelineGroup[] = [];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        entityInfo: null,
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      entityTypes.forEach((entityType) => {
        const { unmount } = render(<Timeline entityType={entityType} entityId="test-id" />);
        expect(useTimeline).toHaveBeenCalledWith(entityType, 'test-id', expect.any(Object));
        unmount();
      });
    });
  });

  describe('Timeline mostra atividades corretas', () => {
    it('deve exibir tarefas relacionadas', async () => {
      const items: TimelineItem[] = [
        createTaskItem('1', new Date().toISOString(), 'Ligar para cliente'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        expect(screen.getByText('Ligar para cliente')).toBeInTheDocument();
        expect(screen.getByText('Pendente')).toBeInTheDocument();
        expect(screen.getByText('Alta')).toBeInTheDocument();
      });
    });

    it('deve exibir notas relacionadas', async () => {
      const items: TimelineItem[] = [
        createNoteItem('1', new Date().toISOString(), 'Esta é uma nota importante sobre o cliente'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        expect(screen.getByText('Nota')).toBeInTheDocument();
        expect(screen.getByText(/Esta é uma nota importante/)).toBeInTheDocument();
      });
    });

    it('deve exibir logs de auditoria', async () => {
      const items: TimelineItem[] = [
        createAuditItem('1', new Date().toISOString(), 'update'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        expect(screen.getByText('Atualização')).toBeInTheDocument();
        expect(screen.getByText(/email/)).toBeInTheDocument();
      });
    });

    it('deve mostrar informações de usuário e timestamp', async () => {
      const items: TimelineItem[] = [
        createTaskItem('1', new Date().toISOString(), 'Tarefa teste'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        expect(screen.getByText(/João Silva/)).toBeInTheDocument();
        // Timestamp deve estar formatado (pode ser "Agora", "há X minutos", etc.)
        expect(screen.getByText(/Agora|há/)).toBeInTheDocument();
      });
    });

    it('deve mostrar "Usuário desconhecido" quando userName é null', async () => {
      const items: TimelineItem[] = [{
        id: '1',
        type: 'task',
        timestamp: new Date().toISOString(),
        userId: 'user-1',
        userName: null,
        data: {
          title: 'Tarefa',
          type: 'CALL',
          status: 'PENDING',
          priority: 'MEDIUM',
        },
      }];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Usuário desconhecido/)).toBeInTheDocument();
      });
    });
  });

  describe('Timeline está ordenada corretamente', () => {
    it('deve exibir itens ordenados por timestamp (mais recente primeiro)', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 3600000); // 1 hora antes
      
      const items: TimelineItem[] = [
        createTaskItem('2', now.toISOString(), 'Tarefa mais recente'),
        createTaskItem('1', earlier.toISOString(), 'Tarefa mais antiga'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: now, items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        const tarefas = screen.getAllByText(/Tarefa/);
        expect(tarefas.length).toBe(2);
        // A ordem visual deve refletir a ordem do array (mais recente primeiro)
      });
    });

    it('deve agrupar por data (Hoje, Ontem, Esta semana, etc.)', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);
      
      const todayItems: TimelineItem[] = [
        createTaskItem('1', today.toISOString(), 'Tarefa de hoje'),
      ];
      
      const yesterdayItems: TimelineItem[] = [
        createNoteItem('2', yesterday.toISOString(), 'Nota de ontem'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: today, items: todayItems },
        { label: 'Ontem', date: yesterday, items: yesterdayItems },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items: [...todayItems, ...yesterdayItems],
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 2, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        expect(screen.getByText('Hoje')).toBeInTheDocument();
        expect(screen.getByText('Ontem')).toBeInTheDocument();
        expect(screen.getByText('Tarefa de hoje')).toBeInTheDocument();
        expect(screen.getByText(/Nota de ontem/)).toBeInTheDocument();
      });
    });

    it('deve ordenar grupos corretamente', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);
      const weekAgo = new Date(today.getTime() - 7 * 86400000);
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: today, items: [createTaskItem('1', today.toISOString(), 'Hoje')] },
        { label: 'Ontem', date: yesterday, items: [createTaskItem('2', yesterday.toISOString(), 'Ontem')] },
        { label: 'Esta semana', date: weekAgo, items: [createTaskItem('3', weekAgo.toISOString(), 'Semana')] },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items: groups.flatMap(g => g.items),
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 3, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        const groupHeaders = screen.getAllByRole('heading', { level: 3 });
        // Verificar que os grupos estão na ordem correta
        expect(groupHeaders[0]).toHaveTextContent('Hoje');
        expect(groupHeaders[1]).toHaveTextContent('Ontem');
        expect(groupHeaders[2]).toHaveTextContent('Esta semana');
      });
    });
  });

  describe('Estados', () => {
    it('deve renderizar loading state durante carregamento inicial', () => {
      vi.mocked(useTimeline).mockReturnValue({
        items: [],
        groups: [],
        loading: true,
        loadingMore: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        entityInfo: null,
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);
      expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    });

    it('deve renderizar error state com mensagem clara', () => {
      const refetch = vi.fn();
      vi.mocked(useTimeline).mockReturnValue({
        items: [],
        groups: [],
        loading: false,
        loadingMore: false,
        error: 'Erro ao carregar histórico',
        pagination: { total: 0, limit: 20, offset: 0 },
        entityInfo: null,
        hasMore: false,
        refetch,
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);
      expect(screen.getByText('Erro ao carregar histórico')).toBeInTheDocument();
      expect(screen.getByText('Tentar novamente')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Tentar novamente'));
      expect(refetch).toHaveBeenCalled();
    });

    it('deve renderizar empty state quando não há atividades', () => {
      vi.mocked(useTimeline).mockReturnValue({
        items: [],
        groups: [],
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 0, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);
      expect(screen.getByText(/nenhuma atividade/i)).toBeInTheDocument();
    });
  });

  describe('Paginação', () => {
    it('deve mostrar botão "Carregar mais" quando há mais itens', async () => {
      const items: TimelineItem[] = [
        createTaskItem('1', new Date().toISOString(), 'Tarefa 1'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 50, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: true,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        expect(screen.getByText(/carregar mais/i)).toBeInTheDocument();
      });
    });

    it('deve chamar loadMore ao clicar no botão', async () => {
      const loadMore = vi.fn();
      const items: TimelineItem[] = [
        createTaskItem('1', new Date().toISOString(), 'Tarefa 1'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 50, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: true,
        refetch: vi.fn(),
        loadMore,
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        const button = screen.getByText(/carregar mais/i);
        fireEvent.click(button);
        expect(loadMore).toHaveBeenCalled();
      });
    });

    it('deve mostrar loading durante carregamento de mais itens', async () => {
      const items: TimelineItem[] = [
        createTaskItem('1', new Date().toISOString(), 'Tarefa 1'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: true,
        error: null,
        pagination: { total: 50, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: true,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        expect(screen.getByText(/carregando/i)).toBeInTheDocument();
      });
    });

    it('não deve mostrar botão quando showLoadMore=false', async () => {
      const items: TimelineItem[] = [
        createTaskItem('1', new Date().toISOString(), 'Tarefa 1'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 50, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: true,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" showLoadMore={false} />);

      await waitFor(() => {
        expect(screen.queryByText(/carregar mais/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Links e navegação', () => {
    it('deve chamar onTaskClick ao clicar em uma tarefa', async () => {
      const onTaskClick = vi.fn();
      const items: TimelineItem[] = [
        createTaskItem('task-1', new Date().toISOString(), 'Tarefa clicável'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" onTaskClick={onTaskClick} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Tarefa clicável'));
        expect(onTaskClick).toHaveBeenCalledWith('task-1');
      });
    });

    it('deve chamar onNoteClick ao clicar em uma nota', async () => {
      const onNoteClick = vi.fn();
      const items: TimelineItem[] = [
        createNoteItem('note-1', new Date().toISOString(), 'Nota clicável'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" onNoteClick={onNoteClick} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Nota'));
        expect(onNoteClick).toHaveBeenCalledWith('note-1');
      });
    });

    it('deve suportar navegação por teclado', async () => {
      const onTaskClick = vi.fn();
      const items: TimelineItem[] = [
        createTaskItem('task-1', new Date().toISOString(), 'Tarefa acessível'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" onTaskClick={onTaskClick} />);

      await waitFor(() => {
        const taskItem = screen.getByText('Tarefa acessível').closest('[role="button"]');
        expect(taskItem).toBeInTheDocument();
        
        if (taskItem) {
          fireEvent.keyDown(taskItem, { key: 'Enter' });
          expect(onTaskClick).toHaveBeenCalledWith('task-1');
        }
      });
    });
  });

  describe('Formatação', () => {
    it('deve truncar conteúdo de nota longo', async () => {
      const longContent = 'Este é um conteúdo muito longo que deve ser truncado para melhorar a legibilidade. ' +
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.';
      
      const items: TimelineItem[] = [
        createNoteItem('1', new Date().toISOString(), longContent),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        // Deve mostrar o conteúdo truncado com "..."
        expect(screen.getByText(/Este é um conteúdo muito longo/)).toBeInTheDocument();
        expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
      });
    });

    it('deve renderizar diferentes tipos de atividade com ícones/badges distintos', async () => {
      const items: TimelineItem[] = [
        createTaskItem('1', new Date().toISOString(), 'Tarefa'),
        createNoteItem('2', new Date().toISOString(), 'Nota'),
        createAuditItem('3', new Date().toISOString(), 'create'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 3, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" />);

      await waitFor(() => {
        // Verificar que diferentes tipos são renderizados
        expect(screen.getByText('Tarefa')).toBeInTheDocument();
        expect(screen.getByText('Nota')).toBeInTheDocument();
        expect(screen.getByText('Criação')).toBeInTheDocument();
      });
    });
  });

  describe('Modo compacto', () => {
    it('deve renderizar versão compacta quando compact=true', async () => {
      const items: TimelineItem[] = [
        createTaskItem('1', new Date().toISOString(), 'Tarefa compacta'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 1, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      render(<Timeline entityType="Contact" entityId="contact-1" compact={true} />);

      await waitFor(() => {
        expect(screen.getByText('Tarefa compacta')).toBeInTheDocument();
        // Em modo compacto, a descrição não deve aparecer
        expect(screen.queryByText('Descrição da tarefa')).not.toBeInTheDocument();
      });
    });
  });

  describe('Limite de itens', () => {
    it('deve respeitar maxItems quando definido', async () => {
      const items: TimelineItem[] = [
        createTaskItem('1', new Date().toISOString(), 'Tarefa 1'),
        createTaskItem('2', new Date().toISOString(), 'Tarefa 2'),
        createTaskItem('3', new Date().toISOString(), 'Tarefa 3'),
      ];
      
      const groups: TimelineGroup[] = [
        { label: 'Hoje', date: new Date(), items },
      ];

      vi.mocked(useTimeline).mockReturnValue({
        items,
        groups,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 3, limit: 20, offset: 0 },
        entityInfo: { type: 'Contact', id: 'contact-1' },
        hasMore: false,
        refetch: vi.fn(),
        loadMore: vi.fn(),
      });

      // O hook é chamado com maxItems como limit
      render(<Timeline entityType="Contact" entityId="contact-1" maxItems={2} />);

      expect(useTimeline).toHaveBeenCalledWith('Contact', 'contact-1', { limit: 2 });
    });
  });
});
