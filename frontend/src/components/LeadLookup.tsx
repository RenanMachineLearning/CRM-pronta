/**
 * Componente para busca e seleção de lead (lookup)
 * Permite buscar leads por nome e selecionar um
 */

import { useState, useEffect, useRef } from 'react';
import { Input } from './Input';
import { listLeadsForLookup, type LeadLookup } from '../services/leadService';

export interface LeadLookupProps {
  value?: string | null; // ID do lead selecionado
  leadName?: string | null; // Nome completo do lead (para exibir no modo edição)
  onChange: (leadId: string | null) => void;
  error?: string;
}

export function LeadLookup({ value, leadName, onChange, error }: LeadLookupProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<LeadLookup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadLookup | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar lead selecionado quando value ou leadName mudarem (modo edição)
  useEffect(() => {
    if (value && leadName && !selectedLead) {
      // Usar leadName que vem formatado como "firstName lastName"
      const nameParts = leadName.trim().split(' ');
      setSelectedLead({
        id: value,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || null,
      });
      setQuery(leadName);
    } else if (!value) {
      setSelectedLead(null);
      setQuery('');
    }
  }, [value, leadName, selectedLead]);

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
    const fetchLeads = async () => {
      if (query.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const leads = await listLeadsForLookup(query);
        setOptions(leads);
        setShowDropdown(true);
      } catch (err) {
        console.error('Erro ao buscar leads:', err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchLeads, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (lead: LeadLookup) => {
    setSelectedLead(lead);
    const fullName = `${lead.firstName} ${lead.lastName || ''}`.trim();
    setQuery(fullName);
    setShowDropdown(false);
    onChange(lead.id);
  };

  const handleClear = () => {
    setSelectedLead(null);
    setQuery('');
    onChange(null);
  };

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
      <Input
        label="Lead"
        placeholder="Buscar lead..."
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
      {selectedLead && (
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
          {options.map((lead) => {
            const fullName = `${lead.firstName} ${lead.lastName || ''}`.trim();
            return (
              <button
                key={lead.id}
                type="button"
                onClick={() => handleSelect(lead)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                {fullName}
              </button>
            );
          })}
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
