/**
 * Componente para gerenciar lista de emails
 * Permite adicionar, remover e marcar email como principal
 */

import { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import type { EmailType } from '../types/contact';

export interface EmailItem {
  email: string;
  type: EmailType;
  isPrimary: boolean;
}

export interface EmailListProps {
  emails: EmailItem[];
  onChange: (emails: EmailItem[]) => void;
  errors?: string[];
}

export function EmailList({ emails, onChange, errors }: EmailListProps) {
  const [newEmail, setNewEmail] = useState({ email: '', type: 'WORK' as EmailType });

  const handleAdd = () => {
    if (!newEmail.email.trim()) return;

    const updated = [...emails, { ...newEmail, isPrimary: emails.length === 0 }];
    onChange(updated);
    setNewEmail({ email: '', type: 'WORK' });
  };

  const handleRemove = (index: number) => {
    const updated = emails.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleSetPrimary = (index: number) => {
    const updated = emails.map((e, i) => ({
      ...e,
      isPrimary: i === index,
    }));
    onChange(updated);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Emails</label>
      
      {emails.map((email, index) => (
        <div key={index} className="flex gap-2 mb-2 items-end">
          <div className="flex-1">
            <Input
              value={email.email}
              readOnly
              className="bg-gray-50 mb-0"
            />
          </div>
          <div className="w-32">
            <Select
              value={email.type}
              options={[
                { value: 'WORK', label: 'Trabalho' },
                { value: 'HOME', label: 'Casa' },
                { value: 'OTHER', label: 'Outro' },
              ]}
              onChange={(e) => {
                const updated = [...emails];
                updated[index].type = e.target.value as EmailType;
                onChange(updated);
              }}
              className="mb-0"
            />
          </div>
          <Button
            type="button"
            variant={email.isPrimary ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handleSetPrimary(index)}
          >
            Principal
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => handleRemove(index)}
          >
            Remover
          </Button>
        </div>
      ))}

      <div className="flex gap-2">
        <Input
          placeholder="email@example.com"
          value={newEmail.email}
          onChange={(e) => setNewEmail({ ...newEmail, email: e.target.value })}
          className="flex-1 mb-0"
        />
        <Select
          value={newEmail.type}
          options={[
            { value: 'WORK', label: 'Trabalho' },
            { value: 'HOME', label: 'Casa' },
            { value: 'OTHER', label: 'Outro' },
          ]}
          onChange={(e) => setNewEmail({ ...newEmail, type: e.target.value as EmailType })}
          className="w-32 mb-0"
        />
        <Button type="button" variant="primary" size="sm" onClick={handleAdd}>
          Adicionar
        </Button>
      </div>

      {errors && errors.length > 0 && (
        <div className="mt-1">
          {errors.map((error, i) => (
            <p key={i} className="text-sm text-red-600">{error}</p>
          ))}
        </div>
      )}
    </div>
  );
}

