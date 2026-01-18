/**
 * Componente OpportunityForm
 * Formulário completo para criar/editar oportunidade
 */

import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { Select } from './Select';
import { ContactLookup } from './ContactLookup';
import { CompanyLookup } from './CompanyLookup';
import { TagSelector } from './TagSelector';
import { Button } from './Button';
import { Loading } from './Loading';
import { ErrorMessage } from './ErrorMessage';
import { getOpportunityById } from '../services/opportunityService';
import { getDefaultPipeline } from '../services/pipelineService';
import { listTags } from '../services/tagService';
import type {
  Opportunity,
  OpportunityFormData,
  OpportunityFormErrors,
  OpportunityStatus,
  Pipeline,
} from '../types/opportunity';
import type { Tag } from '../types/tag';

export interface OpportunityFormProps {
  opportunityId?: string; // Se fornecido, modo edição
  onSubmit: (data: OpportunityFormData) => Promise<void>;
  onCancel?: () => void;
}

export function OpportunityForm({ opportunityId, onSubmit, onCancel }: OpportunityFormProps) {
  // Estados
  const [loading, setLoading] = useState(!!opportunityId);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    value: string; // String vazia inicialmente (será convertido para number na validação)
    currency: string;
    stageId: string;
    status: OpportunityStatus;
    closeDate: string; // String vazia para input type="date"
    probability: number | undefined;
    contactId: string | undefined;
    companyId: string | undefined;
    tagIds: string[];
  }>({
    name: '',
    value: '', // String vazia inicialmente (será convertido para number na validação)
    currency: 'BRL',
    stageId: '',
    status: 'OPEN',
    closeDate: '',
    probability: undefined,
    contactId: undefined,
    companyId: undefined,
    tagIds: [],
  });

  const [errors, setErrors] = useState<OpportunityFormErrors>({});

  // Carregar dados no modo edição
  useEffect(() => {
    if (opportunityId) {
      loadOpportunity();
    }
    loadPipeline();
    loadTags();
  }, [opportunityId]);

  // Funções de carregamento
  const loadOpportunity = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedOpportunity = await getOpportunityById(opportunityId!);
      setOpportunity(loadedOpportunity);
      
      // Preencher formulário com dados da oportunidade
      setFormData({
        name: loadedOpportunity.name,
        value: loadedOpportunity.value.toString(), // Converter number para string
        currency: loadedOpportunity.currency || 'BRL',
        stageId: loadedOpportunity.stageId,
        status: loadedOpportunity.status,
        closeDate: loadedOpportunity.closeDate
          ? new Date(loadedOpportunity.closeDate).toISOString().split('T')[0] // Converter ISO para YYYY-MM-DD
          : '',
        probability: loadedOpportunity.probability ?? undefined,
        contactId: loadedOpportunity.contactId || undefined,
        companyId: loadedOpportunity.companyId || undefined,
        tagIds: loadedOpportunity.tags?.map((t) => t.id) || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar oportunidade');
    } finally {
      setLoading(false);
    }
  };

  const loadPipeline = async () => {
    try {
      const loadedPipeline = await getDefaultPipeline();
      if (loadedPipeline) {
        // Ordenar estágios por order
        const sortedStages = [...(loadedPipeline.stages || [])].sort((a, b) => a.order - b.order);
        setPipeline({ ...loadedPipeline, stages: sortedStages });
      } else {
        setError('Pipeline padrão não encontrado. Crie um pipeline padrão primeiro.');
      }
    } catch (err) {
      console.error('Erro ao carregar pipeline:', err);
      setError('Erro ao carregar pipeline padrão');
    }
  };

  const loadTags = async () => {
    try {
      const tagsData = await listTags();
      setTags(tagsData);
    } catch (err) {
      console.error('Erro ao carregar tags:', err);
      // Não bloquear formulário se tags falharem
    }
  };

  // Validação
  const validate = (): boolean => {
    const newErrors: OpportunityFormErrors = {};
    let isValid = true;

    // Validar name (obrigatório)
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
      isValid = false;
    }

    // Validar value (obrigatório, positivo)
    if (!formData.value || formData.value === '') {
      newErrors.value = 'Valor é obrigatório';
      isValid = false;
    } else {
      const numValue = Number(formData.value);
      if (isNaN(numValue) || numValue <= 0) {
        newErrors.value = 'Valor deve ser um número positivo maior que zero';
        isValid = false;
      }
    }

    // Validar stageId (obrigatório, UUID válido)
    if (!formData.stageId || formData.stageId.trim() === '') {
      newErrors.stageId = 'Estágio é obrigatório';
      isValid = false;
    } else {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formData.stageId)) {
        newErrors.stageId = 'Estágio inválido';
        isValid = false;
      }
    }

    // Validar closeDate (não pode ser no passado se fornecido)
    if (formData.closeDate && formData.closeDate.trim() !== '') {
      const selectedDate = new Date(formData.closeDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.closeDate = 'Data não pode ser no passado';
        isValid = false;
      }
    }

    // Validar probability (0-100 se fornecido)
    if (formData.probability !== undefined && formData.probability !== null) {
      const prob = Number(formData.probability);
      if (isNaN(prob) || prob < 0 || prob > 100) {
        newErrors.probability = 'Probabilidade deve estar entre 0 e 100';
        isValid = false;
      }
    }

    // Validar status (valores permitidos)
    const validStatuses = ['OPEN', 'WON', 'LOST', 'ARCHIVED'];
    if (formData.status && !validStatuses.includes(formData.status)) {
      newErrors.status = 'Status inválido';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar antes de enviar
    if (!validate()) {
      return;
    }

    // Verificar se pipeline está carregado
    if (!pipeline || !pipeline.stages || pipeline.stages.length === 0) {
      setError('Pipeline padrão não encontrado ou sem estágios');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Limpar e formatar dados antes de enviar
      const dataToSubmit: OpportunityFormData = {
        name: formData.name.trim(),
        value: formData.value ? Number(formData.value) : undefined,
        currency: formData.currency || 'BRL',
        stageId: formData.stageId.trim(),
        status: formData.status || 'OPEN',
        closeDate: formData.closeDate && formData.closeDate.trim() !== ''
          ? new Date(formData.closeDate).toISOString()
          : undefined,
        probability: formData.probability !== undefined && formData.probability !== null
          ? Number(formData.probability)
          : undefined,
        contactId: formData.contactId || undefined,
        companyId: formData.companyId || undefined,
        tagIds: formData.tagIds && formData.tagIds.length > 0 ? formData.tagIds : undefined,
      };

      await onSubmit(dataToSubmit);
    } catch (err) {
      // Tratar erros do backend (400, 404, 403, 500)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar oportunidade';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && opportunityId) {
    return <Loading message="Carregando oportunidade..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorMessage message={error} />}
      
      {/* Pipeline não encontrado */}
      {!pipeline && (
        <ErrorMessage message="Pipeline padrão não encontrado. Crie um pipeline padrão primeiro." />
      )}
      
      {/* Nome (full width) */}
      <Input
        label="Nome da Oportunidade *"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        required
      />
      
      {/* Valor e Moeda (2 colunas) */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Valor *"
          type="number"
          step="0.01"
          min="0.01"
          value={formData.value}
          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
          error={errors.value}
          required
        />
        <Select
          label="Moeda"
          value={formData.currency || 'BRL'}
          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
          options={[
            { value: 'BRL', label: 'BRL (R$)' },
            { value: 'USD', label: 'USD ($)' },
            { value: 'EUR', label: 'EUR (€)' },
          ]}
        />
      </div>
      
      {/* Estágio e Status (2 colunas) */}
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Estágio *"
          value={formData.stageId}
          onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
          options={pipeline?.stages?.map((stage) => ({
            value: stage.id,
            label: stage.name,
          })) || []}
          error={errors.stageId}
          required
          disabled={!pipeline || !pipeline.stages || pipeline.stages.length === 0}
        />
        <Select
          label="Status"
          value={formData.status || 'OPEN'}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as OpportunityStatus })}
          options={[
            { value: 'OPEN', label: 'Aberto' },
            { value: 'WON', label: 'Ganho' },
            { value: 'LOST', label: 'Perdido' },
            { value: 'ARCHIVED', label: 'Arquivado' },
          ]}
          error={errors.status}
        />
      </div>
      
      {/* Data de Fechamento e Probabilidade (2 colunas) */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Data de Fechamento"
          type="date"
          value={formData.closeDate}
          onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
          error={errors.closeDate}
          min={new Date().toISOString().split('T')[0]} // Não permitir datas passadas
        />
        <Input
          label="Probabilidade (%)"
          type="number"
          min="0"
          max="100"
          value={formData.probability ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            setFormData({
              ...formData,
              probability: val === '' ? undefined : Number(val),
            });
          }}
          error={errors.probability}
        />
      </div>
      
      {/* Contato e Empresa (2 colunas) */}
      <div className="grid grid-cols-2 gap-4">
        <ContactLookup
          value={formData.contactId || null}
          contactName={
            opportunity?.contact
              ? `${opportunity.contact.firstName} ${opportunity.contact.lastName || ''}`.trim()
              : null
          }
          onChange={(contactId) => setFormData({ ...formData, contactId: contactId || undefined })}
          error={errors.contactId}
        />
        <CompanyLookup
          value={formData.companyId || null}
          companyName={opportunity?.company?.name || null}
          onChange={(companyId) => setFormData({ ...formData, companyId: companyId || undefined })}
          error={errors.companyId}
        />
      </div>
      
      {/* Tags (full width) */}
      <TagSelector
        tags={tags}
        selectedTagIds={formData.tagIds || []}
        onChange={(tagIds) => setFormData({ ...formData, tagIds })}
        error={errors.tagIds}
      />
      
      {/* Botões */}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={loading || !pipeline || !pipeline.stages || pipeline.stages.length === 0}
        >
          {opportunityId ? 'Atualizar' : 'Criar'} Oportunidade
        </Button>
      </div>
    </form>
  );
}
