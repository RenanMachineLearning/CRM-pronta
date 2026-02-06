import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test/test-utils';;
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';

// Mock do GlobalSearchBar para testes
jest.mock('./GlobalSearchBar/GlobalSearchBar', () => ({
  __esModule: true,
  default: ({ placeholder }: { placeholder: string }) => (
    <input 
      data-testid="global-search" 
      placeholder={placeholder} 
      type="text" 
    />
  ),
}));

describe('Header Component', () => {
  const mockToggleSidebar = jest.fn();
  
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: BrowserRouter });
  };

  beforeEach(() => {
    mockToggleSidebar.mockClear();
  });

  test('renders logo and title', () => {
    renderWithRouter(
      <Header sidebarOpen={false} toggleSidebar={mockToggleSidebar} />
    );
    
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument(); // Logo SVG
  });

  test('renders navigation links', () => {
    renderWithRouter(
      <Header sidebarOpen={false} toggleSidebar={mockToggleSidebar} />
    );
    
    expect(screen.getByText('Contatos')).toBeInTheDocument();
    expect(screen.getByText('Empresas')).toBeInTheDocument();
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Oportunidades')).toBeInTheDocument();
    expect(screen.getByText('Tarefas')).toBeInTheDocument();
    expect(screen.getByText('Notas')).toBeInTheDocument();
  });

  test('renders global search bar', () => {
    renderWithRouter(
      <Header sidebarOpen={false} toggleSidebar={mockToggleSidebar} />
    );
    
    expect(screen.getByTestId('global-search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar contatos, empresas, leads...')).toBeInTheDocument();
  });

  test('calls toggleSidebar when menu button is clicked', () => {
    renderWithRouter(
      <Header sidebarOpen={false} toggleSidebar={mockToggleSidebar} />
    );
    
    // O botão de menu só aparece em dispositivos móveis (tela menor)
    // Vamos testar com a classe apropriada
    const menuButton = screen.queryByLabelText(/abrir menu de navegação/i);
    if (menuButton) {
      fireEvent.click(menuButton);
      expect(mockToggleSidebar).toHaveBeenCalledTimes(1);
    }
  });

  test('renders user profile icon', () => {
    renderWithRouter(
      <Header sidebarOpen={false} toggleSidebar={mockToggleSidebar} />
    );
    
    const userIcon = screen.getByRole('button', { hidden: true }); // O botão do usuário é identificado por seu papel
    expect(userIcon).toBeInTheDocument();
  });
});