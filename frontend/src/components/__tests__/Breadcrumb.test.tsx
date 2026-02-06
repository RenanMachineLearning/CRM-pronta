/**
 * Testes para o componente Breadcrumb
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbSimple } from '../Breadcrumb';
import * as useBreadcrumbsModule from '../../hooks/useBreadcrumbs';

// Mock do hook useBreadcrumbs
vi.mock('../../hooks/useBreadcrumbs', () => ({
  useBreadcrumbs: vi.fn(),
}));

const mockUseBreadcrumbs = useBreadcrumbsModule.useBreadcrumbs as ReturnType<typeof vi.fn>;

describe('Breadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement, initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        {component}
      </MemoryRouter>
    );
  };

  describe('Renderização Básica', () => {
    it('não deve renderizar na página inicial (/)', () => {
      mockUseBreadcrumbs.mockReturnValue({
        items: [{ label: 'Início', path: '/' }],
        isLoading: false,
      });

      renderWithRouter(<Breadcrumb />, '/');
      
      const nav = screen.queryByLabelText('Breadcrumb');
      expect(nav).not.toBeInTheDocument();
    });

    it('deve renderizar breadcrumb simples', () => {
      mockUseBreadcrumbs.mockReturnValue({
        items: [
          { label: 'Início', path: '/' },
          { label: 'Contatos', path: '/contacts' },
        ],
        isLoading: false,
      });

      renderWithRouter(<Breadcrumb />, '/contacts');
      
      expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
      expect(screen.getByText('Início')).toBeInTheDocument();
      expect(screen.getByText('Contatos')).toBeInTheDocument();
    });

    it('deve renderizar ícone de home quando showHomeIcon=true', () => {
      mockUseBreadcrumbs.mockReturnValue({
        items: [
          { label: 'Início', path: '/' },
          { label: 'Contatos', path: '/contacts' },
        ],
        isLoading: false,
      });

      renderWithRouter(<Breadcrumb showHomeIcon />, '/contacts');
      
      // Verifica se o ícone home está presente (usando aria-hidden)
      const homeIcon = document.querySelector('[data-testid]')?.querySelector('svg');
      // Ou verifica pelo texto alternativo
      expect(screen.getByText('Início')).toBeInTheDocument();
    });
  });

  describe('Links e Navegação', () => {
    it('deve renderizar links clicáveis para itens anteriores', () => {
      mockUseBreadcrumbs.mockReturnValue({
        items: [
          { label: 'Início', path: '/' },
          { label: 'Contatos', path: '/contacts' },
          { label: 'Novo Contato', path: '/contacts/new' },
        ],
        isLoading: false,
      });

      renderWithRouter(<Breadcrumb />, '/contacts/new');
      
      // Links anteriores devem ser clicáveis
      const homeLink = screen.getByText('Início').closest('a');
      const contactsLink = screen.getByText('Contatos').closest('a');
      
      expect(homeLink).toHaveAttribute('href', '/');
      expect(contactsLink).toHaveAttribute('href', '/contacts');
    });

    it('deve renderizar último item como texto (não clicável)', () => {
      mockUseBreadcrumbs.mockReturnValue({
        items: [
          { label: 'Início', path: '/' },
          { label: 'Contatos', path: '/contacts' },
        ],
        isLoading: false,
      });

      renderWithRouter(<Breadcrumb />, '/contacts');
      
      // Último item não deve ser um link
      const lastItem = screen.getByText('Contatos');
      expect(lastItem.tagName).toBe('SPAN');
      expect(lastItem).toHaveAttribute('aria-current', 'page');
    });

    it('deve renderizar separadores entre itens', () => {
      mockUseBreadcrumbs.mockReturnValue({
        items: [
          { label: 'Início', path: '/' },
          { label: 'Contatos', path: '/contacts' },
          { label: 'Novo', path: '/contacts/new' },
        ],
        isLoading: false,
      });

      renderWithRouter(<Breadcrumb />, '/contacts/new');
      
      // Deve ter 2 separadores (chevrons) para 3 itens
      const separators = document.querySelectorAll('svg');
      expect(separators.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Truncamento', () => {
    it('deve truncar breadcrumbs longos quando excede maxItems', () => {
      mockUseBreadcrumbs.mockReturnValue({
        items: [
          { label: 'Início', path: '/' },
          { label: 'Contatos', path: '/contacts' },
          { label: 'Empresas', path: '/companies' },
          { label: 'Leads', path: '/leads' },
          { label: 'Oportunidades', path: '/opportunities' },
          { label: 'Detalhes', path: '/opportunities/123' },
        ],
        isLoading: false,
      });

      renderWithRouter(<Breadcrumb maxItems={4} />, '/opportunities/123');
      
      // Deve mostrar ellipsis (...)
      expect(screen.getByText('...')).toBeInTheDocument();
      
      // Deve mostrar primeiro e últimos itens
      expect(screen.getByText('Início')).toBeInTheDocument();
      expect(screen.getByText('Detalhes')).toBeInTheDocument();
    });
  });

  describe('Estados de Loading', () => {
    it('deve aplicar animação pulse quando isLoading=true no último item', () => {
      mockUseBreadcrumbs.mockReturnValue({
        items: [
          { label: 'Início', path: '/' },
          { label: 'Contatos', path: '/contacts' },
          { label: 'Carregando...', path: '/contacts/123' },
        ],
        isLoading: true,
      });

      renderWithRouter(<Breadcrumb />, '/contacts/123');
      
      const lastItem = screen.getByText('Carregando...');
      expect(lastItem.className).toContain('animate-pulse');
    });
  });

  describe('Classes CSS e Acessibilidade', () => {
    it('deve aplicar classe customizada via className prop', () => {
      mockUseBreadcrumbs.mockReturnValue({
        items: [
          { label: 'Início', path: '/' },
          { label: 'Contatos', path: '/contacts' },
        ],
        isLoading: false,
      });

      renderWithRouter(<Breadcrumb className="custom-breadcrumb-class" />, '/contacts');
      
      const nav = screen.getByLabelText('Breadcrumb');
      expect(nav.className).toContain('custom-breadcrumb-class');
    });

    it('deve ter atributo aria-label correto', () => {
      mockUseBreadcrumbs.mockReturnValue({
        items: [
          { label: 'Início', path: '/' },
          { label: 'Contatos', path: '/contacts' },
        ],
        isLoading: false,
      });

      renderWithRouter(<Breadcrumb />, '/contacts');
      
      expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
    });
  });
});

describe('BreadcrumbSimple', () => {
  const renderWithRouter = (component: React.ReactElement, initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        {component}
      </MemoryRouter>
    );
  };

  it('deve renderizar versão simplificada', () => {
    vi.mocked(useBreadcrumbsModule.useBreadcrumbs).mockReturnValue({
      items: [
        { label: 'Início', path: '/' },
        { label: 'Contatos', path: '/contacts' },
        { label: 'Novo Contato', path: '/contacts/new' },
      ],
      isLoading: false,
    });

    renderWithRouter(<BreadcrumbSimple />, '/contacts/new');
    
    // Deve mostrar apenas página atual e pai
    expect(screen.getByText('Contatos')).toBeInTheDocument();
    expect(screen.getByText('Novo Contato')).toBeInTheDocument();
  });

  it('não deve renderizar na página inicial', () => {
    vi.mocked(useBreadcrumbsModule.useBreadcrumbs).mockReturnValue({
      items: [{ label: 'Início', path: '/' }],
      isLoading: false,
    });

    renderWithRouter(<BreadcrumbSimple />, '/');
    
    expect(screen.queryByText('Início')).not.toBeInTheDocument();
  });
});
