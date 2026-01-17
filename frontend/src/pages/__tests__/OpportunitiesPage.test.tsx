/**
 * Testes para OpportunitiesPage
 * Teste de alternância de visualização
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { OpportunitiesPage } from '../OpportunitiesPage';
import { PipelineView } from '../../components/PipelineView';
import { OpportunityList } from '../../components/OpportunityList';

// Mock dos componentes
vi.mock('../../components/PipelineView', () => ({
  PipelineView: vi.fn(({ onOpportunityClick }) => (
    <div data-testid="pipeline-view">
      <button onClick={() => onOpportunityClick?.('opp-1')}>Click Opportunity</button>
    </div>
  )),
}));

vi.mock('../../components/OpportunityList', () => ({
  OpportunityList: vi.fn(({ onOpportunityClick, onNewOpportunity }) => (
    <div data-testid="opportunity-list">
      <button onClick={() => onOpportunityClick?.('opp-1')}>Click Opportunity</button>
      <button onClick={onNewOpportunity}>New Opportunity</button>
    </div>
  )),
}));

// Mock do useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('OpportunitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar página com cabeçalho', () => {
    render(
      <BrowserRouter>
        <OpportunitiesPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Oportunidades')).toBeInTheDocument();
    expect(screen.getByText(/Gerencie suas oportunidades de vendas/)).toBeInTheDocument();
  });

  it('deve exibir botões de alternância de visualização', () => {
    render(
      <BrowserRouter>
        <OpportunitiesPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Kanban')).toBeInTheDocument();
    expect(screen.getByText('Lista')).toBeInTheDocument();
  });

  it('deve exibir botão Nova Oportunidade', () => {
    render(
      <BrowserRouter>
        <OpportunitiesPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Nova Oportunidade')).toBeInTheDocument();
  });

  it('deve renderizar PipelineView por padrão (modo Kanban)', () => {
    render(
      <BrowserRouter>
        <OpportunitiesPage />
      </BrowserRouter>
    );

    expect(screen.getByTestId('pipeline-view')).toBeInTheDocument();
    expect(screen.queryByTestId('opportunity-list')).not.toBeInTheDocument();
  });

  it('deve alternar para visualização Lista quando botão Lista é clicado', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <OpportunitiesPage />
      </BrowserRouter>
    );

    // Verificar que está em Kanban
    expect(screen.getByTestId('pipeline-view')).toBeInTheDocument();

    // Clicar no botão Lista
    const listButton = screen.getByText('Lista');
    await user.click(listButton);

    // Verificar que mudou para Lista
    await waitFor(() => {
      expect(screen.getByTestId('opportunity-list')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('pipeline-view')).not.toBeInTheDocument();
  });

  it('deve alternar de volta para visualização Kanban quando botão Kanban é clicado', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <OpportunitiesPage />
      </BrowserRouter>
    );

    // Mudar para Lista primeiro
    const listButton = screen.getByText('Lista');
    await user.click(listButton);

    await waitFor(() => {
      expect(screen.getByTestId('opportunity-list')).toBeInTheDocument();
    });

    // Clicar no botão Kanban
    const kanbanButton = screen.getByText('Kanban');
    await user.click(kanbanButton);

    // Verificar que mudou de volta para Kanban
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-view')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('opportunity-list')).not.toBeInTheDocument();
  });

  it('deve navegar para /opportunities/new quando botão Nova Oportunidade é clicado', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <OpportunitiesPage />
      </BrowserRouter>
    );

    const newButton = screen.getByText('Nova Oportunidade');
    await user.click(newButton);

    expect(mockNavigate).toHaveBeenCalledWith('/opportunities/new');
  });

  it('deve navegar para /opportunities/:id quando oportunidade é clicada no Kanban', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <OpportunitiesPage />
      </BrowserRouter>
    );

    const clickButton = screen.getByText('Click Opportunity');
    await user.click(clickButton);

    expect(mockNavigate).toHaveBeenCalledWith('/opportunities/opp-1');
  });

  it('deve navegar para /opportunities/:id quando oportunidade é clicada na Lista', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <OpportunitiesPage />
      </BrowserRouter>
    );

    // Mudar para Lista
    const listButton = screen.getByText('Lista');
    await user.click(listButton);

    await waitFor(() => {
      expect(screen.getByTestId('opportunity-list')).toBeInTheDocument();
    });

    // Clicar em oportunidade
    const clickButton = screen.getByText('Click Opportunity');
    await user.click(clickButton);

    expect(mockNavigate).toHaveBeenCalledWith('/opportunities/opp-1');
  });

  it('deve destacar botão ativo na alternância de visualização', () => {
    render(
      <BrowserRouter>
        <OpportunitiesPage />
      </BrowserRouter>
    );

    const kanbanButton = screen.getByText('Kanban');
    const listButton = screen.getByText('Lista');

    // Kanban deve estar ativo por padrão
    expect(kanbanButton).toHaveClass('bg-blue-600', 'text-white');
    expect(listButton).toHaveClass('bg-white', 'text-gray-700');
  });
});
