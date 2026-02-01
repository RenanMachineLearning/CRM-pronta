/**
 * Componente TaskForm
 * Formulário completo para criar/editar tarefa
 */

import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Button';
import { Loading } from './Loading';
import { ErrorMessage } from './ErrorMessage';
import { UserLookup } from './UserLookup';
import { ContactLookup } from './ContactLookup';
import { CompanyLookup } from './CompanyLookup';
import { LeadLookup } from './LeadLookup';
import { OpportunityLookup } from './OpportunityLookup';
import { getTaskById } from '../services/taskService';
import { getContactById } from '../services/contactService';
import { getCompanyById } from '../services/companyService';
import { getLeadById } from '../services/leadService';
import { getOpportunityById } from '../services/opportunityService';
import type {
  Task,
  TaskFormData,
  TaskFormErrors,
  TaskType,
  TaskStatus,
  TaskPriority,
  RelatedEntityType,
} from '../types/task';

export interface TaskFormProps {
  taskId?: string; // Se fornecido, modo edição
  relatedEntityType?: RelatedEntityType; // Pré-preenchido se fornecido
  relatedEntityId?: string; // Pré-preenchido se fornecido
  onSubmit: (data: TaskFormData) => Promise<void>;
  onCancel?: () => void;
}

export function TaskForm({ taskId, relatedEntityType, relatedEntityId, onSubmit, onCancel }: TaskFormProps) {
  const [loadingTask, setLoadingTask] = useState(!!taskId);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [relatedEntityName, setRelatedEntityName] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    type: 'OTHER',
    status: 'PENDING',
    priority: 'MEDIUM',
    dueDate: '',
    assignedToId: '',
    relatedEntityType: relatedEntityType || 'Contact',
    relatedEntityId: relatedEntityId || '',
  });

  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Carregar dados da tarefa se modo edição
  useEffect(() => {
    if (taskId) {
      loadTask();
    }
  }, [taskId]);

  // Atualizar formData quando relatedEntityType ou relatedEntityId mudarem via props
  useEffect(() => {
    if (relatedEntityType) {
      setFormData((prev) => ({ ...prev, relatedEntityType }));
    }
    if (relatedEntityId) {
      setFormData((prev) => ({ ...prev, relatedEntityId }));
    }
  }, [relatedEntityType, relatedEntityId]);

  // Carregar nome da entidade relacionada quando relatedEntityId mudar
  useEffect(() => {
    if (formData.relatedEntityId && formData.relatedEntityType) {
      loadRelatedEntityName();
    }
  }, [formData.relatedEntityId, formData.relatedEntityType]);

  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    // Usar UTC para evitar problemas de timezone
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadTask = async () => {
    try {
      setLoadingTask(true);
      setError(null);
      const loadedTask = await getTaskById(taskId!);
      setTask(loadedTask);
      
      setFormData({
        title: loadedTask.title,
        description: loadedTask.description || '',
        type: loadedTask.type,
        status: loadedTask.status,
        priority: loadedTask.priority,
        dueDate: formatDateForInput(loadedTask.dueDate),
        assignedToId: loadedTask.assignedToId || '',
        relatedEntityType: loadedTask.relatedEntityType,
        relatedEntityId: loadedTask.relatedEntityId,
      });
      
      // Carregar nome da entidade relacionada
      if (loadedTask.relatedEntity) {
        if (loadedTask.relatedEntityType === 'Contact' || loadedTask.relatedEntityType === 'Lead') {
          setRelatedEntityName(
            `${loadedTask.relatedEntity.firstName || ''} ${loadedTask.relatedEntity.lastName || ''}`.trim()
          );
        } else {
          setRelatedEntityName(loadedTask.relatedEntity.name || null);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar tarefa';
      setError(errorMessage);
      if (errorMessage.includes('não encontrado') || errorMessage.includes('404')) {
        setError('Tarefa não encontrada ou você não tem permissão para visualizá-la');
      }
    } finally {
      setLoadingTask(false);
    }
  };

  const loadRelatedEntityName = async () => {
    if (!formData.relatedEntityType || !formData.relatedEntityId) {
      setRelatedEntityName(null);
      return;
    }

    try {
      switch (formData.relatedEntityType) {
        case 'Contact': {
          const contact = await getContactById(formData.relatedEntityId);
          setRelatedEntityName(
            `${contact.firstName} ${contact.lastName || ''}`.trim()
          );
          break;
        }
        case 'Company': {
          const company = await getCompanyById(formData.relatedEntityId);
          setRelatedEntityName(company.name);
          break;
        }
        case 'Lead': {
          const lead = await getLeadById(formData.relatedEntityId);
          setRelatedEntityName(
            `${lead.firstName} ${lead.lastName || ''}`.trim()
          );
          break;
        }
        case 'Opportunity': {
          const opportunity = await getOpportunityById(formData.relatedEntityId);
          setRelatedEntityName(opportunity.name);
          break;
        }
      }
    } catch (err) {
      // Se entidade não existir, limpar nome e mostrar erro
      console.error('Erro ao carregar entidade relacionada:', err);
      setRelatedEntityName(null);
      setErrors({
        ...errors,
        relatedEntityId: 'Entidade relacionada não encontrada',
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: TaskFormErrors = {};

    // Validar title (obrigatório, não vazio após trim, máximo 255 caracteres)
    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      newErrors.title = 'Título é obrigatório';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Título não pode exceder 255 caracteres';
    }

    // Validar description (opcional, se fornecido, máximo 10.000 caracteres)
    if (formData.description && formData.description.length > 10000) {
      newErrors.description = 'Descrição não pode exceder 10.000 caracteres';
    }

    // Validar type (se fornecido, deve ser um dos valores válidos)
    if (formData.type && !['CALL', 'EMAIL', 'MEETING', 'OTHER'].includes(formData.type)) {
      newErrors.type = 'Tipo inválido';
    }

    // Validar status (se fornecido, deve ser um dos valores válidos)
    if (formData.status && !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(formData.status)) {
      newErrors.status = 'Status inválido';
    }

    // Validar dueDate (se fornecido, deve ser data válida, não pode ser no passado)
    if (formData.dueDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.dueDate)) {
        newErrors.dueDate = 'Formato de data inválido';
      } else {
        const dueDate = new Date(formData.dueDate + 'T00:00:00');
        if (isNaN(dueDate.getTime())) {
          newErrors.dueDate = 'Data de vencimento inválida';
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < today) {
            newErrors.dueDate = 'Data de vencimento não pode ser no passado';
          }
        }
      }
    }

    // Validar priority (se fornecido, deve ser um dos valores válidos)
    if (formData.priority && !['LOW', 'MEDIUM', 'HIGH'].includes(formData.priority)) {
      newErrors.priority = 'Prioridade inválida';
    }

    // Validar assignedToId (se fornecido, deve ser UUID válido)
    if (formData.assignedToId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formData.assignedToId)) {
        newErrors.assignedToId = 'ID do usuário deve ser um UUID válido';
      }
    }

    // Validar relatedEntityType (obrigatório, deve ser um dos valores válidos)
    if (!formData.relatedEntityType) {
      newErrors.relatedEntityType = 'Tipo de entidade relacionada é obrigatório';
    } else if (!['Contact', 'Company', 'Lead', 'Opportunity'].includes(formData.relatedEntityType)) {
      newErrors.relatedEntityType = 'Tipo de entidade relacionada inválido';
    }

    // Validar relatedEntityId (obrigatório, deve ser UUID válido)
    if (!formData.relatedEntityId) {
      newErrors.relatedEntityId = 'ID da entidade relacionada é obrigatório';
    } else {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formData.relatedEntityId)) {
        newErrors.relatedEntityId = 'ID deve ser um UUID válido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldBlur = (fieldName: keyof TaskFormData) => {
    setTouched({ ...touched, [fieldName]: true });
    
    // Validar campo específico
    const fieldErrors: TaskFormErrors = {};
    
    switch (fieldName) {
      case 'title':
        const trimmedTitle = formData.title.trim();
        if (!trimmedTitle) {
          fieldErrors.title = 'Título é obrigatório';
        } else if (formData.title.length > 255) {
          fieldErrors.title = 'Título não pode exceder 255 caracteres';
        }
        break;
      case 'dueDate':
        if (formData.dueDate) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(formData.dueDate)) {
            fieldErrors.dueDate = 'Formato de data inválido';
          } else {
            const dueDate = new Date(formData.dueDate + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate < today) {
              fieldErrors.dueDate = 'Data de vencimento não pode ser no passado';
            }
          }
        }
        break;
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      setErrors({ ...errors, ...fieldErrors });
    } else {
      // Limpar erro do campo se válido
      const newErrors = { ...errors };
      delete newErrors[fieldName];
      setErrors(newErrors);
    }
  };

  const handleFieldChange = (fieldName: keyof TaskFormData, value: any) => {
    setFormData({ ...formData, [fieldName]: value });
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[fieldName]) {
      const newErrors = { ...errors };
      delete newErrors[fieldName];
      setErrors(newErrors);
    }
  };

  const handleRelatedEntityTypeChange = (newType: RelatedEntityType) => {
    // Resetar relatedEntityId e nome quando tipo mudar
    setFormData({
      ...formData,
      relatedEntityType: newType,
      relatedEntityId: '',
    });
    // Limpar erro e nome da entidade
    setErrors({ ...errors, relatedEntityId: undefined });
    setRelatedEntityName(null);
  };

  const renderRelatedEntityLookup = () => {
    if (!formData.relatedEntityType) {
      return null;
    }

    const commonProps = {
      value: formData.relatedEntityId || null,
      onChange: (entityId: string | null) => {
        setFormData({ ...formData, relatedEntityId: entityId || '' });
        // Limpar erro quando selecionar entidade
        if (entityId) {
          setErrors({ ...errors, relatedEntityId: undefined });
        }
        // Limpar nome da entidade quando mudar
        setRelatedEntityName(null);
      },
      error: errors.relatedEntityId,
    };

    switch (formData.relatedEntityType) {
      case 'Contact':
        return (
          <ContactLookup
            {...commonProps}
            contactName={
              relatedEntityName ||
              (task?.relatedEntity?.firstName && task?.relatedEntity?.lastName
                ? `${task.relatedEntity.firstName} ${task.relatedEntity.lastName}`.trim()
                : null)
            }
          />
        );
      case 'Company':
        return (
          <CompanyLookup
            {...commonProps}
            companyName={
              relatedEntityName ||
              (task?.relatedEntity?.name || null)
            }
          />
        );
      case 'Lead':
        return (
          <LeadLookup
            {...commonProps}
            leadName={
              relatedEntityName ||
              (task?.relatedEntity?.firstName && task?.relatedEntity?.lastName
                ? `${task.relatedEntity.firstName} ${task.relatedEntity.lastName}`.trim()
                : null)
            }
          />
        );
      case 'Opportunity':
        return (
          <OpportunityLookup
            {...commonProps}
            opportunityName={
              relatedEntityName ||
              (task?.relatedEntity?.name || null)
            }
          />
        );
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar campos obrigatórios
    if (!validate()) {
      // Scroll para primeiro erro
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      setLoadingSubmit(true);
      
      // Preparar dados para envio
      const formatDateForAPI = (dateString: string): string => {
        // Converter YYYY-MM-DD para ISO string
        const date = new Date(dateString + 'T00:00:00');
        return date.toISOString();
      };
      
      const dataToSubmit: TaskFormData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        type: formData.type || 'OTHER',
        status: formData.status || 'PENDING',
        dueDate: formData.dueDate 
          ? formatDateForAPI(formData.dueDate)
          : undefined,
        priority: formData.priority || 'MEDIUM',
        assignedToId: formData.assignedToId?.trim() || undefined,
        relatedEntityType: formData.relatedEntityType,
        relatedEntityId: formData.relatedEntityId.trim(),
      };

      await onSubmit(dataToSubmit);
    } catch (err) {
      // Tratar diferentes tipos de erro
      let errorMessage = 'Erro ao salvar tarefa';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Mapear erros específicos do backend
        if (errorMessage.includes('não encontrado') || errorMessage.includes('404')) {
          errorMessage = 'Entidade relacionada não encontrada. Verifique se o registro ainda existe.';
        } else if (errorMessage.includes('não tem permissão') || errorMessage.includes('403')) {
          errorMessage = 'Você não tem permissão para realizar esta ação.';
        } else if (errorMessage.includes('inválido') || errorMessage.includes('400')) {
          // Manter mensagem original do backend
        }
      }
      
      setError(errorMessage);
      
      // Scroll para mensagem de erro
      const errorElement = document.querySelector('[role="alert"]');
      errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingTask && taskId) {
    return <Loading message="Carregando tarefa..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorMessage message={error} />}

      <Input
        label="Título da Tarefa *"
        name="title"
        value={formData.title}
        onChange={(e) => handleFieldChange('title', e.target.value)}
        onBlur={() => handleFieldBlur('title')}
        error={errors.title}
        required
        aria-required="true"
        aria-invalid={!!errors.title}
        aria-describedby={errors.title ? 'title-error' : undefined}
      />
      {errors.title && <p id="title-error" className="text-sm text-red-600 mt-1">{errors.title}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Digite a descrição da tarefa..."
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        {errors.description && (
          <p id="description-error" className="text-sm text-red-600 mt-1">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Tipo"
          name="type"
          value={formData.type || 'OTHER'}
          onChange={(e) => handleFieldChange('type', e.target.value as TaskType)}
          options={[
            { value: 'CALL', label: 'Ligação' },
            { value: 'EMAIL', label: 'Email' },
            { value: 'MEETING', label: 'Reunião' },
            { value: 'OTHER', label: 'Outro' },
          ]}
          error={errors.type}
        />
        <Select
          label="Status"
          name="status"
          value={formData.status || 'PENDING'}
          onChange={(e) => handleFieldChange('status', e.target.value as TaskStatus)}
          options={[
            { value: 'PENDING', label: 'Pendente' },
            { value: 'IN_PROGRESS', label: 'Em Andamento' },
            { value: 'COMPLETED', label: 'Concluída' },
            { value: 'CANCELLED', label: 'Cancelada' },
          ]}
          error={errors.status}
        />
        <Select
          label="Prioridade"
          name="priority"
          value={formData.priority || 'MEDIUM'}
          onChange={(e) => handleFieldChange('priority', e.target.value as TaskPriority)}
          options={[
            { value: 'LOW', label: 'Baixa' },
            { value: 'MEDIUM', label: 'Média' },
            { value: 'HIGH', label: 'Alta' },
          ]}
          error={errors.priority}
        />
      </div>

      <Input
        label="Data de Vencimento"
        name="dueDate"
        type="date"
        value={formData.dueDate}
        onChange={(e) => handleFieldChange('dueDate', e.target.value)}
        onBlur={() => handleFieldBlur('dueDate')}
        error={errors.dueDate}
        aria-invalid={!!errors.dueDate}
        aria-describedby={errors.dueDate ? 'dueDate-error' : undefined}
      />
      {errors.dueDate && <p id="dueDate-error" className="text-sm text-red-600 mt-1">{errors.dueDate}</p>}

      <UserLookup
        value={formData.assignedToId || null}
        userName={task?.assignedTo?.name || null}
        onChange={(userId) => handleFieldChange('assignedToId', userId || '')}
        error={errors.assignedToId}
      />

      <Select
        label="Entidade Relacionada *"
        name="relatedEntityType"
        value={formData.relatedEntityType}
        onChange={(e) => handleRelatedEntityTypeChange(e.target.value as RelatedEntityType)}
        options={[
          { value: 'Contact', label: 'Contato' },
          { value: 'Company', label: 'Empresa' },
          { value: 'Lead', label: 'Lead' },
          { value: 'Opportunity', label: 'Oportunidade' },
        ]}
        error={errors.relatedEntityType}
        disabled={!!relatedEntityType} // Desabilitar se pré-preenchido
        required
        aria-required="true"
      />

      {renderRelatedEntityLookup()}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loadingSubmit}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={loadingSubmit || loadingTask}>
          {loadingSubmit ? 'Salvando...' : taskId ? 'Atualizar' : 'Criar'} Tarefa
        </Button>
      </div>
    </form>
  );
}
