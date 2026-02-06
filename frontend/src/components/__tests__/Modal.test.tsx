/**
 * Testes para componente Modal genérico
 */

import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test/test-utils';;
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

describe('Modal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderização', () => {
    it('não renderiza quando isOpen = false', () => {
      render(
        <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
          <div>Modal Content</div>
        </Modal>
      );

      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
      expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
    });

    it('renderiza quando isOpen = true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal Content</div>
        </Modal>
      );

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('exibe título corretamente', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="My Modal Title">
          <div>Content</div>
        </Modal>
      );

      expect(screen.getByText('My Modal Title')).toBeInTheDocument();
    });

    it('exibe conteúdo (children) corretamente', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div data-testid="modal-content">Custom Content</div>
        </Modal>
      );

      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });
  });

  describe('Interações', () => {
    it('chama onClose ao clicar no backdrop', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </Modal>
      );

      const backdrop = screen.getByRole('dialog').querySelector('.fixed.inset-0.bg-black');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('chama onClose ao clicar no botão X', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </Modal>
      );

      const closeButton = screen.getByLabelText('Fechar modal');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('chama onClose ao pressionar ESC', async () => {
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </Modal>
      );

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('não chama onClose ao clicar dentro do modal', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div data-testid="modal-inner">Content</div>
        </Modal>
      );

      const modalInner = screen.getByTestId('modal-inner');
      fireEvent.click(modalInner);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Acessibilidade', () => {
    it('tem ARIA attributes corretos', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('botão de fechar tem aria-label', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </Modal>
      );

      const closeButton = screen.getByLabelText('Fechar modal');
      expect(closeButton).toBeInTheDocument();
    });

    it('título tem id correto para aria-labelledby', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </Modal>
      );

      const title = screen.getByText('Test Modal');
      expect(title).toHaveAttribute('id', 'modal-title');
    });
  });

  describe('Tamanhos', () => {
    it('usa tamanho md por padrão', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </Modal>
      );

      const modalContainer = screen.getByRole('dialog').querySelector('.max-w-md');
      expect(modalContainer).toBeInTheDocument();
    });

    it('aplica tamanho sm quando especificado', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" size="sm">
          <div>Content</div>
        </Modal>
      );

      const modalContainer = screen.getByRole('dialog').querySelector('.max-w-sm');
      expect(modalContainer).toBeInTheDocument();
    });

    it('aplica tamanho lg quando especificado', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" size="lg">
          <div>Content</div>
        </Modal>
      );

      const modalContainer = screen.getByRole('dialog').querySelector('.max-w-lg');
      expect(modalContainer).toBeInTheDocument();
    });

    it('aplica tamanho xl quando especificado', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" size="xl">
          <div>Content</div>
        </Modal>
      );

      const modalContainer = screen.getByRole('dialog').querySelector('.max-w-2xl');
      expect(modalContainer).toBeInTheDocument();
    });
  });

  describe('Prevenção de scroll', () => {
    it('previne scroll do body quando aberto', () => {
      const originalOverflow = document.body.style.overflow;
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');

      // Cleanup
      document.body.style.overflow = originalOverflow;
    });

    it('restaura scroll do body quando fechado', () => {
      const originalOverflow = document.body.style.overflow;
      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('');

      // Cleanup
      document.body.style.overflow = originalOverflow;
    });
  });
});
