import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Bars3Icon, 
  BellAlertIcon, 
  XMarkIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { Tooltip } from './Tooltip';
import { LazyImage } from './LazyImage';
import GlobalSearchBar from './GlobalSearchBar/GlobalSearchBar';

interface HeaderProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Obtém iniciais do nome
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-bg-surface border-b border-border-default shadow-sm sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 gap-4 px-4 sm:px-6 lg:px-8">
        {/* Botão para abrir sidebar em mobile */}
        <div className="flex items-center">
          <button
            type="button"
            className="text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
            onClick={toggleSidebar}
          >
            <span className="sr-only">Abrir menu de navegação</span>
            {sidebarOpen ? (
              <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
            ) : (
              <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
            )}
          </button>

          {/* Logo / Home */}
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-text-primary hover:text-primary-600 transition-colors ml-2 md:ml-0">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>CRM</span>
          </Link>
        </div>

        {/* Barra de busca global - oculta em mobile */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-8">
          <GlobalSearchBar placeholder="Buscar contatos, empresas, leads..." />
        </div>

        {/* Ícones de ação - desktop */}
        <div className="flex items-center gap-4">
          {/* Notificações */}
          <div className="relative">
            <Tooltip content="Notificações">
              <button
                type="button"
                className="p-1 text-text-tertiary hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Ver notificações"
                aria-expanded={notificationsOpen}
                aria-haspopup="true"
              >
                <span className="sr-only">Ver notificações</span>
                <BellAlertIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </Tooltip>

            {/* Dropdown de notificações */}
            {notificationsOpen && (
              <div
                className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-bg-surface ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                role="menu"
                aria-label="Notificações"
              >
                <div className="py-1">
                  <p className="px-4 py-2 text-sm text-text-primary">Você não tem notificações novas</p>
                </div>
              </div>
            )}
          </div>

          {/* Toggle de tema */}
          <Tooltip content={isDark ? 'Modo claro' : 'Modo escuro'}>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-page focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {isDark ? (
                <SunIcon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <MoonIcon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </Tooltip>

          {/* Menu do usuário */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-label="Abrir menu do usuário"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <span className="hidden md:block text-right">
                <span className="block text-sm font-medium text-text-primary">{user?.name}</span>
                <span className="block text-xs text-text-secondary">{user?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}</span>
              </span>
              
              {/* Avatar */}
              <div className="relative">
                {user?.avatar ? (
                  <LazyImage
                    src={user.avatar}
                    alt={user.name}
                    className="h-9 w-9 rounded-full object-cover border-2 border-border-default"
                    width={36}
                    height={36}
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-text-inverse flex items-center justify-center text-sm font-medium border-2 border-border-default">
                    {getInitials(user?.name || 'U')}
                  </div>
                )}
              </div>
            </button>

            {/* Dropdown do usuário */}
            {userMenuOpen && (
              <div 
                className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-bg-surface ring-1 ring-black ring-opacity-5 focus:outline-none z-50 py-1"
                onMouseLeave={() => setUserMenuOpen(false)}
                role="menu"
                aria-label="Menu do usuário"
              >
                <div className="px-4 py-3 border-b border-border-subtle">
                  <p className="text-sm text-text-primary font-medium">{user?.name}</p>
                  <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-bg-page hover:text-text-primary focus:outline-none focus:bg-bg-page"
                    onClick={() => setUserMenuOpen(false)}
                    role="menuitem"
                  >
                    <UserIcon className="mr-3 h-4 w-4 text-text-tertiary" aria-hidden="true" />
                    Meu Perfil
                  </Link>

                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-bg-page hover:text-text-primary focus:outline-none focus:bg-bg-page"
                    onClick={() => setUserMenuOpen(false)}
                    role="menuitem"
                  >
                    <Cog6ToothIcon className="mr-3 h-4 w-4 text-text-tertiary" aria-hidden="true" />
                    Configurações
                  </Link>
                </div>

                <div className="border-t border-border-subtle py-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 focus:outline-none focus:bg-red-50"
                    role="menuitem"
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4 text-red-500" aria-hidden="true" />
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de busca global - visível em mobile */}
      <div className="px-4 sm:px-6 lg:px-8 py-2 md:hidden">
        <GlobalSearchBar placeholder="Buscar contatos, empresas, leads..." />
      </div>
    </header>
  );
};

export default Header;
