/**
 * Componente para gerenciar lista de telefones
 * Permite adicionar, remover e marcar telefone como principal
 */

import { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import type { PhoneType } from '../types/contact';

export interface PhoneItem {
  phone: string;
  type: PhoneType;
  isPrimary: boolean;
}

export interface PhoneListProps {
  phones: PhoneItem[];
  onChange: (phones: PhoneItem[]) => void;
  errors?: string[];
}

export function PhoneList({ phones, onChange, errors }: PhoneListProps) {
  const [newPhone, setNewPhone] = useState({ phone: '', type: 'MOBILE' as PhoneType });

  const handleAdd = () => {
    if (!newPhone.phone.trim()) return;

    const updated = [...phones, { ...newPhone, isPrimary: phones.length === 0 }];
    onChange(updated);
    setNewPhone({ phone: '', type: 'MOBILE' });
  };

  const handleRemove = (index: number) => {
    const updated = phones.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleSetPrimary = (index: number) => {
    const updated = phones.map((p, i) => ({
      ...p,
      isPrimary: i === index,
    }));
    onChange(updated);
  };

  const labelId = 'phone-list-label';
  const inputId = 'phone-list-input';
  const typeId = 'phone-list-type';

  return (
    <div className="mb-4">
      <label id={labelId} htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
        Telefones
      </label>
      
      {phones.map((phone, index) => (
        <div key={index} className="flex gap-2 mb-2 items-end">
          <div className="flex-1">
            <Input
              value={phone.phone}
              readOnly
              className="bg-gray-50 mb-0"
            />
          </div>
          <div className="w-32">
            <Select
              value={phone.type}
              options={[
                { value: 'WORK', label: 'Trabalho' },
                { value: 'HOME', label: 'Casa' },
                { value: 'MOBILE', label: 'Celular' },
                { value: 'OTHER', label: 'Outro' },
              ]}
              onChange={(e) => {
                const updated = [...phones];
                updated[index].type = e.target.value as PhoneType;
                onChange(updated);
              }}
              className="mb-0"
            />
          </div>
          <Button
            type="button"
            variant={phone.isPrimary ? 'primary' : 'secondary'}
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
          id={inputId}
          placeholder="(11) 99999-9999"
          value={newPhone.phone}
          onChange={(e) => setNewPhone({ ...newPhone, phone: e.target.value })}
          className="flex-1 mb-0"
          aria-labelledby={labelId}
        />
        <Select
          id={typeId}
          value={newPhone.type}
          options={[
            { value: 'WORK', label: 'Trabalho' },
            { value: 'HOME', label: 'Casa' },
            { value: 'MOBILE', label: 'Celular' },
            { value: 'OTHER', label: 'Outro' },
          ]}
          onChange={(e) => setNewPhone({ ...newPhone, type: e.target.value as PhoneType })}
          className="w-32 mb-0"
          aria-label="Tipo de telefone"
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

