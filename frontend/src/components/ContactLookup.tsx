/**
 * Componente para busca e seleção de contato (lookup)
 * Permite buscar contatos por nome e selecionar um
 */

import React, { useState, useEffect, useRef } from 'react';
import { Input } from './Input';
import { listContactsForLookup } from '../services/contactService';
import type { ContactLookup } from '../types/contact';

export interface ContactLookupProps {
  value?: string | null; // ID do contato selecionado
  contactName?: string | null; // Nome completo do contato (para exibir no modo edição)
  onChange: (contactId: string | null) => void;
  error?: string;
}

export function ContactLookup({ value, contactName, onChange, error }: ContactLookupProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<ContactLookup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactLookup | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar contato selecionado quando value ou contactName mudarem (modo edição)
  useEffect(() => {
    if (value && contactName && !selectedContact) {
      // Usar contactName que vem da oportunidade (GET /api/opportunities/:id retorna contact.firstName e contact.lastName)
      // contactName já vem formatado como "firstName lastName"
      const nameParts = contactName.trim().split(' ');
      setSelectedContact({
        id: value,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || null,
      });
      setQuery(contactName);
    } else if (!value) {
      setSelectedContact(null);
      setQuery('');
    }
  }, [value, contactName]);

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
    const fetchContacts = async () => {
      if (query.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const contacts = await listContactsForLookup(query);
        setOptions(contacts);
        setShowDropdown(true);
      } catch (err) {
        console.error('Erro ao buscar contatos:', err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchContacts, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (contact: ContactLookup) => {
    setSelectedContact(contact);
    const fullName = `${contact.firstName} ${contact.lastName || ''}`.trim();
    setQuery(fullName);
    setShowDropdown(false);
    onChange(contact.id);
  };

  const handleClear = () => {
    setSelectedContact(null);
    setQuery('');
    onChange(null);
  };

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
      <Input
        label="Contato"
        placeholder="Buscar contato..."
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
      {selectedContact && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-8 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}
      {showDropdown && options.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((contact) => {
            const fullName = `${contact.firstName} ${contact.lastName || ''}`.trim();
            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => handleSelect(contact)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                {fullName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
