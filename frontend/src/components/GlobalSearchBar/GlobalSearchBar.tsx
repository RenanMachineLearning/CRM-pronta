/**
 * Componente principal de busca global
 * Input de busca com dropdown de resultados, debounce e navegação
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { GlobalSearchDropdown } from './GlobalSearchDropdown';
import type { GlobalSearchProps } from './types';

export function GlobalSearchBar({ 
  placeholder = "Buscar contatos, empresas, leads...", 
  autoFocus = false,
  onSelectResult,
  className = ''
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const { results, loading, error, search, cancelSearch, clearResults } = useGlobalSearch();
  
  // Debounce: atualizar debouncedQuery após 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);
  
  // Buscar quando debouncedQuery mudar
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      search({ query: debouncedQuery, limit: 5 }); // Limitar a 5 por entidade no dropdown
      setIsOpen(true);
    } else if (debouncedQuery.length === 0) {
      cancelSearch();
      setIsOpen(false);
    }
  }, [debouncedQuery, search, cancelSearch]);
  
  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Fechar dropdown ao pressionar Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };
  
  const handleSelectResult = (result: any) => {
    setIsOpen(false);
    setQuery('');
    clearResults();
    
    // Navegar para página de detalhes
    const routes: Record<string, string> = {
      contact: `/contacts/${result.id}`,
      company: `/companies/${result.id}`,
      lead: `/leads/${result.id}`,
      opportunity: `/opportunities/${result.id}`,
    };

    const route = routes[result.type as keyof typeof routes];
    if (route) {
      navigate(route);
    }
    
    if (onSelectResult) {
      onSelectResult(result);
    }
  };
  
  const handleViewAll = () => {
    if (query.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      e.preventDefault();
      handleViewAll();
    }
  };
  
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        {/* Ícone de busca */}
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        
        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Busca global"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
      </div>
      
      {/* Dropdown */}
      {isOpen && (
        <GlobalSearchDropdown
          results={results?.results || null}
          loading={loading}
          error={error}
          query={query}
          onSelectResult={handleSelectResult}
          onViewAll={handleViewAll}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default GlobalSearchBar;
