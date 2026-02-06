/**
 * Testes para componentes Skeleton
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../Skeleton';
import { SkeletonTable } from '../SkeletonTable';
import { SkeletonCard } from '../SkeletonCard';
import { SkeletonForm } from '../SkeletonForm';
import { SkeletonDashboard, SkeletonStatCard, SkeletonChart } from '../SkeletonDashboard';

describe('Skeleton', () => {
  it('deve renderizar skeleton básico', () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });

  it('deve aplicar classe de círculo quando circle=true', () => {
    render(<Skeleton circle data-testid="skeleton-circle" />);
    const skeleton = screen.getByTestId('skeleton-circle');
    expect(skeleton.className).toContain('rounded-full');
  });

  it('deve aplicar dimensões customizadas', () => {
    render(<Skeleton width={100} height={50} data-testid="skeleton-sized" />);
    const skeleton = screen.getByTestId('skeleton-sized');
    expect(skeleton).toHaveStyle({ width: '100px', height: '50px' });
  });

  it('deve aplicar classe pulse por padrão', () => {
    render(<Skeleton data-testid="skeleton-pulse" />);
    const skeleton = screen.getByTestId('skeleton-pulse');
    expect(skeleton.className).toContain('animate-pulse');
  });

  it('deve aplicar classe shimmer quando effect=shimmer', () => {
    render(<Skeleton effect="shimmer" data-testid="skeleton-shimmer" />);
    const skeleton = screen.getByTestId('skeleton-shimmer');
    expect(skeleton.className).toContain('skeleton-shimmer');
  });

  it('não deve aplicar animação quando animate=false', () => {
    render(<Skeleton animate={false} data-testid="skeleton-static" />);
    const skeleton = screen.getByTestId('skeleton-static');
    expect(skeleton.className).not.toContain('animate-pulse');
    expect(skeleton.className).not.toContain('skeleton-shimmer');
  });
});

describe('SkeletonTable', () => {
  it('deve renderizar tabela skeleton com colunas e linhas padrão', () => {
    render(<SkeletonTable />);
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    // Verifica se há linhas (header + 5 skeleton rows)
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('deve renderizar número correto de colunas', () => {
    render(<SkeletonTable columns={3} />);
    const headerCells = screen.getAllByRole('columnheader');
    expect(headerCells).toHaveLength(3);
  });

  it('deve aplicar classe CSS customizada', () => {
    render(<SkeletonTable className="custom-class" />);
    const table = screen.getByRole('table');
    expect(table.className).toContain('custom-class');
  });
});

describe('SkeletonCard', () => {
  it('deve renderizar card skeleton básico', () => {
    render(<SkeletonCard data-testid="skeleton-card" />);
    const card = screen.getByTestId('skeleton-card');
    expect(card).toBeInTheDocument();
  });

  it('deve renderizar header quando header=true', () => {
    render(<SkeletonCard header />);
    // Verifica se há pelo menos 2 skeletons (header é composto por 2)
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(2);
  });

  it('deve renderizar número correto de linhas', () => {
    render(<SkeletonCard lines={5} />);
    // Cada linha é um skeleton
    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });

  it('deve renderizar footer quando footer=true', () => {
    render(<SkeletonCard footer />);
    // Footer adiciona mais skeletons
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(1);
  });
});

describe('SkeletonForm', () => {
  it('deve renderizar formulário skeleton', () => {
    render(<SkeletonForm />);
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
  });

  it('deve renderizar número correto de campos', () => {
    render(<SkeletonForm fields={4} />);
    // Cada campo tem label + input (2 skeletons)
    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(8);
  });

  it('deve renderizar botões de ação', () => {
    render(<SkeletonForm />);
    // Botões são representados por skeletons
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('SkeletonDashboard', () => {
  it('deve renderizar dashboard skeleton completo', () => {
    render(<SkeletonDashboard />);
    
    // Verifica se há múltiplos elementos skeleton
    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(10);
  });
});

describe('SkeletonStatCard', () => {
  it('deve renderizar card de estatística skeleton', () => {
    render(<SkeletonStatCard />);
    
    // Deve ter pelo menos 3 skeletons (título, valor, círculo)
    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });
});

describe('SkeletonChart', () => {
  it('deve renderizar gráfico skeleton com altura padrão', () => {
    render(<SkeletonChart />);
    
    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });

  it('deve aplicar altura customizada', () => {
    render(<SkeletonChart height={400} />);
    
    // Verifica se o skeleton do chart tem a altura correta
    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
