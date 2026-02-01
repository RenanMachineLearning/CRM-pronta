/**
 * Testes para OpportunityCard
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OpportunityCard } from '../OpportunityCard';
import type { Opportunity } from '../../types/opportunity';

describe('OpportunityCard', () => {
  const mockOpportunity: Opportunity = {
    id: '1',
    tenantId: 'tenant-1',
    name: 'Oportunidade Teste',
    value: 50000,
    currency: 'BRL',
    stageId: 'stage-1',
    status: 'OPEN' as any,
    closeDate: '2024-12-31T00:00:00.000Z',
    probability: 75,
    contact: {
      id: 'contact-1',
      firstName: 'João',
      lastName: 'Silva',
    },
    tags: [
      { id: 'tag-1', name: 'Cliente', color: '#3B82F6' },
      { id: 'tag-2', name: 'VIP', color: '#10B981' },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('deve renderizar card com dados básicos', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    expect(screen.getByText('Oportunidade Teste')).toBeInTheDocument();
    expect(screen.getByText(/R\$ 50\.000/)).toBeInTheDocument();
    expect(screen.getByText(/31\/12\/2024/)).toBeInTheDocument();
  });

  it('deve exibir valor formatado em BRL', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    const valueElement = screen.getByText(/R\$/);
    expect(valueElement).toBeInTheDocument();
  });

  it('deve exibir data de fechamento formatada', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    expect(screen.getByText(/Fechamento:/)).toBeInTheDocument();
    expect(screen.getByText(/31\/12\/2024/)).toBeInTheDocument();
  });

  it('deve exibir probabilidade com barra de progresso', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    expect(screen.getByText(/75%/)).toBeInTheDocument();
    expect(screen.getByText(/Probabilidade/)).toBeInTheDocument();
  });

  it('deve exibir status com badge colorido', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    expect(screen.getByText('Aberta')).toBeInTheDocument();
  });

  it('deve exibir contato quando disponível', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    expect(screen.getByText(/Contato:/)).toBeInTheDocument();
    expect(screen.getByText(/João Silva/)).toBeInTheDocument();
  });

  it('deve exibir empresa quando contato não disponível', () => {
    const oppWithoutContact: Opportunity = {
      ...mockOpportunity,
      contact: null,
      company: {
        id: 'company-1',
        name: 'Empresa XYZ',
      },
    };

    render(<OpportunityCard opportunity={oppWithoutContact} />);

    expect(screen.getByText(/Empresa:/)).toBeInTheDocument();
    expect(screen.getByText('Empresa XYZ')).toBeInTheDocument();
  });

  it('deve exibir tags (máximo 3 visíveis)', () => {
    const oppWithManyTags: Opportunity = {
      ...mockOpportunity,
      tags: [
        { id: 'tag-1', name: 'Tag 1', color: '#3B82F6' },
        { id: 'tag-2', name: 'Tag 2', color: '#10B981' },
        { id: 'tag-3', name: 'Tag 3', color: '#F59E0B' },
        { id: 'tag-4', name: 'Tag 4', color: '#EF4444' },
        { id: 'tag-5', name: 'Tag 5', color: '#8B5CF6' },
      ],
    };

    render(<OpportunityCard opportunity={oppWithManyTags} />);

    expect(screen.getByText('Tag 1')).toBeInTheDocument();
    expect(screen.getByText('Tag 2')).toBeInTheDocument();
    expect(screen.getByText('Tag 3')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('deve chamar onClick quando card é clicado', () => {
    const mockOnClick = vi.fn();
    render(<OpportunityCard opportunity={mockOpportunity} onClick={mockOnClick} />);

    const card = screen.getByText('Oportunidade Teste').closest('div');
    fireEvent.click(card!);

    expect(mockOnClick).toHaveBeenCalledWith('1');
  });

  it('não deve chamar onClick se não fornecido', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />);

    const card = screen.getByText('Oportunidade Teste').closest('div');
    fireEvent.click(card!);

    // Não deve lançar erro
    expect(card).toBeInTheDocument();
  });

  it('deve lidar com oportunidade sem probabilidade', () => {
    const oppWithoutProbability: Opportunity = {
      ...mockOpportunity,
      probability: null,
    };

    render(<OpportunityCard opportunity={oppWithoutProbability} />);

    expect(screen.queryByText(/Probabilidade/)).not.toBeInTheDocument();
  });

  it('deve lidar com oportunidade sem data de fechamento', () => {
    const oppWithoutDate: Opportunity = {
      ...mockOpportunity,
      closeDate: null,
    };

    render(<OpportunityCard opportunity={oppWithoutDate} />);

    expect(screen.getByText(/Sem data/)).toBeInTheDocument();
  });
});
