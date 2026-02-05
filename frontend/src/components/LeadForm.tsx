/**
 * Componente LeadForm
 * Formulário completo para criar/editar lead
 */

import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { Select } from './Select';
import { TagSelector } from './TagSelector';
import { Button } from './Button';
import { SkeletonForm } from './Skeleton';
import { ErrorMessage } from './ErrorMessage';
import { getLeadById } from '../services/leadService';
import { listTags } from '../services/tagService';
import type {
  Lead,
  LeadFormData,
  LeadFormErrors,
} from '../types/lead';
import { LeadStatus } from '../types/lead';
import type { Tag } from '../types/tag';

export interface LeadFormProps {
  leadId?: string; // Se fornecido, modo edição
  onSubmit: (data: LeadFormData) => Promise<void>;
  onCancel?: () => void;
}

export function LeadForm({ leadId, onSubmit, onCancel }: LeadFormProps) {
  const [loading, setLoading] = useState(!!leadId);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [lead, setLead] = useState<Lead | null>(null);
  
  const [formData, setFormData] = useState<LeadFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    status: LeadStatus.NEW,
    tagIds: [],
  });

  const [errors, setErrors] = useState<LeadFormErrors>({});

  // Carregar dados do lead se modo edição
  useEffect(() => {
    if (leadId) {
      loadLead();
    }
    loadTags();
  }, [leadId]);

  const loadLead = async () => {
    try {
      setLoading(true);
      const loadedLead = await getLeadById(leadId!);
      setLead(loadedLead);
      setFormData({
        firstName: loadedLead.firstName,
        lastName: loadedLead.lastName || '',
        email: loadedLead.email || '',
        phone: loadedLead.phone || '',
        company: loadedLead.company || '',
        source: loadedLead.source || '',
        status: loadedLead.status,
        tagIds: loadedLead.tags?.map((t) => t.id) || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar lead');
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
    const newErrors: LeadFormErrors = {};

    // Validar firstName/lastName (pelo menos um obrigatório - alinhado com backend)
    if (!formData.firstName.trim() && !formData.lastName?.trim()) {
      newErrors.firstName = 'Nome ou sobrenome é obrigatório';
    }

    // Validar email (formato válido se fornecido)
    if (formData.email && formData.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Formato de email inválido';
      }
    }

    // Validar telefone (formato válido se fornecido - 10-15 dígitos)
    if (formData.phone && formData.phone.trim().length > 0) {
      const digitsOnly = formData.phone.replace(/[\s\(\)\-\+]/g, '');
      if (!/^\d{10,15}$/.test(digitsOnly)) {
        newErrors.phone = 'Formato de telefone inválido (10-15 dígitos)';
      }
    }

    // Validar status (deve ser um dos valores permitidos)
    if (formData.status && !['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'].includes(formData.status)) {
      newErrors.status = 'Status inválido';
    }

    // Validar tagIds (UUIDs válidos - regex mais simples, alinhado com ContactForm)
    if (formData.tagIds && formData.tagIds.length > 0) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
      setLoading(true); // Desabilitar botão durante submit
      
      // Limpar campos vazios antes de enviar (strings vazias → undefined)
      const dataToSubmit: LeadFormData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        company: formData.company?.trim() || undefined,
        source: formData.source?.trim() || undefined,
        status: formData.status,
        tagIds: formData.tagIds && formData.tagIds.length > 0 ? formData.tagIds : undefined,
      };
      await onSubmit(dataToSubmit);
    } catch (err) {
      // Tratar erros do backend (400, 404, 403, 500)
      // apiRequest lança Error com mensagem do backend: error.message || error.error
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar lead';
      setError(errorMessage);
      
      // Se erro for de validação (400), mensagem já vem do backend
      // Backend retorna { error: string, message: string }
      // Exibir mensagem do backend para melhor feedback ao usuário
    } finally {
      setLoading(false); // Reabilitar botão após submit
    }
  };

  if (loading && leadId) {
    return <SkeletonForm fields={6} columns={2} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorMessage message={error} />}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nome *"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          error={errors.firstName}
          required
        />
        <Input
          label="Sobrenome"
          value={formData.lastName || ''}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          error={errors.lastName}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
        />
        <Input
          label="Telefone"
          type="tel"
          value={formData.phone || ''}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          error={errors.phone}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Empresa"
          value={formData.company || ''}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          error={errors.company}
        />
        <Input
          label="Origem"
          value={formData.source || ''}
          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          error={errors.source}
          placeholder="Ex: Website, Referência, Evento..."
        />
      </div>

      <Select
        label="Status"
        value={formData.status || 'NEW'}
        onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
        options={[
          { value: 'NEW', label: 'Novo' },
          { value: 'QUALIFIED', label: 'Qualificado' },
          { value: 'CONVERTED', label: 'Convertido' },
          { value: 'LOST', label: 'Perdido' },
        ]}
        error={errors.status}
        disabled={lead?.converted === true} // Desabilitar se lead já foi convertido
      />

      <TagSelector
        tags={tags}
        selectedTagIds={formData.tagIds || []}
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
          {leadId ? 'Atualizar' : 'Criar'} Lead
        </Button>
      </div>
    </form>
  );
}
