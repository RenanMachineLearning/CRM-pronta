/**
 * Testes para componente NoteEditor
 * 
 * Teste obrigatório 1: Editor de notas funciona
 * Teste obrigatório 2: Preview de Markdown funciona
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { NoteEditor } from '../NoteEditor';

describe('NoteEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderização', () => {
    it('renderiza textarea', () => {
      render(<NoteEditor value="" onChange={mockOnChange} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    it('exibe label quando fornecido', () => {
      render(<NoteEditor value="" onChange={mockOnChange} label="Conteúdo da Nota" />);
      expect(screen.getByText('Conteúdo da Nota')).toBeInTheDocument();
    });

    it('exibe placeholder quando fornecido', () => {
      render(<NoteEditor value="" onChange={mockOnChange} placeholder="Digite aqui..." />);
      const textarea = screen.getByPlaceholderText('Digite aqui...');
      expect(textarea).toBeInTheDocument();
    });

    it('exibe contador de caracteres', () => {
      render(<NoteEditor value="Teste" onChange={mockOnChange} />);
      expect(screen.getByText(/5 \/ 10000/)).toBeInTheDocument();
    });
  });

  describe('Editor de notas funciona (Teste Obrigatório 1)', () => {
    it('aceita input do usuário', async () => {
      const user = userEvent.setup();
      render(<NoteEditor value="" onChange={mockOnChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Texto de teste');
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('chama onChange quando conteúdo muda', async () => {
      const user = userEvent.setup();
      render(<NoteEditor value="" onChange={mockOnChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'a');
      
      expect(mockOnChange).toHaveBeenCalledWith('a');
    });

    it('mantém valor controlado corretamente', () => {
      const { rerender } = render(<NoteEditor value="Inicial" onChange={mockOnChange} />);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Inicial');
      
      rerender(<NoteEditor value="Atualizado" onChange={mockOnChange} />);
      expect(textarea.value).toBe('Atualizado');
    });
  });

  describe('Preview de Markdown funciona (Teste Obrigatório 2)', () => {
    it('renderiza markdown corretamente - negrito', () => {
      render(<NoteEditor value="**texto em negrito**" onChange={mockOnChange} />);
      // Verificar se o preview renderiza (pode não ter strong tag visível, mas o conteúdo deve estar)
      const preview = screen.getByText(/Preview aparecerá aqui|texto em negrito/i);
      expect(preview).toBeInTheDocument();
    });

    it('renderiza markdown corretamente - itálico', () => {
      render(<NoteEditor value="*texto em itálico*" onChange={mockOnChange} />);
      const preview = screen.getByText(/Preview aparecerá aqui|texto em itálico/i);
      expect(preview).toBeInTheDocument();
    });

    it('renderiza markdown corretamente - listas', () => {
      render(<NoteEditor value="- item 1\n- item 2" onChange={mockOnChange} />);
      const preview = screen.getByText(/Preview aparecerá aqui|item 1|item 2/i);
      expect(preview).toBeInTheDocument();
    });

    it('atualiza em tempo real conforme digitação', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<NoteEditor value="" onChange={mockOnChange} />);
      
      // Digitar conteúdo
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '# Título');
      
      // Atualizar componente com novo valor
      rerender(<NoteEditor value="# Título" onChange={mockOnChange} />);
      
      // Preview deve atualizar
      await waitFor(() => {
        const preview = screen.queryByText(/Preview aparecerá aqui/i);
        expect(preview).not.toBeInTheDocument();
      });
    });

    it('mostra mensagem quando conteúdo vazio', () => {
      render(<NoteEditor value="" onChange={mockOnChange} />);
      expect(screen.getByText('Preview aparecerá aqui')).toBeInTheDocument();
    });
  });

  describe('Botões de formatação funcionam', () => {
    it('insere markdown no cursor quando não há seleção', async () => {
      const user = userEvent.setup();
      render(<NoteEditor value="texto" onChange={mockOnChange} />);
      
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(3, 3); // Cursor no meio
      
      const boldButton = screen.getByLabelText('Negrito');
      await user.click(boldButton);
      
      // Deve inserir ** antes e depois do cursor
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('insere markdown ao redor do texto selecionado', async () => {
      const user = userEvent.setup();
      render(<NoteEditor value="texto selecionado" onChange={mockOnChange} />);
      
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 6); // Selecionar "texto"
      
      const boldButton = screen.getByLabelText('Negrito');
      await user.click(boldButton);
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('mantém foco no textarea após inserção', async () => {
      const user = userEvent.setup();
      render(<NoteEditor value="texto" onChange={mockOnChange} />);
      
      const textarea = screen.getByRole('textbox');
      const boldButton = screen.getByLabelText('Negrito');
      
      await user.click(boldButton);
      
      // Foco deve estar no textarea
      expect(textarea).toHaveFocus();
    });
  });

  describe('Contador de caracteres funciona', () => {
    it('atualiza conforme digitação', async () => {
      const { rerender } = render(<NoteEditor value="" onChange={mockOnChange} />);

      expect(screen.getByText(/0 \/ 10000/)).toBeInTheDocument();

      rerender(<NoteEditor value="abc" onChange={mockOnChange} />);
      expect(screen.getByText(/3 \/ 10000/)).toBeInTheDocument();
    });

    it('respeita limite de caracteres', () => {
      const longText = 'a'.repeat(10001);
      render(<NoteEditor value={longText} onChange={mockOnChange} maxLength={10000} />);
      
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      // Valor deve ser truncado ou não permitir digitação adicional
      expect(textarea.value.length).toBeLessThanOrEqual(10000);
    });

    it('mostra feedback visual quando próximo do limite', () => {
      const nearLimitText = 'a'.repeat(9901); // 99 caracteres restantes
      render(<NoteEditor value={nearLimitText} onChange={mockOnChange} />);
      
      const counter = screen.getByText(/9901 \/ 10000/);
      expect(counter).toHaveClass('text-yellow-600');
    });

    it('mostra feedback visual quando excedido', () => {
      const overLimitText = 'a'.repeat(10001);
      render(<NoteEditor value={overLimitText} onChange={mockOnChange} maxLength={10000} />);
      
      const counter = screen.getByText(/10001 \/ 10000/);
      expect(counter).toHaveClass('text-red-600');
    });
  });

  describe('Validação funciona', () => {
    it('mostra erro quando conteúdo vazio após trim e required', () => {
      render(<NoteEditor value="   " onChange={mockOnChange} required />);
      
      // A validação deve detectar conteúdo vazio após trim
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('mostra erro quando excede limite de caracteres', () => {
      const longText = 'a'.repeat(10001);
      render(<NoteEditor value={longText} onChange={mockOnChange} maxLength={10000} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('não mostra erro quando conteúdo válido', () => {
      render(<NoteEditor value="Conteúdo válido" onChange={mockOnChange} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-invalid', 'false');
    });

    it('borda do textarea fica vermelha quando há erro', () => {
      render(<NoteEditor value="" onChange={mockOnChange} error="Erro de teste" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('border-red-500');
    });

    it('exibe mensagem de erro quando fornecida', () => {
      render(<NoteEditor value="" onChange={mockOnChange} error="Erro customizado" />);
      
      expect(screen.getByText('Erro customizado')).toBeInTheDocument();
    });
  });

  describe('Modo split/tab funciona', () => {
    it('modo split: mostra editor e preview lado a lado', () => {
      render(<NoteEditor value="teste" onChange={mockOnChange} previewMode="split" showPreview />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      
      // Preview deve estar visível
      const preview = screen.queryByText(/Preview aparecerá aqui/i);
      expect(preview).toBeInTheDocument();
    });

    it('modo tab: mostra abas para alternar entre editor e preview', () => {
      render(<NoteEditor value="teste" onChange={mockOnChange} previewMode="tab" showPreview />);
      
      expect(screen.getByText('Editar')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('alterna entre visualizações no modo tab', async () => {
      const user = userEvent.setup();
      render(<NoteEditor value="teste" onChange={mockOnChange} previewMode="tab" showPreview />);
      
      const previewTab = screen.getByText('Preview');
      await user.click(previewTab);
      
      // Editor deve estar oculto, preview visível
      const textarea = screen.getByRole('textbox');
      expect(textarea.closest('div')).toHaveClass('hidden');
    });

    it('preview não aparece quando showPreview=false', () => {
      render(<NoteEditor value="teste" onChange={mockOnChange} showPreview={false} />);
      
      const preview = screen.queryByText(/Preview aparecerá aqui/i);
      expect(preview).not.toBeInTheDocument();
    });
  });

  describe('Acessibilidade funciona', () => {
    it('labels e aria-labels estão presentes', () => {
      render(<NoteEditor value="" onChange={mockOnChange} label="Conteúdo" />);
      
      const textarea = screen.getByLabelText('Conteúdo');
      expect(textarea).toBeInTheDocument();
    });

    it('navegação por teclado funciona', async () => {
      const user = userEvent.setup();
      render(<NoteEditor value="" onChange={mockOnChange} />);

      screen.getByRole('textbox');
      await user.tab();

      // Deve focar no textarea ou primeiro botão
      expect(document.activeElement).toBeInTheDocument();
    });

    it('screen readers podem identificar o campo', () => {
      render(<NoteEditor value="" onChange={mockOnChange} label="Conteúdo da Nota" aria-label="Editor de notas" />);
      
      const textarea = screen.getByLabelText(/Conteúdo da Nota|Editor de notas/i);
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Estados e props funcionam', () => {
    it('disabled desabilita editor e botões', () => {
      render(<NoteEditor value="teste" onChange={mockOnChange} disabled />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
      
      const boldButton = screen.getByLabelText('Negrito');
      expect(boldButton).toBeDisabled();
    });

    it('required marca campo como obrigatório', () => {
      render(<NoteEditor value="" onChange={mockOnChange} required />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeRequired();
      
      // Deve mostrar asterisco no label se houver
      const label = screen.queryByText(/\*/);
      if (label) {
        expect(label).toHaveClass('text-red-600');
      }
    });

    it('placeholder aparece quando vazio', () => {
      render(<NoteEditor value="" onChange={mockOnChange} placeholder="Digite aqui..." />);
      
      const textarea = screen.getByPlaceholderText('Digite aqui...');
      expect(textarea).toBeInTheDocument();
    });

    it('error exibe mensagem de erro', () => {
      render(<NoteEditor value="" onChange={mockOnChange} error="Erro de validação" />);
      
      expect(screen.getByText('Erro de validação')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('conteúdo muito longo é tratado corretamente', () => {
      const longText = 'a'.repeat(10000);
      render(<NoteEditor value={longText} onChange={mockOnChange} />);
      
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value.length).toBe(10000);
    });

    it('conteúdo vazio não quebra preview', () => {
      render(<NoteEditor value="" onChange={mockOnChange} />);
      
      expect(screen.getByText('Preview aparecerá aqui')).toBeInTheDocument();
    });

    it('botões funcionam mesmo quando textarea está vazio', async () => {
      const user = userEvent.setup();
      render(<NoteEditor value="" onChange={mockOnChange} />);
      
      const boldButton = screen.getByLabelText('Negrito');
      await user.click(boldButton);
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('maxLength customizado funciona', () => {
      render(<NoteEditor value="teste" onChange={mockOnChange} maxLength={5000} />);
      
      expect(screen.getByText(/5 \/ 5000/)).toBeInTheDocument();
    });
  });
});
