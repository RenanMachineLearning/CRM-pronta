import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import SkipLink from './SkipLink';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Fechar sidebar ao mudar de rota em mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <>
      {/* Skip Link para acessibilidade */}
      <SkipLink />

      <div className="flex h-screen bg-bg-page">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        {/* Conteúdo principal */}
        <div className="flex flex-col flex-1 w-full overflow-hidden">
          {/* Header */}
          <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

          {/* Main content */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto pt-2 pb-6 px-2 sm:px-4 md:px-6 lg:px-8 focus:outline-none"
          >
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>

        {/* Rodapé opcional */}
        <footer className="bg-bg-surface border-t border-border-default py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center text-sm text-text-secondary">
            © {new Date().getFullYear()} CRM SaaS - Todos os direitos reservados
          </div>
        </footer>
      </div>
    </div>
    </>
  );
};

export default Layout;