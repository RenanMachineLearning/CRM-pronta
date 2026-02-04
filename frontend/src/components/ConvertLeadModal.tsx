/**
 * Componente Modal para conversão de leads em contatos e/ou oportunidades
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { ErrorMessage } from './ErrorMessage';
import { convertLead } from '../services/leadService';
import { getDefaultPipeline } from '../services/pipelineService';
import type { ConvertLeadResponse, ConvertLeadData } from '../types/lead';
import type { Pipeline } from '../types/opportunity';

export interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string; // Nome do lead para exibição
  onSuccess?: (result: ConvertLeadResponse) => void; // Callback após conversão bem-sucedida
}

const initialFormData = {
  createContact: false,
  createOpportunity: false,
  opportunityData: {
    name: '',
    value: '',
    currency: 'BRL',
    stageId: '',
    closeDate: '',
    probability: undefined as number | undefined,
  },
};

export function ConvertLeadModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  onSuccess,
}: ConvertLeadModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);

  // Resetar formulário
  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setError(null);
  };

  // Gerar sugestão de nome da oportunidade
  const generateOpportunityName = (leadName: string, leadCompany?: string | null): string => {
    if (leadCompany) {
      return `Oportunidade - ${leadCompany}`;
    }
    if (leadName && leadName !== 'Lead') {
      return `Oportunidade - ${leadName}`;
    }
    return 'Oportunidade de Lead';
  };

  // Carregar pipeline e resetar ao abrir
  useEffect(() => {
    if (isOpen) {
      resetForm();
      loadPipeline();
    }
  }, [isOpen]);

  const loadPipeline = async () => {
    try {
      setLoadingPipeline(true);
      setError(null);
      const loadedPipeline = await getDefaultPipeline();
      if (loadedPipeline) {
        const sortedStages = [...(loadedPipeline.stages || [])].sort((a, b) => a.order - b.order);
        setPipeline({ ...loadedPipeline, stages: sortedStages });

        // Selecionar primeiro estágio por padrão
        if (sortedStages.length > 0) {
          setFormData((prev) => ({
            ...prev,
            opportunityData: {
              ...prev.opportunityData,
              stageId: sortedStages[0].id,
            },
          }));
        }
      } else {
        setError('Pipeline padrão não encontrado. Crie um pipeline padrão primeiro.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pipeline');
    } finally {
      setLoadingPipeline(false);
    }
  };

  // Preencher sugestão de nome quando criar oportunidade
  const handleCreateOpportunityChange = (checked: boolean) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        createOpportunity: checked,
      };

      // Se marcando checkbox e nome está vazio, preencher sugestão
      if (checked && !prev.opportunityData.name.trim()) {
        const suggestedName = generateOpportunityName(leadName);
        newData.opportunityData = {
          ...prev.opportunityData,
          name: suggestedName,
        };
      }

      return newData;
    });
  };

  // Validação
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Pelo menos uma opção marcada
    if (!formData.createContact && !formData.createOpportunity) {
      newErrors.general = 'Selecione pelo menos uma opção (Criar Contato ou Criar Oportunidade)';
      isValid = false;
    }

    // Se criar oportunidade, validar campos
    if (formData.createOpportunity) {
      if (!formData.opportunityData.value || formData.opportunityData.value === '') {
        newErrors.value = 'Valor é obrigatório';
        isValid = false;
      } else {
        const numValue = Number(formData.opportunityData.value);
        if (isNaN(numValue) || numValue <= 0) {
          newErrors.value = 'Valor deve ser um número positivo maior que zero';
          isValid = false;
        }
      }

      // stageId é opcional (backend usa primeiro estágio se não fornecido)
      // Mas se fornecido, deve ser UUID válido
      if (formData.opportunityData.stageId && formData.opportunityData.stageId.trim() !== '') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(formData.opportunityData.stageId)) {
          newErrors.stageId = 'Estágio inválido';
          isValid = false;
        }
      }

      if (formData.opportunityData.closeDate && formData.opportunityData.closeDate.trim() !== '') {
        const selectedDate = new Date(formData.opportunityData.closeDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          newErrors.closeDate = 'Data não pode ser no passado';
          isValid = false;
        }
      }

      if (formData.opportunityData.probability !== undefined && formData.opportunityData.probability !== null) {
        const prob = Number(formData.opportunityData.probability);
        if (isNaN(prob) || prob < 0 || prob > 100) {
          newErrors.probability = 'Probabilidade deve estar entre 0 e 100';
          isValid = false;
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setLoadingSubmit(true);
      setError(null);

      const dataToSubmit: ConvertLeadData = {
        createContact: formData.createContact,
        createOpportunity: formData.createOpportunity,
        opportunityData: formData.createOpportunity
          ? {
              name: formData.opportunityData.name.trim() || generateOpportunityName(leadName),
              value: Number(formData.opportunityData.value),
              currency: formData.opportunityData.currency || 'BRL',
              stageId:
                formData.opportunityData.stageId && formData.opportunityData.stageId.trim() !== ''
                  ? formData.opportunityData.stageId.trim()
                  : undefined, // Opcional - backend usa primeiro estágio se não fornecido
              closeDate:
                formData.opportunityData.closeDate && formData.opportunityData.closeDate.trim() !== ''
                  ? new Date(formData.opportunityData.closeDate).toISOString()
                  : undefined,
              probability:
                formData.opportunityData.probability !== undefined &&
                formData.opportunityData.probability !== null
                  ? Number(formData.opportunityData.probability)
                  : undefined,
            }
          : undefined,
      };

      const result = await convertLead(leadId, dataToSubmit);

      // Resetar formulário antes de fechar
      resetForm();

      if (onSuccess) {
        onSuccess(result);
      }

      onClose();
    } catch (err) {
      // Tratar erros específicos do backend
      let errorMessage = 'Erro ao converter lead';

      if (err instanceof Error) {
        // Backend retorna mensagens específicas
        if (err.message.includes('já convertido') || err.message.includes('409')) {
          errorMessage = 'Este lead já foi convertido anteriormente.';
        } else if (err.message.includes('não encontrado') || err.message.includes('404')) {
          errorMessage = 'Lead não encontrado.';
        } else if (err.message.includes('Pipeline') || err.message.includes('pipeline')) {
          errorMessage = err.message;
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Converter Lead: ${leadName}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Loading de pipeline */}
        {loadingPipeline && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600">Carregando pipeline...</p>
          </div>
        )}

        {/* Erro geral */}
        {error && <ErrorMessage message={error} />}

        {/* Erro de validação geral */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

        {/* Checkboxes */}
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.createContact}
              onChange={(e) => setFormData({ ...formData, createContact: e.target.checked })}
              className="mr-2"
            />
            <span>Criar Contato</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.createOpportunity}
              onChange={(e) => handleCreateOpportunityChange(e.target.checked)}
              disabled={!pipeline || loadingPipeline}
              className="mr-2"
            />
            <span>Criar Oportunidade</span>
            {(!pipeline || loadingPipeline) && (
              <span className="ml-2 text-xs text-gray-500">(Pipeline não disponível)</span>
            )}
          </label>
        </div>

        {/* Campos de oportunidade (condicionais) */}
        {formData.createOpportunity && pipeline && (
          <div className="space-y-4 border-t pt-4">
            <Input
              label="Nome da Oportunidade"
              value={formData.opportunityData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  opportunityData: { ...formData.opportunityData, name: e.target.value },
                })
              }
              placeholder="Nome da oportunidade (opcional)"
              error={errors.name}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Valor *"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.opportunityData.value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    opportunityData: { ...formData.opportunityData, value: e.target.value },
                  })
                }
                error={errors.value}
                required
              />
              <Select
                label="Moeda"
                value={formData.opportunityData.currency || 'BRL'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    opportunityData: { ...formData.opportunityData, currency: e.target.value },
                  })
                }
                options={[
                  { value: 'BRL', label: 'BRL (R$)' },
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Estágio"
                value={formData.opportunityData.stageId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    opportunityData: { ...formData.opportunityData, stageId: e.target.value },
                  })
                }
                options={
                  pipeline.stages?.map((stage) => ({
                    value: stage.id,
                    label: stage.name,
                  })) || []
                }
                error={errors.stageId}
              />
              <Input
                label="Data de Fechamento"
                type="date"
                value={formData.opportunityData.closeDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    opportunityData: { ...formData.opportunityData, closeDate: e.target.value },
                  })
                }
                min={new Date().toISOString().split('T')[0]}
                error={errors.closeDate}
              />
            </div>

            <Input
              label="Probabilidade (%)"
              type="number"
              min="0"
              max="100"
              value={formData.opportunityData.probability ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({
                  ...formData,
                  opportunityData: {
                    ...formData.opportunityData,
                    probability: val === '' ? undefined : Number(val),
                  },
                });
              }}
              error={errors.probability}
            />
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loadingSubmit}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              loadingSubmit ||
              loadingPipeline ||
              (formData.createOpportunity &&
                (!pipeline || !pipeline.stages || pipeline.stages.length === 0))
            }
          >
            {loadingSubmit ? 'Convertendo...' : 'Converter'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
