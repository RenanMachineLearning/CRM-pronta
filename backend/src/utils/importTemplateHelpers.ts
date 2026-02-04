/**
 * Helper para geração de templates de importação (Etapa 9 - Parte 9).
 *
 * Gera arquivos CSV/Excel com headers corretos e uma linha de exemplo,
 * reutilizando exportHelpers e campos do FieldMetadataService.
 */

import { FieldMetadataService } from '../services/fieldMetadataService';
import type { FieldDefinition } from '../types/mapping.types';
import { generateCSV, generateExcel } from './exportHelpers';
import { EXPORT_CONFIG, type ExportFormat } from '../config/exportConfig';

/** Entidades suportadas para template (conforme doc Etapa-09 §10) */
export const TEMPLATE_ENTITY_TYPES = EXPORT_CONFIG.ENTITY_TYPES;

/**
 * Gera valor de exemplo para um campo conforme tipo e opções.
 * Valores fictícios mas semanticamente corretos (ex.: email@example.com).
 */
function exampleValueForField(def: FieldDefinition): string {
  if (def.options && def.options.length > 0) {
    return String(def.options[0].value ?? 'Exemplo');
  }
  switch (def.type) {
    case 'email':
      return 'email@example.com';
    case 'phone':
      return '+5511999999999';
    case 'url':
      return 'https://example.com';
    case 'date':
      return '2024-01-01';
    case 'datetime':
      return '2024-01-01T12:00:00.000Z';
    case 'number':
    case 'currency':
    case 'percentage':
      return '0';
    case 'boolean':
      return 'false';
    case 'relationship':
      return '';
    case 'text':
    case 'textarea':
    default:
      return 'Exemplo';
  }
}

/**
 * Monta uma linha de exemplo a partir das definições de campo.
 */
function buildExampleRow(defs: FieldDefinition[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const d of defs) {
    row[d.name] = exampleValueForField(d);
  }
  return row;
}

/**
 * Gera buffer do template de importação (CSV ou Excel).
 * Busca campos via FieldMetadataService.getDefaultFieldsForTemplate (paridade com import).
 *
 * @param entityType - Contact, Company, Lead ou Opportunity
 * @param format - 'csv' ou 'excel'
 * @returns Buffer do arquivo (headers + uma linha de exemplo)
 */
export function generateImportTemplate(
  entityType: string,
  format: ExportFormat
): Buffer {
  const defs = FieldMetadataService.getDefaultFieldsForTemplate(entityType);
  if (defs.length === 0) {
    return Buffer.from('', 'utf8');
  }

  const fields = defs.map((d) => d.name);
  const exampleRow = buildExampleRow(defs);
  const data = [exampleRow];

  if (format === 'excel') {
    return generateExcel(data, fields);
  }
  return generateCSV(data, fields);
}
