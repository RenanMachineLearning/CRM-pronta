/**
 * Componente para gerenciar lista de endereços
 * Permite adicionar, remover e editar endereços inline
 */

import { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import type { CompanyAddress, AddressType } from '../types/company';

export interface AddressListProps {
  addresses: CompanyAddress[];
  onChange: (addresses: CompanyAddress[]) => void;
  errors?: string[]; // Array de erros por índice de endereço
}

export function AddressList({ addresses, onChange, errors }: AddressListProps) {
  const [newAddress, setNewAddress] = useState<Partial<CompanyAddress>>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Brasil',
    type: 'OTHER',
  });

  const handleAdd = () => {
    // Validar campos obrigatórios
    if (!newAddress.street?.trim() || !newAddress.city?.trim() || 
        !newAddress.state?.trim() || !newAddress.zipCode?.trim()) {
      return;
    }

    const updated = [...addresses, {
      street: newAddress.street!,
      city: newAddress.city!,
      state: newAddress.state!,
      zipCode: newAddress.zipCode!,
      country: newAddress.country || 'Brasil',
      type: newAddress.type || 'OTHER',
    }];
    onChange(updated);
    setNewAddress({
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Brasil',
      type: 'OTHER',
    });
  };

  const handleRemove = (index: number) => {
    const updated = addresses.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdate = (index: number, field: keyof CompanyAddress, value: string) => {
    const updated = [...addresses];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const labelId = 'address-list-label';

  return (
    <div className="mb-4">
      <label id={labelId} className="block text-sm font-medium text-gray-700 mb-2">
        Endereços
      </label>
      
      {addresses.map((address, index) => (
        <div key={index} className="border rounded-md p-4 mb-2 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 mb-2">
            <Input
              label="Rua"
              value={address.street}
              onChange={(e) => handleUpdate(index, 'street', e.target.value)}
              error={errors?.[index]?.includes('street') ? errors[index] : undefined}
              className="mb-0"
            />
            <Input
              label="Cidade"
              value={address.city}
              onChange={(e) => handleUpdate(index, 'city', e.target.value)}
              className="mb-0"
            />
            <Input
              label="Estado"
              value={address.state}
              onChange={(e) => handleUpdate(index, 'state', e.target.value)}
              className="mb-0"
            />
            <Input
              label="CEP"
              value={address.zipCode}
              onChange={(e) => handleUpdate(index, 'zipCode', e.target.value)}
              className="mb-0"
            />
            <Input
              label="País"
              value={address.country || 'Brasil'}
              onChange={(e) => handleUpdate(index, 'country', e.target.value)}
              className="mb-0"
            />
            <Select
              label="Tipo"
              value={address.type}
              options={[
                { value: 'BILLING', label: 'Cobrança' },
                { value: 'SHIPPING', label: 'Entrega' },
                { value: 'OTHER', label: 'Outro' },
              ]}
              onChange={(e) => handleUpdate(index, 'type', e.target.value as AddressType)}
              className="mb-0"
            />
          </div>
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

      <div className="border rounded-md p-4 bg-white">
        <div className="grid grid-cols-2 gap-4 mb-2">
          <Input
            label="Rua"
            value={newAddress.street || ''}
            onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
            className="mb-0"
          />
          <Input
            label="Cidade"
            value={newAddress.city || ''}
            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
            className="mb-0"
          />
          <Input
            label="Estado"
            value={newAddress.state || ''}
            onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
            className="mb-0"
          />
          <Input
            label="CEP"
            value={newAddress.zipCode || ''}
            onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
            className="mb-0"
          />
          <Input
            label="País"
            value={newAddress.country || 'Brasil'}
            onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
            className="mb-0"
          />
          <Select
            label="Tipo"
            value={newAddress.type || 'OTHER'}
            options={[
              { value: 'BILLING', label: 'Cobrança' },
              { value: 'SHIPPING', label: 'Entrega' },
              { value: 'OTHER', label: 'Outro' },
            ]}
            onChange={(e) => setNewAddress({ ...newAddress, type: e.target.value as AddressType })}
            className="mb-0"
          />
        </div>
        <Button type="button" variant="primary" size="sm" onClick={handleAdd}>
          Adicionar Endereço
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

