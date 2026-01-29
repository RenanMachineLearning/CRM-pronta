/**
 * Passo 3: Mapeamento de campos (Etapa 9 - Parte 10).
 * Tabela coluna → campo, dropdown campo, checkbox Obrigatório, preview mapeado.
 */

import React from 'react';
import type { FieldMappingRow } from '../types';
import type { EntityType } from '../entityFields';
import { ENTITY_FIELDS } from '../entityFields';

export interface FieldMappingStepProps {
  headers: string[];
  mappings: FieldMappingRow[];
  entityType: EntityType | null;
  mappedPreview: unknown[];
  onMappingChange: (columnIndex: number, fieldName: string, required: boolean) => void;
}

const fieldOptionsFor = (entityType: EntityType | null) => {
  if (!entityType) return [];
  return ENTITY_FIELDS[entityType] || [];
};

export function FieldMappingStep({
  headers,
  mappings,
  entityType,
  mappedPreview,
  onMappingChange,
}: FieldMappingStepProps) {
  const options = fieldOptionsFor(entityType);
  const optionList = options.map((o) => ({ value: o.value, label: o.label, required: o.required }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Associe cada coluna do arquivo ao campo da entidade. Marque &quot;Obrigatório&quot; quando o campo não pode ficar vazio.
      </p>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Coluna do arquivo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Campo da entidade</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Obrigatório</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {headers.map((header, i) => {
              const mapping = mappings[i];
              return (
                <tr key={i}>
                  <td className="px-4 py-2 text-sm text-gray-900">{header}</td>
                  <td className="px-4 py-2">
                    <select
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      value={mapping?.fieldName ?? ''}
                      onChange={(e) =>
                        onMappingChange(i, e.target.value, mapping?.required ?? false)
                      }
                    >
                      <option value="">— Ignorar —</option>
                      {optionList.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                          {o.required ? ' *' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={mapping?.required ?? false}
                      onChange={(e) =>
                        onMappingChange(i, mapping?.fieldName ?? '', e.target.checked)
                      }
                      disabled={!mapping?.fieldName}
                      className="rounded border-gray-300"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {mappedPreview.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-1">Preview (dados mapeados):</p>
          <div className="overflow-x-auto border border-gray-200 rounded text-sm">
            <pre className="p-2 bg-gray-50 overflow-x-auto">
              {JSON.stringify(mappedPreview.slice(0, 3), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
