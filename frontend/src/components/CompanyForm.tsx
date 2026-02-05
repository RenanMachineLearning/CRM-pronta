/**
 * Componente CompanyForm
 * Formulário completo para criar/editar empresa
 */

import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { Select } from './Select';
import { AddressList } from './AddressList';
import { TagSelector } from './TagSelector';
import { Button } from './Button';
import { SkeletonForm } from './Skeleton';
import { ErrorMessage } from './ErrorMessage';
import { getCompanyById } from '../services/companyService';
import { listTags } from '../services/tagService';
import type {
  Company,
  CompanyFormData,
  CompanyFormErrors,
  CompanyStatus,
  CompanySize,
} from '../types/company';
import type { Tag } from '../types/tag';

export interface CompanyFormProps {
  companyId?: string; // Se fornecido, modo edição
  onSubmit: (data: CompanyFormData) => Promise<void>;
  onCancel?: () => void;
}

export function CompanyForm({ companyId, onSubmit, onCancel }: CompanyFormProps) {
  const [loading, setLoading] = useState(!!companyId);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    website: null,
    industry: null,
    size: null,
    status: 'ACTIVE',
    addresses: [],
    tagIds: [],
  });

  const [errors, setErrors] = useState<CompanyFormErrors>({});

  // Carregar dados da empresa se modo edição
  useEffect(() => {
    if (companyId) {
      loadCompany();
    }
    loadTags();
  }, [companyId]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const company: Company = await getCompanyById(companyId!);
      setFormData({
        name: company.name,
        website: company.website || null,
        industry: company.industry || null,
        size: company.size || null,
        status: company.status,
        addresses: company.addresses?.map((a) => ({
          id: a.id,
          street: a.street,
          city: a.city,
          state: a.state,
          zipCode: a.zipCode,
          country: a.country || null,
          type: a.type,
        })) || [],
        tagIds: company.tags?.map((t) => t.id) || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar empresa');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const tagsData = await listTags();
      setTags(tagsData);
    } catch (err) {
      console.error('Erro ao carregar tags:', err);
    }
  };

  const validate = (): boolean => {
    const newErrors: CompanyFormErrors = {};

    // Validar name (obrigatório - alinhado com backend linha 174)
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    // Validar website (formato URL válido se fornecido)
    if (formData.website && formData.website.trim().length > 0) {
      try {
        // Tentar criar URL (aceita http://, https:// ou sem protocolo)
        let urlToValidate = formData.website.trim();
        if (!urlToValidate.startsWith('http://') && !urlToValidate.startsWith('https://')) {
          urlToValidate = `http://${urlToValidate}`;
        }
        new URL(urlToValidate);
      } catch {
        newErrors.website = 'Formato de URL inválido';
      }
    }

    // Validar endereços (campos obrigatórios)
    const addressErrors: string[] = [];
    formData.addresses.forEach((address, index) => {
      if (!address.street.trim()) {
        addressErrors[index] = 'Rua é obrigatória';
      } else if (!address.city.trim()) {
        addressErrors[index] = 'Cidade é obrigatória';
      } else if (!address.state.trim()) {
        addressErrors[index] = 'Estado é obrigatório';
      } else if (!address.zipCode.trim()) {
        addressErrors[index] = 'CEP é obrigatório';
      }
    });
    if (addressErrors.length > 0) {
      newErrors.addresses = addressErrors;
    }

    // Validar tagIds (UUIDs válidos)
    if (formData.tagIds.length > 0) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidTagIds = formData.tagIds.filter((id) => !uuidRegex.test(id));
      if (invalidTagIds.length > 0) {
        newErrors.tagIds = 'Algumas tags têm IDs inválidos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await onSubmit(formData);
    } catch (err) {
      // Tratar erros do backend (400, 404, 403, 500)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar empresa';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && companyId) {
    return <SkeletonForm fields={6} columns={2} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorMessage message={error} />}

      <Input
        label="Nome *"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        required
      />

      <Input
        label="Website"
        type="url"
        placeholder="https://example.com"
        value={formData.website || ''}
        onChange={(e) => setFormData({ ...formData, website: e.target.value || null })}
        error={errors.website}
      />

      <Input
        label="Indústria"
        value={formData.industry || ''}
        onChange={(e) => setFormData({ ...formData, industry: e.target.value || null })}
      />

      <Select
        label="Tamanho"
        value={formData.size || ''}
        onChange={(e) => setFormData({ ...formData, size: (e.target.value || null) as CompanySize | null })}
        options={[
          { value: '', label: 'Selecione...' },
          { value: 'SMALL', label: 'Pequena' },
          { value: 'MEDIUM', label: 'Média' },
          { value: 'LARGE', label: 'Grande' },
          { value: 'ENTERPRISE', label: 'Empresarial' },
        ]}
      />

      <Select
        label="Status"
        value={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.value as CompanyStatus })}
        options={[
          { value: 'ACTIVE', label: 'Ativo' },
          { value: 'INACTIVE', label: 'Inativo' },
          { value: 'ARCHIVED', label: 'Arquivado' },
        ]}
      />

      <AddressList
        addresses={formData.addresses}
        onChange={(addresses) => setFormData({ ...formData, addresses })}
        errors={errors.addresses}
      />

      <TagSelector
        tags={tags}
        selectedTagIds={formData.tagIds}
        onChange={(tagIds) => setFormData({ ...formData, tagIds })}
        error={errors.tagIds}
      />

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" isLoading={loading} disabled={loading}>
          {companyId ? 'Atualizar' : 'Criar'} Empresa
        </Button>
      </div>
    </form>
  );
}

