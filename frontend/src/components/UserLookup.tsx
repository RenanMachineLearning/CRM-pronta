/**
 * Componente para busca e seleção de usuário (lookup)
 * Permite buscar usuários por nome ou email e selecionar um
 */

import React, { useState, useEffect, useRef } from 'react';
import { Input } from './Input';
import { listUsersForLookup, type UserLookup } from '../services/userService';

export interface UserLookupProps {
  value?: string | null; // ID do usuário selecionado
  userName?: string | null; // Nome do usuário (para exibir no modo edição)
  onChange: (userId: string | null) => void;
  error?: string;
}

export function UserLookup({ value, userName, onChange, error }: UserLookupProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<UserLookup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserLookup | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar usuário selecionado quando value ou userName mudarem (modo edição)
  useEffect(() => {
    if (value && userName && !selectedUser) {
      setSelectedUser({
        id: value,
        name: userName,
        email: '', // Email não é necessário para exibição inicial
      });
      setQuery(userName);
    } else if (!value) {
      setSelectedUser(null);
      setQuery('');
    }
  }, [value, userName, selectedUser]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      if (query.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const users = await listUsersForLookup(query);
        setOptions(users);
        setShowDropdown(true);
      } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (user: UserLookup) => {
    setSelectedUser(user);
    setQuery(user.name);
    setShowDropdown(false);
    onChange(user.id);
  };

  const handleClear = () => {
    setSelectedUser(null);
    setQuery('');
    onChange(null);
  };

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
      <Input
        label="Atribuído a"
        placeholder="Buscar usuário..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!e.target.value) {
            handleClear();
          }
        }}
        onFocus={() => {
          if (options.length > 0) setShowDropdown(true);
        }}
        error={error}
      />
      {selectedUser && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-8 text-gray-400 hover:text-gray-600"
          aria-label="Limpar seleção"
        >
          ✕
        </button>
      )}
      {loading && (
        <div className="absolute right-2 top-8 text-gray-400">
          <span className="text-sm">Carregando...</span>
        </div>
      )}
      {showDropdown && options.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelect(user)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
            >
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </button>
          ))}
        </div>
      )}
      {showDropdown && !loading && query.length >= 2 && options.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-sm text-gray-500">
          Nenhum resultado encontrado
        </div>
      )}
    </div>
  );
}
