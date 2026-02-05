import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import { Button } from '../Button';

describe('Button', () => {
  it('deve renderizar o botão com o texto correto', () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByText('Clique aqui')).toBeInTheDocument();
  });

  it('deve estar desabilitado quando disabled for true', () => {
    render(<Button disabled>Desabilitado</Button>);
    expect(screen.getByText('Desabilitado')).toBeDisabled();
  });

  it('deve mostrar loading quando isLoading for true', () => {
    render(<Button isLoading>Carregando</Button>);
    expect(screen.getByText('Carregando')).toBeInTheDocument();
  });

  it('deve chamar onClick quando clicado', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clicar</Button>);
    screen.getByText('Clicar').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('deve ter as classes corretas para variantes diferentes', () => {
    const { rerender } = render(<Button variant="primary">Primário</Button>);
    expect(screen.getByText('Primário')).toHaveClass('bg-primary-600');

    rerender(<Button variant="danger">Perigo</Button>);
    expect(screen.getByText('Perigo')).toHaveClass('bg-error-600');
  });
});