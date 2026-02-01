/**
 * Modal para adicionar um novo filtro
 * Envolve o FilterForm
 */

import { Modal } from '../Modal';
import { FilterForm } from './FilterForm';
import type { FilterModalProps } from './types';
import type { Filter } from '../../types/filter';

export function FilterModal({ 
  isOpen, 
  onClose, 
  onAdd, 
  entity, 
  existingFilters 
}: FilterModalProps) {
  const handleSave = (filter: Filter) => {
    onAdd(filter);
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adicionar Filtro"
      size="md"
    >
      <FilterForm
        entity={entity}
        onSave={handleSave}
        onCancel={onClose}
        existingFilters={existingFilters}
      />
    </Modal>
  );
}
