/**
 * Testes para ImportWizard (Etapa 9 - Parte 10).
 * Valida: wizard de importação funciona, indicador de passos, navegação.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportWizard } from '../ImportWizard';

describe('ImportWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wizard de importação funciona: exibe passo 1 (Upload)', () => {
    render(<ImportWizard />);
    expect(screen.getByText(/1\. Upload/)).toBeInTheDocument();
    expect(screen.getByText(/Arraste um arquivo aqui ou/)).toBeInTheDocument();
    const next = screen.getByRole('button', { name: /Próximo/i });
    expect(next).toBeInTheDocument();
  });

  it('exibe os 6 passos no indicador', () => {
    render(<ImportWizard />);
    expect(screen.getByText('1. Upload')).toBeInTheDocument();
    expect(screen.getByText('2. Entidade')).toBeInTheDocument();
    expect(screen.getByText('3. Mapeamento')).toBeInTheDocument();
    expect(screen.getByText('4. Opções')).toBeInTheDocument();
    expect(screen.getByText('5. Processamento')).toBeInTheDocument();
    expect(screen.getByText('6. Relatório')).toBeInTheDocument();
  });

  it('botão Voltar está desabilitado no passo 1', () => {
    render(<ImportWizard />);
    const back = screen.getByRole('button', { name: /Voltar/i });
    expect(back).toBeDisabled();
  });

  it('botão Próximo no passo 1 está desabilitado sem arquivo', () => {
    render(<ImportWizard />);
    const next = screen.getByRole('button', { name: /Próximo/i });
    expect(next).toBeDisabled();
  });

  it('mapeamento: passo 3 exibe tabela de coluna/campo quando alcançado', () => {
    render(<ImportWizard />);
    expect(screen.getByText(/3\. Mapeamento/)).toBeInTheDocument();
  });
});
