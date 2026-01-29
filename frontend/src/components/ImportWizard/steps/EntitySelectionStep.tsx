/**
 * Passo 2: Seleção de entidade (Etapa 9 - Parte 10).
 * Dropdown Contact, Company, Lead, Opportunity; link Baixar template.
 */

import React from 'react';
import { Select } from '../../Select';
import { Button } from '../../Button';
import { ENTITY_OPTIONS, type EntityType } from '../entityFields';

export interface EntitySelectionStepProps {
  entityType: EntityType | null;
  onEntityTypeChange: (value: EntityType) => void;
  /** Chamado quando o usuário clica em Baixar template; o pai faz o download e reporta erro. */
  onTemplateDownload: (format: 'csv' | 'excel') => void;
  templateDownloadError: string | null;
}

const options = [
  { value: '', label: 'Selecione...' },
  ...ENTITY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

export function EntitySelectionStep({
  entityType,
  onEntityTypeChange,
  onTemplateDownload,
  templateDownloadError,
}: EntitySelectionStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Selecione o tipo de entidade que os dados do arquivo representam.
      </p>

      <Select
        label="Tipo de entidade"
        options={options}
        value={entityType ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v) onEntityTypeChange(v as EntityType);
        }}
      />

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-600">Baixar template:</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onTemplateDownload('csv')}
          disabled={!entityType}
        >
          CSV
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onTemplateDownload('excel')}
          disabled={!entityType}
        >
          Excel
        </Button>
      </div>

      {templateDownloadError && (
        <p className="text-sm text-red-600">{templateDownloadError}</p>
      )}
    </div>
  );
}
