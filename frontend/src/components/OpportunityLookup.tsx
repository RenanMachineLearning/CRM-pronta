/**
 * Componente para busca e seleção de oportunidade (lookup)
 * Permite buscar oportunidades por nome e selecionar uma
 */

import { useState, useEffect, useRef } from 'react';
import { Input } from './Input';
import { listOpportunitiesForLookup, type OpportunityLookup } from '../services/opportunityService';

export interface OpportunityLookupProps {
  value?: string | null; // ID da oportunidade selecionada
  opportunityName?: string | null; // Nome da oportunidade (para exibir no modo edição)
  onChange: (opportunityId: string | null) => void;
  error?: string;
}

export function OpportunityLookup({ value, opportunityName, onChange, error }: OpportunityLookupProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<OpportunityLookup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityLookup | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar oportunidade selecionada quando value ou opportunityName mudarem (modo edição)
  useEffect(() => {
    if (value && opportunityName && !selectedOpportunity) {
      setSelectedOpportunity({
        id: value,
        name: opportunityName,
      });
      setQuery(opportunityName);
    } else if (!value) {
      setSelectedOpportunity(null);
      setQuery('');
    }
  }, [value, opportunityName, selectedOpportunity]);

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
    const fetchOpportunities = async () => {
      if (query.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const opportunities = await listOpportunitiesForLookup(query);
        setOptions(opportunities);
        setShowDropdown(true);
      } catch (err) {
        console.error('Erro ao buscar oportunidades:', err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchOpportunities, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (opportunity: OpportunityLookup) => {
    setSelectedOpportunity(opportunity);
    setQuery(opportunity.name);
    setShowDropdown(false);
    onChange(opportunity.id);
  };

  const handleClear = () => {
    setSelectedOpportunity(null);
    setQuery('');
    onChange(null);
  };

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
      <Input
        label="Oportunidade"
        placeholder="Buscar oportunidade..."
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
      {selectedOpportunity && (
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
          {options.map((opportunity) => (
            <button
              key={opportunity.id}
              type="button"
              onClick={() => handleSelect(opportunity)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
            >
              {opportunity.name}
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
