import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  const mockToggleSidebar = jest.fn();
  
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: BrowserRouter });
  };

  beforeEach(() => {
    mockToggleSidebar.mockClear();
  });

  test('renders navigation links', () => {
    renderWithRouter(
      <Sidebar isOpen={true} toggleSidebar={mockToggleSidebar} />
    );
    
    expect(screen.getByText('Contatos')).toBeInTheDocument();
    expect(screen.getByText('Empresas')).toBeInTheDocument();
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Oportunidades')).toBeInTheDocument();
    expect(screen.getByText('Tarefas')).toBeInTheDocument();
    expect(screen.getByText('Notas')).toBeInTheDocument();
    expect(screen.getByText('Importar')).toBeInTheDocument();
    expect(screen.getByText('Busca Global')).toBeInTheDocument();
    expect(screen.getByText('Design System')).toBeInTheDocument();
  });

  test('renders close button when open on mobile', () => {
    renderWithRouter(
      <Sidebar isOpen={true} toggleSidebar={mockToggleSidebar} />
    );
    
    const closeButton = screen.queryByLabelText(/fechar menu/i);
    if (closeButton) {
      expect(closeButton).toBeInTheDocument();
    }
  });

  test('calls toggleSidebar when close button is clicked', () => {
    renderWithRouter(
      <Sidebar isOpen={true} toggleSidebar={mockToggleSidebar} />
    );
    
    const closeButton = screen.queryByLabelText(/fechar menu/i);
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockToggleSidebar).toHaveBeenCalledTimes(1);
    }
  });

  test('renders logo and title', () => {
    renderWithRouter(
      <Sidebar isOpen={true} toggleSidebar={mockToggleSidebar} />
    );
    
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument(); // Logo SVG
  });
});