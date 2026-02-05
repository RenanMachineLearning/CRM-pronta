/**
 * Componente ContactForm
 * Formulário completo para criar/editar contato
 */

import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { Select } from './Select';
import { EmailList } from './EmailList';
import { PhoneList } from './PhoneList';
import { TagSelector } from './TagSelector';
import { CompanyLookup } from './CompanyLookup';
import { FormSection } from './FormSection';
import { FormActions } from './FormActions';
import { ErrorMessage } from './ErrorMessage';
import { SkeletonForm } from './Skeleton';
import { getContactById } from '../services/contactService';
import { listTags } from '../services/tagService';
import { validators } from '../utils/validators';
import type {
  Contact,
  ContactFormData,
  ContactFormErrors,
} from '../types/contact';
import { ContactStatus } from '../types/contact';
import type { Tag } from '../types/tag';

export interface ContactFormProps {
  contactId?: string; // Se fornecido, modo edição
  onSubmit: (data: ContactFormData) => Promise<void>;
  onCancel?: () => void;
}

export function ContactForm({ contactId, onSubmit, onCancel }: ContactFormProps) {
  const [loading, setLoading] = useState(!!contactId);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [contact, setContact] = useState<Contact | null>(null); // Armazenar contato carregado para acessar company.name
  
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: '',
    lastName: '',
    title: '',
    status: ContactStatus.ACTIVE,
    companyId: null,
    emails: [],
    phones: [],
    tagIds: [],
  });

  const [errors, setErrors] = useState<ContactFormErrors>({});

  // Carregar dados do contato se modo edição
  useEffect(() => {
    if (contactId) {
      loadContact();
    }
    loadTags();
  }, [contactId]);

  const loadContact = async () => {
    try {
      setLoading(true);
      const loadedContact = await getContactById(contactId!);
      setContact(loadedContact); // Armazenar contato completo para acessar company.name
      setFormData({
        firstName: loadedContact.firstName,
        lastName: loadedContact.lastName || '',
        title: loadedContact.title || '',
        status: loadedContact.status,
        companyId: loadedContact.companyId || null,
        emails: loadedContact.emails.map((e) => ({
          email: e.email,
          type: e.type,
          isPrimary: e.isPrimary,
        })),
        phones: loadedContact.phones.map((p) => ({
          phone: p.phone,
          type: p.type,
          isPrimary: p.isPrimary,
        })),
        tagIds: loadedContact.tags.map((t) => t.id),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar contato');
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
    const newErrors: ContactFormErrors = {};

    // Validar firstName/lastName (pelo menos um obrigatório)
    const nameValidator = validators.required('Nome ou sobrenome é obrigatório');
    const firstNameError = nameValidator(formData.firstName);
    const lastNameError = nameValidator(formData.lastName);
    if (firstNameError && lastNameError) {
      newErrors.firstName = 'Nome ou sobrenome é obrigatório';
    }

    // Validar emails (formato)
    const emailValidator = validators.email('Formato de email inválido');
    const emailErrors: string[] = [];
    formData.emails.forEach((email, index) => {
      const error = emailValidator(email.email);
      if (error) emailErrors[index] = error;
    });
    if (emailErrors.length > 0) {
      newErrors.emails = emailErrors;
    }

    // Validar que pelo menos um email é principal (se houver emails)
    const primaryEmails = formData.emails.filter((e) => e.isPrimary);
    if (formData.emails.length > 0 && primaryEmails.length === 0) {
      if (!newErrors.emails) newErrors.emails = [];
      newErrors.emails.push('Pelo menos um email deve ser marcado como principal');
    }

    // Validar telefones (formato)
    const phoneValidator = validators.phone('Formato de telefone inválido (10-15 dígitos)');
    const phoneErrors: string[] = [];
    formData.phones.forEach((phone, index) => {
      const error = phoneValidator(phone.phone);
      if (error) phoneErrors[index] = error;
    });
    if (phoneErrors.length > 0) {
      newErrors.phones = phoneErrors;
    }

    // Validar que pelo menos um telefone é principal (se houver telefones)
    const primaryPhones = formData.phones.filter((p) => p.isPrimary);
    if (formData.phones.length > 0 && primaryPhones.length === 0) {
      if (!newErrors.phones) newErrors.phones = [];
      newErrors.phones.push('Pelo menos um telefone deve ser marcado como principal');
    }

    // Validar tagIds (UUIDs válidos)
    const uuidValidator = validators.uuid('ID inválido');
    const invalidTagIds = formData.tagIds.filter((id) => uuidValidator(id));
    if (invalidTagIds.length > 0) {
      newErrors.tagIds = 'Algumas tags têm IDs inválidos';
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
      await onSubmit(formData);
    } catch (err) {
      // Tratar erros do backend (400, 404, 403, 500)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar contato';
      setError(errorMessage);
      
      // Se erro for de validação (400), pode conter detalhes específicos
      // Backend retorna { error: string, message: string }
      // Exibir mensagem do backend para melhor feedback ao usuário
    }
  };

  if (loading && contactId) {
    return <SkeletonForm fields={8} columns={2} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <ErrorMessage message={error} />}

      {/* Seção: Informações Básicas */}
      <FormSection title="Informações Básicas" description="Dados principais do contato">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nome *"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            error={errors.firstName}
            required
            fullWidth
          />
          <Input
            label="Sobrenome"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            error={errors.lastName}
            fullWidth
          />
        </div>

        <Input
          label="Cargo"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          fullWidth
        />

        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as ContactStatus })}
          options={[
            { value: 'ACTIVE', label: 'Ativo' },
            { value: 'INACTIVE', label: 'Inativo' },
            { value: 'ARCHIVED', label: 'Arquivado' },
          ]}
          fullWidth
        />

        <CompanyLookup
          value={formData.companyId}
          companyName={contact?.company?.name || null}
          onChange={(companyId) => setFormData({ ...formData, companyId })}
          error={errors.companyId}
        />
      </FormSection>

      {/* Seção: Contato */}
      <FormSection title="Informações de Contato" description="Emails e telefones">
        <EmailList
          emails={formData.emails}
          onChange={(emails) => setFormData({ ...formData, emails })}
          errors={errors.emails}
        />

        <PhoneList
          phones={formData.phones}
          onChange={(phones) => setFormData({ ...formData, phones })}
          errors={errors.phones}
        />
      </FormSection>

      {/* Seção: Tags */}
      <FormSection title="Categorização" description="Tags para organização">
        <TagSelector
          tags={tags}
          selectedTagIds={formData.tagIds}
          onChange={(tagIds) => setFormData({ ...formData, tagIds })}
          error={errors.tagIds}
        />
      </FormSection>

      {/* Ações */}
      <FormActions
        onCancel={onCancel}
        cancelLabel="Cancelar"
        submitLabel={contactId ? 'Atualizar Contato' : 'Criar Contato'}
        loading={loading}
      />
    </form>
  );
}

