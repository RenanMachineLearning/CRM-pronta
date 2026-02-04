/**
 * Componente para busca e seleção de empresa (lookup)
 * Permite buscar empresas por nome e selecionar uma
 */

import { useState, useEffect, useRef } from 'react';
import { Input } from './Input';
import { listCompaniesForLookup } from '../services/companyService';
import type { CompanyLookup } from '../types/company';

export interface CompanyLookupProps {
  value?: string | null; // ID da empresa selecionada
  companyName?: string | null; // Nome da empresa (para exibir no modo edição)
  onChange: (companyId: string | null) => void;
  error?: string;
}

export function CompanyLookup({ value, companyName, onChange, error }: CompanyLookupProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CompanyLookup[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyLookup | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar empresa selecionada quando value ou companyName mudarem (modo edição)
  useEffect(() => {
    if (value && companyName && !selectedCompany) {
      // Usar companyName que vem do contato (GET /api/contacts/:id retorna company.name)
      setSelectedCompany({ id: value, name: companyName });
      setQuery(companyName);
    } else if (!value) {
      setSelectedCompany(null);
      setQuery('');
    }
  }, [value, companyName, selectedCompany]);

  useEffect(() => {
    const fetchCompanies = async () => {
      if (query.length < 2) {
        setOptions([]);
        return;
      }

      try {
        const companies = await listCompaniesForLookup(query);
        setOptions(companies);
        setShowDropdown(true);
      } catch (err) {
        console.error('Erro ao buscar empresas:', err);
        setOptions([]);
      }
    };

    const timeoutId = setTimeout(fetchCompanies, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (company: CompanyLookup) => {
    setSelectedCompany(company);
    setQuery(company.name);
    setShowDropdown(false);
    onChange(company.id);
  };

  const handleClear = () => {
    setSelectedCompany(null);
    setQuery('');
    onChange(null);
  };

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
      <Input
        label="Empresa"
        placeholder="Buscar empresa..."
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
      {selectedCompany && (
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
          {options.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => handleSelect(company)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
            >
              {company.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

