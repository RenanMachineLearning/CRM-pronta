/**
 * Testes para o componente IconWrapper
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test/test-utils';;
import { IconWrapper } from '../IconWrapper';

// Mock de um ícone simples
const MockIcon = ({ className }: { className?: string }) => (
  <svg className={className} data-testid="mock-icon">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

describe('IconWrapper', () => {
  describe('Ícones Decorativos', () => {
    it('deve ter aria-hidden="true" quando decorative=true', () => {
      render(
        <IconWrapper
          icon={<MockIcon />}
          decorative={true}
        />
      );

      const wrapper = screen.getByTestId('mock-icon').parentElement;
      expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    });

    it('deve ter aria-hidden="true" quando não há label', () => {
      render(
        <IconWrapper
          icon={<MockIcon />}
        />
      );

      const wrapper = screen.getByTestId('mock-icon').parentElement;
      expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    });

    it('não deve ter role quando decorative', () => {
      render(
        <IconWrapper
          icon={<MockIcon />}
          decorative={true}
        />
      );

      const wrapper = screen.getByTestId('mock-icon').parentElement;
      expect(wrapper).not.toHaveAttribute('role');
    });
  });

  describe('Ícones com Label', () => {
    it('deve ter aria-label quando label é fornecido', () => {
      render(
        <IconWrapper
          icon={<MockIcon />}
          label="Editar contato"
        />
      );

      const wrapper = screen.getByLabelText('Editar contato');
      expect(wrapper).toBeInTheDocument();
    });

    it('deve ter role="img" quando label é fornecido', () => {
      render(
        <IconWrapper
          icon={<MockIcon />}
          label="Editar contato"
        />
      );

      const wrapper = screen.getByRole('img');
      expect(wrapper).toBeInTheDocument();
    });

    it('deve aplicar classe CSS corretamente', () => {
      render(
        <IconWrapper
          icon={<MockIcon />}
          decorative={true}
          className="test-class"
        />
      );

      const wrapper = screen.getByTestId('mock-icon').parentElement;
      expect(wrapper).toHaveClass('test-class');
    });
  });

  describe('Casos de Uso Comuns', () => {
    it('ícone decorativo dentro de botão - deve ser aria-hidden', () => {
      render(
        <button aria-label="Editar">
          <IconWrapper
            icon={<MockIcon />}
            decorative={true}
          />
        </button>
      );

      const iconWrapper = screen.getByTestId('mock-icon').parentElement;
      expect(iconWrapper).toHaveAttribute('aria-hidden', 'true');
      
      // O botão deve ser encontrado pelo aria-label
      const button = screen.getByRole('button', { name: 'Editar' });
      expect(button).toBeInTheDocument();
    });

    it('ícone standalone - deve ter aria-label', () => {
      render(
        <IconWrapper
          icon={<MockIcon />}
          label="Notificação"
        />
      );

      const icon = screen.getByRole('img', { name: 'Notificação' });
      expect(icon).toBeInTheDocument();
    });
  });
});
