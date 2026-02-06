/**
 * Theme Context - Gerenciamento de tema claro/escuro
 * 
 * Features:
 * - Persistência no localStorage
 * - Detecção automática da preferência do sistema
 * - Transições suaves entre temas
 * - Toggle manual
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'crm-theme-preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Inicializar com light como padrão
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Carregar tema do localStorage ou detectar preferência do sistema
  useEffect(() => {
    const loadTheme = () => {
      // Tentar carregar do localStorage
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      
      if (stored && (stored === 'light' || stored === 'dark')) {
        setThemeState(stored);
      } else {
        // Detectar preferência do sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setThemeState(prefersDark ? 'dark' : 'light');
      }
    };

    loadTheme();
    setMounted(true);
  }, []);

  // Aplicar tema ao documento
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else {
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
    }

    // Salvar no localStorage
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  // Escutar mudanças na preferência do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Só atualizar automaticamente se o usuário não definiu preferência manual
      const hasManualPreference = localStorage.getItem(STORAGE_KEY);
      if (!hasManualPreference) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // Evitar flash de tema incorreto durante SSR/hidratação
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}

export type { Theme };
