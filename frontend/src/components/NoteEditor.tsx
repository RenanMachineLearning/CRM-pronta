/**
 * Componente NoteEditor
 * Editor de notas com suporte a Markdown, preview e botões de formatação
 */

import React, { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Componente MarkdownPreview encapsulado
 */
interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <div className={`text-gray-400 italic text-sm p-4 ${className}`}>
        Preview aparecerá aqui
      </div>
    );
  }

  return (
    <div className={`prose prose-sm max-w-none p-4 overflow-auto ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Helper para inserir sintaxe Markdown no textarea
 */
function insertMarkdown(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string = '',
  onChange?: (value: string) => void
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  const newText = before + selectedText + after;
  const newValue = 
    textarea.value.substring(0, start) + 
    newText + 
    textarea.value.substring(end);
  
  // Atualizar valor do textarea
  textarea.value = newValue;
  
  // Reposicionar cursor após o texto inserido
  const newCursorStart = start + before.length;
  const newCursorEnd = newCursorStart + selectedText.length;
  textarea.selectionStart = newCursorStart;
  textarea.selectionEnd = newCursorEnd;
  
  // Manter foco
  textarea.focus();
  
  // Disparar evento onChange manualmente (para componentes controlados)
  if (onChange) {
    onChange(newValue);
  } else {
    // Disparar evento nativo para componentes não controlados
    const event = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event);
  }
}

/**
 * Props do componente NoteEditor
 */
export interface NoteEditorProps {
  value: string; // Conteúdo Markdown (controlado)
  onChange: (value: string) => void; // Callback quando conteúdo muda
  error?: string; // Mensagem de erro a exibir
  label?: string; // Label do campo (opcional)
  placeholder?: string; // Placeholder do textarea
  showPreview?: boolean; // Mostrar preview? Default: true
  previewMode?: 'split' | 'tab'; // Modo de preview: split (lado a lado) ou tab (abas). Default: 'split'
  minHeight?: string; // Altura mínima do editor. Default: '200px'
  maxLength?: number; // Comprimento máximo. Default: 10000
  disabled?: boolean; // Desabilitar editor? Default: false
  required?: boolean; // Campo obrigatório? Default: false
  className?: string; // Classes CSS adicionais
  'aria-label'?: string; // Acessibilidade: label para screen readers
  'aria-describedby'?: string; // Acessibilidade: ID do elemento que descreve o campo
}

/**
 * Componente NoteEditor
 */
export function NoteEditor({
  value,
  onChange,
  error,
  label,
  placeholder = 'Digite sua nota aqui...',
  showPreview = true,
  previewMode = 'split',
  minHeight = '200px',
  maxLength = 10000,
  disabled = false,
  required = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: NoteEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = value.length;
  const isOverLimit = charCount > maxLength;
  const remainingChars = maxLength - charCount;
  const isNearLimit = remainingChars < 100 && remainingChars >= 0;

  // Função para validar conteúdo
  const validateContent = useCallback((content: string): { isValid: boolean; error?: string } => {
    const trimmed = content.trim();
    
    if (required && trimmed.length === 0) {
      return {
        isValid: false,
        error: 'Conteúdo é obrigatório e não pode ser vazio'
      };
    }
    
    if (content.length > maxLength) {
      return {
        isValid: false,
        error: `Conteúdo não pode exceder ${maxLength} caracteres`
      };
    }
    
    return { isValid: true };
  }, [required, maxLength]);

  // Handler para mudança de conteúdo
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Prevenir digitação adicional se exceder limite
    if (newValue.length > maxLength) {
      return;
    }
    
    onChange(newValue);
  }, [onChange, maxLength]);

  // Handlers para botões de formatação
  const handleFormatBold = useCallback(() => {
    if (textareaRef.current && !disabled) {
      insertMarkdown(textareaRef.current, '**', '**', onChange);
    }
  }, [onChange, disabled]);

  const handleFormatItalic = useCallback(() => {
    if (textareaRef.current && !disabled) {
      insertMarkdown(textareaRef.current, '*', '*', onChange);
    }
  }, [onChange, disabled]);

  const handleFormatUnorderedList = useCallback(() => {
    if (textareaRef.current && !disabled) {
      insertMarkdown(textareaRef.current, '- ', '', onChange);
    }
  }, [onChange, disabled]);

  const handleFormatOrderedList = useCallback(() => {
    if (textareaRef.current && !disabled) {
      insertMarkdown(textareaRef.current, '1. ', '', onChange);
    }
  }, [onChange, disabled]);

  const handleFormatLink = useCallback(() => {
    if (textareaRef.current && !disabled) {
      const url = prompt('Digite a URL:');
      if (url) {
        insertMarkdown(textareaRef.current, '[', `](${url})`, onChange);
      }
    }
  }, [onChange, disabled]);

  const handleFormatCode = useCallback(() => {
    if (textareaRef.current && !disabled) {
      insertMarkdown(textareaRef.current, '`', '`', onChange);
    }
  }, [onChange, disabled]);

  // Determinar cor do contador de caracteres
  const getCharCountColor = () => {
    if (isOverLimit) return 'text-red-600';
    if (isNearLimit) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const validation = validateContent(value);
  const displayError = error || (!validation.isValid ? validation.error : undefined);

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}

      {/* Botões de Formatação */}
      <div className="flex gap-1 mb-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={handleFormatBold}
          disabled={disabled}
          aria-label="Negrito"
          className="px-2 py-1 text-sm font-bold border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Negrito"
        >
          B
        </button>
        <button
          type="button"
          onClick={handleFormatItalic}
          disabled={disabled}
          aria-label="Itálico"
          className="px-2 py-1 text-sm italic border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Itálico"
        >
          I
        </button>
        <button
          type="button"
          onClick={handleFormatUnorderedList}
          disabled={disabled}
          aria-label="Lista não ordenada"
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Lista não ordenada"
        >
          -
        </button>
        <button
          type="button"
          onClick={handleFormatOrderedList}
          disabled={disabled}
          aria-label="Lista ordenada"
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Lista ordenada"
        >
          1.
        </button>
        <button
          type="button"
          onClick={handleFormatLink}
          disabled={disabled}
          aria-label="Link"
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Link"
        >
          []
        </button>
        <button
          type="button"
          onClick={handleFormatCode}
          disabled={disabled}
          aria-label="Código inline"
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
          title="Código inline"
        >
          `
        </button>
      </div>

      {/* Modo Tab: Abas para alternar */}
      {showPreview && previewMode === 'tab' && (
        <div className="flex border-b border-gray-200 mb-2">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'edit'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'preview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview
          </button>
        </div>
      )}

      {/* Container do Editor e Preview */}
      <div className={`${showPreview && previewMode === 'split' ? 'grid grid-cols-2 gap-4' : ''}`}>
        {/* Editor */}
        <div className={showPreview && previewMode === 'tab' && activeTab !== 'edit' ? 'hidden' : ''}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            maxLength={maxLength}
            aria-label={ariaLabel || label || 'Editor de notas'}
            aria-describedby={ariaDescribedBy}
            aria-invalid={!!displayError}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
              displayError ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            style={{ minHeight }}
          />
        </div>

        {/* Preview */}
        {showPreview && (
          <div className={previewMode === 'tab' && activeTab !== 'preview' ? 'hidden' : ''}>
            <div
              className="border border-gray-300 rounded-md"
              style={{ minHeight }}
            >
              <MarkdownPreview content={value} />
            </div>
          </div>
        )}
      </div>

      {/* Contador de caracteres e mensagem de erro */}
      <div className="mt-2 flex justify-between items-start">
        <div className="flex-1">
          {displayError && (
            <p className="text-sm text-red-600" role="alert">
              {displayError}
            </p>
          )}
        </div>
        <div className={`text-sm ${getCharCountColor()}`}>
          {charCount} / {maxLength}
        </div>
      </div>
    </div>
  );
}
