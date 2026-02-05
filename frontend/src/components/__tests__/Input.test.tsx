import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/test-utils';
import { Input } from '../Input';

describe('Input', () => {
  it('deve renderizar o input com label', () => {
    render(<Input id="test" label="Nome" />);
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
  });

  it('deve renderizar o input sem label', () => {
    render(<Input placeholder="Digite aqui" />);
    expect(screen.getByPlaceholderText('Digite aqui')).toBeInTheDocument();
  });

  it('deve mostrar mensagem de erro', () => {
    render(<Input label="Email" error="Email inválido" id="email" />);
    expect(screen.getByText('Email inválido')).toBeInTheDocument();
  });

  it('deve mostrar texto de ajuda quando não há erro', () => {
    render(<Input label="Senha" helpText="Mínimo 8 caracteres" id="password" />);
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
  });

  it('deve chamar onChange quando valor muda', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'novo valor' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('deve estar desabilitado quando disabled for true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('deve ter atributo aria-invalid quando há erro', () => {
    render(<Input error="Erro" id="test" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('deve aplicar classes de variante corretamente', () => {
    render(<Input variant="error" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-error-500');
  });
});