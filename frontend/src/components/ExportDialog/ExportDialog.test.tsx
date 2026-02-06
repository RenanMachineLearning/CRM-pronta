import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExportDialog from './ExportDialog';
import { Field } from './ExportDialog.types';

// Mock para os props
const mockOnClose = vi.fn();
const mockOnExport = vi.fn();

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  entityType: 'Contact',
  currentFilters: undefined,
  availableFields: [
    { id: '1', name: 'firstName', label: 'Primeiro Nome', type: 'string', required: true, order: 1 },
    { id: '2', name: 'lastName', label: 'Último Nome', type: 'string', required: false, order: 2 },
    { id: '3', name: 'email', label: 'Email', type: 'string', required: false, order: 3 },
  ] as Field[],
  onExport: mockOnExport,
};

describe('ExportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<ExportDialog {...defaultProps} />);
    
    expect(screen.getByText('Exportar Contact')).toBeInTheDocument();
    expect(screen.getByLabelText('CSV')).toBeInTheDocument();
    expect(screen.getByLabelText('Excel')).toBeInTheDocument();
    expect(screen.getByText('Formato de exportação')).toBeInTheDocument();
    expect(screen.getByText('Campos para exportar')).toBeInTheDocument();
  });

  it('allows selection of export format', () => {
    render(<ExportDialog {...defaultProps} />);
    
    const excelRadio = screen.getByLabelText('Excel');
    fireEvent.click(excelRadio);
    
    expect(excelRadio).toBeChecked();
  });

  it('allows selection of fields', () => {
    render(<ExportDialog {...defaultProps} />);
    
    // O campo obrigatório deve estar selecionado e desabilitado
    const requiredCheckbox = screen.getByTestId('field-checkbox-1');
    expect(requiredCheckbox).toBeChecked();
    expect(requiredCheckbox).toBeDisabled();
    
    // O campo não obrigatório deve estar selecionado por padrão
    const optionalCheckbox = screen.getByTestId('field-checkbox-2');
    expect(optionalCheckbox).toBeChecked();
    
    // Desmarcar um campo opcional
    fireEvent.click(optionalCheckbox);
    expect(optionalCheckbox).not.toBeChecked();
  });

  it('handles select all and deselect all', () => {
    render(<ExportDialog {...defaultProps} />);
    
    // Desmarcar todos
    const deselectAllBtn = screen.getByText('Desmarcar todos');
    fireEvent.click(deselectAllBtn);
    
    // Apenas o campo obrigatório deve estar selecionado
    const requiredCheckbox = screen.getByTestId('field-checkbox-1');
    const optionalCheckbox = screen.getByTestId('field-checkbox-2');
    expect(requiredCheckbox).toBeChecked();
    expect(optionalCheckbox).not.toBeChecked();
    
    // Marcar todos
    const selectAllBtn = screen.getByText('Selecionar todos');
    fireEvent.click(selectAllBtn);
    
    // Todos os campos devem estar selecionados
    expect(requiredCheckbox).toBeChecked();
    expect(optionalCheckbox).toBeChecked();
  });

  it('calls onExport with correct options', async () => {
    render(<ExportDialog {...defaultProps} />);
    
    // Desmarcar um campo opcional
    const optionalCheckbox = screen.getByTestId('field-checkbox-2');
    fireEvent.click(optionalCheckbox);
    
    // Selecionar formato Excel
    const excelRadio = screen.getByLabelText('Excel');
    fireEvent.click(excelRadio);
    
    // Clicar no botão de exportação
    const exportBtn = screen.getByText('Exportar');
    fireEvent.click(exportBtn);
    
    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith({
        format: 'excel',
        fields: ['1', '3'], // Apenas campos 1 e 3 selecionados (2 foi desmarcado)
      });
    });
  });

  it('validates field selection before export', async () => {
    render(<ExportDialog {...defaultProps} />);
    
    // Verificar que campos estão selecionados por padrão
    expect(screen.getByTestId('field-checkbox-1')).toBeChecked();
    expect(screen.getByTestId('field-checkbox-2')).toBeChecked();
    
    // Exportar com campos selecionados deve funcionar
    const exportBtn = screen.getByText('Exportar');
    fireEvent.click(exportBtn);
    
    // A exportação deve ser chamada
    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalled();
    });
  });

  it('closes the dialog when cancel button is clicked', () => {
    render(<ExportDialog {...defaultProps} />);
    
    const cancelBtn = screen.getByText('Cancelar');
    fireEvent.click(cancelBtn);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
});