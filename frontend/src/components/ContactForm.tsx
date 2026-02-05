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
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';
import { SkeletonForm } from './Skeleton';
import { getContactById } from '../services/contactService';
import { listTags } from '../services/tagService';
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

    // Validar firstName/lastName (pelo menos um obrigatório - alinhado com backend linha 194)
    if (!formData.firstName.trim() && !formData.lastName?.trim()) {
      newErrors.firstName = 'Nome ou sobrenome é obrigatório';
    }

    // Validar emails (formato e pelo menos um principal)
    const emailErrors: string[] = [];
    formData.emails.forEach((email, index) => {
      // Validar formato de email (regex alinhado com backend)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.email.trim())) {
        emailErrors[index] = 'Formato de email inválido';
      }
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

    // Validar telefones (formato - 10-15 dígitos após remover caracteres especiais)
    const phoneErrors: string[] = [];
    formData.phones.forEach((phone, index) => {
      const digitsOnly = phone.phone.replace(/[\s\(\)\-\+]/g, '');
      if (!/^\d{10,15}$/.test(digitsOnly)) {
        phoneErrors[index] = 'Formato de telefone inválido (10-15 dígitos)';
      }
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorMessage message={error} />}

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
      />

      <CompanyLookup
        value={formData.companyId}
        companyName={contact?.company?.name || null} // Passar nome da empresa no modo edição (vem de GET /api/contacts/:id)
        onChange={(companyId) => setFormData({ ...formData, companyId })}
        error={errors.companyId}
      />

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
          {contactId ? 'Atualizar' : 'Criar'} Contato
        </Button>
      </div>
    </form>
  );
}

