/**
 * Layout principal da aplicação
 * Inclui header com barra de busca global e navegação
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import GlobalSearchBar from './GlobalSearchBar/GlobalSearchBar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  // Links de navegação
  const navLinks = [
    { path: '/contacts', label: 'Contatos' },
    { path: '/companies', label: 'Empresas' },
    { path: '/leads', label: 'Leads' },
    { path: '/opportunities', label: 'Oportunidades' },
    { path: '/tasks', label: 'Tarefas' },
    { path: '/notes', label: 'Notas' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo / Home */}
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>CRM</span>
            </Link>

            {/* Barra de busca global */}
            <div className="flex-1 max-w-2xl mx-8">
              <GlobalSearchBar placeholder="Buscar contatos, empresas, leads..." />
            </div>

            {/* Navegação */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main>
        {children}
      </main>
    </div>
  );
}
